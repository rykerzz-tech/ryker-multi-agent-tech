/**
 * Unit tests for Elite-Nexus Hardened Core Modules
 */

const assert = require("assert");
const { EliteNexus, AgentRuntimeInstance } = require("../../core/elite-nexus");
const { checkQuality } = require("../../core/quality-gate");

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
  console.log("\n🧪 Elite-Nexus Evolution & Hardening Unit Tests\n");

  await test("AgentRuntimeInstance tracks execution trace events", () => {
    const agent = EliteNexus.createAgentInstance("TestSpecialist");
    assert.strictEqual(agent.events.length, 0);

    agent.transition("QUEUED", "REQUEST");
    assert.strictEqual(agent.events.length, 1);
    assert.strictEqual(agent.events[0].stage, "STATE_TRANSITION");
    assert.strictEqual(agent.events[0].status, "QUEUED");

    agent.addEvent("TOOL_EXECUTION", "STARTED", { tool: "fs.read", target: "index.js" });
    assert.strictEqual(agent.events.length, 2);
    assert.strictEqual(agent.events[1].stage, "TOOL_EXECUTION");
    assert.strictEqual(agent.events[1].status, "STARTED");
    assert.strictEqual(agent.events[1].tool, "fs.read");
  });

  await test("DynamicAgentRouter executes single-agent and multi-agent routing decisions", () => {
    // Single-agent routing
    const resSingle = EliteNexus.router.agentRouter.route("Fix styling", { categories: ["frontend"] }, "LOW");
    assert.strictEqual(resSingle.routingMode, "SINGLE-AGENT MODE");
    assert.strictEqual(resSingle.primarySpecialist, "FrontendSpecialist");
    assert.strictEqual(resSingle.tasks.length, 0);

    // Multi-agent routing (HIGH complexity or multiple domains)
    const resMulti = EliteNexus.router.agentRouter.route("Build express server with tests and check security config", { categories: ["backend", "testing", "security"] }, "HIGH");
    assert.strictEqual(resMulti.routingMode, "MULTI-AGENT MODE");
    assert.ok(resMulti.tasks.length > 0);
    assert.strictEqual(resMulti.tasks[0].id, "subtask-1");
    assert.ok(resMulti.explanation.includes("Multi-Agent coordination"));
  });

  await test("Quality Gate evaluates all 9 dimensions", () => {
    const output = "const key = process.env.API_KEY;";
    const options = {
      requirementChecked: true,
      requirementPassed: true,
      buildChecked: true,
      buildPassed: true,
      runtimeChecked: true,
      runtimePassed: true,
      riskLevel: "LOW"
    };

    const qResult = checkQuality(output, options);
    assert.strictEqual(qResult.pass, true);
    assert.strictEqual(qResult.status, "PASS");
    assert.strictEqual(qResult.gateMetrics.build, "PASS");
    assert.strictEqual(qResult.gateMetrics.runtime, "PASS");
    assert.strictEqual(qResult.gateMetrics.security, "PASS");
    assert.strictEqual(qResult.gateMetrics.codeHealth, "PASS");
  });

  await test("Quality Gate rejects security leaks or eval statements", () => {
    const badOutput1 = "const secret = 'mySuperSecretPassword123';";
    const qResult1 = checkQuality(badOutput1, { riskLevel: "LOW" });
    assert.strictEqual(qResult1.pass, false);
    assert.strictEqual(qResult1.gateMetrics.security, "FAIL");

    const badOutput2 = "eval('console.log(1)');";
    const qResult2 = checkQuality(badOutput2, { riskLevel: "LOW" });
    assert.strictEqual(qResult2.pass, false);
    assert.strictEqual(qResult2.gateMetrics.codeHealth, "FAIL");
  });

  await test("Failure Recovery Engine correctly classifies errors and avoids repeating strategies", () => {
    const verifyResult = {
      status: "FAIL",
      reviewerResult: { approved: false, issues: ["Avoid eval()."] }
    };
    const failuresHistory = [];

    const recovery1 = EliteNexus.recover(verifyResult, 1, failuresHistory);
    assert.strictEqual(recovery1.shouldRetry, true);
    assert.strictEqual(recovery1.recoveryRecord.attempt, 1);
    assert.strictEqual(recovery1.recoveryRecord.classification, "security_violation");
    assert.ok(recovery1.nextStrategy.includes("Refactor code to use robust JSON parsing"));

    // Repeated error should yield alternative strategy escalation
    const recovery2 = EliteNexus.recover(verifyResult, 2, failuresHistory);
    assert.strictEqual(recovery2.shouldRetry, true);
    assert.ok(recovery2.nextStrategy.includes("Escalate to generalist reasoning"));
  });

  await test("Reporting Generator creates concise NORMAL output and verbose DEBUG output", () => {
    const mockState = {
      input: "Build visual layout",
      status: "completed",
      agentInstance: {
        role: "FrontendSpecialist",
        events: [
          { stage: "TOOL_EXECUTION", status: "STARTED", tool: "fs.write", target: "style.css", timestamp: Date.now() },
          { stage: "TOOL_EXECUTION", status: "COMPLETED", tool: "fs.write", timestamp: Date.now() }
        ]
      },
      steps: [
        {
          toolCalls: [
            { tool: "fs.write", args: { TargetFile: "style.css" }, result: "wrote file" },
            { tool: "run_command", args: { CommandLine: "npm run build" }, result: "build success" }
          ]
        }
      ]
    };

    const reportNormal = EliteNexus.generateReport(mockState, "NORMAL");
    assert.ok(reportNormal.includes("✅ COMPLETED"));
    assert.ok(reportNormal.includes("📁 CHANGED"));
    assert.ok(reportNormal.includes("- style.css"));
    assert.ok(reportNormal.includes("Build: PASS"));

    const reportDebug = EliteNexus.generateReport(mockState, "DEBUG");
    assert.ok(reportDebug.includes("🐞 DEBUG - FULL EXECUTION TRACE"));
    assert.ok(reportDebug.includes("TOOL_EXECUTION"));
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
