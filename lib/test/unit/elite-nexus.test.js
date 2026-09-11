/**
 * Unit tests for Elite-Nexus OS Modules
 */

const assert = require("assert");
const { EliteNexus } = require("../../core/elite-nexus");

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
  console.log("\n🧪 Elite-Nexus Operating System Unit Tests\n");

  await test("IntentAnalyzer should identify code intent", () => {
    const res = EliteNexus.analyzers.intent.analyze("Please write a JS function to filter arrays.");
    assert.strictEqual(res.primaryIntent, "code_development");
  });

  await test("ComplexityAnalyzer should assign correct score", () => {
    const resShort = EliteNexus.analyzers.complexity.analyze("hello");
    const resLong = EliteNexus.analyzers.complexity.analyze("hello ".repeat(120));
    assert.strictEqual(resShort.level, "LOW");
    assert.strictEqual(resLong.level, "HIGH");
  });

  await test("PriorityAnalyzer detects urgent flag", () => {
    const res = EliteNexus.analyzers.priority.analyze("CRITICAL bug on prod server");
    assert.strictEqual(res.priority, "HIGH");
  });

  await test("GoalExtractor extracts main sentence", () => {
    const res = EliteNexus.analyzers.goals.extract("We want to build a secure API. Ensure high performance.");
    assert.ok(res.goals.length > 0);
  });

  await test("DependencyGraph sorts nodes properly", () => {
    const res = EliteNexus.planners.execPlanner.buildSchedule({
      planId: "test",
      steps: [
        { id: "stepC", dep: ["stepB"] },
        { id: "stepA", dep: [] },
        { id: "stepB", dep: ["stepA"] }
      ]
    });
    assert.deepStrictEqual(res.executionOrder, ["stepA", "stepB", "stepC"]);
  });

  await test("Reviewer rejects generic assistant filler", () => {
    const rules = [{ pattern: /I'd be happy to help/i, message: "Filler" }];
    const res = EliteNexus.reflection.reviewer.review("I'd be happy to help you with that.", rules);
    assert.strictEqual(res.approved, false);
    assert.strictEqual(res.issues[0], "Filler");
  });

  await test("Central Hub coordinates orchestration", () => {
    const res = EliteNexus.analyzeAndSchedule("Build a backend express api.");
    assert.ok(res.analyzationResults);
    assert.ok(res.plan);
    assert.ok(res.schedule);
  });

  await test("Canonical Registry contains required fields for each agent", () => {
    const { listAgents } = require("../../core/agent-registry");
    const agents = listAgents();
    assert.ok(agents.length > 0);
    agents.forEach(agent => {
      assert.ok(agent.id);
      assert.ok(agent.displayName);
      assert.ok(agent.role);
      assert.ok(Array.isArray(agent.responsibilities));
      assert.ok(Array.isArray(agent.capabilities));
      assert.ok(Array.isArray(agent.boundaries));
      assert.ok(Array.isArray(agent.allowedTasks));
      assert.ok(Array.isArray(agent.excludedTasks));
    });
  });

  await test("Boundary routing rules enforce task boundaries and route to alternative", () => {
    const res = EliteNexus.router.agentRouter.route("Setup LLM Infrastructure for training", { categories: ["prompt"] });
    assert.strictEqual(res.primarySpecialist, "AiMlSpecialist");
  });

  await test("Orchestrator reports no dedicated specialist available for unsupported tasks", () => {
    const resNoSpec = EliteNexus.router.agentRouter.route("Model Training with UI Design", { categories: ["prompt"] });
    assert.ok(resNoSpec.explanation.includes("No dedicated specialist available"));
  });

  await test("Cross-platform Python executable is resolved dynamically", () => {
    const utils = require("../../utils");
    const exe = utils.getPythonExecutable();
    assert.ok(exe === "python3" || exe === "python" || exe === "py");
  });

  await test("CLI binary entry point exists and is valid", () => {
    const path = require("path");
    const fs = require("fs");
    const pkg = require("../../../package.json");
    const entryPoint = pkg.bin["ryker-multi-agent-tech"];
    assert.ok(entryPoint);
    const absPath = path.resolve(__dirname, "../../../", entryPoint);
    assert.ok(fs.existsSync(absPath));
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
