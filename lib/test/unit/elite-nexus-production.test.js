/**
 * Unit tests for Elite-Nexus Production Modules — State Machine, Tool Runtime, Debugging, Confidence Engine
 */

const assert = require("assert");
const {
  EliteNexus,
  AgentRuntimeInstance,
  AGENT_STATES,
  TOOL_RISK_LEVELS
} = require("../../core/elite-nexus");

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
    failed++;
  }
}

async function runAll() {
  console.log("\n🧪 Elite-Nexus Production Engine Unit Tests\n");

  await test("AgentRuntimeInstance transitions states and records history", () => {
    const agent = EliteNexus.createAgentInstance("TestAgent", ["Code"], ["fs"]);
    assert.strictEqual(agent.state, AGENT_STATES.CREATED);
    
    agent.transition(AGENT_STATES.QUEUED, "REQUEST");
    agent.transition(AGENT_STATES.PLANNING, "PLAN");
    agent.transition(AGENT_STATES.RUNNING, "EXECUTE");
    agent.transition(AGENT_STATES.COMPLETED, "COMPLETE");

    assert.strictEqual(agent.state, AGENT_STATES.COMPLETED);
    assert.strictEqual(agent.history.length, 4);
    assert.strictEqual(agent.history[0].to, AGENT_STATES.QUEUED);
  });

  await test("UnifiedToolRuntime executes tools and tracks audit log", async () => {
    const runtime = EliteNexus.toolRuntime;
    runtime.registerTool("echoTool", "general", TOOL_RISK_LEVELS.LOW, {}, async (args) => args.msg);
    
    const result = await runtime.executeTool("echoTool", { msg: "hello nexus" });
    assert.strictEqual(result, "hello nexus");
    
    const logs = runtime.getAuditLog();
    assert.ok(logs.length > 0);
    assert.strictEqual(logs[logs.length - 1].tool, "echoTool");
  });

  await test("UnifiedToolRuntime blocks CRITICAL risk tools without approval", async () => {
    const runtime = EliteNexus.toolRuntime;
    runtime.registerTool("dangerousTool", "system", TOOL_RISK_LEVELS.CRITICAL, {}, async () => "done");

    await assert.rejects(
      async () => await runtime.executeTool("dangerousTool", {}, { approved: false }),
      /Execution blocked: Tool "dangerousTool" requires explicit permission confirmation/
    );
  });

  await test("RepositoryAnalyzer detects package environment", () => {
    const res = EliteNexus.repoAnalyzer.analyze(process.cwd());
    assert.ok(res.language);
    assert.ok(res.buildSystem);
  });

  await test("RealDebuggingLoop tracks hypothesis status", () => {
    const loop = EliteNexus.debuggingLoop;
    const hyp = loop.createHypothesis("ReferenceError: x is not defined", "server.js");
    assert.strictEqual(hyp.status, "UNTESTED");

    loop.recordResult(hyp.id, true, "Fix verified");
    assert.strictEqual(hyp.status, "PASSED");
  });

  await test("ConfidenceRiskEngine calculates score and risk", () => {
    const res = EliteNexus.confidenceRisk.evaluate("function test() { return 1; }", "write function");
    assert.ok(res.confidenceScore >= 70);
    assert.strictEqual(res.riskLevel, "LOW");
  });

  await test("DynamicAgentRouter returns specialist capabilities", () => {
    const res = EliteNexus.router.agentRouter.route("audit authentication security", { categories: ["security"] });
    assert.strictEqual(res.primarySpecialist, "SecuritySpecialist");
    assert.ok(res.capabilities.includes("Auth"));
  });

  await test("SessionWorkspaceManager creates active session", () => {
    const sess = EliteNexus.sessionWorkspace.createSession("proj-1");
    assert.ok(sess.id.startsWith("sess-"));
    assert.strictEqual(sess.status, "ACTIVE");
  });

  console.log(`\n  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runAll();
}

module.exports = { runAll };
