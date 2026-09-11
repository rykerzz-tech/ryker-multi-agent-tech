/**
 * Unit tests for Universal LLM Providers & Failover Chain (Gemini, DeepSeek, Mistral, OpenAI, Claude)
 */

const assert = require("assert");
const failover = require("../../core/failover");
const llmProviders = require("../../core/llm-providers");

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
  console.log("\n🧪 Universal LLM Providers & Failover Unit Tests\n");

  await test("llmProviders.callLLM throws when provider missing", async () => {
    await assert.rejects(
      () => llmProviders.callLLM([{ role: "user", content: "hi" }]),
      /options\.provider is required/
    );
  });

  await test("llmProviders.callLLM rejects unknown provider with full list", async () => {
    await assert.rejects(
      () => llmProviders.callLLM([{ role: "user", content: "hi" }], { provider: "unsupported-llm" }),
      /Available: openai, claude, gemini, deepseek, mistral/
    );
  });

  await test("llmProviders.callGemini rejects when GEMINI_API_KEY is not set", async () => {
    const origKey1 = process.env.GEMINI_API_KEY;
    const origKey2 = process.env.GOOGLE_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    try {
      await assert.rejects(
        () => llmProviders.callGemini([{ role: "user", content: "hi" }]),
        /GEMINI_API_KEY or GOOGLE_API_KEY not set/
      );
    } finally {
      if (origKey1) process.env.GEMINI_API_KEY = origKey1;
      if (origKey2) process.env.GOOGLE_API_KEY = origKey2;
    }
  });

  await test("llmProviders.callDeepSeek rejects when DEEPSEEK_API_KEY is not set", async () => {
    const orig = process.env.DEEPSEEK_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    try {
      await assert.rejects(
        () => llmProviders.callDeepSeek([{ role: "user", content: "hi" }]),
        /DEEPSEEK_API_KEY not set/
      );
    } finally {
      if (orig) process.env.DEEPSEEK_API_KEY = orig;
    }
  });

  await test("llmProviders.callMistral rejects when MISTRAL_API_KEY is not set", async () => {
    const orig = process.env.MISTRAL_API_KEY;
    delete process.env.MISTRAL_API_KEY;
    try {
      await assert.rejects(
        () => llmProviders.callMistral([{ role: "user", content: "hi" }]),
        /MISTRAL_API_KEY not set/
      );
    } finally {
      if (orig) process.env.MISTRAL_API_KEY = orig;
    }
  });

  await test("failover.resolveProvider discovers Gemini, DeepSeek, and Mistral keys", () => {
    const saved = { ...process.env };
    delete process.env.LLM_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.MISTRAL_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.OLLAMA_HOST;

    assert.strictEqual(failover.resolveProvider(), "mock");

    process.env.GEMINI_API_KEY = "test-gemini-key";
    assert.strictEqual(failover.resolveProvider(), "gemini");
    delete process.env.GEMINI_API_KEY;

    process.env.DEEPSEEK_API_KEY = "test-deepseek-key";
    assert.strictEqual(failover.resolveProvider(), "deepseek");
    delete process.env.DEEPSEEK_API_KEY;

    process.env.MISTRAL_API_KEY = "test-mistral-key";
    assert.strictEqual(failover.resolveProvider(), "mistral");

    // Restore
    for (const k in process.env) delete process.env[k];
    Object.assign(process.env, saved);
  });

  await test("failover.buildFailoverChain includes available universal providers", () => {
    const saved = { ...process.env };
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.OLLAMA_HOST;

    process.env.GEMINI_API_KEY = "test-gemini";
    process.env.DEEPSEEK_API_KEY = "test-deepseek";
    process.env.MISTRAL_API_KEY = "test-mistral";

    const chain = failover.buildFailoverChain("gemini");
    assert.ok(chain.includes("gemini"));
    assert.ok(chain.includes("deepseek"));
    assert.ok(chain.includes("mistral"));
    assert.ok(chain.includes("mock"));
    assert.strictEqual(chain[0], "gemini");

    // Restore
    for (const k in process.env) delete process.env[k];
    Object.assign(process.env, saved);
  });

  console.log(`\n  Results: ${passed} passed, ${failed} failed, ${passed + failed} total\n`);
  if (failed > 0) process.exit(1);
}

runAll();
