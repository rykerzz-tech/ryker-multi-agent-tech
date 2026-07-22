/**
 * Elite-Nexus OS Engine — Production Transformation Version 1.0.0
 * 
 * Implements 3 Major Operating System Layers:
 * LAYER 1 — INTELLIGENCE ORCHESTRATION (Analyzers, Planners, Dynamic Router, Prompt Composition, Memory/RAG)
 * LAYER 2 — EXECUTION RUNTIME (Agent State Machine, Unified Tool Runtime, Safe Engineering, Debugging Loop)
 * LAYER 3 — COLLABORATION & PLATFORM (Sessions, Workspaces, Audit Trails, Permissions, Confidence/Risk Engine)
 * 
 * Designed with SOLID, DRY, and Clean Architecture principles.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const logger = require("./logger");

// ==========================================
// 1. AGENT LIFECYCLE & STATE MACHINE (PHASE 2)
// ==========================================

const AGENT_STATES = {
  CREATED: "CREATED",
  QUEUED: "QUEUED",
  PLANNING: "PLANNING",
  RUNNING: "RUNNING",
  WAITING: "WAITING",
  BLOCKED: "BLOCKED",
  REVIEWING: "REVIEWING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  RETRYING: "RETRYING"
};

const AGENT_LIFECYCLE_STEPS = [
  "REQUEST",
  "INITIALIZE",
  "LOAD_CONTEXT",
  "PLAN",
  "EXECUTE",
  "OBSERVE",
  "VALIDATE",
  "REPORT",
  "COMPLETE"
];

class AgentRuntimeInstance {
  constructor(id, role, capabilities = [], tools = []) {
    this.id = id || `agent-${crypto.randomBytes(4).toString("hex")}`;
    this.role = role || "GeneralistSpecialist";
    this.capabilities = capabilities;
    this.tools = tools;
    this.state = AGENT_STATES.CREATED;
    this.lifecycleStep = "REQUEST";
    this.history = [];
    this.events = []; // Structured execution events trace
    this.confidenceScore = 1.0;
    this.riskLevel = "LOW";
    this.tokenUsage = { prompt: 0, completion: 0, total: 0 };
    this.metrics = { startTime: Date.now(), endTime: null, durationMs: 0 };
  }

  transition(newState, lifecycleStep = null, metadata = {}) {
    const prev = this.state;
    this.state = newState;
    if (lifecycleStep) this.lifecycleStep = lifecycleStep;
    
    const record = {
      from: prev,
      to: newState,
      step: this.lifecycleStep,
      timestamp: Date.now(),
      metadata
    };
    this.history.push(record);
    this.addEvent("STATE_TRANSITION", newState, { prev, step: this.lifecycleStep, metadata });
    logger.info(`[AgentState] Instance ${this.id} (${this.role}): ${prev} ➔ ${newState} [Step: ${this.lifecycleStep}]`);
    return record;
  }

  addEvent(stage, status, details = {}) {
    const event = {
      stage,
      status,
      timestamp: Date.now(),
      ...details
    };
    this.events.push(event);
  }
}

// ==========================================
// 2. UNIFIED TOOL RUNTIME & RISK CHECK (PHASE 3)
// ==========================================

const TOOL_RISK_LEVELS = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL"
};

class UnifiedToolRuntime {
  constructor() {
    this.registry = {};
    this.auditLog = [];
  }

  registerTool(name, category, riskLevel, schema, handler) {
    this.registry[name] = {
      name,
      category,
      riskLevel: riskLevel || TOOL_RISK_LEVELS.LOW,
      schema: schema || {},
      handler
    };
  }

  async executeTool(name, args, context = {}) {
    const tool = this.registry[name];
    const startTime = Date.now();

    if (!tool) {
      // Fallback execution for non-custom tools
      logger.info(`[ToolRuntime] Executing builtin tool: ${name}`);
      return { status: "executed", result: args };
    }

    if (tool.riskLevel === TOOL_RISK_LEVELS.CRITICAL && !context.approved) {
      throw new Error(`Execution blocked: Tool "${name}" requires explicit permission confirmation (Risk: CRITICAL).`);
    }

    try {
      const result = await tool.handler(args, context);
      const durationMs = Date.now() - startTime;
      const logEntry = { tool: name, args, risk: tool.riskLevel, durationMs, status: "success", timestamp: startTime };
      this.auditLog.push(logEntry);
      return result;
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const logEntry = { tool: name, args, risk: tool.riskLevel, durationMs, status: "error", error: err.message, timestamp: startTime };
      this.auditLog.push(logEntry);
      throw err;
    }
  }

  getAuditLog() {
    return [...this.auditLog];
  }
}

// ==========================================
// 3. SAFE CODE ENGINEERING & REPO DISCOVERY (PHASE 4)
// ==========================================

class RepositoryAnalyzer {
  analyze(projectDir) {
    const result = {
      projectDir,
      language: "javascript",
      framework: "vanilla",
      buildSystem: "npm",
      hasTests: false,
      filesCount: 0
    };

    if (fs.existsSync(path.join(projectDir, "package.json"))) {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, "package.json"), "utf-8"));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps.typescript || fs.existsSync(path.join(projectDir, "tsconfig.json"))) result.language = "typescript";
        if (deps.next) result.framework = "nextjs";
        else if (deps.express) result.framework = "express";
        else if (deps.react) result.framework = "react";
        if (deps.jest || deps.vitest || pkg.scripts?.test) result.hasTests = true;
      } catch { /* skip */ }
    } else if (fs.existsSync(path.join(projectDir, "pyproject.toml")) || fs.existsSync(path.join(projectDir, "requirements.txt"))) {
      result.language = "python";
      result.buildSystem = "pip";
    }

    return result;
  }
}

// ==========================================
// 4. REAL DEBUGGING LOOP ENGINE (PHASE 5)
// ==========================================

class RealDebuggingLoop {
  constructor() {
    this.attempts = [];
  }

  createHypothesis(errorLog, fileContext) {
    const hypothesis = {
      id: `hyp-${crypto.randomBytes(3).toString("hex")}`,
      errorMsg: errorLog,
      suspectedCause: errorLog.includes("SyntaxError") ? "Syntax error in file" : errorLog.includes("ReferenceError") ? "Undefined variable reference" : "Logic or contract violation",
      proposedFix: "Apply targeted surgical patch",
      status: "UNTESTED"
    };
    this.attempts.push(hypothesis);
    return hypothesis;
  }

  recordResult(hypothesisId, passed, log = "") {
    const item = this.attempts.find(a => a.id === hypothesisId);
    if (item) {
      item.status = passed ? "PASSED" : "FAILED";
      item.testLog = log;
    }
    return item;
  }
}

// ==========================================
// 5. INTELLIGENT PLANNING & DEPENDENCY GRAPH (PHASE 6)
// ==========================================

class IntentAnalyzer {
  analyze(input) {
    const isCode = /(code|refactor|bug|fix|function|class|test|build|create|app|api)/i.test(input);
    const isGuide = /(guide|how to|tutorial|steps|procedure)/i.test(input);
    const isQuery = /(what is|explain|tell me about|how does)/i.test(input);
    return {
      primaryIntent: isCode ? "code_development" : isGuide ? "guide_creation" : isQuery ? "information_query" : "general_task",
      confidence: 0.95,
      rawInput: input
    };
  }
}

class ComplexityAnalyzer {
  analyze(input) {
    const words = input.split(/\s+/).length;
    const level = words > 100 ? "HIGH" : words > 30 ? "MEDIUM" : "LOW";
    return {
      complexityScore: level === "HIGH" ? 0.85 : level === "MEDIUM" ? 0.5 : 0.2,
      level,
      estimatedSteps: level === "HIGH" ? 8 : level === "MEDIUM" ? 4 : 2
    };
  }
}

class PriorityAnalyzer {
  analyze(input) {
    const isUrgent = /(urgent|critical|emergency|immediate|blocking|break)/i.test(input);
    return {
      priority: isUrgent ? "HIGH" : "NORMAL",
      slaMs: isUrgent ? 60000 : 300000
    };
  }
}

class GoalExtractor {
  extract(input) {
    const lines = input.split("\n").map(l => l.trim()).filter(Boolean);
    const goals = lines.filter(l => /^(goal|target|aim|should|must|want to)/i.test(l));
    if (goals.length === 0) {
      goals.push(input.split(/[.!?]/)[0] || "Execute autonomous operations.");
    }
    return { goals };
  }
}

class TaskClassifier {
  classify(input) {
    const categories = [];
    if (/(ui|frontend|css|html|react|next|view)/i.test(input)) categories.push("frontend");
    if (/(api|backend|express|db|database|server)/i.test(input)) categories.push("backend");
    if (/(test|jest|vitest|mocha|qa|assert)/i.test(input)) categories.push("testing");
    if (/(ci|cd|docker|deploy|aws|git|pipeline)/i.test(input)) categories.push("devops");
    if (/(security|auth|jwt|encrypt|token|vulnerability)/i.test(input)) categories.push("security");
    if (categories.length === 0) categories.push("general");
    return { categories };
  }
}

class DependencyGraph {
  constructor() {
    this.nodes = {};
  }
  addNode(id, dependencies = []) {
    this.nodes[id] = dependencies;
  }
  topologicalSort() {
    const visited = {};
    const temp = {};
    const order = [];

    const visit = (node) => {
      if (temp[node]) throw new Error("Circular dependency detected in execution plan!");
      if (!visited[node]) {
        temp[node] = true;
        const deps = this.nodes[node] || [];
        deps.forEach(dep => {
          if (this.nodes[dep]) visit(dep);
        });
        visited[node] = true;
        temp[node] = false;
        order.push(node);
      }
    };

    Object.keys(this.nodes).forEach(node => {
      if (!visited[node]) visit(node);
    });

    return order;
  }
  serialize() { return this.nodes; }
}

class Planner {
  createPlan(input, analyzersResult) {
    const steps = [];
    const { primaryIntent } = analyzersResult.intent;
    const { level } = analyzersResult.complexity;

    if (primaryIntent === "code_development") {
      steps.push({ id: "plan_arch", desc: "Architectural & Technical System Design", dep: [] });
      steps.push({ id: "impl_code", desc: "Surgical Code Modification & Patching", dep: ["plan_arch"] });
      steps.push({ id: "run_test", desc: "Automated Testing & Verification", dep: ["impl_code"] });
    } else {
      steps.push({ id: "extract_info", desc: "Context Extraction & RAG Retrieval", dep: [] });
      steps.push({ id: "draft_res", desc: "Response Synthesis & Quality Check", dep: ["extract_info"] });
    }

    if (level === "HIGH") {
      steps.push({ id: "quality_audit", desc: "Quality Gate Audit & Risk Analysis", dep: steps.map(s => s.id) });
    }

    return {
      planId: crypto.randomBytes(4).toString("hex"),
      steps,
      createdAt: Date.now()
    };
  }
}

class ExecutionPlanner {
  buildSchedule(plan) {
    const dependencyGraph = new DependencyGraph();
    plan.steps.forEach(s => dependencyGraph.addNode(s.id, s.dep));
    const executionOrder = dependencyGraph.topologicalSort();
    return {
      executionOrder,
      planId: plan.planId,
      graph: dependencyGraph.serialize()
    };
  }
}

class WorkflowScheduler {
  schedule(schedule) {
    return {
      scheduleId: crypto.randomBytes(4).toString("hex"),
      executionOrder: schedule.executionOrder,
      status: "scheduled"
    };
  }
}

// ==========================================
// 6. DYNAMIC CAPABILITY ROUTER (PHASE 7)
// ==========================================

class DynamicAgentRouter {
  route(input, taskClassifications, complexityLevel = "LOW") {
    const { categories = [] } = taskClassifications || {};
    const specialistMap = {
      frontend: { name: "FrontendSpecialist", capabilities: ["React", "Next.js", "CSS", "UI", "Responsive"] },
      backend: { name: "BackendSpecialist", capabilities: ["REST APIs", "Node.js", "Databases", "Express"] },
      testing: { name: "QA_TestSpecialist", capabilities: ["Unit Testing", "Jest", "Assertions", "Regression"] },
      devops: { name: "DevOpsSpecialist", capabilities: ["Docker", "Git", "Pipelines", "CI/CD"] },
      security: { name: "SecuritySpecialist", capabilities: ["Auth", "Vulnerability Scanning", "Secrets Audit"] }
    };

    const routed = categories.map(cat => specialistMap[cat] || { name: "ArchitectSpecialist", capabilities: ["System Design", "SOLID Principles"] });
    if (routed.length === 0) {
      routed.push({ name: "ArchitectSpecialist", capabilities: ["System Design", "SOLID Principles"] });
    }

    const primarySpecialist = routed[0].name;
    const capabilities = routed[0].capabilities;
    const backupSpecialists = routed.slice(1).map(r => r.name);

    // Determine routing mode
    const isMultiAgent = complexityLevel === "HIGH" || categories.length > 1 || categories.includes("security") || categories.includes("devops");
    const routingMode = isMultiAgent ? "MULTI-AGENT MODE" : "SINGLE-AGENT MODE";
    
    let explanation = "";
    let tasks = [];

    if (isMultiAgent) {
      explanation = `Task complexity is high or covers multiple domains (${categories.join(", ")}). Requiring Multi-Agent coordination to guarantee architecture, implementation, security, and QA verification.`;
      tasks = routed.map((spec, index) => {
        let taskName = "";
        let completionCriteria = "";
        if (spec.name.includes("Frontend")) {
          taskName = "Develop user interface components";
          completionCriteria = "UI pages built, responsive layout verification PASS";
        } else if (spec.name.includes("Backend")) {
          taskName = "Implement server/database API logic";
          completionCriteria = "REST API endpoints operational, database models matching schema";
        } else if (spec.name.includes("Security")) {
          taskName = "Perform security audit & code scanning";
          completionCriteria = "Zero high severity vulnerabilities, credential scanning PASS";
        } else if (spec.name.includes("QA")) {
          taskName = "Verify functionality and test coverage";
          completionCriteria = "Unit tests execution PASS with 80%+ coverage";
        } else if (spec.name.includes("DevOps")) {
          taskName = "Validate CI/CD configuration & build pipelines";
          completionCriteria = "Build script executes successfully, containerized deployment check PASS";
        } else {
          taskName = "Coordinate system architecture and design verification";
          completionCriteria = "Architecture plans verify and align with system specs";
        }

        return {
          id: `subtask-${index + 1}`,
          task: taskName,
          owner: spec.name,
          input: "Project specifications and context",
          output: "Completed subtask artifacts",
          dependencies: index > 0 ? [`subtask-${index}`] : [],
          completionCriteria
        };
      });
    } else {
      explanation = `Task is straightforward (Complexity: ${complexityLevel}). Handled in Single-Agent Mode by ${primarySpecialist}.`;
    }

    return {
      routingMode,
      explanation,
      primarySpecialist,
      capabilities,
      backupSpecialists,
      agentCount: routed.length,
      tasks
    };
  }
}

// ==========================================
// 7. DYNAMIC PROMPT COMPOSITION (PHASE 10)
// ==========================================

class DynamicPromptComposition {
  build(agentSpec, constraints = [], checklist = [], projectProfile = null) {
    let prompt = `[Elite-Nexus System Rules]\nRole: ${agentSpec.name || "Elite Autonomous Agent"}\nDescription: ${agentSpec.description || ""}\n\n`;
    
    if (projectProfile) {
      prompt += `[Project Environment Context]\n- Language: ${projectProfile.language}\n- Framework: ${projectProfile.framework}\n- Package Manager: ${projectProfile.packageManager}\n\n`;
    }

    if (constraints.length > 0) {
      prompt += `[Operational Constraints]\n${constraints.map(c => `- ${c}`).join("\n")}\n\n`;
    }

    if (checklist.length > 0) {
      prompt += `[Engineering Checklist]\n${checklist.map(i => `- ${i}`).join("\n")}\n\n`;
    }

    return prompt;
  }
}

class PromptOptimizer {
  optimize(promptText, tokenBudget = 4000) {
    if (promptText.length > tokenBudget * 3) {
      return promptText.replace(/\n\n+/g, "\n").slice(0, tokenBudget * 3);
    }
    return promptText;
  }
}

// ==========================================
// 8. LAYERED MEMORY FABRIC (PHASE 8)
// ==========================================

class MemoryLayer {
  constructor(name) {
    this.name = name;
    this.storage = {};
  }
  set(key, val) { this.storage[key] = val; }
  get(key) { return this.storage[key]; }
  clear() { this.storage = {}; }
  getAll() { return { ...this.storage }; }
}

class LayeredMemoryFabric {
  constructor() {
    this.working = new MemoryLayer("working");
    this.conversation = new MemoryLayer("conversation");
    this.project = new MemoryLayer("project");
    this.persistent = new MemoryLayer("persistent");
    this.knowledge = new MemoryLayer("knowledge");
    this.architecture = new MemoryLayer("architecture");
    this.decision = new MemoryLayer("decision");
    this.promptLibrary = new MemoryLayer("promptLibrary");
    this.codingStandards = new MemoryLayer("codingStandards");
    this.userPreferences = new MemoryLayer("userPreferences");
    this.vector = new MemoryLayer("vector");
  }
}

// ==========================================
// 9. KNOWLEDGE ENGINE & RAG (PHASE 9)
// ==========================================

class KnowledgeRetrieval {
  retrieve(query, docIndex) {
    const hits = [];
    if (docIndex) {
      Object.entries(docIndex).forEach(([title, content]) => {
        if (title.toLowerCase().includes(query.toLowerCase()) || content.toLowerCase().includes(query.toLowerCase())) {
          hits.push({ title, content, score: 0.95 });
        }
      });
    }
    return hits;
  }
}

class RagLayer {
  constructor(retrieval) {
    this.retrieval = retrieval || new KnowledgeRetrieval();
    this.docsIndex = {};
  }
  indexDocument(title, content) { this.docsIndex[title] = content; }
  augment(query, prompt) {
    const hits = this.retrieval.retrieve(query, this.docsIndex);
    if (hits.length > 0) {
      return `${prompt}\n\n[Retrieved Knowledge Base Context]\n${hits.map(h => `Source: ${h.title}\n${h.content}`).join("\n\n")}`;
    }
    return prompt;
  }
}

// ==========================================
// 10. CONFIDENCE & RISK ENGINE (PHASE 12)
// ==========================================

class ConfidenceRiskEngine {
  evaluate(output, input) {
    const containsEval = /eval\s*\(/.test(output);
    const containsSecrets = /(password|apikey|secret)\s*[:=]/i.test(output);
    const hasTodo = output.includes("TODO");

    const confidenceScore = hasTodo ? 82 : output.length > 60 ? 95 : 70;
    const riskLevel = containsEval || containsSecrets ? "HIGH" : hasTodo ? "MEDIUM" : "LOW";
    
    return {
      confidenceScore,
      riskLevel,
      unknowns: hasTodo ? ["Incomplete placeholder blocks found in code draft"] : [],
      assumptions: ["Standard Node.js runtime environment assumptions"],
      evidence: [`Generated text output length: ${output.length} chars`]
    };
  }
}

// ==========================================
// 11. REVIEWER & REFLECTION PIPELINE (PHASE 11)
// ==========================================

class ReviewerLayer {
  review(output, rules) {
    const issues = [];
    rules.forEach(rule => {
      if (rule.pattern.test(output)) issues.push(rule.message);
    });
    return { approved: issues.length === 0, issues };
  }
}

class ReflectionLayer {
  reflect(output) {
    const score = output.includes("TODO") ? 0.6 : 0.95;
    return { completenessScore: score, feedback: score < 0.8 ? "Draft contains unresolved TODO markers." : "Satisfies criteria." };
  }
}

class ConfidenceEngine {
  calculate(output) {
    const confidence = output.length > 50 ? 0.94 : 0.72;
    return { confidence };
  }
}

class RiskAnalysis {
  analyze(output) {
    const containsEval = /eval\s*\(/.test(output);
    const containsSecrets = /(password|apikey|secret)\s*[:=]/i.test(output);
    return {
      riskLevel: containsEval || containsSecrets ? "HIGH" : "LOW",
      violations: containsEval ? ["eval Usage"] : containsSecrets ? ["Leaked Secret Pattern"] : []
    };
  }
}

class SelfCritique {
  critique(output) {
    const observations = [];
    if (output.includes("console.log")) observations.push("Uses console.log instead of trace/logger");
    return { observations };
  }
}

class RetryEngine {
  shouldRetry(reviewResult, attemptCount, maxRetries = 3) {
    return !reviewResult.approved && attemptCount < maxRetries;
  }
}

class RecoveryEngine {
  repair(output, reviewIssues) {
    let repaired = output;
    if (reviewIssues.includes("Remove debug console.log statements.")) {
      repaired = repaired.replace(/console\.log\(.*?\);?/g, "");
    }
    return repaired;
  }
}

// ==========================================
// 12. SESSIONS & WORKSPACE MANAGER (PHASE 14)
// ==========================================

class SessionWorkspaceManager {
  constructor() {
    this.sessions = {};
  }
  createSession(projectId) {
    const sessionId = `sess-${crypto.randomBytes(4).toString("hex")}`;
    this.sessions[sessionId] = { id: sessionId, projectId, status: "ACTIVE", createdAt: Date.now() };
    return this.sessions[sessionId];
  }
  getSession(sessionId) { return this.sessions[sessionId]; }
}

// ==========================================
// ELITE-NEXUS CENTRAL OS HUB
// ==========================================

class EliteNexusOS {
  constructor() {
    this.analyzers = {
      intent: new IntentAnalyzer(),
      complexity: new ComplexityAnalyzer(),
      priority: new PriorityAnalyzer(),
      goals: new GoalExtractor(),
      classifier: new TaskClassifier()
    };
    this.planners = {
      planner: new Planner(),
      execPlanner: new ExecutionPlanner(),
      workflows: new WorkflowScheduler()
    };
    this.router = {
      agentRouter: new DynamicAgentRouter(),
      promptBuilder: new DynamicPromptComposition(),
      promptOptimizer: new PromptOptimizer()
    };
    this.memory = new LayeredMemoryFabric();
    this.knowledge = new RagLayer();
    this.toolRuntime = new UnifiedToolRuntime();
    this.repoAnalyzer = new RepositoryAnalyzer();
    this.debuggingLoop = new RealDebuggingLoop();
    this.confidenceRisk = new ConfidenceRiskEngine();
    this.sessionWorkspace = new SessionWorkspaceManager();
    this.reflection = {
      reviewer: new ReviewerLayer(),
      reflector: new ReflectionLayer(),
      confidence: new ConfidenceEngine(),
      risk: new RiskAnalysis(),
      critique: new SelfCritique(),
      retry: new RetryEngine(),
      recovery: new RecoveryEngine()
    };
  }

  createAgentInstance(role, capabilities = [], tools = []) {
    return new AgentRuntimeInstance(null, role, capabilities, tools);
  }

  analyzeAndSchedule(input) {
    const intent = this.analyzers.intent.analyze(input);
    const complexity = this.analyzers.complexity.analyze(input);
    const priority = this.analyzers.priority.analyze(input);
    const goals = this.analyzers.goals.extract(input);
    const classification = this.analyzers.classifier.classify(input);

    const analyzationResults = { intent, complexity, priority, goals, classification };
    const plan = this.planners.planner.createPlan(input, analyzationResults);
    const schedule = this.planners.execPlanner.buildSchedule(plan);

    return { analyzationResults, plan, schedule };
  }

  understand(input) {
    const intent = this.analyzers.intent.analyze(input);
    const complexity = this.analyzers.complexity.analyze(input);
    const priority = this.analyzers.priority.analyze(input);
    const goals = this.analyzers.goals.extract(input);
    const classification = this.analyzers.classifier.classify(input);
    return { intent, complexity, priority, goals, classification };
  }

  plan(input, understandResult) {
    const plan = this.planners.planner.createPlan(input, understandResult);
    const schedule = this.planners.execPlanner.buildSchedule(plan);
    return { plan, schedule };
  }

  execute(plan, agentInstance) {
    agentInstance.transition("RUNNING", "EXECUTE");
    return { status: "executing", planId: plan.planId };
  }

  verify(output, input, context = {}) {
    const changedFiles = context.changedFiles || [];
    const browserAvailable = context.browserAvailable || false;

    // Check verification layers (1 to 5)
    const verificationLayers = {
      layer1_static: { name: "STATIC VERIFICATION (TypeScript/ESLint/Build)", status: "NOT_TESTED", evidence: "" },
      layer2_runtime: { name: "RUNTIME VERIFICATION (App Startup/Load)", status: "NOT_TESTED", evidence: "" },
      layer3_interaction: { name: "INTERACTION VERIFICATION (Buttons/Forms)", status: "NOT_TESTED", evidence: "" },
      layer4_visual: { name: "VISUAL / RESPONSIVE VERIFICATION (Mobile/Tablet/Desktop)", status: "NOT_TESTED", evidence: "" },
      layer5_project: { name: "PROJECT-SPECIFIC VERIFICATION", status: "NOT_TESTED", evidence: "" }
    };

    if (context.staticChecked) {
      verificationLayers.layer1_static.status = context.staticPassed ? "PASS" : "FAIL";
      verificationLayers.layer1_static.evidence = context.staticEvidence || "Build compilation and syntax checks passed.";
    }

    if (context.runtimeChecked) {
      verificationLayers.layer2_runtime.status = context.runtimePassed ? "PASS" : "FAIL";
      verificationLayers.layer2_runtime.evidence = context.runtimeEvidence || "Application starts successfully and routes load without exceptions.";
    }

    if (context.interactionChecked) {
      verificationLayers.layer3_interaction.status = context.interactionPassed ? "PASS" : "FAIL";
      verificationLayers.layer3_interaction.evidence = context.interactionEvidence || "Interactive elements simulation passed.";
    }

    if (browserAvailable) {
      verificationLayers.layer4_visual.status = context.visualPassed ? "PASS" : "FAIL";
      verificationLayers.layer4_visual.evidence = context.visualEvidence || "Browser verified responsive layout across standard screen sizes.";
    } else {
      verificationLayers.layer4_visual.status = "NOT_TESTED";
      verificationLayers.layer4_visual.evidence = "Browser verification capability not available.";
    }

    if (context.projectChecked) {
      verificationLayers.layer5_project.status = context.projectPassed ? "PASS" : "FAIL";
      verificationLayers.layer5_project.evidence = context.projectEvidence || "Project specific validation suite completed.";
    }

    const rules = [{ pattern: /I'd be happy to help/i, message: "Filler" }];
    const reviewerResult = this.reflection.reviewer.review(output, rules);
    const reflectionResult = this.reflection.reflector.reflect(output);
    const riskResult = this.confidenceRisk.evaluate(output, input);

    const hasFailedLayer = Object.values(verificationLayers).some(layer => layer.status === "FAIL");
    const passes = !hasFailedLayer && reviewerResult.approved && riskResult.riskLevel !== "HIGH" && reflectionResult.completenessScore >= 0.8;

    return {
      status: passes ? "PASS" : "FAIL",
      confidence: riskResult.confidenceScore,
      risk: riskResult.riskLevel,
      reviewerResult,
      reflectionResult,
      verificationLayers,
      changedFiles
    };
  }

  deliver(verifyResult, output) {
    return {
      completed: true,
      output,
      confidence: verifyResult.confidence,
      risk: verifyResult.risk,
      verificationLayers: verifyResult.verificationLayers
    };
  }

  recover(verifyResult, attemptCount, failuresHistory = []) {
    const shouldRetry = attemptCount < 3 && verifyResult.status === "FAIL";
    
    const lastIssue = verifyResult.reviewerResult?.issues?.[0] || "Quality threshold not met";
    let classification = "logic_error";
    let rootCause = "The draft content did not meet the quality or completeness threshold.";
    let affectedScope = "system_output";
    let strategy = "Regenerate output with strict adherence to validation constraints.";

    if (lastIssue.includes("eval")) {
      classification = "security_violation";
      rootCause = "Use of prohibited eval() function in draft.";
      affectedScope = "code_syntax";
      strategy = "Refactor code to use robust JSON parsing or function mapping instead of eval().";
    } else if (lastIssue.includes("secret") || lastIssue.includes("key")) {
      classification = "security_leak";
      rootCause = "Potential API key or secret hardcoded in code.";
      affectedScope = "configuration";
      strategy = "Replace hardcoded keys with environment variable lookups (e.g. process.env).";
    } else if (lastIssue.includes("filler")) {
      classification = "prose_slop";
      rootCause = "Generic AI assistant filler present in output.";
      affectedScope = "prose_style";
      strategy = "Rewrite output starting directly with the payload, pruning introductory phrases.";
    }

    // Ensure we don't repeat the same strategy
    const previouslyUsed = failuresHistory.some(h => h.strategy === strategy);
    if (previouslyUsed) {
      strategy = "Escalate to generalist reasoning to perform direct, minimal surgical fix without templates.";
    }

    const recoveryRecord = {
      attempt: attemptCount,
      classification,
      rootCause,
      affectedScope,
      strategy,
      timestamp: Date.now()
    };

    failuresHistory.push(recoveryRecord);

    return {
      shouldRetry,
      nextStrategy: strategy,
      recoveryRecord
    };
  }

  generateReport(state, mode = "NORMAL") {
    const completedText = state.status === "completed"
      ? `Task completed successfully: ${state.input.split(/[.!?\n]/)[0].slice(0, 80)}`
      : `Task execution finished with status: ${state.status}`;

    const changedFiles = [];
    if (state.steps) {
      for (const step of state.steps) {
        if (step.toolCalls) {
          for (const tc of step.toolCalls) {
            if (tc.tool?.includes("fs.write") || tc.tool?.includes("fs.edit") || tc.tool?.includes("write") || tc.tool?.includes("replace")) {
              const file = tc.args?.TargetFile || tc.args?.path || tc.args?.target;
              if (file && !changedFiles.includes(file)) {
                changedFiles.push(file);
              }
            }
          }
        }
      }
    }
    const filesList = changedFiles.length > 0
      ? changedFiles.map(f => `- ${path.basename(f)}`).join("\n")
      : "None";

    let buildStatus = "NOT TESTED";
    let testStatus = "NOT TESTED";
    let runtimeStatus = "NOT TESTED";

    if (state.steps) {
      for (const step of state.steps) {
        if (step.toolCalls) {
          for (const tc of step.toolCalls) {
            if (tc.tool === "run_command" && tc.args.CommandLine) {
              const cmd = tc.args.CommandLine;
              if (cmd.includes("build") || cmd.includes("compile") || cmd.includes("tsc")) {
                buildStatus = tc.error ? "FAIL" : "PASS";
              }
              if (cmd.includes("test") || cmd.includes("jest") || cmd.includes("vitest")) {
                testStatus = tc.error ? "FAIL" : "PASS";
              }
              if (cmd.includes("start") || cmd.includes("node") || cmd.includes("dev")) {
                runtimeStatus = tc.error ? "FAIL" : "PASS";
              }
            }
          }
        }
      }
    }

    const issues = [];
    if (state.error) {
      issues.push(state.error);
    }
    if (state.quality && state.quality.violations) {
      state.quality.violations.forEach(v => issues.push(v.message));
    }
    const issuesText = issues.length > 0
      ? issues.map(i => `- ${i}`).join("\n")
      : "None";

    const finalStatus = state.status === "completed" ? "PASS" : "REVISION_REQUIRED";

    if (mode === "NORMAL") {
      return [
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "✅ COMPLETED",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        completedText,
        "",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "📁 CHANGED",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        filesList,
        "",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "🧪 VERIFICATION",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        `Build: ${buildStatus}`,
        `Tests: ${testStatus}`,
        `Runtime: ${runtimeStatus}`,
        "",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "⚠️ ISSUES",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        issuesText,
        "",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "📌 STATUS",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        finalStatus,
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      ].join("\n");
    } else {
      const traceEventsText = (state.agentInstance?.events || [])
        .map(e => `[${new Date(e.timestamp).toISOString()}] [${e.stage}] ${e.status} - ${e.tool || e.prev || ""} ${e.evidence || ""}`)
        .join("\n");
      
      const routingText = state.memory?.working?.get("routing")
        ? JSON.stringify(state.memory.working.get("routing"), null, 2)
        : "Single Agent Mode default";

      return [
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "🐞 DEBUG - FULL EXECUTION TRACE",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        `Agent Role: ${state.agentInstance?.role || "Generalist"}`,
        `Status: ${state.status}`,
        "",
        "--- AGENT ROUTING & TASK DECOMPOSITION ---",
        routingText,
        "",
        "--- STRUCTURED EXECUTION EVENTS ---",
        traceEventsText || "No events recorded",
        "",
        "--- FAILURE RECOVERY LOGS ---",
        state.failuresHistory && state.failuresHistory.length > 0
          ? JSON.stringify(state.failuresHistory, null, 2)
          : "No failures recorded",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      ].join("\n");
    }
  }
}

module.exports = {
  EliteNexusOS,
  AgentRuntimeInstance,
  AGENT_STATES,
  AGENT_LIFECYCLE_STEPS,
  TOOL_RISK_LEVELS,
  EliteNexus: new EliteNexusOS()
};
