/**
 * ReAct Loop — Core agent execution loop (Reason + Act)
 *
 * Separated from agent-runtime.js for maintainability.
 * This is the primary execution path for `ryker-multi-agent-tech run`.
 */

const crypto = require("crypto");

const tracing = require("./tracing");
const agentSystem = require("./agent-system");
const { callLLMWithFailover } = require("./failover");
const { loadAgentSpec, loadSkillInstructions, DEFAULT_MAX_STEPS, MAX_ALLOWED_STEPS } = require("./agent-loader");
const { buildSystemPrompt } = require("./prompt-builder");
const { parseToolCalls } = require("./tool-parser");
const { sanitizeInput, safeStringify } = require("./input-sanitizer");
const { _cacheKey, _cacheGet, _cacheSet } = require("./cache");
const toolRegistry = require("./tool-registry");
const { maybeInjectQuestionForm } = require("./question-form");
const { applyQualityGate } = require("./quality-gate");
const { parseArtifacts } = require("./artifact-parser");
const { EliteNexus } = require("./elite-nexus");

const MAX_CONTEXT_CHARS = 200000;
const TOOL_TIMEOUT_MS = 30000;

async function runAgent(options) {
  const {
    input,
    agentName,
    projectDir = process.cwd(),
    provider: overrideProvider,
    model: overrideModel,
    maxSteps: overrideMaxSteps,
    onStep,
    json: jsonMode = false,
    noCache = false,
    signal,
  } = options;

  // Input sanitization — length limit + prompt injection warning
  const safeInput = sanitizeInput(input);

  // Elite-Nexus Orchestration & Agent State Machine Initialization
  const agentInstance = EliteNexus.createAgentInstance(agentName);
  agentInstance.transition("QUEUED", "REQUEST");
  agentInstance.transition("PLANNING", "PLAN");

  const nexusOrchestration = EliteNexus.analyzeAndSchedule(safeInput);
  
  // Dynamic Agent Routing decision based on input and classification complexity
  const complexityLevel = nexusOrchestration.analyzationResults.complexity.level;
  const routing = EliteNexus.router.agentRouter.route(safeInput, nexusOrchestration.analyzationResults.classification, complexityLevel);

  EliteNexus.memory.working.set("agentName", agentName);
  EliteNexus.memory.working.set("rawInput", safeInput);
  EliteNexus.memory.working.set("analyzation", nexusOrchestration.analyzationResults);
  EliteNexus.memory.working.set("plan", nexusOrchestration.plan);
  EliteNexus.memory.working.set("schedule", nexusOrchestration.schedule);
  EliteNexus.memory.working.set("routing", routing);

  // Start distributed trace
  const traceId = tracing.startTrace(`agent.run.${agentName}`, { agentName, provider: overrideProvider });
  const traceSpanId = tracing.startSpan(traceId, "runAgent", { agentName });

  const agentSpec = loadAgentSpec(projectDir, agentName);
  const skillInstructions = loadSkillInstructions(projectDir, agentSpec.skills);
  const INHERIT = "inherit";
  const provider = options.provider ?? (agentSpec.provider && agentSpec.provider !== INHERIT ? agentSpec.provider : process.env.LLM_PROVIDER) ?? undefined;
  const model = overrideModel ?? (agentSpec.model && agentSpec.model !== INHERIT ? agentSpec.model : undefined) ?? process.env.LLM_MODEL ?? "gpt-4";

  // Compute instructions hash for cache invalidation on spec changes
  const instructionsHash = crypto.createHash("sha256")
    .update(agentSpec.instructions || "")
    .update(typeof skillInstructions === "string" ? skillInstructions : JSON.stringify(skillInstructions) || "")
    .digest("hex").slice(0, 8);

  const maxSteps = Math.min(overrideMaxSteps ?? agentSpec.maxSteps ?? DEFAULT_MAX_STEPS, MAX_ALLOWED_STEPS);
  const outputFormat = options.outputFormat ?? agentSpec.outputFormat ?? "text";
  const deterministic = options.deterministic ?? agentSpec.deterministic ?? false;

  // Rebuild cache key with resolved values (not raw options) to prevent false cache hits
  const resolvedCacheKey = _cacheKey(safeInput, agentName, provider, model, outputFormat, deterministic, maxSteps, instructionsHash, projectDir);
  if (!noCache) {
    const cached = _cacheGet(resolvedCacheKey);
    if (cached) {
      cached._fromCache = true;
      tracing.addSpanEvent(traceId, traceSpanId, "cache_hit");
      tracing.endSpan(traceId, traceSpanId, { result: "cached" });
      tracing.endTrace(traceId, "ok", { fromCache: true });
      if (onStep) onStep({ step: 0, thought: "(cached)", action: null, result: null, error: null, duration_ms: 0, toolCalls: [] }, cached);
      return cached;
    }
  }

  // Auto-detect project context and inject into system prompt
  const projectProfile = agentSystem.detect(projectDir);
  EliteNexus.memory.project.set("profile", projectProfile);

  // Dynamic Prompt Builder & Optimization
  const constraints = agentSpec.guardrails ? ["Never access files outside the project directory", "Use safe write for all file operations"] : [];
  const checklist = ["THINK FIRST: State assumptions explicitly.", "SIMPLICITY: Minimum code that solves the problem."];
  const dynamicPrompt = EliteNexus.router.promptBuilder.build(agentSpec, constraints, checklist);
  EliteNexus.memory.promptLibrary.set(agentSpec.name, dynamicPrompt);

  // Build system prompt
  const rawSystemPrompt = buildSystemPrompt(agentSpec, skillInstructions, projectProfile, outputFormat);
  const systemPrompt = EliteNexus.router.promptOptimizer.optimize(rawSystemPrompt);

  // LLM options
  const llmOpts = { provider, model, outputFormat };
  if (deterministic) {
    llmOpts.temperature = 0;
  }

  // State
  agentInstance.transition("RUNNING", "EXECUTE");
  const state = {
    input: safeInput,
    steps: [],
    status: "running",
    agentInstance,
    output: null,
    error: null,
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    traceId,
    failuresHistory: []
  };

  // Record planned events for subtasks in routing mode
  if (routing.routingMode === "MULTI-AGENT MODE") {
    routing.tasks.forEach(t => {
      agentInstance.addEvent("TASK_ORCHESTRATION", "PLANNED", {
        owner: t.owner,
        task: t.task,
        dependencies: t.dependencies,
        evidence: `Task planned via multi-agent router. Criteria: ${t.completionCriteria}`
      });
    });
  } else {
    agentInstance.addEvent("TASK_ORCHESTRATION", "PLANNED", {
      owner: routing.primarySpecialist,
      task: `Execute direct engineering: ${safeInput.slice(0, 50)}...`,
      dependencies: [],
      evidence: `Single-agent routing strategy active.`
    });
  }

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: safeInput },
  ];

  maybeInjectQuestionForm(messages, safeInput, { turn: 1, noForm: options.noForm });

  // ReAct loop
  for (let step = 0; step < maxSteps; step++) {
    // Check abort signal — allows WS/API timeout to cancel running agent
    if (signal?.aborted) {
      state.status = "error";
      state.error = "Agent execution aborted (timeout or cancellation)";
      break;
    }
    const stepSpanId = tracing.startSpan(traceId, `step.${step + 1}`, { step: step + 1 });
    const stepStart = Date.now();

    // Inline intervention: inject mid-run feedback from WebSocket/API
    if (state._intervention) {
      const interventionMsg = state._intervention;
      state._intervention = null;
      messages.push({ role: "user", content: `[Intervention] ${interventionMsg}` });
      tracing.addSpanEvent(traceId, stepSpanId, "intervention", { message: interventionMsg.slice(0, 100) });
    }

    // Call LLM with automatic per-provider failover
    let response;
    try {
      const result = await callLLMWithFailover(messages, llmOpts);
      response = result.response;
      if (result.provider !== llmOpts.provider) {
        tracing.addSpanEvent(traceId, stepSpanId, "provider_failover", { to: result.provider });
        llmOpts.provider = result.provider;
      }
    } catch (err) {
      state.status = "error";
      state.error = `LLM call failed at step ${step + 1}: ${err.message}`;
      tracing.endSpan(traceId, stepSpanId, { error: err.message, errorType: "llm_failure" });
      break;
    }

    // Track usage
    if (response.usage) {
      state.usage.promptTokens += response.usage.promptTokens || 0;
      state.usage.completionTokens += response.usage.completionTokens || 0;
      state.usage.totalTokens += response.usage.totalTokens || 0;
    }

    const assistantContent = response.content || "";

    // Parse tool calls from response (fallback chain)
    const toolCalls = parseToolCalls(assistantContent, response.toolCalls);

    // Standard step record
    const stepRecord = {
      step: step + 1,
      thought: assistantContent,
      action: null,
      result: null,
      error: null,
      duration_ms: 0,
      toolCalls: [],
    };

    // If no tool calls, agent is done — run through Elite-Nexus Reflection Loop
    if (toolCalls.length === 0) {
      const changedFilesList = [];
      if (state.steps) {
        for (const s of state.steps) {
          if (s.toolCalls) {
            for (const tc of s.toolCalls) {
              if (tc.tool?.includes("fs.write") || tc.tool?.includes("fs.edit") || tc.tool?.includes("write") || tc.tool?.includes("replace") || tc.tool?.includes("multi_replace")) {
                const file = tc.args?.TargetFile || tc.args?.path || tc.args?.target;
                if (file && !changedFilesList.includes(file)) {
                  changedFilesList.push(file);
                }
              }
            }
          }
        }
      }

      const checkContext = {
        changedFiles: changedFilesList,
        staticChecked: state.steps.some(s => s.toolCalls?.some(tc => tc.tool === "run_command" && tc.args.CommandLine?.includes("build"))),
        staticPassed: state.steps.some(s => s.toolCalls?.some(tc => tc.tool === "run_command" && tc.args.CommandLine?.includes("build") && !tc.error)),
        scriptRuntimeChecked: state.steps.some(s => s.toolCalls?.some(tc => tc.tool === "run_command" && tc.args.CommandLine?.includes("node ") && !tc.args.CommandLine?.includes("start") && !tc.args.CommandLine?.includes("dev"))),
        scriptRuntimePassed: state.steps.some(s => s.toolCalls?.some(tc => tc.tool === "run_command" && tc.args.CommandLine?.includes("node ") && !tc.args.CommandLine?.includes("start") && !tc.args.CommandLine?.includes("dev") && !tc.error)),
        appRuntimeChecked: state.steps.some(s => s.toolCalls?.some(tc => tc.tool === "run_command" && (tc.args.CommandLine?.includes("start") || tc.args.CommandLine?.includes("dev")))),
        appRuntimePassed: state.steps.some(s => s.toolCalls?.some(tc => tc.tool === "run_command" && (tc.args.CommandLine?.includes("start") || tc.args.CommandLine?.includes("dev")) && !tc.error)),
        browserRuntimeChecked: state.steps.some(s => s.toolCalls?.some(tc => tc.tool === "browser_subagent" || (tc.tool === "run_command" && (tc.args.CommandLine?.includes("playwright") || tc.args.CommandLine?.includes("cypress"))))),
        browserRuntimePassed: state.steps.some(s => s.toolCalls?.some(tc => (tc.tool === "browser_subagent" || (tc.tool === "run_command" && (tc.args.CommandLine?.includes("playwright") || tc.args.CommandLine?.includes("cypress")))) && !tc.error)),
        interactionChecked: state.steps.some(s => s.toolCalls?.some(tc => tc.tool === "run_command" && tc.args.CommandLine?.includes("interaction"))),
        interactionPassed: state.steps.some(s => s.toolCalls?.some(tc => tc.tool === "run_command" && tc.args.CommandLine?.includes("interaction") && !tc.error)),
        visualChecked: state.steps.some(s => s.toolCalls?.some(tc => tc.tool === "run_command" && tc.args.CommandLine?.includes("responsive"))),
        visualPassed: state.steps.some(s => s.toolCalls?.some(tc => tc.tool === "run_command" && tc.args.CommandLine?.includes("responsive") && !tc.error)),
        projectChecked: state.steps.some(s => s.toolCalls?.some(tc => tc.tool === "run_command" && tc.args.CommandLine?.includes("test"))),
        projectPassed: state.steps.some(s => s.toolCalls?.some(tc => tc.tool === "run_command" && tc.args.CommandLine?.includes("test") && !tc.error)),
        browserAvailable: false
      };

      const verifyResult = EliteNexus.verify(assistantContent, safeInput, checkContext);
      const passesReview = verifyResult.status === "PASS";

      if (!passesReview && (state.retryCount || 0) < 3) {
        state.retryCount = (state.retryCount || 0) + 1;
        
        const recovery = EliteNexus.recover(verifyResult, state.retryCount, state.failuresHistory);
        
        const feedbackMsg = `[Elite-Nexus Reflection Loop] การตรวจสอบคุณภาพผลลัพธ์ล้มเหลว (Quality Gate failed).
ประเด็นปัญหา (Issues detected):
- Classification: ${recovery.recoveryRecord.classification}
- Root Cause: ${recovery.recoveryRecord.rootCause}
- Recovery Strategy: ${recovery.nextStrategy}

โปรดปรับปรุงคำตอบใหม่และแก้ไขจุดบกพร่องตามรายการข้างต้น โดยห้ามแสดงประเด็นเหล่านี้ออกมาอีก`;

        messages.push({ role: "assistant", content: assistantContent });
        messages.push({ role: "user", content: feedbackMsg });

        stepRecord.duration_ms = Date.now() - stepStart;
        stepRecord.error = `Quality reflection retry #${state.retryCount} (${recovery.recoveryRecord.classification})`;
        state.steps.push(stepRecord);
        tracing.endSpan(traceId, stepSpanId, { result: "reflection_retry" });
        if (onStep) onStep(stepRecord, state);
        continue;
      }

      stepRecord.duration_ms = Date.now() - stepStart;
      state.output = assistantContent;
      state.status = "completed";
      
      agentInstance.transition("COMPLETED", "COMPLETE");
      agentInstance.addEvent("TASK_ORCHESTRATION", "COMPLETED", {
        evidence: `Task execution succeeded and quality verification passed.`
      });

      state.steps.push(stepRecord);
      tracing.endSpan(traceId, stepSpanId, { result: "complete" });
      if (onStep) onStep(stepRecord, state);
      break;
    }

    // Execute tool calls
    messages.push({ role: "assistant", content: assistantContent });

    for (const toolCall of toolCalls) {
      if (signal?.aborted) break;
      const resolvedName = toolRegistry.resolveToolName(toolCall.tool);
      const tool = toolRegistry.getTool(resolvedName);
      if (!tool) {
        const errMsg = `Tool "${resolvedName}" not found. Available: ${toolRegistry.listTools().join(", ")}`;
        stepRecord.toolCalls.push({ tool: resolvedName, args: toolCall.args, error: errMsg, duration_ms: 0 });
        stepRecord.error = errMsg;
        messages.push({ role: "user", content: `Tool error: ${errMsg}` });

        agentInstance.addEvent("TOOL_EXECUTION", "FAILED", {
          tool: resolvedName,
          error: errMsg,
          evidence: "Tool not found in registry"
        });
        continue;
      }

      // Validate tool args
      const validationErr = toolRegistry.validateToolArgs(resolvedName, toolCall.args || {});
      if (validationErr) {
        stepRecord.toolCalls.push({ tool: resolvedName, args: toolCall.args, error: validationErr, duration_ms: 0 });
        stepRecord.error = validationErr;
        messages.push({ role: "user", content: `Tool validation error (${resolvedName}): ${validationErr}` });

        agentInstance.addEvent("TOOL_EXECUTION", "FAILED", {
          tool: resolvedName,
          error: validationErr,
          evidence: "Arguments validation failed"
        });
        continue;
      }

      const toolStart = Date.now();
      const toolSpanId = tracing.startSpan(traceId, `tool.${resolvedName}`, { tool: resolvedName });

      // Structured trace event: STARTED
      agentInstance.addEvent("TOOL_EXECUTION", "STARTED", {
        tool: resolvedName,
        action: toolCall.args.action || "execute",
        target: toolCall.args.path || toolCall.args.TargetFile || toolCall.args.target || toolCall.args.Cwd || "",
        args: toolCall.args,
        evidence: `Initiating call to ${resolvedName}`
      });

      try {
        const toolArgs = { ...toolCall.args, projectRoot: projectDir, _currentAgent: agentName, _provider: provider, _model: model, _runId: traceId };
        const toolPromise = tool(toolArgs);
        let toolTimer;
        const timeoutPromise = new Promise((_, reject) => {
          toolTimer = setTimeout(() => reject(new Error(`Tool "${resolvedName}" timed out after ${TOOL_TIMEOUT_MS / 1000}s`)), TOOL_TIMEOUT_MS);
        });
        let result;
        try {
          result = await Promise.race([toolPromise, timeoutPromise]);
        } finally {
          clearTimeout(toolTimer);
        }
        result = toolRegistry.truncateResult(result);
        const toolDuration = Date.now() - toolStart;
        stepRecord.toolCalls.push({ tool: resolvedName, args: toolCall.args, result, duration_ms: toolDuration });
        stepRecord.action = { name: resolvedName, args: toolCall.args };
        stepRecord.result = result;
        tracing.endSpan(traceId, toolSpanId, { result: "ok" });
        let toolResultStr = `Tool result (${resolvedName}): ${safeStringify(result)}`;
        // Karpathy surgical change guardrail: warn on large file mutations
        if ((resolvedName.includes("fs.write") || resolvedName.includes("fs.edit")) && safeStringify(result).length > 5000) {
          toolResultStr += `\n[Guardrail] Large change detected. Verify every changed line traces directly to the user's request. If a senior engineer would say this is overcomplicated, simplify.`;
        }
        messages.push({ role: "user", content: toolResultStr });

        // Structured trace event: COMPLETED
        agentInstance.addEvent("TOOL_EXECUTION", "COMPLETED", {
          tool: resolvedName,
          result: typeof result === "string" ? result.slice(0, 200) : JSON.stringify(result).slice(0, 200),
          evidence: `Execution finished in ${toolDuration}ms`
        });

      } catch (err) {
        const toolDuration = Date.now() - toolStart;
        const isTimeout = err.message.includes("timed out");
        stepRecord.toolCalls.push({ tool: resolvedName, args: toolCall.args, error: err.message, duration_ms: toolDuration });
        stepRecord.error = err.message;
        tracing.endSpan(traceId, toolSpanId, { error: err.message, errorType: isTimeout ? "tool_timeout" : "tool_failure" });
        messages.push({ role: "user", content: `Tool error (${resolvedName}): ${err.message}` });

        // Structured trace event: FAILED
        agentInstance.addEvent("TOOL_EXECUTION", "FAILED", {
          tool: resolvedName,
          error: err.message,
          evidence: `Failed after ${toolDuration}ms: ${err.message}`
        });
      }
    }

    stepRecord.duration_ms = Date.now() - stepStart;
    state.steps.push(stepRecord);
    if (stepSpanId) tracing.endSpan(traceId, stepSpanId, { result: stepRecord.error ? "error" : "ok" });
    if (onStep) onStep(stepRecord, state);

    // Enforce context size limit to prevent memory overflow
    // Trim message contents rather than dropping messages to preserve tool call/result pairs
    const totalChars = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
    if (totalChars > MAX_CONTEXT_CHARS) {
      const excess = totalChars - MAX_CONTEXT_CHARS;
      const trimmable = messages.filter(m => m.role !== "system");
      if (trimmable.length > 0) {
        const trimPerMsg = Math.ceil(excess / trimmable.length) + 100; // +100 buffer
        for (const m of trimmable) {
          if (m.content && m.content.length > trimPerMsg * 2) {
            m.content = m.content.slice(0, Math.max(100, m.content.length - trimPerMsg)) + "\n...[truncated for context limit]";
          }
        }
      }
      // If still over limit after trimming, drop complete tool-call/result groups
      // Preserve messages[0] (system) and messages[1] (original user task) — always.
      // Drop from messages[2] onward: assistant + following user tool-result messages.
      while (messages.reduce((sum, m) => sum + (m.content?.length || 0), 0) > MAX_CONTEXT_CHARS && messages.length > 3) {
        const first = messages[2];
        if (!first) break;
        if (first.role === "assistant") {
          // Count how many consecutive user messages follow (tool results)
          let dropCount = 1;
          while (messages[2 + dropCount] && messages[2 + dropCount].role === "user") {
            dropCount++;
          }
          messages.splice(2, dropCount);
        } else {
          messages.splice(2, 1);
        }
      }
    }
  }

  if (state.status === "running") {
    state.status = "max_steps";
    state.output = state.steps[state.steps.length - 1]?.thought || "Max steps reached without completion";
  }

  // End trace
  tracing.endSpan(traceId, traceSpanId, { result: state.status });
  tracing.endTrace(traceId, state.status === "completed" ? "ok" : "error", {
    steps: state.steps.length,
    tokens: state.usage.totalTokens,
  });

  if (outputFormat === "artifact" && state.output != null) {
    const parsed = parseArtifacts(state.output);
    state.artifacts = parsed.artifacts;
    state.output = parsed.text || state.output;
  }

  applyQualityGate(state, { strict: options.strictQualityGate, noQualityGate: options.noQualityGate });

  // Output format enforcement
  if (outputFormat === "json" && state.output != null) {
    try {
      JSON.parse(state.output);
    } catch {
      state.output = JSON.stringify({ text: state.output });
    }
  }

  // Cache result (only cache successful completions)
  if (!noCache && state.status === "completed") {
    _cacheSet(resolvedCacheKey, state);
  }

  return state;
}

module.exports = {
  runAgent,
  MAX_CONTEXT_CHARS,
  TOOL_TIMEOUT_MS,
};
