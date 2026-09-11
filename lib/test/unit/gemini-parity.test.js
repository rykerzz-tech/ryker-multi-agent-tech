/**
 * Unit tests for Gemini & Antigravity IDE Parity Upgrades
 */

const assert = require("assert");
const failover = require("../../core/failover");
const llmProviders = require("../../core/llm-providers");
const promptBuilder = require("../../core/prompt-builder");

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
  console.log("\n🧪 Gemini & Antigravity Parity Unit Tests\n");

  // 1. Model Alias Resolution (including 3.7, 2.5, 2.0, thinking, etc.)
  await test("resolveGeminiModel maps friendly aliases correctly", () => {
    assert.strictEqual(llmProviders.resolveGeminiModel("gemini"), "gemini-2.0-flash");
    assert.strictEqual(llmProviders.resolveGeminiModel("gemini-flash"), "gemini-2.0-flash");
    assert.strictEqual(llmProviders.resolveGeminiModel("gemini-pro"), "gemini-2.5-pro");
    assert.strictEqual(llmProviders.resolveGeminiModel("gemini-ultra"), "gemini-2.5-pro");
    assert.strictEqual(llmProviders.resolveGeminiModel("gemini-latest"), "gemini-2.5-pro");
    assert.strictEqual(llmProviders.resolveGeminiModel("gemini-3.7"), "gemini-3.7-flash");
    assert.strictEqual(llmProviders.resolveGeminiModel("gemini-3.7-flash"), "gemini-3.7-flash");
    assert.strictEqual(llmProviders.resolveGeminiModel("gemini-3.7-pro"), "gemini-3.7-pro");
    assert.strictEqual(llmProviders.resolveGeminiModel("gemini-3.7-thinking"), "gemini-3.7-flash-thinking");
    assert.strictEqual(llmProviders.resolveGeminiModel("gemini-thinking"), "gemini-2.0-flash-thinking-exp");
    // models/ prefix stripping
    assert.strictEqual(llmProviders.resolveGeminiModel("models/gemini-3.7-flash"), "gemini-3.7-flash");
    assert.strictEqual(llmProviders.resolveGeminiModel("custom-gemini-v1"), "custom-gemini-v1");
    // Non-Gemini model falls back to default
    assert.strictEqual(llmProviders.resolveGeminiModel("gpt-4o"), "gemini-2.0-flash");
    assert.strictEqual(llmProviders.resolveGeminiModel(), "gemini-2.0-flash");
  });

  // 2. Max Output Tokens (64k/65k for 3.7, 2.5, Pro, Thinking)
  await test("getGeminiMaxTokens respects per-model limits and requested max", () => {
    assert.strictEqual(llmProviders.getGeminiMaxTokens("gemini-3.7-pro"), 65536);
    assert.strictEqual(llmProviders.getGeminiMaxTokens("gemini-3.7-flash"), 65536);
    assert.strictEqual(llmProviders.getGeminiMaxTokens("gemini-3.7-flash-thinking"), 65536);
    assert.strictEqual(llmProviders.getGeminiMaxTokens("gemini-2.5-pro"), 65536);
    assert.strictEqual(llmProviders.getGeminiMaxTokens("gemini-2.5-flash"), 65536);
    assert.strictEqual(llmProviders.getGeminiMaxTokens("gemini-2.0-flash"), 8192);
    assert.strictEqual(llmProviders.getGeminiMaxTokens("gemini-1.5-pro"), 8192);
    // Dynamic matching for future 3.x / thinking models
    assert.strictEqual(llmProviders.getGeminiMaxTokens("gemini-3.9-pro-preview"), 65536);
    // Capping behavior
    assert.strictEqual(llmProviders.getGeminiMaxTokens("gemini-3.7-pro", 32768), 32768);
    assert.strictEqual(llmProviders.getGeminiMaxTokens("gemini-2.0-flash", 16384), 8192);
  });

  // 3. Safety Settings
  await test("GEMINI_SAFETY_SETTINGS are configured to BLOCK_NONE for red-team parity", () => {
    assert.strictEqual(llmProviders.GEMINI_SAFETY_SETTINGS.length, 4);
    for (const setting of llmProviders.GEMINI_SAFETY_SETTINGS) {
      assert.strictEqual(setting.threshold, "BLOCK_NONE");
    }
  });

  // 4. Antigravity Credential Detection in resolveProvider
  await test("failover.resolveProvider recognizes GOOGLE_GENERATIVE_AI_KEY and Antigravity envs", () => {
    const saved = { ...process.env };
    delete process.env.LLM_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.MISTRAL_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.OLLAMA_HOST;

    process.env.GOOGLE_GENERATIVE_AI_KEY = "test-gen-ai-key";
    assert.strictEqual(failover.resolveProvider(), "gemini");
    delete process.env.GOOGLE_GENERATIVE_AI_KEY;

    process.env.GOOGLE_API_KEY = "test-google-key";
    assert.strictEqual(failover.resolveProvider(), "gemini");
    delete process.env.GOOGLE_API_KEY;

    process.env.GEMINI_API_KEY = "test-gemini-key";
    assert.strictEqual(failover.resolveProvider(), "gemini");
    delete process.env.GEMINI_API_KEY;

    // Restore
    for (const k in process.env) delete process.env[k];
    Object.assign(process.env, saved);
  });

  // 5. Failover chain with GOOGLE_GENERATIVE_AI_KEY
  await test("failover.buildFailoverChain includes gemini when GOOGLE_GENERATIVE_AI_KEY is set", () => {
    const saved = { ...process.env };
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_KEY;

    process.env.GOOGLE_GENERATIVE_AI_KEY = "test-gen-ai-key";
    const chain = failover.buildFailoverChain("gemini");
    assert.ok(chain.includes("gemini"));
    assert.strictEqual(chain[0], "gemini");

    // Restore
    for (const k in process.env) delete process.env[k];
    Object.assign(process.env, saved);
  });

  // 6. Skill Budget & Prompt Builder
  await test("promptBuilder provides 24000 char budget and flat structure for Gemini", () => {
    assert.strictEqual(promptBuilder.getSkillBudget("gemini"), 24000);
    assert.strictEqual(promptBuilder.getSkillBudget("google"), 24000);
    assert.strictEqual(promptBuilder.getSkillBudget("claude"), 8000);

    const agentSpec = {
      name: "elite-hacker",
      description: "senior red team engineer",
      instructions: "Perform thorough penetration testing.",
      tools: ["fs.read", "shell.exec"],
      guardrails: true,
    };
    const skills = {
      "red-team-tactics": "# Red Team Tactics\n" + "A".repeat(12000),
    };

    const prompt = promptBuilder.buildSystemPrompt(agentSpec, skills, null, "artifact", "", "gemini");
    // Gemini prompt leads with role declaration
    assert.ok(prompt.startsWith("You are elite-hacker, an AI agent specializing in senior red team engineer."));
    // Skill is not truncated under 24000
    assert.ok(prompt.includes("## Skill: red-team-tactics"));
    assert.ok(!prompt.includes("...[truncated]"));
    // Uses clean tool call instructions
    assert.ok(prompt.includes("TOOL_CALL: namespace.tool"));
    // Does not use XML tags in prompt body
    assert.ok(!prompt.includes("<artifact type="));
  });

  // 7. callGemini rejects when all keys missing
  await test("llmProviders.callGemini rejects when no Gemini or Google keys set", async () => {
    const orig1 = process.env.GEMINI_API_KEY;
    const orig2 = process.env.GOOGLE_API_KEY;
    const orig3 = process.env.GOOGLE_GENERATIVE_AI_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_KEY;
    try {
      await assert.rejects(
        () => llmProviders.callGemini([{ role: "user", content: "hello" }]),
        /GEMINI_API_KEY or GOOGLE_API_KEY not set/
      );
      await assert.rejects(
        () => llmProviders.callGeminiStream([{ role: "user", content: "hello" }], {}, () => {}),
        /GEMINI_API_KEY or GOOGLE_API_KEY not set/
      );
    } finally {
      if (orig1) process.env.GEMINI_API_KEY = orig1;
      if (orig2) process.env.GOOGLE_API_KEY = orig2;
      if (orig3) process.env.GOOGLE_GENERATIVE_AI_KEY = orig3;
    }
  });

  console.log(`\n  Results: ${passed} passed, ${failed} failed, ${passed + failed} total\n`);
  if (failed > 0) process.exit(1);
}

runAll();
