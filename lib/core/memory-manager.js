/**
 * 4-Tier Persistent Cognitive Memory Architecture — Ryker v2.0.0
 * 
 * Layers:
 * 1. Working Memory: In-process key-value store with TTL (30 min default)
 * 2. Episodic Memory: Append-only JSONL recording task turns, tools, and outcomes
 * 3. Semantic Memory: Distilled facts & project domain knowledge (.nexus/memory/semantic.json)
 * 4. Procedural Memory: Successful task patterns stored for automated reuse (.nexus/memory/procedures.json)
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const logger = require("./logger");

const DEFAULT_WORKING_TTL_MS = 30 * 60 * 1000; // 30 mins

class MemoryManager {
  constructor(baseDir = process.cwd()) {
    this.baseDir = baseDir;
    this.memoryDir = path.join(this.baseDir, ".nexus", "memory");
    this.working = new Map(); // key -> { value, expiresAt }

    this._ensureDirs();
  }

  _ensureDirs() {
    try {
      if (!fs.existsSync(this.memoryDir)) {
        fs.mkdirSync(this.memoryDir, { recursive: true });
      }
      const semanticPath = path.join(this.memoryDir, "semantic.json");
      if (!fs.existsSync(semanticPath)) {
        fs.writeFileSync(semanticPath, JSON.stringify({ facts: [], tags: {} }, null, 2), "utf-8");
      }
      const proceduresPath = path.join(this.memoryDir, "procedures.json");
      if (!fs.existsSync(proceduresPath)) {
        fs.writeFileSync(proceduresPath, JSON.stringify({ procedures: [] }, null, 2), "utf-8");
      }
    } catch (err) {
      logger.warn(`Failed to initialize memory directory: ${err.message}`);
    }
  }

  // ── 1. WORKING MEMORY ────────────────────────────────────────────────────

  setWorking(key, value, ttlMs = DEFAULT_WORKING_TTL_MS) {
    this.working.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  getWorking(key) {
    const item = this.working.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.working.delete(key);
      return null;
    }
    return item.value;
  }

  clearWorking() {
    this.working.clear();
  }

  // ── 2. EPISODIC MEMORY ───────────────────────────────────────────────────

  appendEpisode(episode) {
    try {
      const episodesFile = path.join(this.memoryDir, "episodes.jsonl");
      const record = {
        id: `ep-${crypto.randomBytes(4).toString("hex")}`,
        timestamp: Date.now(),
        isoTime: new Date().toISOString(),
        ...episode,
      };
      fs.appendFileSync(episodesFile, JSON.stringify(record) + "\n", "utf-8");
      return record;
    } catch (err) {
      logger.warn(`Failed to append episodic memory: ${err.message}`);
      return null;
    }
  }

  getRecentEpisodes(limit = 10) {
    try {
      const episodesFile = path.join(this.memoryDir, "episodes.jsonl");
      if (!fs.existsSync(episodesFile)) return [];
      const lines = fs.readFileSync(episodesFile, "utf-8").trim().split("\n").filter(Boolean);
      const records = lines.slice(-limit).map(l => {
        try { return JSON.parse(l); } catch { return null; }
      }).filter(Boolean);
      return records.reverse();
    } catch (err) {
      logger.warn(`Failed to read episodes: ${err.message}`);
      return [];
    }
  }

  // ── 3. SEMANTIC MEMORY ───────────────────────────────────────────────────

  addSemanticFact(topic, fact, source = "autonomous-extraction") {
    try {
      const semanticPath = path.join(this.memoryDir, "semantic.json");
      let data = { facts: [] };
      if (fs.existsSync(semanticPath)) {
        try { data = JSON.parse(fs.readFileSync(semanticPath, "utf-8")); } catch { data = { facts: [] }; }
      }

      const entry = {
        id: `fact-${crypto.randomBytes(3).toString("hex")}`,
        topic,
        fact,
        source,
        timestamp: Date.now(),
      };

      data.facts = data.facts || [];
      // Deduplicate similar facts
      const existing = data.facts.findIndex(f => f.topic.toLowerCase() === topic.toLowerCase() && f.fact.toLowerCase() === fact.toLowerCase());
      if (existing === -1) {
        data.facts.push(entry);
        if (data.facts.length > 500) data.facts.shift(); // Keep top 500 facts
        fs.writeFileSync(semanticPath, JSON.stringify(data, null, 2), "utf-8");
      }
      return entry;
    } catch (err) {
      logger.warn(`Failed to add semantic fact: ${err.message}`);
      return null;
    }
  }

  getSemanticFacts(query = "") {
    try {
      const semanticPath = path.join(this.memoryDir, "semantic.json");
      if (!fs.existsSync(semanticPath)) return [];
      const data = JSON.parse(fs.readFileSync(semanticPath, "utf-8"));
      if (!query) return data.facts || [];
      const q = query.toLowerCase();
      return (data.facts || []).filter(f =>
        f.topic.toLowerCase().includes(q) || f.fact.toLowerCase().includes(q)
      );
    } catch (err) {
      return [];
    }
  }

  // ── 4. PROCEDURAL MEMORY ─────────────────────────────────────────────────

  addProcedure(name, pattern, steps, tags = []) {
    try {
      const proceduresPath = path.join(this.memoryDir, "procedures.json");
      let data = { procedures: [] };
      if (fs.existsSync(proceduresPath)) {
        try { data = JSON.parse(fs.readFileSync(proceduresPath, "utf-8")); } catch { data = { procedures: [] }; }
      }

      const record = {
        id: `proc-${crypto.randomBytes(3).toString("hex")}`,
        name,
        pattern,
        steps,
        tags,
        successCount: 1,
        lastUsed: Date.now(),
      };

      data.procedures = data.procedures || [];
      const idx = data.procedures.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
      if (idx !== -1) {
        data.procedures[idx].successCount++;
        data.procedures[idx].lastUsed = Date.now();
        data.procedures[idx].steps = steps;
      } else {
        data.procedures.push(record);
      }
      fs.writeFileSync(proceduresPath, JSON.stringify(data, null, 2), "utf-8");
      return record;
    } catch (err) {
      logger.warn(`Failed to store procedural memory: ${err.message}`);
      return null;
    }
  }

  findProcedure(taskDescription) {
    try {
      const proceduresPath = path.join(this.memoryDir, "procedures.json");
      if (!fs.existsSync(proceduresPath)) return null;
      const data = JSON.parse(fs.readFileSync(proceduresPath, "utf-8"));
      const desc = taskDescription.toLowerCase();
      return (data.procedures || []).find(p =>
        desc.includes(p.name.toLowerCase()) || desc.includes(p.pattern.toLowerCase())
      ) || null;
    } catch {
      return null;
    }
  }

  // ── PROMPT INJECTION CONTEXT ─────────────────────────────────────────────

  getRelevantMemoryContext(prompt) {
    if (!prompt) return "";
    const facts = this.getSemanticFacts(prompt).slice(0, 3);
    const proc = this.findProcedure(prompt);

    const blocks = [];
    if (facts.length > 0) {
      blocks.push(`### Relevant Distilled Facts:\n` + facts.map(f => `- **${f.topic}**: ${f.fact}`).join("\n"));
    }
    if (proc) {
      blocks.push(`### Verified Task Procedure [${proc.name}]:\n` + proc.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"));
    }

    return blocks.join("\n\n");
  }
}

const defaultMemory = new MemoryManager();

// ══════════════════════════════════════════════════════════════════════════════
// HackSessionMemory — Red Team attack session persistent memory
// Used by the elite-hacker agent to track findings, credentials, endpoints,
// and build an adaptive chain graph across the full attack session.
// ══════════════════════════════════════════════════════════════════════════════

class HackSessionMemory {
  /**
   * @param {string} targetId — unique identifier for this target (domain, IP, app name)
   */
  constructor(targetId) {
    this.targetId = targetId;
    this.sessionId = `hack-${targetId}-${Date.now()}`;
    this.findings = [];         // confirmed vulns: { id, type, severity, target, proof, chainPotential[] }
    this.credentials = [];      // harvested creds (stored as hashed/masked)
    this.endpoints = [];        // discovered attack surface entries
    this.failedVectors = [];    // what didn't work — avoid redundant re-testing
    this.chainGraph = {};       // adjacency map: findingId -> [unlocked findingIds]
    this.chainEdges = [];       // discovered chain edges: [{ from, to, chainScore }]
    this.createdAt = Date.now();
  }

  /**
   * Add a confirmed vulnerability finding.
   * @param {{ id: string, type: string, severity: 'CRITICAL'|'HIGH'|'MEDIUM'|'LOW'|'INFO',
   *           target: string, proof: string, chainPotential: string[] }} finding
   */
  addFinding(finding) {
    const enriched = {
      ...finding,
      timestamp: Date.now(),
      cvssBase: this._estimateCVSS(finding.severity),
    };
    this.findings.push(enriched);
    this.chainGraph[finding.id] = [];
    this._updateChainGraph(enriched);
    return enriched;
  }

  /**
   * Mark a vector as exhausted so the agent doesn't re-test it.
   * @param {string} vectorId — endpoint ID or vector description
   */
  addFailedVector(vectorId, reason = "") {
    this.failedVectors.push({ vectorId, reason, timestamp: Date.now() });
  }

  /**
   * Register a discovered endpoint/attack surface entry.
   * @param {{ id: string, url: string, method: string, params: string[], tech: string }} endpoint
   */
  addEndpoint(endpoint) {
    if (!this.endpoints.find(e => e.id === endpoint.id)) {
      this.endpoints.push({ ...endpoint, discovered: Date.now() });
    }
  }

  /**
   * Store harvested credentials — value is hashed (SHA-256) before storage.
   * @param {{ type: string, target: string, value: string }} creds
   */
  addCreds(creds) {
    const crypto = require("crypto");
    const hashed = crypto.createHash("sha256").update(String(creds.value)).digest("hex");
    this.credentials.push({
      type: creds.type,
      target: creds.target,
      valueHash: hashed,
      hint: String(creds.value).substring(0, 3) + "***", // first 3 chars as hint only
      timestamp: Date.now(),
    });
  }

  /**
   * Internal — update chain graph when a new finding is added.
   * Checks if the new finding's type satisfies any existing finding's chainPotential.
   * @param {object} newFinding
   */
  _updateChainGraph(newFinding) {
    for (const existing of this.findings) {
      if (existing.id === newFinding.id) continue;

      // Check if existing finding chains into new finding
      if (existing.chainPotential && existing.chainPotential.includes(newFinding.type)) {
        if (!this.chainGraph[existing.id]) this.chainGraph[existing.id] = [];
        this.chainGraph[existing.id].push(newFinding.id);

        const score = this._calculateChainScore([existing, newFinding]);
        this.chainEdges.push({
          from: existing.id,
          to: newFinding.id,
          chainScore: score,
          discovered: Date.now(),
        });
      }

      // Check if new finding chains into existing finding
      if (newFinding.chainPotential && newFinding.chainPotential.includes(existing.type)) {
        if (!this.chainGraph[newFinding.id]) this.chainGraph[newFinding.id] = [];
        this.chainGraph[newFinding.id].push(existing.id);

        const score = this._calculateChainScore([newFinding, existing]);
        this.chainEdges.push({
          from: newFinding.id,
          to: existing.id,
          chainScore: score,
          discovered: Date.now(),
        });
      }
    }
  }

  /**
   * Calculate compound chain score for a set of findings.
   * @param {object[]} chainFindings
   * @returns {number} compound score (capped at 10.0)
   */
  _calculateChainScore(chainFindings) {
    const multipliers = { 1: 1.0, 2: 1.5, 3: 2.0 };
    const multiplier = multipliers[chainFindings.length] || 2.5;
    const sum = chainFindings.reduce((acc, f) => acc + this._estimateCVSS(f.severity), 0);
    return Math.min(10.0, parseFloat((sum * multiplier).toFixed(1)));
  }

  /**
   * Estimate CVSS base score from severity label.
   * @param {string} severity
   * @returns {number}
   */
  _estimateCVSS(severity) {
    const map = { CRITICAL: 9.5, HIGH: 7.5, MEDIUM: 5.0, LOW: 2.5, INFO: 0.5 };
    return map[severity] || 0;
  }

  /**
   * BFS through chainGraph to find the highest-scoring chain path.
   * @returns {object[]} ordered array of findings forming the best chain
   */
  getBestChain() {
    if (this.chainEdges.length === 0) return this.findings.slice(0, 1);

    // Find the edge with highest chain score as starting point
    const sorted = [...this.chainEdges].sort((a, b) => b.chainScore - a.chainScore);
    const best = sorted[0];
    if (!best) return this.findings.slice(0, 1);

    // BFS from the 'from' node to collect the full path
    const visited = new Set();
    const path = [];
    const queue = [best.from];

    while (queue.length > 0) {
      const nodeId = queue.shift();
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const finding = this.findings.find(f => f.id === nodeId);
      if (finding) path.push(finding);

      const neighbors = this.chainGraph[nodeId] || [];
      for (const n of neighbors) {
        if (!visited.has(n)) queue.push(n);
      }
    }

    return path;
  }

  /**
   * Get full attack context for AI prompt injection (used by elite-hacker agent).
   * @returns {object} structured attack context
   */
  getAttackContext() {
    const openVectors = this.endpoints.filter(
      e => !this.failedVectors.find(f => f.vectorId === e.id)
    );

    return {
      targetId: this.targetId,
      sessionId: this.sessionId,
      confirmedVulns: this.findings.filter(f => f.severity !== "INFO"),
      infoFindings: this.findings.filter(f => f.severity === "INFO"),
      openVectors,
      exhaustedVectors: this.failedVectors,
      bestChain: this.getBestChain(),
      chainEdgeCount: this.chainEdges.length,
      credCount: this.credentials.length,
      topChainScore: this.chainEdges.length > 0
        ? Math.max(...this.chainEdges.map(e => e.chainScore))
        : 0,
    };
  }

  /**
   * Emit the current attack DAG in a format parseable by the dashboard DAGVisualizer.
   * @returns {object} DAG event payload compatible with dag:update WebSocket event
   */
  toDAGEvent() {
    const nodes = this.findings.map(f => ({
      taskId: f.id,
      label: `[${f.severity}] ${f.type}`,
      description: f.target,
      status: f.severity === "CRITICAL" ? "DONE" : "RUNNING",
      dependsOn: Object.entries(this.chainGraph)
        .filter(([, targets]) => targets.includes(f.id))
        .map(([src]) => src),
      parallelizable: false,
      estimatedComplexity: this._estimateCVSS(f.severity),
      assignedAgentRole: "elite-hacker",
      retryPolicy: { maxRetries: 0 },
    }));

    return {
      type: "dag:update",
      sessionId: this.sessionId,
      dagId: `hack-dag-${this.targetId}`,
      tasks: nodes,
      timestamp: Date.now(),
    };
  }

  /**
   * Serialize session to JSON for persistent storage.
   */
  toJSON() {
    return {
      sessionId: this.sessionId,
      targetId: this.targetId,
      findings: this.findings,
      credentials: this.credentials, // already hashed
      endpoints: this.endpoints,
      failedVectors: this.failedVectors,
      chainGraph: this.chainGraph,
      chainEdges: this.chainEdges,
      createdAt: this.createdAt,
      updatedAt: Date.now(),
    };
  }
}

module.exports = {
  MemoryManager,
  defaultMemory,
  HackSessionMemory,
};

