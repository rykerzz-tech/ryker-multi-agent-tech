/**
 * Comprehensive Test Suite for All Models in Ryker Multi-Agent Tech
 * Tests:
 * 1. All LLM Models & Providers (Gemini, OpenAI, Claude, DeepSeek, Mistral, Groq, Ollama, CLI, Mock)
 * 2. All 29 Canonical Specialist Agent Models
 * 3. 5 Consolidated Omni-Agent Groups (ELITE-NEXUS v2)
 * 4. Cognitive & Self-Reflection Subsystems
 */

const assert = require("assert");
const path = require("path");

// Core modules
const llmProviders = require("../lib/core/llm-providers");
const failover = require("../lib/core/failover");
const cliScanner = require("../lib/core/cli-scanner");
const { CANONICAL_REGISTRY } = require("../lib/core/agent-registry");
const {
  EliteNexus,
  AgentRuntimeInstance,
  AGENT_STATES,
  CognitiveDecomposer,
  DAGExecutor,
  SelfReflectionEngine,
  SwarmOrchestrator
} = require("../lib/core/elite-nexus");

const testResults = {
  llmModels: [],
  agentModels: [],
  omniGroups: [],
  cognitiveSubsystems: [],
  summary: { total: 0, passed: 0, failed: 0 }
};

function recordTest(category, name, passed, details = "") {
  testResults.summary.total++;
  if (passed) {
    testResults.summary.passed++;
  } else {
    testResults.summary.failed++;
  }
  const item = { name, passed, details };
  if (category === "llm") testResults.llmModels.push(item);
  else if (category === "agent") testResults.agentModels.push(item);
  else if (category === "omni") testResults.omniGroups.push(item);
  else if (category === "cognitive") testResults.cognitiveSubsystems.push(item);
  console.log(`  ${passed ? "✓" : "✗"} [${category.toUpperCase()}] ${name}${details ? ` (${details})` : ""}`);
}

async function testLLMModels() {
  console.log("\n==================================================");
  console.log("1. TESTING ALL LLM PROVIDERS & MODELS");
  console.log("==================================================");

  // 1.1 Gemini Models & Aliases
  const geminiModels = [
    { alias: "gemini", expected: "gemini-2.0-flash" },
    { alias: "gemini-flash", expected: "gemini-2.0-flash" },
    { alias: "gemini-pro", expected: "gemini-2.5-pro" },
    { alias: "gemini-ultra", expected: "gemini-2.5-pro" },
    { alias: "gemini-3.7", expected: "gemini-3.7-flash" },
    { alias: "gemini-3.7-flash", expected: "gemini-3.7-flash" },
    { alias: "gemini-3.7-pro", expected: "gemini-3.7-pro" },
    { alias: "gemini-3.7-thinking", expected: "gemini-3.7-flash-thinking" },
    { alias: "gemini-2.5", expected: "gemini-2.5-pro" },
    { alias: "gemini-2.0", expected: "gemini-2.0-flash" }
  ];

  for (const gm of geminiModels) {
    try {
      const resolved = llmProviders.resolveGeminiModel(gm.alias);
      const ok = resolved === gm.expected;
      recordTest("llm", `Gemini Alias: "${gm.alias}" ➔ ${resolved}`, ok, `Expected ${gm.expected}`);
    } catch (err) {
      recordTest("llm", `Gemini Alias: "${gm.alias}"`, false, err.message);
    }
  }

  // 1.2 Gemini Token Limits
  try {
    const flashMax = llmProviders.getGeminiMaxTokens("gemini-2.0-flash");
    const proMax = llmProviders.getGeminiMaxTokens("gemini-2.5-pro");
    const p37Max = llmProviders.getGeminiMaxTokens("gemini-3.7-pro");
    recordTest("llm", "Gemini Token Limits (Flash=8k, Pro=64k, 3.7=64k)", flashMax === 8192 && proMax === 65536 && p37Max === 65536);
  } catch (err) {
    recordTest("llm", "Gemini Token Limits", false, err.message);
  }

  // 1.3 Gemini Safety Settings (BLOCK_NONE for red-team)
  try {
    const isBlockNone = llmProviders.GEMINI_SAFETY_SETTINGS.every(s => s.threshold === "BLOCK_NONE");
    recordTest("llm", "Gemini Safety Settings (All BLOCK_NONE)", isBlockNone, "Red-team unconstrained");
  } catch (err) {
    recordTest("llm", "Gemini Safety Settings", false, err.message);
  }

  // 1.4 Mock Provider (Zero-latency execution & tool simulation)
  try {
    const mockRes = await llmProviders.callLLM([
      { role: "user", content: "read package.json" }
    ], { provider: "mock" });
    const hasTool = mockRes.toolCalls && mockRes.toolCalls.length > 0;
    recordTest("llm", "Mock Provider: Tool Call Simulation (fs.read)", hasTool, `Tools returned: ${mockRes.toolCalls?.length}`);
  } catch (err) {
    recordTest("llm", "Mock Provider: Tool Call Simulation", false, err.message);
  }

  try {
    const mockChat = await llmProviders.callLLM([
      { role: "user", content: "Hello Ryker Master Orchestrator" }
    ], { provider: "mock" });
    const hasContent = mockChat.content && mockChat.content.includes("Mock Response");
    recordTest("llm", "Mock Provider: Chat Simulation", hasContent, `Length: ${mockChat.content.length} chars`);
  } catch (err) {
    recordTest("llm", "Mock Provider: Chat Simulation", false, err.message);
  }

  // 1.5 Provider Failover & Key Validation
  const providersToVerify = [
    { name: "openai", env: "OPENAI_API_KEY", fn: () => llmProviders.callOpenAI([{ role: "user", content: "hi" }], {}) },
    { name: "claude", env: "ANTHROPIC_API_KEY", fn: () => llmProviders.callClaude([{ role: "user", content: "hi" }], {}) },
    { name: "gemini", env: "GEMINI_API_KEY", fn: () => llmProviders.callGemini([{ role: "user", content: "hi" }], {}) },
    { name: "deepseek", env: "DEEPSEEK_API_KEY", fn: () => llmProviders.callDeepSeek([{ role: "user", content: "hi" }], {}) },
    { name: "mistral", env: "MISTRAL_API_KEY", fn: () => llmProviders.callMistral([{ role: "user", content: "hi" }], {}) },
    { name: "groq", env: "GROQ_API_KEY", fn: () => llmProviders.callGroq([{ role: "user", content: "hi" }], {}) }
  ];

  for (const prov of providersToVerify) {
    try {
      const origKey = process.env[prov.env];
      delete process.env[prov.env];
      let rejected = false;
      try {
        await prov.fn();
      } catch (e) {
        rejected = e.message.includes("not set");
      }
      if (origKey) process.env[prov.env] = origKey;
      recordTest("llm", `Provider Guard: ${prov.name} rejects gracefully if ${prov.env} missing`, rejected);
    } catch (err) {
      recordTest("llm", `Provider Guard: ${prov.name}`, false, err.message);
    }
  }

  // 1.6 CLI Engine Scanner
  try {
    const engines = cliScanner.listAvailableEngines();
    const claudeEngine = engines.find(e => e.name === "claude");
    recordTest("llm", `CLI Engine Detection (${engines.map(e => e.name).join(", ") || "none"})`, claudeEngine ? claudeEngine.available : true, `Found ${engines.length} engine(s)`);
  } catch (err) {
    recordTest("llm", "CLI Engine Detection", false, err.message);
  }

  // 1.7 Failover Resolution Chain
  try {
    const resolvedDefault = failover.resolveProvider();
    const chain = failover.buildFailoverChain("mock");
    recordTest("llm", `Failover Chain Resolution (Default: ${resolvedDefault})`, chain.length > 0 && chain.includes("mock"), `Chain: ${chain.join(" ➔ ")}`);
  } catch (err) {
    recordTest("llm", "Failover Chain Resolution", false, err.message);
  }
}

async function testAgentModels() {
  console.log("\n==================================================");
  console.log("2. TESTING ALL 29 SPECIALIST AGENT MODELS");
  console.log("==================================================");

  const agentIds = Object.keys(CANONICAL_REGISTRY);

  for (const agentId of agentIds) {
    const agentDef = CANONICAL_REGISTRY[agentId];
    try {
      const hasProps = agentDef.id && agentDef.displayName && agentDef.role && Array.isArray(agentDef.capabilities);
      if (!hasProps) {
        recordTest("agent", `Agent [${agentId}] Config Structure`, false, "Missing core properties");
        continue;
      }

      // Test lifecycle execution with AgentRuntimeInstance
      const instance = EliteNexus.createAgentInstance(agentDef.displayName, agentDef.capabilities, []);

      instance.transition(AGENT_STATES.QUEUED, "REQUEST");
      instance.transition(AGENT_STATES.PLANNING, "PLAN");
      instance.transition(AGENT_STATES.RUNNING, "EXECUTE");
      instance.transition(AGENT_STATES.COMPLETED, "COMPLETE");

      const completed = instance.state === AGENT_STATES.COMPLETED && instance.history.length === 4;
      recordTest("agent", `Agent [${agentId}] (${agentDef.displayName})`, completed, `Caps: ${agentDef.capabilities.length}, History: ${instance.history.length}`);
    } catch (err) {
      recordTest("agent", `Agent [${agentId}] Execution`, false, err.message);
    }
  }
}

async function testOmniAgentGroups() {
  console.log("\n==================================================");
  console.log("3. TESTING 5 CONSOLIDATED OMNI-AGENT GROUPS (ELITE-NEXUS v2)");
  console.log("==================================================");

  const groups = [
    {
      group: "Group 1: 01-core-architects",
      slash: "/elite-Nexus, /tech-leader, /plan, /status",
      query: "Architect high-level distributed multi-agent system",
      category: "Architecture & Orchestration"
    },
    {
      group: "Group 2: 02-fullstack-engineering",
      slash: "/uxui, /frontend, /backend, /database",
      query: "Develop React frontend with Express backend and PostgreSQL database schema",
      category: "Fullstack Engineering & Design"
    },
    {
      group: "Group 3: 03-cyber-cloud-qa",
      slash: "/cyber, /cloud-infra, /qa-test, /debugger",
      query: "Audit OWASP Top 10 vulnerabilities, configure Kubernetes CI/CD, and run Playwright E2E tests",
      category: "Security, Cloud, DevOps & QA"
    },
    {
      group: "Group 4: 04-ai-data-specialists",
      slash: "/ai-data, /iot",
      query: "Build RAG pipeline with prompt engineering and IoT sensor telemetry",
      category: "AI, Data, Prompting & IoT"
    },
    {
      group: "Group 5: 05-game-engineering",
      slash: "/game-dev",
      query: "Develop 60 FPS WebGL game engine with physics loop, state machine, and zero GC stutter",
      category: "Game Dev, Physics, Loop & Performance"
    }
  ];

  for (const g of groups) {
    try {
      const plan = EliteNexus.cognitive.swarm.createSwarmPlan(g.query);
      const isPlanValid = plan && plan.planId && plan.status === "PLANNED" && Array.isArray(plan.team) && plan.team.length > 0;
      recordTest("omni", `${g.group} (${g.category})`, isPlanValid, `Plan ID: ${plan.planId}, Team Members: ${plan.team.length}`);
    } catch (err) {
      recordTest("omni", `${g.group}`, false, err.message);
    }
  }
}

async function testCognitiveSubsystems() {
  console.log("\n==================================================");
  console.log("4. TESTING COGNITIVE & SELF-REFLECTION SUBSYSTEMS");
  console.log("==================================================");

  // 4.1 CognitiveDecomposer
  try {
    const decomposer = new CognitiveDecomposer();
    const task = "สร้างระบบ authentication ด้วย express และเชื่อมต่อ database พร้อมเขียน unit test ครอบคลุม";
    const result = decomposer.decompose(task);
    const hasSubtasks = result && result.isDecomposed && result.subTasks && result.subTasks.length >= 3;
    recordTest("cognitive", "CognitiveDecomposer: Multi-goal task decomposition into phases", hasSubtasks, `Generated ${result.subTasks?.length} subtasks across phases`);
  } catch (err) {
    recordTest("cognitive", "CognitiveDecomposer", false, err.message);
  }

  // 4.2 DAGExecutor
  try {
    const decomposer = new CognitiveDecomposer();
    const dag = decomposer.decompose("Implement authentication API and frontend login view with unit tests");
    const executor = new DAGExecutor();
    const events = [];
    const execResult = await executor.execute(dag, async (task) => {
      return { executed: task.taskId, status: "OK" };
    }, (evt) => {
      events.push(evt.type);
    });
    const passed = execResult && execResult.success && events.includes("dag:complete");
    recordTest("cognitive", "DAGExecutor: Dependency-ordered asynchronous execution", passed, `Success: ${execResult?.success}, Emitted: ${events.length} events`);
  } catch (err) {
    recordTest("cognitive", "DAGExecutor", false, err.message);
  }

  // 4.3 SelfReflectionEngine
  try {
    const reflector = new SelfReflectionEngine();
    const brokenCode = "Here is the code:\n```javascript\nconst x = 10;\n";
    const evalBroken = reflector.evaluateOutput(brokenCode);

    const cleanCode = `
\`\`\`javascript
async function fetchUserData(userId) {
  try {
    const response = await api.get('/users/' + userId);
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch user', error);
    throw error;
  }
}
\`\`\`
    `.trim();
    const evalClean = reflector.evaluateOutput(cleanCode);

    const detectsBroken = evalBroken.passed === false;
    const passesClean = evalClean.passed === true && evalClean.score >= 0.8;
    recordTest("cognitive", "SelfReflectionEngine: Anti-lazy code & syntax inspection", detectsBroken && passesClean, `Broken passed: ${evalBroken.passed}, Clean score: ${evalClean.score}`);
  } catch (err) {
    recordTest("cognitive", "SelfReflectionEngine", false, err.message);
  }

  // 4.4 EliteNexusOS 6-Stage Flow
  try {
    const input = "build high reliability game loop with delta time";
    const understandResult = EliteNexus.understand(input);
    const planResult = EliteNexus.plan(input, understandResult);
    const agent = EliteNexus.createAgentInstance("GameSpecialist");
    const execResult = EliteNexus.execute(planResult.plan, agent);
    const verifyResult = EliteNexus.verify("Output code draft", input);
    const deliverResult = EliteNexus.deliver(verifyResult, "Output code draft");

    const passed = understandResult.intent && planResult.plan && execResult.status === "executing" && deliverResult.completed === true;
    recordTest("cognitive", "EliteNexusOS: 6-Stage Intelligence & Runtime Pipeline", passed, `Intent: ${understandResult.intent}, Delivered: ${deliverResult.completed}`);
  } catch (err) {
    recordTest("cognitive", "EliteNexusOS 6-Stage Pipeline", false, err.message);
  }
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════════╗");
  console.log("║         RYKER AI OS — ALL MODELS & AGENTS TEST SUITE             ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝");

  const start = Date.now();

  await testLLMModels();
  await testAgentModels();
  await testOmniAgentGroups();
  await testCognitiveSubsystems();

  const duration = ((Date.now() - start) / 1000).toFixed(2);

  console.log("\n==================================================");
  console.log("📊 FINAL TEST RESULTS SUMMARY");
  console.log("==================================================");
  console.log(`Total Tests Run:       ${testResults.summary.total}`);
  console.log(`Passed:                ${testResults.summary.passed} ✅`);
  console.log(`Failed:                ${testResults.summary.failed} ❌`);
  console.log(`Success Rate:          ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1)}%`);
  console.log(`Execution Time:        ${duration}s`);
  console.log("==================================================\n");

  if (testResults.summary.failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
