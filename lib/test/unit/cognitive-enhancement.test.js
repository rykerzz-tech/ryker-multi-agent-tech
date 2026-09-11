/**
 * Unit tests for Cognitive Decomposition, Self-Reflection Engine, and Swarm Orchestration
 */

const assert = require("assert");
const {
  EliteNexus,
  CognitiveDecomposer,
  SelfReflectionEngine,
  SwarmOrchestrator
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
  console.log("\n🧪 Cognitive Enhancement & Self-Reflection Unit Tests\n");

  await test("CognitiveDecomposer splits multi-goal tasks into structured sub-tasks", () => {
    const decomposer = new CognitiveDecomposer();
    const prompt = "สร้างระบบ authentication ด้วย express และเชื่อมต่อ database พร้อมเขียน unit test ครอบคลุม";
    const result = decomposer.decompose(prompt);

    assert.ok(result.taskId.startsWith("plan-"));
    assert.strictEqual(result.isDecomposed, true);
    assert.ok(result.subTasks.length >= 3);
    assert.strictEqual(result.subTasks[0].phase, "ANALYSIS");
    assert.ok(result.subTasks.some(t => t.phase === "DATA_LAYER" || t.phase === "IMPLEMENTATION"));
    assert.ok(result.subTasks.some(t => t.phase === "VERIFICATION"));
  });

  await test("SelfReflectionEngine detects unclosed code fences and lazy placeholders", () => {
    const reflector = new SelfReflectionEngine();

    // Incomplete code fence
    const brokenCode = "Here is the code:\n```javascript\nconst x = 10;\n";
    const evalBroken = reflector.evaluateOutput(brokenCode);
    assert.strictEqual(evalBroken.passed, false);
    assert.ok(evalBroken.critiques.some(c => c.includes("Unclosed code fence")));

    // Lazy placeholder
    const lazyCode = "```javascript\nfunction solve() {\n  // ... rest of the implementation\n}\n```";
    const evalLazy = reflector.evaluateOutput(lazyCode);
    assert.ok(evalLazy.critiques.some(c => c.includes("Lazy placeholder")));
  });

  await test("SelfReflectionEngine passes clean production code with high quality score", () => {
    const reflector = new SelfReflectionEngine();
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
    assert.strictEqual(evalClean.passed, true);
    assert.ok(evalClean.score >= 0.8);
    assert.strictEqual(evalClean.critiques.length, 0);
  });

  await test("SwarmOrchestrator generates comprehensive multi-agent collaborative plan", () => {
    const swarm = new SwarmOrchestrator();
    const plan = swarm.createSwarmPlan("Migrate fullstack app from REST to GraphQL with PostgreSQL schema");

    assert.ok(plan.planId.startsWith("plan-"));
    assert.strictEqual(plan.status, "PLANNED");
    assert.strictEqual(plan.team.length, 4);
    assert.ok(plan.team.some(t => t.role === "Architect"));
    assert.ok(plan.team.some(t => t.role === "Specialist"));
    assert.ok(plan.team.some(t => t.role === "Reviewer"));
    assert.ok(plan.team.some(t => t.role === "Verifier"));
  });

  await test("EliteNexusOS exposes cognitive subsystems on global instance", () => {
    assert.ok(EliteNexus.cognitive);
    assert.ok(EliteNexus.cognitive.decomposer instanceof CognitiveDecomposer);
    assert.ok(EliteNexus.cognitive.reflectionEngine instanceof SelfReflectionEngine);
    assert.ok(EliteNexus.cognitive.swarm instanceof SwarmOrchestrator);
  });

  console.log(`\n  Results: ${passed} passed, ${failed} failed, ${passed + failed} total\n`);
  if (failed > 0) process.exit(1);
}

runAll();
