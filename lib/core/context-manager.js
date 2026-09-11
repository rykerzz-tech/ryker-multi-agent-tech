/**
 * Context Window Management Engine — Ryker v2.0.0
 * 
 * Provides:
 * - High-speed token estimation (~4 chars/token)
 * - Session context budget tracking & auto-truncation
 * - Context compression & distilled memory injection
 * - Stats exporter for dashboard TokenMeter
 */

const DEFAULT_CONTEXT_LIMIT = 128000; // 128k default
const DEFAULT_SAFETY_MARGIN = 4096; // 4k tokens reserve for completions

const sessionBudgets = new Map();

function estimateTokens(text) {
  if (!text) return 0;
  if (typeof text !== "string") {
    try { text = JSON.stringify(text); } catch { return 0; }
  }
  // Standard rule of thumb: ~4 characters per token in English / code
  return Math.ceil(text.length / 4);
}

function estimateMessagesTokens(messages) {
  if (!Array.isArray(messages)) return 0;
  let total = 0;
  for (const msg of messages) {
    total += estimateTokens(msg.content) + 4; // overhead per message
  }
  return total;
}

function trackUsage(sessionId, tokens, maxTokens = DEFAULT_CONTEXT_LIMIT, provider = "openai") {
  const current = sessionBudgets.get(sessionId) || {
    used: 0,
    total: maxTokens,
    provider,
    updatedAt: Date.now(),
  };

  current.used = tokens;
  current.total = maxTokens;
  current.provider = provider;
  current.updatedAt = Date.now();
  sessionBudgets.set(sessionId, current);

  // Cleanup stale sessions (> 1 hour)
  if (sessionBudgets.size > 200) {
    const now = Date.now();
    for (const [id, data] of sessionBudgets) {
      if (now - data.updatedAt > 3600000) sessionBudgets.delete(id);
    }
  }

  return current;
}

function getContextStats(sessionId) {
  const stats = sessionBudgets.get(sessionId);
  if (!stats) {
    return {
      used: 0,
      total: DEFAULT_CONTEXT_LIMIT,
      percent: 0,
      provider: "mock",
    };
  }
  const percent = Math.min(100, Math.round((stats.used / (stats.total || 1)) * 100));
  return {
    used: stats.used,
    total: stats.total,
    percent,
    provider: stats.provider,
  };
}

/**
 * Truncate conversation history to fit within token budget.
 * Always preserves the system prompt, and keeps the most recent turns.
 * Dropped messages are condensed into a summary prefix if compress = true.
 */
function manageContextWindow(messages, options = {}) {
  const maxTokens = options.maxTokens || DEFAULT_CONTEXT_LIMIT;
  const reserveTokens = options.reserveTokens || DEFAULT_SAFETY_MARGIN;
  const budget = maxTokens - reserveTokens;

  const currentTokens = estimateMessagesTokens(messages);
  if (currentTokens <= budget) {
    return {
      messages,
      truncated: false,
      estimatedTokens: currentTokens,
      droppedCount: 0,
    };
  }

  const systemMsgs = messages.filter(m => m.role === "system");
  const nonSystemMsgs = messages.filter(m => m.role !== "system");

  const systemTokens = estimateMessagesTokens(systemMsgs);
  let availableBudget = budget - systemTokens;
  if (availableBudget < 1000) availableBudget = 1000;

  const retained = [];
  let accumulated = 0;
  let droppedCount = 0;

  // Scan backwards from most recent message
  for (let i = nonSystemMsgs.length - 1; i >= 0; i--) {
    const msg = nonSystemMsgs[i];
    const msgTokens = estimateTokens(msg.content) + 4;
    if (accumulated + msgTokens <= availableBudget) {
      retained.unshift(msg);
      accumulated += msgTokens;
    } else {
      droppedCount = i + 1;
      break;
    }
  }

  // If messages were dropped, create a compression note
  const finalMessages = [...systemMsgs];
  if (droppedCount > 0) {
    const droppedSlice = nonSystemMsgs.slice(0, droppedCount);
    const summaryPoints = droppedSlice
      .filter(m => m.role === "user" || (m.role === "assistant" && m.content))
      .slice(-4)
      .map(m => `[${m.role.toUpperCase()}]: ${String(m.content).slice(0, 100)}...`)
      .join(" | ");

    finalMessages.push({
      role: "system",
      content: `[CONTEXT COMPRESSION: ${droppedCount} earlier messages summarized to preserve context budget]\nKey highlights: ${summaryPoints}`
    });
  }

  finalMessages.push(...retained);

  return {
    messages: finalMessages,
    truncated: droppedCount > 0,
    estimatedTokens: estimateMessagesTokens(finalMessages),
    droppedCount,
  };
}

module.exports = {
  estimateTokens,
  estimateMessagesTokens,
  trackUsage,
  getContextStats,
  manageContextWindow,
  DEFAULT_CONTEXT_LIMIT,
};
