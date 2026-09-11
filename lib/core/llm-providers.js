/**
 * LLM Providers — OpenAI, Claude, Groq, Ollama, Mock
 * Separated from agent-runtime.js for maintainability
 */

const https = require("https");
const http = require("http");

// Keep-alive agents — reuse TCP connections across LLM calls to reduce latency
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 10, timeout: 60000 });
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 10, timeout: 60000 });

const MAX_RETRIES = 3;
const RETRYABLE_ERRORS = [/\b429\b/, /\b503\b/, /\brate\s+limit\b/, /\boverloaded\b/, /\btimeout\b/, /\bECONNRESET\b/, /\bETIMEDOUT\b/];

function isRetryableError(err) {
  const msg = (err.message || "");
  return RETRYABLE_ERRORS.some(pattern => pattern.test(msg));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// callLLM() requires provider to be passed explicitly (via failover chain).
// This avoids a circular dependency with failover.js.
async function callLLM(messages, options = {}) {
  const provider = options.provider;
  if (!provider) throw new Error("options.provider is required. Use failover.resolveProvider() or pass a provider explicitly.");
  const model = options.model || "gpt-4o-mini";
  const maxRetries = options.maxRetries ?? MAX_RETRIES;

  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      switch (provider) {
        case "openai":
          return await callOpenAI(messages, { ...options, model });
        case "claude":
          return await callClaude(messages, { ...options, model });
        case "gemini":
        case "google":
          return await callGemini(messages, { ...options, model });
        case "deepseek":
          return await callDeepSeek(messages, { ...options, model });
        case "mistral":
          return await callMistral(messages, { ...options, model });
        case "local":
          return await callOllama(messages, { ...options, model });
        case "groq":
          return await callGroq(messages, { ...options, model });
        case "mock":
          return await callMock(messages, options);
        default:
          if (provider.startsWith("cli:")) {
            const cliScanner = require("./cli-scanner");
            const engine = cliScanner.getEngine(provider.slice(4));
            if (!engine || !engine.available) {
              throw new Error(`CLI engine not available: "${provider}"`);
            }
            const adapterModule = `./cli-adapters/${engine.adapter}-adapter`;
            const adapter = require(adapterModule);
            return await adapter.call(engine, messages, options);
          }
          throw new Error(`Unknown LLM provider: "${provider}". Available: openai, claude, gemini, deepseek, mistral, local, groq, mock, cli:<name>`);
      }
    } catch (err) {
      lastError = err;
      const isLastAttempt = attempt >= maxRetries - 1;
      if (!isLastAttempt && isRetryableError(err)) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000) + Math.random() * 1000;
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

async function callOpenAI(messages, options) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set. Run: export OPENAI_API_KEY=sk-...");

  const body = JSON.stringify({
    model: options.model || "gpt-4",
    messages,
    max_tokens: options.maxTokens || 2048,
    temperature: options.temperature !== undefined ? options.temperature : 0.7,
  });

  const MAX_RESPONSE_SIZE = 1024 * 1024; // 1MB

  return new Promise((resolve, reject) => {
    const req = https.request("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      agent: httpsAgent,
      timeout: 60000,
    }, (res) => {
      let data = "";
      res.on("data", chunk => {
        data += chunk;
        if (data.length > MAX_RESPONSE_SIZE) {
          req.destroy();
          reject(new Error("LLM response too large"));
        }
      });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));
          resolve({
            content: parsed.choices?.[0]?.message?.content || "",
            usage: parsed.usage || {},
            toolCalls: parsed.choices?.[0]?.message?.tool_calls || [],
          });
        } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("LLM request timeout")); });
    req.write(body);
    req.end();
  });
}

async function callClaude(messages, options = {}) {
  const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const NON_CLAUDE_MODELS = new Set(["gpt-4", "gpt-4o", "gpt-3.5-turbo", "llama3", "mistral", "codellama"]);
  const resolvedModel = (options.model && !NON_CLAUDE_MODELS.has(options.model))
    ? options.model
    : (process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001");
  const bodyObj = {
    model: resolvedModel,
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature !== undefined ? options.temperature : 0.7,
    messages: messages.filter(m => m.role !== "system"),
  };

  // Add system prompt as top-level field — merge multiple system messages
  const systemMsgs = messages.filter(m => m.role === "system");
  if (systemMsgs.length > 0) {
    bodyObj.system = systemMsgs.map(m => m.content).join("\n\n");
  }

  // Claude tool use support
  if (options.tools && options.tools.length > 0) {
    bodyObj.tools = options.tools;
  }

  const body = JSON.stringify(bodyObj);

  const MAX_RESPONSE_SIZE = 1024 * 1024; // 1MB

  const baseUrl = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
  const url = new URL("/v1/messages", baseUrl);
  const transport = url.protocol === "http:" ? http : https;
  const agent = url.protocol === "http:" ? httpAgent : httpsAgent;

  return new Promise((resolve, reject) => {
    const req = transport.request(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      agent: agent,
      timeout: 60000,
    }, (res) => {
      let data = "";
      res.on("data", chunk => {
        data += chunk;
        if (data.length > MAX_RESPONSE_SIZE) {
          req.destroy();
          reject(new Error("LLM response too large"));
        }
      });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));

          // Extract tool calls from Claude's content blocks
          const toolCalls = [];
          let textContent = "";
          for (const block of (parsed.content || [])) {
            if (block.type === "text") {
              textContent += block.text;
            } else if (block.type === "tool_use") {
              toolCalls.push({
                id: block.id,
                function: { name: block.name, arguments: JSON.stringify(block.input || {}) },
              });
            }
          }

          resolve({
            content: textContent,
            usage: parsed.usage || {},
            toolCalls,
          });
        } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("LLM request timeout")); });
    req.write(body);
    req.end();
  });
}

const NON_GROQ_MODELS = new Set(["gpt-4", "gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo", "claude-haiku-4-5-20251001", "claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022", "llama3", "mistral", "codellama"]);

async function callGroq(messages, options) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set. Run: export GROQ_API_KEY=gsk_... (get free key at console.groq.com)");

  const resolvedModel = (options.model && !NON_GROQ_MODELS.has(options.model))
    ? options.model
    : (process.env.GROQ_MODEL || "llama-3.3-70b-versatile");

  const body = JSON.stringify({
    model: resolvedModel,
    messages,
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature !== undefined ? options.temperature : 0.7,
  });

  const MAX_RESPONSE_SIZE = 1024 * 1024; // 1MB

  return new Promise((resolve, reject) => {
    const req = https.request("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "Authorization": `Bearer ${apiKey}`,
      },
      agent: httpsAgent,
      timeout: 60000,
    }, (res) => {
      let data = "";
      res.on("data", chunk => {
        data += chunk;
        if (data.length > MAX_RESPONSE_SIZE) {
          req.destroy();
          reject(new Error("LLM response too large"));
        }
      });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message || JSON.stringify(parsed.error)));
          if (res.statusCode >= 400) return reject(new Error(`Groq API error ${res.statusCode}: ${data.slice(0, 200)}`));
          resolve({
            content: parsed.choices?.[0]?.message?.content || "",
            usage: parsed.usage || {},
            toolCalls: parsed.choices?.[0]?.message?.tool_calls || [],
          });
        } catch (e) {
          // Non-JSON response (e.g. HTML error page for 429/503) — include status code for retry matching
          if (res.statusCode >= 400) {
            reject(new Error(`Groq API error ${res.statusCode}: ${data.slice(0, 200)}`));
          } else {
            reject(e);
          }
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("LLM request timeout")); });
    req.write(body);
    req.end();
  });
}

async function callOllama(messages, options) {
  const bodyObj = {
    model: options.model || "llama3",
    messages,
    stream: false,
  };

  bodyObj.options = { ...(bodyObj.options || {}), temperature: options.temperature !== undefined ? options.temperature : 0.7 };
  bodyObj.stream = options.stream || false;

  // Ollama tool support (available in newer models)
  if (options.tools && options.tools.length > 0) {
    bodyObj.tools = options.tools;
  }

  const body = JSON.stringify(bodyObj);

  const MAX_RESPONSE_SIZE = 1024 * 1024; // 1MB

  const ollamaUrl = new URL(process.env.OLLAMA_HOST || "http://localhost:11434");
  ollamaUrl.pathname = ollamaUrl.pathname.replace(/\/$/, "") + "/api/chat";

  const transport = ollamaUrl.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const req = transport.request({
      hostname: ollamaUrl.hostname,
      port: ollamaUrl.port || (ollamaUrl.protocol === "https:" ? 443 : 80),
      path: ollamaUrl.pathname + (ollamaUrl.search || ""),
      method: "POST",
      headers: { "Content-Type": "application/json" },
      agent: ollamaUrl.protocol === "https:" ? httpsAgent : httpAgent,
      timeout: 120000,
    }, (res) => {
      let data = "";
      res.on("data", chunk => {
        data += chunk;
        if (data.length > MAX_RESPONSE_SIZE) {
          req.destroy();
          reject(new Error("Ollama response too large"));
        }
      });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);

          // Extract tool calls from Ollama response
          const toolCalls = [];
          if (parsed.message?.tool_calls) {
            for (const tc of parsed.message.tool_calls) {
              toolCalls.push({
                function: { name: tc.function?.name || tc.name, arguments: JSON.stringify(tc.function?.arguments || tc.args || {}) },
              });
            }
          }

          resolve({
            content: parsed.message?.content || "",
            usage: {},
            toolCalls,
          });
        } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Ollama timeout")); });
    req.write(body);
    req.end();
  });
}

async function callMock(messages, options) {
  if (!Array.isArray(messages)) throw new TypeError("callMock: messages must be an array");
  // Only look at original user messages (not tool result messages)
  const userMsgs = messages.filter(m => m.role === "user" && !m.content.startsWith("Tool result") && !m.content.startsWith("Tool error"));
  const lastUserMsg = userMsgs.pop()?.content || "";
  const hasToolResults = messages.some(m => m.role === "user" && m.content.startsWith("Tool result"));

  // If we already executed a tool, return a final answer (no more tool calls)
  if (hasToolResults) {
    return {
      content: "**[Mock Response]** Tool executed successfully. Based on the tool result, here is the answer to: *\"" + Array.from(lastUserMsg).slice(0, 80).join("") + "\"*\n\n---\n\n> 🧪 This is a mock response. Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` for real LLM output.",
      usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
      toolCalls: [],
    };
  }

  // Simulate tool calls if the message looks like it needs one
  if (lastUserMsg.toLowerCase().includes("read") || lastUserMsg.toLowerCase().includes("file")) {
    return {
      content: "I'll read that file for you.\n\n```\ntool: fs.read\npath: package.json\n```\n\n---\n\n> 🧪 Mock tool call — no real file was read.",
      usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
      toolCalls: [{
        function: { name: "fs.read", arguments: JSON.stringify({ path: "package.json" }) },
      }],
    };
  }

  if (lastUserMsg.toLowerCase().includes("run") || lastUserMsg.toLowerCase().includes("exec")) {
    return {
      content: "I'll execute that command.\n\n```\ntool: shell.exec\ncommand: echo hello\n```\n\n---\n\n> 🧪 Mock tool call — no real command was executed.",
      usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
      toolCalls: [{
        function: { name: "shell.exec", arguments: JSON.stringify({ command: "echo hello" }) },
      }],
    };
  }

  return {
    content: options.outputFormat === "json"
      ? JSON.stringify({ response: `I received your request: "${lastUserMsg.slice(0, 100)}"`, note: "To get real responses, set OPENAI_API_KEY or ANTHROPIC_API_KEY." })
      : "**[Mock Response]** I received your request: *\"" + lastUserMsg.slice(0, 100) + "\"*\n\n---\n\n> 🧪 This is a mock response. To get real responses, set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`.\n\n### What I can do:\n- 🔍 **Read files** — mention \"read\" or \"file\"\n- ⚡ **Run commands** — mention \"run\" or \"exec\"\n- 💬 **Chat** — just type anything else",
    usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
    toolCalls: [],
  };
}

const GEMINI_MODEL_ALIASES = {
  "gemini": "gemini-2.0-flash",           // default
  "gemini-flash": "gemini-2.0-flash",
  "gemini-pro": "gemini-2.5-pro",
  "gemini-ultra": "gemini-2.5-pro",       // best available
  "gemini-latest": "gemini-2.5-pro",
  "gemini-3.7": "gemini-3.7-flash",
  "gemini-3.7-flash": "gemini-3.7-flash",
  "gemini-3.7-pro": "gemini-3.7-pro",
  "gemini-3.7-thinking": "gemini-3.7-flash-thinking",
  "gemini-3.7-flash-thinking": "gemini-3.7-flash-thinking",
  "gemini-thinking": "gemini-2.0-flash-thinking-exp",
  "gemini-2.5": "gemini-2.5-pro",
  "gemini-2.0": "gemini-2.0-flash",
};

const GEMINI_MAX_OUTPUT_TOKENS = {
  "gemini-3.7-pro": 65536,
  "gemini-3.7-flash": 65536,
  "gemini-3.7-flash-thinking": 65536,
  "gemini-2.5-pro": 65536,
  "gemini-2.5-flash": 65536,
  "gemini-2.0-flash": 8192,
  "gemini-2.0-flash-thinking-exp": 65536,
  "gemini-2.0-pro-exp": 65536,
  "gemini-1.5-pro": 8192,
  "gemini-1.5-flash": 8192,
};

function resolveGeminiModel(model) {
  if (!model) return process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const cleanModel = typeof model === "string" ? model.replace(/^models\//, "") : model;
  if (GEMINI_MODEL_ALIASES[cleanModel]) return GEMINI_MODEL_ALIASES[cleanModel];
  const NON_GEMINI_MODELS = new Set(["gpt-4", "gpt-4o", "gpt-4o-mini", "claude-haiku-4-5-20251001", "claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022", "llama3", "mistral", "codellama"]);
  if (!NON_GEMINI_MODELS.has(cleanModel)) return cleanModel;
  return process.env.GEMINI_MODEL || "gemini-2.0-flash";
}

function getGeminiMaxTokens(model, requestedMax) {
  const m = (model || "").toLowerCase();
  let cap = 8192;
  if (GEMINI_MAX_OUTPUT_TOKENS[model]) {
    cap = GEMINI_MAX_OUTPUT_TOKENS[model];
  } else if (/3\.[0-9]|2\.5|pro|thinking|exp/.test(m)) {
    cap = 65536;
  }
  return requestedMax ? Math.min(requestedMax, cap) : cap;
}

const GEMINI_SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
];

async function callGemini(messages, options = {}) {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY not set. Run: export GEMINI_API_KEY=...");

  const resolvedModel = resolveGeminiModel(options.model);

  const systemMsgs = messages.filter(m => m.role === "system");
  const chatMsgs = messages.filter(m => m.role !== "system");

  const contents = [];
  for (const m of chatMsgs) {
    const role = (m.role === "assistant" || m.role === "model") ? "model" : "user";
    contents.push({
      role,
      parts: [{ text: typeof m.content === "string" ? m.content : JSON.stringify(m.content || "") }]
    });
  }

  const bodyObj = {
    contents: contents.length > 0 ? contents : [{ role: "user", parts: [{ text: "Hello" }] }],
    safetySettings: GEMINI_SAFETY_SETTINGS,
    generationConfig: {
      temperature: options.temperature !== undefined ? options.temperature : 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: getGeminiMaxTokens(resolvedModel, options.maxTokens),
      responseMimeType: "text/plain",
    }
  };

  if (options.thinkingBudget !== undefined || options.thinking !== undefined) {
    bodyObj.generationConfig.thinkingConfig = {
      thinkingBudget: options.thinkingBudget ?? (options.thinking ? -1 : 0),
    };
  }

  if (systemMsgs.length > 0) {
    bodyObj.systemInstruction = {
      parts: [{ text: systemMsgs.map(m => m.content).join("\n\n") }]
    };
  }

  const body = JSON.stringify(bodyObj);
  const MAX_RESPONSE_SIZE = 1024 * 1024 * 4; // 4MB

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(resolvedModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
      agent: httpsAgent,
      timeout: 60000,
    }, (res) => {
      let data = "";
      res.on("data", chunk => {
        data += chunk;
        if (data.length > MAX_RESPONSE_SIZE) {
          req.destroy();
          reject(new Error("Gemini response too large"));
        }
      });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message || JSON.stringify(parsed.error)));
          if (res.statusCode >= 400) return reject(new Error(`Gemini API error ${res.statusCode}: ${data.slice(0, 200)}`));

          const candidate = parsed.candidates?.[0];
          let textPart = "";
          let reasoningPart = "";
          for (const part of (candidate?.content?.parts || [])) {
            if (part.thought) {
              reasoningPart += part.text || "";
            } else if (part.text) {
              textPart += part.text;
            }
          }

          resolve({
            content: textPart,
            reasoning: reasoningPart,
            usage: {
              promptTokens: parsed.usageMetadata?.promptTokenCount || 0,
              completionTokens: parsed.usageMetadata?.candidatesTokenCount || 0,
              totalTokens: parsed.usageMetadata?.totalTokenCount || 0,
            },
            toolCalls: [],
          });
        } catch (e) {
          if (res.statusCode >= 400) {
            reject(new Error(`Gemini API error ${res.statusCode}: ${data.slice(0, 200)}`));
          } else {
            reject(e);
          }
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Gemini request timeout")); });
    req.write(body);
    req.end();
  });
}

async function callDeepSeek(messages, options = {}) {
  const apiKey = options.apiKey || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not set. Run: export DEEPSEEK_API_KEY=sk-...");

  const NON_DEEPSEEK_MODELS = new Set(["gpt-4", "gpt-4o", "claude-3-5-sonnet", "llama3"]);
  const resolvedModel = (options.model && !NON_DEEPSEEK_MODELS.has(options.model))
    ? options.model
    : (process.env.DEEPSEEK_MODEL || "deepseek-chat");

  const body = JSON.stringify({
    model: resolvedModel,
    messages,
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature !== undefined ? options.temperature : 0.7,
  });

  const MAX_RESPONSE_SIZE = 1024 * 1024; // 1MB

  return new Promise((resolve, reject) => {
    const req = https.request("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "Authorization": `Bearer ${apiKey}`,
      },
      agent: httpsAgent,
      timeout: 60000,
    }, (res) => {
      let data = "";
      res.on("data", chunk => {
        data += chunk;
        if (data.length > MAX_RESPONSE_SIZE) {
          req.destroy();
          reject(new Error("DeepSeek response too large"));
        }
      });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message || JSON.stringify(parsed.error)));
          if (res.statusCode >= 400) return reject(new Error(`DeepSeek API error ${res.statusCode}: ${data.slice(0, 200)}`));
          resolve({
            content: parsed.choices?.[0]?.message?.content || "",
            reasoning: parsed.choices?.[0]?.message?.reasoning_content || "",
            usage: parsed.usage || {},
            toolCalls: parsed.choices?.[0]?.message?.tool_calls || [],
          });
        } catch (e) {
          if (res.statusCode >= 400) {
            reject(new Error(`DeepSeek API error ${res.statusCode}: ${data.slice(0, 200)}`));
          } else {
            reject(e);
          }
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("DeepSeek request timeout")); });
    req.write(body);
    req.end();
  });
}

async function callMistral(messages, options = {}) {
  const apiKey = options.apiKey || process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error("MISTRAL_API_KEY not set. Run: export MISTRAL_API_KEY=...");

  const resolvedModel = options.model || process.env.MISTRAL_MODEL || "mistral-large-latest";

  const body = JSON.stringify({
    model: resolvedModel,
    messages,
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature !== undefined ? options.temperature : 0.7,
  });

  const MAX_RESPONSE_SIZE = 1024 * 1024; // 1MB

  return new Promise((resolve, reject) => {
    const req = https.request("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "Authorization": `Bearer ${apiKey}`,
      },
      agent: httpsAgent,
      timeout: 60000,
    }, (res) => {
      let data = "";
      res.on("data", chunk => {
        data += chunk;
        if (data.length > MAX_RESPONSE_SIZE) {
          req.destroy();
          reject(new Error("Mistral response too large"));
        }
      });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message || JSON.stringify(parsed.error)));
          if (res.statusCode >= 400) return reject(new Error(`Mistral API error ${res.statusCode}: ${data.slice(0, 200)}`));
          resolve({
            content: parsed.choices?.[0]?.message?.content || "",
            usage: parsed.usage || {},
            toolCalls: parsed.choices?.[0]?.message?.tool_calls || [],
          });
        } catch (e) {
          if (res.statusCode >= 400) {
            reject(new Error(`Mistral API error ${res.statusCode}: ${data.slice(0, 200)}`));
          } else {
            reject(e);
          }
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Mistral request timeout")); });
    req.write(body);
    req.end();
  });
}

function _createSSEStreamer(onChunk) {
  let buffer = "";
  let fullContent = "";
  return {
    push(chunk) {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":") || trimmed === "data: [DONE]") continue;
        if (trimmed.startsWith("data: ")) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            // OpenAI / DeepSeek / Groq / Mistral format
            const text = data.choices?.[0]?.delta?.content || "";
            if (text) {
              fullContent += text;
              onChunk(text);
            }
          } catch { /* skip incomplete json line */ }
        }
      }
    },
    getFullContent() {
      return fullContent;
    }
  };
}

async function callOpenAIStream(messages, options, onChunk) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set.");
  const body = JSON.stringify({
    model: options.model || "gpt-4o-mini",
    messages,
    max_tokens: options.maxTokens || 2048,
    temperature: options.temperature !== undefined ? options.temperature : 0.7,
    stream: true,
  });

  return new Promise((resolve, reject) => {
    const streamer = _createSSEStreamer(onChunk);
    const req = https.request("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      agent: httpsAgent,
      timeout: 60000,
    }, (res) => {
      res.on("data", chunk => streamer.push(chunk.toString("utf-8")));
      res.on("end", () => {
        resolve({
          content: streamer.getFullContent(),
          usage: { promptTokens: 0, completionTokens: Math.ceil(streamer.getFullContent().length / 4), totalTokens: Math.ceil(streamer.getFullContent().length / 4) },
          toolCalls: [],
        });
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function callClaudeStream(messages, options, onChunk) {
  const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  const resolvedModel = options.model || process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";
  const bodyObj = {
    model: resolvedModel,
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature !== undefined ? options.temperature : 0.7,
    messages: messages.filter(m => m.role !== "system"),
    stream: true,
  };
  const systemMsgs = messages.filter(m => m.role === "system");
  if (systemMsgs.length > 0) bodyObj.system = systemMsgs.map(m => m.content).join("\n\n");
  const body = JSON.stringify(bodyObj);

  return new Promise((resolve, reject) => {
    let fullContent = "";
    let buffer = "";
    const req = https.request("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      agent: httpsAgent,
      timeout: 60000,
    }, (res) => {
      res.on("data", chunk => {
        buffer += chunk.toString("utf-8");
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.type === "content_block_delta" && data.delta?.text) {
                fullContent += data.delta.text;
                onChunk(data.delta.text);
              }
            } catch { /* skip */ }
          }
        }
      });
      res.on("end", () => {
        resolve({
          content: fullContent,
          usage: { promptTokens: 0, completionTokens: Math.ceil(fullContent.length / 4), totalTokens: Math.ceil(fullContent.length / 4) },
          toolCalls: [],
        });
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function callGeminiStream(messages, options, onChunk) {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY not set.");
  const resolvedModel = resolveGeminiModel(options.model);

  const systemMsgs = messages.filter(m => m.role === "system");
  const chatMsgs = messages.filter(m => m.role !== "system");
  const contents = chatMsgs.map(m => ({
    role: (m.role === "assistant" || m.role === "model") ? "model" : "user",
    parts: [{ text: typeof m.content === "string" ? m.content : JSON.stringify(m.content || "") }]
  }));

  const bodyObj = {
    contents: contents.length > 0 ? contents : [{ role: "user", parts: [{ text: "Hello" }] }],
    safetySettings: GEMINI_SAFETY_SETTINGS,
    generationConfig: {
      temperature: options.temperature !== undefined ? options.temperature : 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: getGeminiMaxTokens(resolvedModel, options.maxTokens),
      responseMimeType: "text/plain",
    }
  };
  if (options.thinkingBudget !== undefined || options.thinking !== undefined) {
    bodyObj.generationConfig.thinkingConfig = {
      thinkingBudget: options.thinkingBudget ?? (options.thinking ? -1 : 0),
    };
  }
  if (systemMsgs.length > 0) {
    bodyObj.systemInstruction = { parts: [{ text: systemMsgs.map(m => m.content).join("\n\n") }] };
  }
  const body = JSON.stringify(bodyObj);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(resolvedModel)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

  return new Promise((resolve, reject) => {
    let fullContent = "";
    let buffer = "";
    const req = https.request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      agent: httpsAgent,
      timeout: 60000,
    }, (res) => {
      res.on("data", chunk => {
        buffer += chunk.toString("utf-8");
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":") || trimmed === "data: [DONE]") continue;
          if (trimmed.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              const candidate = data.candidates?.[0];
              const parts = candidate?.content?.parts || [];
              for (const part of parts) {
                if (!part.thought && part.text) {
                  fullContent += part.text;
                  onChunk(part.text);
                }
              }
            } catch { /* skip */ }
          }
        }
      });
      res.on("end", () => {
        if (buffer.trim().startsWith("data: ")) {
          try {
            const data = JSON.parse(buffer.trim().slice(6));
            const candidate = data.candidates?.[0];
            const parts = candidate?.content?.parts || [];
            for (const part of parts) {
              if (!part.thought && part.text) {
                fullContent += part.text;
                onChunk(part.text);
              }
            }
          } catch { /* skip */ }
        }
        resolve({
          content: fullContent,
          usage: { promptTokens: 0, completionTokens: Math.ceil(fullContent.length / 4), totalTokens: Math.ceil(fullContent.length / 4) },
          toolCalls: [],
        });
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function callDeepSeekStream(messages, options, onChunk) {
  const apiKey = options.apiKey || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not set.");
  const resolvedModel = options.model || process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const body = JSON.stringify({
    model: resolvedModel,
    messages,
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature !== undefined ? options.temperature : 0.7,
    stream: true,
  });

  return new Promise((resolve, reject) => {
    const streamer = _createSSEStreamer(onChunk);
    const req = https.request("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      agent: httpsAgent,
      timeout: 60000,
    }, (res) => {
      res.on("data", chunk => streamer.push(chunk.toString("utf-8")));
      res.on("end", () => {
        resolve({
          content: streamer.getFullContent(),
          usage: { promptTokens: 0, completionTokens: Math.ceil(streamer.getFullContent().length / 4), totalTokens: Math.ceil(streamer.getFullContent().length / 4) },
          toolCalls: [],
        });
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function callGroqStream(messages, options, onChunk) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set.");
  const resolvedModel = (options.model && !NON_GROQ_MODELS.has(options.model))
    ? options.model
    : (process.env.GROQ_MODEL || "llama-3.3-70b-versatile");

  const body = JSON.stringify({
    model: resolvedModel,
    messages,
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature !== undefined ? options.temperature : 0.7,
    stream: true,
  });

  return new Promise((resolve, reject) => {
    const streamer = _createSSEStreamer(onChunk);
    const req = https.request("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      agent: httpsAgent,
      timeout: 60000,
    }, (res) => {
      res.on("data", chunk => streamer.push(chunk.toString("utf-8")));
      res.on("end", () => {
        resolve({
          content: streamer.getFullContent(),
          usage: { promptTokens: 0, completionTokens: Math.ceil(streamer.getFullContent().length / 4), totalTokens: Math.ceil(streamer.getFullContent().length / 4) },
          toolCalls: [],
        });
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function callMistralStream(messages, options, onChunk) {
  const apiKey = options.apiKey || process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error("MISTRAL_API_KEY not set.");
  const resolvedModel = options.model || process.env.MISTRAL_MODEL || "mistral-large-latest";
  const body = JSON.stringify({
    model: resolvedModel,
    messages,
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature !== undefined ? options.temperature : 0.7,
    stream: true,
  });

  return new Promise((resolve, reject) => {
    const streamer = _createSSEStreamer(onChunk);
    const req = https.request("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      agent: httpsAgent,
      timeout: 60000,
    }, (res) => {
      res.on("data", chunk => streamer.push(chunk.toString("utf-8")));
      res.on("end", () => {
        resolve({
          content: streamer.getFullContent(),
          usage: { promptTokens: 0, completionTokens: Math.ceil(streamer.getFullContent().length / 4), totalTokens: Math.ceil(streamer.getFullContent().length / 4) },
          toolCalls: [],
        });
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function callOllamaStream(messages, options, onChunk) {
  const resolvedModel = options.model || process.env.OLLAMA_MODEL || "llama3";
  const body = JSON.stringify({
    model: resolvedModel,
    messages,
    stream: true,
  });

  const ollamaUrl = new URL(process.env.OLLAMA_HOST || "http://localhost:11434");
  ollamaUrl.pathname = ollamaUrl.pathname.replace(/\/$/, "") + "/api/chat";
  const transport = ollamaUrl.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    let fullContent = "";
    let buffer = "";
    const req = transport.request({
      hostname: ollamaUrl.hostname,
      port: ollamaUrl.port || (ollamaUrl.protocol === "https:" ? 443 : 80),
      path: ollamaUrl.pathname + (ollamaUrl.search || ""),
      method: "POST",
      headers: { "Content-Type": "application/json" },
      agent: ollamaUrl.protocol === "https:" ? httpsAgent : httpAgent,
      timeout: 120000,
    }, (res) => {
      res.on("data", chunk => {
        buffer += chunk.toString("utf-8");
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            try {
              const data = JSON.parse(trimmed);
              const text = data.message?.content || "";
              if (text) {
                fullContent += text;
                onChunk(text);
              }
            } catch { /* skip */ }
          }
        }
      });
      res.on("end", () => {
        resolve({
          content: fullContent,
          usage: {},
          toolCalls: [],
        });
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function callMockStream(messages, options, onChunk) {
  const result = await callMock(messages, options);
  const words = result.content.split(" ");
  for (let i = 0; i < words.length; i++) {
    const chunk = (i === 0 ? "" : " ") + words[i];
    onChunk(chunk);
    await sleep(20);
  }
  return result;
}

async function callLLMStream(messages, options = {}, onChunk = () => {}) {
  const provider = options.provider;
  if (!provider) throw new Error("options.provider is required for streaming.");
  const model = options.model || "gpt-4o-mini";

  switch (provider) {
    case "mock":
      return await callMockStream(messages, options, onChunk);
    case "openai":
      return await callOpenAIStream(messages, { ...options, model }, onChunk);
    case "claude":
      return await callClaudeStream(messages, { ...options, model }, onChunk);
    case "gemini":
    case "google":
      return await callGeminiStream(messages, { ...options, model }, onChunk);
    case "deepseek":
      return await callDeepSeekStream(messages, { ...options, model }, onChunk);
    case "groq":
      return await callGroqStream(messages, { ...options, model }, onChunk);
    case "mistral":
      return await callMistralStream(messages, { ...options, model }, onChunk);
    case "local":
      return await callOllamaStream(messages, { ...options, model }, onChunk);
    default: {
      const res = await callLLM(messages, options);
      if (res && res.content) onChunk(res.content);
      return res;
    }
  }
}

function destroyAgents() {
  httpsAgent.destroy();
  httpAgent.destroy();
}

// Clean up keep-alive sockets on process exit to prevent leaks
process.on("exit", destroyAgents);

module.exports = {
  callLLM,
  callLLMStream,
  callOpenAI,
  callClaude,
  callGemini,
  callGeminiStream,
  callDeepSeek,
  callMistral,
  callOllama,
  callGroq,
  callMock,
  resolveGeminiModel,
  getGeminiMaxTokens,
  GEMINI_MODEL_ALIASES,
  GEMINI_MAX_OUTPUT_TOKENS,
  GEMINI_SAFETY_SETTINGS,
  destroyAgents
};
