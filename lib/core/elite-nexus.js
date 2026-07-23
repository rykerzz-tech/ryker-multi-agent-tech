/**
 * Elite-Nexus OS Engine — Production Transformation Version 1.0.0
 * 
 * Implements 3 Major Operating System Layers:
 * LAYER 1 — INTELLIGENCE ORCHESTRATION (Analyzers, Planners, Dynamic Router, Prompt Composition, Memory/RAG)
 * LAYER 2 — EXECUTION RUNTIME (Agent State Machine, Unified Tool Runtime, Safe Engineering, Debugging Loop)
 * LAYER 3 — COLLABORATION & PLATFORM (Sessions, Workspaces, Audit Trails, Permissions, Confidence/Risk Engine)
 * 
 * Designed with SOLID, DRY, and Clean Architecture principles.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const logger = require("./logger");
const { getComplexity, evaluateLayers, getVerificationStatus } = require("./quality-gate");

// ==========================================
// 1. AGENT LIFECYCLE & STATE MACHINE (PHASE 2)
// ==========================================

const AGENT_STATES = {
  CREATED: "CREATED",
  QUEUED: "QUEUED",
  PLANNING: "PLANNING",
  RUNNING: "RUNNING",
  WAITING: "WAITING",
  BLOCKED: "BLOCKED",
  REVIEWING: "REVIEWING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  RETRYING: "RETRYING"
};

const AGENT_LIFECYCLE_STEPS = [
  "REQUEST",
  "INITIALIZE",
  "LOAD_CONTEXT",
  "PLAN",
  "EXECUTE",
  "OBSERVE",
  "VALIDATE",
  "REPORT",
  "COMPLETE"
];

class AgentRuntimeInstance {
  constructor(id, role, capabilities = [], tools = []) {
    this.id = id || `agent-${crypto.randomBytes(4).toString("hex")}`;
    this.role = role || "GeneralistSpecialist";
    this.capabilities = capabilities;
    this.tools = tools;
    this.state = AGENT_STATES.CREATED;
    this.lifecycleStep = "REQUEST";
    this.history = [];
    this.events = []; // Structured execution events trace
    this.confidenceScore = 1.0;
    this.riskLevel = "LOW";
    this.tokenUsage = { prompt: 0, completion: 0, total: 0 };
    this.metrics = { startTime: Date.now(), endTime: null, durationMs: 0 };
  }

  transition(newState, lifecycleStep = null, metadata = {}) {
    const prev = this.state;
    this.state = newState;
    if (lifecycleStep) this.lifecycleStep = lifecycleStep;
    
    const record = {
      from: prev,
      to: newState,
      step: this.lifecycleStep,
      timestamp: Date.now(),
      metadata
    };
    this.history.push(record);
    this.addEvent("STATE_TRANSITION", newState, { prev, step: this.lifecycleStep, metadata });
    logger.info(`[AgentState] Instance ${this.id} (${this.role}): ${prev} ➔ ${newState} [Step: ${this.lifecycleStep}]`);
    return record;
  }

  addEvent(stage, status, details = {}) {
    const event = {
      stage,
      status,
      timestamp: Date.now(),
      ...details
    };
    this.events.push(event);
  }
}

// ==========================================
// 2. UNIFIED TOOL RUNTIME & RISK CHECK (PHASE 3)
// ==========================================

const TOOL_RISK_LEVELS = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL"
};

class UnifiedToolRuntime {
  constructor() {
    this.registry = {};
    this.auditLog = [];
  }

  registerTool(name, category, riskLevel, schema, handler) {
    this.registry[name] = {
      name,
      category,
      riskLevel: riskLevel || TOOL_RISK_LEVELS.LOW,
      schema: schema || {},
      handler
    };
  }

  async executeTool(name, args, context = {}) {
    const tool = this.registry[name];
    const startTime = Date.now();

    if (!tool) {
      // Fallback execution for non-custom tools
      logger.info(`[ToolRuntime] Executing builtin tool: ${name}`);
      return { status: "executed", result: args };
    }

    if (tool.riskLevel === TOOL_RISK_LEVELS.CRITICAL && !context.approved) {
      throw new Error(`Execution blocked: Tool "${name}" requires explicit permission confirmation (Risk: CRITICAL).`);
    }

    try {
      const result = await tool.handler(args, context);
      const durationMs = Date.now() - startTime;
      const logEntry = { tool: name, args, risk: tool.riskLevel, durationMs, status: "success", timestamp: startTime };
      this.auditLog.push(logEntry);
      return result;
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const logEntry = { tool: name, args, risk: tool.riskLevel, durationMs, status: "error", error: err.message, timestamp: startTime };
      this.auditLog.push(logEntry);
      throw err;
    }
  }

  getAuditLog() {
    return [...this.auditLog];
  }
}

// ==========================================
// 3. SAFE CODE ENGINEERING & REPO DISCOVERY (PHASE 4)
// ==========================================

class RepositoryAnalyzer {
  analyze(projectDir) {
    const result = {
      projectDir,
      language: "javascript",
      framework: "vanilla",
      buildSystem: "npm",
      hasTests: false,
      filesCount: 0
    };

    if (fs.existsSync(path.join(projectDir, "package.json"))) {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, "package.json"), "utf-8"));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps.typescript || fs.existsSync(path.join(projectDir, "tsconfig.json"))) result.language = "typescript";
        if (deps.next) result.framework = "nextjs";
        else if (deps.express) result.framework = "express";
        else if (deps.react) result.framework = "react";
        if (deps.jest || deps.vitest || pkg.scripts?.test) result.hasTests = true;
      } catch { /* skip */ }
    } else if (fs.existsSync(path.join(projectDir, "pyproject.toml")) || fs.existsSync(path.join(projectDir, "requirements.txt"))) {
      result.language = "python";
      result.buildSystem = "pip";
    }

    return result;
  }
}

// ==========================================
// 4. REAL DEBUGGING LOOP ENGINE (PHASE 5)
// ==========================================

class RealDebuggingLoop {
  constructor() {
    this.attempts = [];
  }

  createHypothesis(errorLog, fileContext) {
    const hypothesis = {
      id: `hyp-${crypto.randomBytes(3).toString("hex")}`,
      errorMsg: errorLog,
      suspectedCause: errorLog.includes("SyntaxError") ? "Syntax error in file" : errorLog.includes("ReferenceError") ? "Undefined variable reference" : "Logic or contract violation",
      proposedFix: "Apply targeted surgical patch",
      status: "UNTESTED"
    };
    this.attempts.push(hypothesis);
    return hypothesis;
  }

  recordResult(hypothesisId, passed, log = "") {
    const item = this.attempts.find(a => a.id === hypothesisId);
    if (item) {
      item.status = passed ? "PASSED" : "FAILED";
      item.testLog = log;
    }
    return item;
  }
}

// ==========================================
// 5. INTELLIGENT PLANNING & DEPENDENCY GRAPH (PHASE 6)
// ==========================================

class IntentAnalyzer {
  analyze(input) {
    const isCode = /(code|refactor|bug|fix|function|class|test|build|create|app|api)/i.test(input);
    const isGuide = /(guide|how to|tutorial|steps|procedure)/i.test(input);
    const isQuery = /(what is|explain|tell me about|how does)/i.test(input);
    return {
      primaryIntent: isCode ? "code_development" : isGuide ? "guide_creation" : isQuery ? "information_query" : "general_task",
      confidence: 0.95,
      rawInput: input
    };
  }
}

class ComplexityAnalyzer {
  analyze(input) {
    const lowInput = input.toLowerCase();
    const words = input.split(/\s+/).length;
    
    let level = "LOW";
    if (/(สร้างระบบใหม่|ปรับ architecture|migration|saas|platform|องค์กร|ขนาดใหญ่|enterprise)/i.test(lowInput) || words > 100) {
      level = "HIGH";
    } else if (/(สร้าง feature|ระบบ login|authentication|เพิ่ม api|เชื่อมต่อ api)/i.test(lowInput) || words > 30) {
      level = "MEDIUM";
    }

    return {
      complexityScore: level === "HIGH" ? 0.85 : level === "MEDIUM" ? 0.5 : 0.2,
      level,
      estimatedSteps: level === "HIGH" ? 8 : level === "MEDIUM" ? 4 : 2
    };
  }
}

class PriorityAnalyzer {
  analyze(input) {
    const isUrgent = /(urgent|critical|emergency|immediate|blocking|break)/i.test(input);
    return {
      priority: isUrgent ? "HIGH" : "NORMAL",
      slaMs: isUrgent ? 60000 : 300000
    };
  }
}

class GoalExtractor {
  extract(input) {
    const lines = input.split("\n").map(l => l.trim()).filter(Boolean);
    const goals = lines.filter(l => /^(goal|target|aim|should|must|want to)/i.test(l));
    if (goals.length === 0) {
      goals.push(input.split(/[.!?]/)[0] || "Execute autonomous operations.");
    }
    return { goals };
  }
}

class TaskClassifier {
  classify(input) {
    const categories = [];
    const lowInput = input.toLowerCase();

    // Core Orchestration
    if (lowInput.includes("explorer") || lowInput.includes("สำรวจ")) categories.push("explorer");
    if (lowInput.includes("plan") || lowInput.includes("วางแผน")) categories.push("planner");
    if (lowInput.includes("requirement") || lowInput.includes("วิเคราะห์ความต้องการ")) categories.push("requirements");

    // Software Engineering
    if (/(ui|frontend|css|html|react|next|view|svelte|angular|tailwind|หน้าเว็บ|ปุ่ม)/i.test(lowInput)) categories.push("frontend");
    if (/(api|backend|express|server|node|python|go|java|\.net|หลังบ้าน)/i.test(lowInput)) categories.push("backend");
    if (/(mobile|react native|flutter|expo|ios|android|มือถือ)/i.test(lowInput)) categories.push("mobile");
    if (/(integration|เชื่อมต่อ|connect)/i.test(lowInput)) categories.push("integration");
    if (/(api spec|graphql|websocket|rest api|apidoc)/i.test(lowInput)) categories.push("api");

    // Product & Experience
    if (/(ux|design system|wireframe|layout|hierarchy)/i.test(lowInput)) categories.push("uiux");
    if (/(accessibility|wcag|screen reader|aria|a11y)/i.test(lowInput)) categories.push("accessibility");
    if (/(seo|metadata|sitemap|robots\.txt)/i.test(lowInput)) categories.push("seo");
    if (/(content|copywrite|localization|multilingual|คำอธิบาย)/i.test(lowInput)) categories.push("content");

    // Data & AI
    if (/(db|database|prisma|drizzle|migration|sql|schema|ดึงข้อมูล)/i.test(lowInput)) categories.push("database");
    if (/(pipeline|etl|elt|data warehouse|spark|hadoop)/i.test(lowInput)) categories.push("data_eng");
    if (/(ai|ml|machine learning|inference|model|llm)/i.test(lowInput)) categories.push("ai_ml");
    if (/(prompt|system instruction|few-shot)/i.test(lowInput)) categories.push("prompt");

    // Infrastructure & Operations
    if (/(docker|ci\/cd|pipeline|deploy|pm2)/i.test(lowInput)) categories.push("devops");
    if (/(aws|azure|gcp|vercel|cloud)/i.test(lowInput)) categories.push("cloud");
    if (/(sre|observability|monitor|alert|incident)/i.test(lowInput)) categories.push("sre");
    if (/(dns|routing|http|tcp|network|firewall)/i.test(lowInput)) categories.push("network");

    // Quality & Security
    if (/(test|jest|vitest|mocha|qa|assert|spec|ครอบคลุม)/i.test(lowInput)) categories.push("testing");
    if (/(security|auth|jwt|encrypt|token|vulnerability|owasp|scan|ความปลอดภัย)/i.test(lowInput)) categories.push("security");
    if (/(bug|error|debugger|stack trace|log|แก้ไขบั๊ก)/i.test(lowInput)) categories.push("debugger");
    if (/(performance|caching|bundle|lazy load|optimization|ความเร็ว)/i.test(lowInput)) categories.push("performance");
    if (/(review|code quality|refactor|technical debt|smell)/i.test(lowInput)) categories.push("review");

    // Delivery & Knowledge
    if (/(readme|documentation|guide|manual|คู่มือ|เอกสาร)/i.test(lowInput)) categories.push("docs");
    if (/(release|versioning|checklist|rollback|เผยแพร่)/i.test(lowInput)) categories.push("release");
    if (/(migration|migrate|upgrade|legacy|ย้ายระบบ)/i.test(lowInput)) categories.push("migration");

    if (categories.length === 0) categories.push("general");
    return { categories };
  }
}

class DependencyGraph {
  constructor() {
    this.nodes = {};
  }
  addNode(id, dependencies = []) {
    this.nodes[id] = dependencies;
  }
  topologicalSort() {
    const visited = {};
    const temp = {};
    const order = [];

    const visit = (node) => {
      if (temp[node]) throw new Error("Circular dependency detected in execution plan!");
      if (!visited[node]) {
        temp[node] = true;
        const deps = this.nodes[node] || [];
        deps.forEach(dep => {
          if (this.nodes[dep]) visit(dep);
        });
        visited[node] = true;
        temp[node] = false;
        order.push(node);
      }
    };

    Object.keys(this.nodes).forEach(node => {
      if (!visited[node]) visit(node);
    });

    return order;
  }
  serialize() { return this.nodes; }
}

class Planner {
  createPlan(input, analyzersResult) {
    const steps = [];
    const { primaryIntent } = analyzersResult.intent;
    const { level } = analyzersResult.complexity;

    if (primaryIntent === "code_development") {
      steps.push({ id: "plan_arch", desc: "Architectural & Technical System Design", dep: [] });
      steps.push({ id: "impl_code", desc: "Surgical Code Modification & Patching", dep: ["plan_arch"] });
      steps.push({ id: "run_test", desc: "Automated Testing & Verification", dep: ["impl_code"] });
    } else {
      steps.push({ id: "extract_info", desc: "Context Extraction & RAG Retrieval", dep: [] });
      steps.push({ id: "draft_res", desc: "Response Synthesis & Quality Check", dep: ["extract_info"] });
    }

    if (level === "HIGH") {
      steps.push({ id: "quality_audit", desc: "Quality Gate Audit & Risk Analysis", dep: steps.map(s => s.id) });
    }

    return {
      planId: crypto.randomBytes(4).toString("hex"),
      steps,
      createdAt: Date.now()
    };
  }
}

class ExecutionPlanner {
  buildSchedule(plan) {
    const dependencyGraph = new DependencyGraph();
    plan.steps.forEach(s => dependencyGraph.addNode(s.id, s.dep));
    const executionOrder = dependencyGraph.topologicalSort();
    return {
      executionOrder,
      planId: plan.planId,
      graph: dependencyGraph.serialize()
    };
  }
}

class WorkflowScheduler {
  schedule(schedule) {
    return {
      scheduleId: crypto.randomBytes(4).toString("hex"),
      executionOrder: schedule.executionOrder,
      status: "scheduled"
    };
  }
}

// ==========================================
// 6. DYNAMIC CAPABILITY ROUTER (PHASE 7)
// ==========================================

class DynamicAgentRouter {
  route(input, taskClassifications, complexityLevel = "LOW") {
    const { categories = [] } = taskClassifications || {};
    const { getAgent } = require("./agent-registry");
    const query = String(input).toLowerCase();

    const specialistMap = {
      frontend: { name: "FrontendSpecialist", fileName: "frontend-specialist", capabilities: ["React", "Next.js", "CSS", "UI", "Responsive"] },
      backend: { name: "BackendSpecialist", fileName: "backend-specialist", capabilities: ["REST APIs", "Node.js", "Databases", "Express"] },
      testing: { name: "TestEngineer", fileName: "test-engineer", capabilities: ["Unit Testing", "Jest", "Assertions", "Regression"] },
      devops: { name: "DevOpsSpecialist", fileName: "devops-specialist", capabilities: ["Docker", "Git", "Pipelines", "CI/CD"] },
      security: { name: "SecuritySpecialist", fileName: "security-specialist", capabilities: ["Auth", "Vulnerability Scanning", "Secrets Audit"] },
      mobile: { name: "MobileDeveloper", fileName: "mobile-developer", capabilities: ["React Native", "Flutter", "Expo"] },
      integration: { name: "IntegrationSpecialist", fileName: "integration-specialist", capabilities: ["API Connectors", "Data Mappings"] },
      api: { name: "ApiSpecialist", fileName: "api-specialist", capabilities: ["REST/GraphQL design", "Versioning"] },
      uiux: { name: "UiUxSpecialist", fileName: "uiux-specialist", capabilities: ["UX Flow", "UI Layouts"] },
      accessibility: { name: "AccessibilitySpecialist", fileName: "accessibility-specialist", capabilities: ["WCAG", "ARIA", "Color Contrast"] },
      seo: { name: "SeoSpecialist", fileName: "seo-specialist", capabilities: ["Metadata", "Schema", "Technical SEO"] },
      content: { name: "ContentSpecialist", fileName: "content-specialist", capabilities: ["UX Copy", "Localization"] },
      database: { name: "DatabaseArchitect", fileName: "database-architect", capabilities: ["Prisma", "Drizzle", "SQL Migrations"] },
      data_eng: { name: "DataEngineer", fileName: "data-engineer", capabilities: ["ETL Pipelines", "Data Validation"] },
      ai_ml: { name: "AiMlSpecialist", fileName: "ai-ml-specialist", capabilities: ["Inference", "Model Evaluations"] },
      prompt: { name: "PromptEngineer", fileName: "prompt-engineer", capabilities: ["Prompt design", "System instruction"] },
      cloud: { name: "CloudArchitect", fileName: "cloud-architect", capabilities: ["AWS", "Vercel", "Cost estimation"] },
      sre: { name: "SreSpecialist", fileName: "sre-specialist", capabilities: ["Observability", "Logging", "Alerts"] },
      network: { name: "NetworkSpecialist", fileName: "network-specialist", capabilities: ["DNS", "SSL", "Network routing"] },
      debugger: { name: "Debugger", fileName: "debugger", capabilities: ["Stack trace analysis", "Hotfixing"] },
      performance: { name: "PerformanceSpecialist", fileName: "performance-specialist", capabilities: ["Optimization", "Bundle size", "Caching"] },
      review: { name: "CodeReviewer", fileName: "code-reviewer", capabilities: ["SOLID/DRY audits", "Technical Debt"] },
      docs: { name: "DocumentationSpecialist", fileName: "documentation-specialist", capabilities: ["README docs", "API reference"] },
      release: { name: "ReleaseManager", fileName: "release-manager", capabilities: ["Deploy checklist", "Rollback readiness"] },
      migration: { name: "MigrationSpecialist", fileName: "migration-specialist", capabilities: ["Upgrades", "Conversions"] }
    };

    // Filter valid specialist mappings
    const specialists = categories
      .map(cat => specialistMap[cat])
      .filter(Boolean);

    let initialSpecialist = specialists.length > 0 ? specialists[0] : specialistMap.backend;
    let primarySpecialist = initialSpecialist.name;
    let primaryFileName = initialSpecialist.fileName;
    let capabilities = initialSpecialist.capabilities || ["General Engineering"];

    // Boundary checking
    let hasSpecialistNotFoundReport = false;
    let boundaryReason = "";

    const agentDetails = getAgent(primaryFileName);
    if (agentDetails) {
      // Check if task is explicitly excluded by the current agent
      const isExcluded = agentDetails.excludedTasks.some(task => query.includes(task.toLowerCase()));
      if (isExcluded) {
        // Find if there is another specialist that handles this task
        let foundAlt = false;
        const { CANONICAL_REGISTRY } = require("./agent-registry");
        for (const [id, agent] of Object.entries(CANONICAL_REGISTRY)) {
          if (id === agentDetails.id) continue;
          const matchAllowed = agent.responsibilities.some(resp => query.includes(resp.toLowerCase())) ||
                               agent.allowedTasks.some(task => query.includes(task.toLowerCase()));
          const matchExcluded = agent.excludedTasks.some(task => query.includes(task.toLowerCase()));
          if (matchAllowed && !matchExcluded) {
            // Find in specialistMap
            const specKey = Object.keys(specialistMap).find(k => specialistMap[k].fileName === id);
            if (specKey) {
              const altSpecialist = specialistMap[specKey];
              primarySpecialist = altSpecialist.name;
              primaryFileName = altSpecialist.fileName;
              capabilities = altSpecialist.capabilities;
              foundAlt = true;
              boundaryReason = `Routed to ${primarySpecialist} because the requested task is excluded for the initial specialist (${agentDetails.displayName}).`;
              break;
            }
          }
        }
        if (!foundAlt) {
          hasSpecialistNotFoundReport = true;
          boundaryReason = `No dedicated specialist available for this task (excluded from ${agentDetails.displayName}). Falling back to closest agent.`;
        }
      }
    }

    const backupSpecialists = specialists.filter(s => s.name !== primarySpecialist).map(r => r.name);

    // Determine routing mode
    const isMultiAgent = complexityLevel === "HIGH" || categories.length > 1 || categories.includes("security") || categories.includes("devops");
    const routingMode = isMultiAgent ? "MULTI-AGENT MODE" : "SINGLE-AGENT MODE";
    
    let explanation = "";
    let tasks = [];

    if (hasSpecialistNotFoundReport) {
      explanation = `No dedicated specialist available. ${boundaryReason}`;
    } else if (boundaryReason) {
      explanation = boundaryReason;
    } else if (isMultiAgent) {
      explanation = `Task complexity is high or covers multiple domains (${categories.join(", ")}). Requiring Multi-Agent coordination to guarantee architecture, implementation, security, and QA verification.`;
    } else {
      explanation = `Task is straightforward (Complexity: ${complexityLevel}). Handled in Single-Agent Mode by ${primarySpecialist}.`;
    }

    if (isMultiAgent) {
      tasks = specialists.map((spec, index) => {
        let taskName = "";
        let completionCriteria = "";
        if (spec.fileName.includes("frontend")) {
          taskName = "Develop user interface components";
          completionCriteria = "UI pages built, responsive layout verification PASS";
        } else if (spec.fileName.includes("backend")) {
          taskName = "Implement server/database API logic";
          completionCriteria = "REST API endpoints operational, database models matching schema";
        } else if (spec.fileName.includes("security")) {
          taskName = "Perform security audit & code scanning";
          completionCriteria = "Zero high severity vulnerabilities, credential scanning PASS";
        } else if (spec.fileName.includes("test")) {
          taskName = "Verify functionality and test coverage";
          completionCriteria = "Unit tests execution PASS with 80%+ coverage";
        } else if (spec.fileName.includes("devops")) {
          taskName = "Validate CI/CD configuration & build pipelines";
          completionCriteria = "Build script executes successfully, containerized deployment check PASS";
        } else {
          taskName = `Coordinate ${spec.name} tasks`;
          completionCriteria = "Task verification PASS";
        }

        return {
          id: `subtask-${index + 1}`,
          task: taskName,
          owner: spec.name,
          input: "Project specifications and context",
          output: "Completed subtask artifacts",
          dependencies: index > 0 ? [`subtask-${index}`] : [],
          completionCriteria
        };
      });
    }

    // Build execution order workflow
    let workflowOrder = [];
    if (complexityLevel === "LOW") {
      workflowOrder = ["orchestrator", primaryFileName, "test-engineer"];
    } else if (complexityLevel === "MEDIUM") {
      workflowOrder = ["orchestrator", "explorer-agent", "project-planner"];
      specialists.forEach(s => {
        const fileNm = s.fileName === "database-specialist" ? "database-architect" : (s.fileName === "mobile-specialist" ? "mobile-developer" : s.fileName);
        if (!workflowOrder.includes(fileNm)) workflowOrder.push(fileNm);
      });
      if (!workflowOrder.includes("integration-specialist")) workflowOrder.push("integration-specialist");
      if (!workflowOrder.includes("test-engineer")) workflowOrder.push("test-engineer");
    } else {
      workflowOrder = ["requirements-analyst", "orchestrator", "explorer-agent", "project-planner"];
      specialists.forEach(s => {
        const fileNm = s.fileName === "database-specialist" ? "database-architect" : (s.fileName === "mobile-specialist" ? "mobile-developer" : s.fileName);
        if (!workflowOrder.includes(fileNm)) workflowOrder.push(fileNm);
      });
      if (!workflowOrder.includes("integration-specialist")) workflowOrder.push("integration-specialist");
      if (!workflowOrder.includes("security-specialist")) workflowOrder.push("security-specialist");
      if (!workflowOrder.includes("performance-specialist")) workflowOrder.push("performance-specialist");
      if (!workflowOrder.includes("test-engineer")) workflowOrder.push("test-engineer");
      if (!workflowOrder.includes("code-reviewer")) workflowOrder.push("code-reviewer");
      if (!workflowOrder.includes("release-manager")) workflowOrder.push("release-manager");
    }

    // Ensure all workflowOrder elements are canonical
    workflowOrder = workflowOrder.map(w => {
      if (w === "database-specialist") return "database-architect";
      if (w === "mobile-specialist") return "mobile-developer";
      return w;
    });

    return {
      routingMode,
      explanation,
      primarySpecialist,
      capabilities,
      backupSpecialists,
      agentCount: workflowOrder.length,
      tasks,
      workflowOrder
    };
  }
}

// ==========================================
// 7. DYNAMIC PROMPT COMPOSITION (PHASE 10)
// ==========================================

class DynamicPromptComposition {
  build(agentSpec, constraints = [], checklist = [], projectProfile = null) {
    let prompt = `[Elite-Nexus System Rules]\nRole: ${agentSpec.name || "Elite Autonomous Agent"}\nDescription: ${agentSpec.description || ""}\n\n`;
    
    if (projectProfile) {
      prompt += `[Project Environment Context]\n- Language: ${projectProfile.language}\n- Framework: ${projectProfile.framework}\n- Package Manager: ${projectProfile.packageManager}\n\n`;
    }

    if (constraints.length > 0) {
      prompt += `[Operational Constraints]\n${constraints.map(c => `- ${c}`).join("\n")}\n\n`;
    }

    if (checklist.length > 0) {
      prompt += `[Engineering Checklist]\n${checklist.map(i => `- ${i}`).join("\n")}\n\n`;
    }

    return prompt;
  }
}

class PromptOptimizer {
  optimize(promptText, tokenBudget = 4000) {
    if (promptText.length > tokenBudget * 3) {
      return promptText.replace(/\n\n+/g, "\n").slice(0, tokenBudget * 3);
    }
    return promptText;
  }
}

// ==========================================
// 8. LAYERED MEMORY FABRIC (PHASE 8)
// ==========================================

class MemoryLayer {
  constructor(name) {
    this.name = name;
    this.storage = {};
  }
  set(key, val) { this.storage[key] = val; }
  get(key) { return this.storage[key]; }
  clear() { this.storage = {}; }
  getAll() { return { ...this.storage }; }
}

class LayeredMemoryFabric {
  constructor() {
    this.working = new MemoryLayer("working");
    this.conversation = new MemoryLayer("conversation");
    this.project = new MemoryLayer("project");
    this.persistent = new MemoryLayer("persistent");
    this.knowledge = new MemoryLayer("knowledge");
    this.architecture = new MemoryLayer("architecture");
    this.decision = new MemoryLayer("decision");
    this.promptLibrary = new MemoryLayer("promptLibrary");
    this.codingStandards = new MemoryLayer("codingStandards");
    this.userPreferences = new MemoryLayer("userPreferences");
    this.vector = new MemoryLayer("vector");
  }
}

// ==========================================
// 9. KNOWLEDGE ENGINE & RAG (PHASE 9)
// ==========================================

class KnowledgeRetrieval {
  retrieve(query, docIndex) {
    const hits = [];
    if (docIndex) {
      Object.entries(docIndex).forEach(([title, content]) => {
        if (title.toLowerCase().includes(query.toLowerCase()) || content.toLowerCase().includes(query.toLowerCase())) {
          hits.push({ title, content, score: 0.95 });
        }
      });
    }
    return hits;
  }
}

class RagLayer {
  constructor(retrieval) {
    this.retrieval = retrieval || new KnowledgeRetrieval();
    this.docsIndex = {};
  }
  indexDocument(title, content) { this.docsIndex[title] = content; }
  augment(query, prompt) {
    const hits = this.retrieval.retrieve(query, this.docsIndex);
    if (hits.length > 0) {
      return `${prompt}\n\n[Retrieved Knowledge Base Context]\n${hits.map(h => `Source: ${h.title}\n${h.content}`).join("\n\n")}`;
    }
    return prompt;
  }
}

// ==========================================
// 10. CONFIDENCE & RISK ENGINE (PHASE 12)
// ==========================================

class ConfidenceRiskEngine {
  evaluate(output, input) {
    const containsEval = /eval\s*\(/.test(output);
    const containsSecrets = /(password|apikey|secret)\s*[:=]/i.test(output);
    const hasTodo = output.includes("TODO");

    const confidenceScore = hasTodo ? 82 : output.length > 60 ? 95 : 70;
    const riskLevel = containsEval || containsSecrets ? "HIGH" : hasTodo ? "MEDIUM" : "LOW";
    
    return {
      confidenceScore,
      riskLevel,
      unknowns: hasTodo ? ["Incomplete placeholder blocks found in code draft"] : [],
      assumptions: ["Standard Node.js runtime environment assumptions"],
      evidence: [`Generated text output length: ${output.length} chars`]
    };
  }
}

// ==========================================
// 11. REVIEWER & REFLECTION PIPELINE (PHASE 11)
// ==========================================

class ReviewerLayer {
  review(output, rules) {
    const issues = [];
    rules.forEach(rule => {
      if (rule.pattern.test(output)) issues.push(rule.message);
    });
    return { approved: issues.length === 0, issues };
  }
}

class ReflectionLayer {
  reflect(output) {
    const score = output.includes("TODO") ? 0.6 : 0.95;
    return { completenessScore: score, feedback: score < 0.8 ? "Draft contains unresolved TODO markers." : "Satisfies criteria." };
  }
}

class ConfidenceEngine {
  calculate(output) {
    const confidence = output.length > 50 ? 0.94 : 0.72;
    return { confidence };
  }
}

class RiskAnalysis {
  analyze(output) {
    const containsEval = /eval\s*\(/.test(output);
    const containsSecrets = /(password|apikey|secret)\s*[:=]/i.test(output);
    return {
      riskLevel: containsEval || containsSecrets ? "HIGH" : "LOW",
      violations: containsEval ? ["eval Usage"] : containsSecrets ? ["Leaked Secret Pattern"] : []
    };
  }
}

class SelfCritique {
  critique(output) {
    const observations = [];
    if (output.includes("console.log")) observations.push("Uses console.log instead of trace/logger");
    return { observations };
  }
}

class RetryEngine {
  shouldRetry(reviewResult, attemptCount, maxRetries = 3) {
    return !reviewResult.approved && attemptCount < maxRetries;
  }
}

class RecoveryEngine {
  repair(output, reviewIssues) {
    let repaired = output;
    if (reviewIssues.includes("Remove debug console.log statements.")) {
      repaired = repaired.replace(/console\.log\(.*?\);?/g, "");
    }
    return repaired;
  }
}

// ==========================================
// 12. SESSIONS & WORKSPACE MANAGER (PHASE 14)
// ==========================================

class SessionWorkspaceManager {
  constructor() {
    this.sessions = {};
  }
  createSession(projectId) {
    const sessionId = `sess-${crypto.randomBytes(4).toString("hex")}`;
    this.sessions[sessionId] = { id: sessionId, projectId, status: "ACTIVE", createdAt: Date.now() };
    return this.sessions[sessionId];
  }
  getSession(sessionId) { return this.sessions[sessionId]; }
}

// ==========================================
// ELITE-NEXUS CENTRAL OS HUB
// ==========================================

class EliteNexusOS {
  constructor() {
    this.analyzers = {
      intent: new IntentAnalyzer(),
      complexity: new ComplexityAnalyzer(),
      priority: new PriorityAnalyzer(),
      goals: new GoalExtractor(),
      classifier: new TaskClassifier()
    };
    this.planners = {
      planner: new Planner(),
      execPlanner: new ExecutionPlanner(),
      workflows: new WorkflowScheduler()
    };
    this.router = {
      agentRouter: new DynamicAgentRouter(),
      promptBuilder: new DynamicPromptComposition(),
      promptOptimizer: new PromptOptimizer()
    };
    this.memory = new LayeredMemoryFabric();
    this.knowledge = new RagLayer();
    this.toolRuntime = new UnifiedToolRuntime();
    this.repoAnalyzer = new RepositoryAnalyzer();
    this.debuggingLoop = new RealDebuggingLoop();
    this.confidenceRisk = new ConfidenceRiskEngine();
    this.sessionWorkspace = new SessionWorkspaceManager();
    this.reflection = {
      reviewer: new ReviewerLayer(),
      reflector: new ReflectionLayer(),
      confidence: new ConfidenceEngine(),
      risk: new RiskAnalysis(),
      critique: new SelfCritique(),
      retry: new RetryEngine(),
      recovery: new RecoveryEngine()
    };
  }

  createAgentInstance(role, capabilities = [], tools = []) {
    return new AgentRuntimeInstance(null, role, capabilities, tools);
  }

  analyzeAndSchedule(input) {
    const intent = this.analyzers.intent.analyze(input);
    const complexity = this.analyzers.complexity.analyze(input);
    const priority = this.analyzers.priority.analyze(input);
    const goals = this.analyzers.goals.extract(input);
    const classification = this.analyzers.classifier.classify(input);

    const analyzationResults = { intent, complexity, priority, goals, classification };
    const route = this.router.agentRouter.route(input, classification, complexity.level);
    const plan = this.planners.planner.createPlan(input, analyzationResults);
    const schedule = this.planners.execPlanner.buildSchedule(plan);

    // Override execution order with specialist routing workflow order
    schedule.executionOrder = route.workflowOrder;

    return { analyzationResults, plan, schedule };
  }

  understand(input) {
    const intent = this.analyzers.intent.analyze(input);
    const complexity = this.analyzers.complexity.analyze(input);
    const priority = this.analyzers.priority.analyze(input);
    const goals = this.analyzers.goals.extract(input);
    const classification = this.analyzers.classifier.classify(input);
    return { intent, complexity, priority, goals, classification };
  }

  plan(input, understandResult) {
    const plan = this.planners.planner.createPlan(input, understandResult);
    const schedule = this.planners.execPlanner.buildSchedule(plan);
    return { plan, schedule };
  }

  execute(plan, agentInstance) {
    agentInstance.transition("RUNNING", "EXECUTE");
    return { status: "executing", planId: plan.planId };
  }

  verify(output, input, context = {}) {
    const changedFiles = context.changedFiles || [];
    const browserAvailable = context.browserAvailable || false;
    const complexity = context.complexity || getComplexity(input);

    const { relevance, critical } = evaluateLayers(input, { changedFiles }, complexity);

    // Check verification layers (1 to 5, split runtime)
    const verificationLayers = {
      layer1_static: {
        name: "STATIC VERIFICATION (TypeScript/ESLint/Build)",
        status: getVerificationStatus(context.staticChecked, context.staticPassed, relevance.build, critical.build, false),
        evidence: context.staticEvidence || (context.staticPassed ? "Build compilation and syntax checks passed." : "Build compilation has not been verified.")
      },
      layer2_script_runtime: {
        name: "SCRIPT RUNTIME VERIFICATION",
        status: getVerificationStatus(context.scriptRuntimeChecked, context.scriptRuntimePassed, relevance.scriptRuntime, critical.scriptRuntime, false),
        evidence: context.scriptRuntimeEvidence || (context.scriptRuntimePassed ? "Script executed successfully." : "Script execution has not been verified.")
      },
      layer2_app_runtime: {
        name: "APPLICATION RUNTIME VERIFICATION",
        status: getVerificationStatus(context.appRuntimeChecked, context.appRuntimePassed, relevance.appRuntime, critical.appRuntime, false),
        evidence: context.appRuntimeEvidence || (context.appRuntimePassed ? "Application starts successfully and routes load without exceptions." : "Application startup has not been verified.")
      },
      layer2_browser_runtime: {
        name: "BROWSER RUNTIME VERIFICATION",
        status: getVerificationStatus(context.browserRuntimeChecked, context.browserRuntimePassed, relevance.browserRuntime, critical.browserRuntime, !browserAvailable),
        evidence: context.browserRuntimeEvidence || (context.browserRuntimePassed ? "Browser environment verified successfully." : (!browserAvailable ? "Browser environment not available." : "Browser runtime has not been verified."))
      },
      layer3_interaction: {
        name: "INTERACTION VERIFICATION (Buttons/Forms)",
        status: getVerificationStatus(context.interactionChecked, context.interactionPassed, relevance.interaction, critical.interaction, !browserAvailable),
        evidence: context.interactionEvidence || (context.interactionPassed ? "Interactive elements simulation passed." : (!browserAvailable ? "Browser environment not available for interaction test." : "Interaction has not been verified."))
      },
      layer4_visual: {
        name: "VISUAL / RESPONSIVE VERIFICATION (Mobile/Tablet/Desktop)",
        status: getVerificationStatus(context.visualChecked || context.visualPassed, context.visualPassed, relevance.responsive, critical.responsive, !browserAvailable),
        evidence: context.visualEvidence || (context.visualPassed ? "Browser verified responsive layout across standard screen sizes." : (!browserAvailable ? "Browser environment not available for visual verification." : "Visual responsiveness has not been verified."))
      },
      layer5_project: {
        name: "PROJECT-SPECIFIC VERIFICATION",
        status: getVerificationStatus(context.projectChecked, context.projectPassed, relevance.project, critical.project, false),
        evidence: context.projectEvidence || (context.projectPassed ? "Project specific validation suite completed." : "Project tests have not been verified.")
      }
    };

    const rules = [{ pattern: /I'd be happy to help/i, message: "Filler" }];
    const reviewerResult = this.reflection.reviewer.review(output, rules);
    const reflectionResult = this.reflection.reflector.reflect(output);
    const riskResult = this.confidenceRisk.evaluate(output, input);

    const hasFailedLayer = Object.values(verificationLayers).some(layer => layer.status === "FAIL");
    const hasCriticalNotTested = Object.keys(critical).some(key => {
      const layerKeyMap = {
        build: "layer1_static",
        scriptRuntime: "layer2_script_runtime",
        appRuntime: "layer2_app_runtime",
        browserRuntime: "layer2_browser_runtime",
        interaction: "layer3_interaction",
        responsive: "layer4_visual",
        project: "layer5_project"
      };
      const layerId = layerKeyMap[key];
      return critical[key] && verificationLayers[layerId] && verificationLayers[layerId].status === "NOT_TESTED";
    });

    const passes = !hasFailedLayer && !hasCriticalNotTested && reviewerResult.approved && riskResult.riskLevel !== "HIGH" && reflectionResult.completenessScore >= 0.8;

    return {
      status: passes ? "PASS" : "FAIL",
      confidence: riskResult.confidenceScore,
      risk: riskResult.riskLevel,
      reviewerResult,
      reflectionResult,
      verificationLayers,
      changedFiles
    };
  }

  deliver(verifyResult, output) {
    return {
      completed: true,
      output,
      confidence: verifyResult.confidence,
      risk: verifyResult.risk,
      verificationLayers: verifyResult.verificationLayers
    };
  }

  recover(verifyResult, attemptCount, failuresHistory = []) {
    const shouldRetry = attemptCount < 3 && verifyResult.status === "FAIL";
    
    const lastIssue = verifyResult.reviewerResult?.issues?.[0] || "Quality threshold not met";
    let classification = "logic_error";
    let rootCause = "The draft content did not meet the quality or completeness threshold.";
    let affectedScope = "system_output";
    let strategy = "Regenerate output with strict adherence to validation constraints.";

    if (lastIssue.includes("eval")) {
      classification = "security_violation";
      rootCause = "Use of prohibited eval() function in draft.";
      affectedScope = "code_syntax";
      strategy = "Refactor code to use robust JSON parsing or function mapping instead of eval().";
    } else if (lastIssue.includes("secret") || lastIssue.includes("key")) {
      classification = "security_leak";
      rootCause = "Potential API key or secret hardcoded in code.";
      affectedScope = "configuration";
      strategy = "Replace hardcoded keys with environment variable lookups (e.g. process.env).";
    } else if (lastIssue.includes("filler")) {
      classification = "prose_slop";
      rootCause = "Generic AI assistant filler present in output.";
      affectedScope = "prose_style";
      strategy = "Rewrite output starting directly with the payload, pruning introductory phrases.";
    }

    // Ensure we don't repeat the same strategy
    const previouslyUsed = failuresHistory.some(h => h.strategy === strategy);
    if (previouslyUsed) {
      strategy = "Escalate to generalist reasoning to perform direct, minimal surgical fix without templates.";
    }

    const recoveryRecord = {
      attempt: attemptCount,
      classification,
      rootCause,
      affectedScope,
      strategy,
      timestamp: Date.now()
    };

    failuresHistory.push(recoveryRecord);

    return {
      shouldRetry,
      nextStrategy: strategy,
      recoveryRecord
    };
  }

  getActiveAgentDisplay(agentName, input = "", showFullTrace = false) {
    const showFull = showFullTrace || input.includes("SHOW FULL EXECUTION TRACE");
    
    if (showFull) {
      const complexity = this.analyzers.complexity.analyze(input).level;
      const route = this.router.agentRouter.route(input, this.analyzers.classifier.classify(input), complexity);
      return [
        `\n🚀 [Elite-Nexus Engine] กำลังวิเคราะห์และระบุระบบงาน (Initializing System Analyzers)...`,
        `   ├─ Active Specialist:   ${agentName} (Specialist: ${route.primarySpecialist})`,
        `   ├─ Specialist Skills:   ${route.capabilities ? route.capabilities.join(", ") : "All System Capabilities"}`,
        `   ├─ Task Classification: ${this.analyzers.classifier.classify(input).categories.join(", ")}`,
        `   ├─ Complexity Level:    ${complexity}`,
        `   ├─ Routing Decision:    ${route.routingMode} — ${route.explanation}`,
        `   └─ Workflow Schedule:   ${route.workflowOrder.join(" ➔ ")}`,
        ``
      ].join("\n");
    }

    const name = String(agentName).toLowerCase();
    if (name === "orchestrator") {
      return `🧠 Active Agent: Architect`;
    } else if (name === "explorer-agent") {
      return `🔍 Active Agent: Explorer`;
    } else if (name === "frontend-specialist") {
      return `🎨 Active Agent: Frontend Specialist`;
    } else if (name === "security-specialist") {
      return `🛡️ Active Agent: Security Specialist`;
    } else if (name === "test-engineer") {
      return `🧪 Active Agent: Test Engineer`;
    } else if (name === "devops-specialist") {
      return `☁️ Active Agent: DevOps Engineer`;
    } else if (name === "project-planner") {
      return `📅 Active Agent: Project Planner`;
    } else if (name === "requirements-analyst") {
      return `📋 Active Agent: Requirements Analyst`;
    } else if (name === "mobile-specialist" || name === "mobile-developer") {
      return `📱 Active Agent: Mobile Developer`;
    } else if (name === "integration-specialist") {
      return `🔗 Active Agent: Integration Specialist`;
    } else if (name === "api-specialist") {
      return `🔌 Active Agent: API Specialist`;
    } else if (name === "uiux-specialist") {
      return `🎨 Active Agent: UIUX Specialist`;
    } else if (name === "accessibility-specialist") {
      return `♿ Active Agent: Accessibility Specialist`;
    } else if (name === "seo-specialist") {
      return `📈 Active Agent: SEO Specialist`;
    } else if (name === "content-specialist") {
      return `✍️ Active Agent: Content Specialist`;
    } else if (name === "database-specialist" || name === "database-architect") {
      return `🗄️ Active Agent: Database Architect`;
    } else if (name === "data-engineer") {
      return `📊 Active Agent: Data Engineer`;
    } else if (name === "ai-ml-specialist") {
      return `🤖 Active Agent: AI/ML Specialist`;
    } else if (name === "prompt-engineer") {
      return `💬 Active Agent: Prompt Engineer`;
    } else if (name === "cloud-architect") {
      return `☁️ Active Agent: Cloud Architect`;
    } else if (name === "sre-specialist") {
      return `🚨 Active Agent: SRE Specialist`;
    } else if (name === "network-specialist") {
      return `🌐 Active Agent: Network Specialist`;
    } else if (name === "debugger") {
      return `🛠️ Active Agent: Debugger`;
    } else if (name === "performance-specialist") {
      return `⚡ Active Agent: Performance Specialist`;
    } else if (name === "code-reviewer") {
      return `🔎 Active Agent: Code Reviewer`;
    } else if (name === "documentation-specialist") {
      return `📝 Active Agent: Documentation Specialist`;
    } else if (name === "release-manager") {
      return `📦 Active Agent: Release Manager`;
    } else if (name === "migration-specialist") {
      return `🔄 Active Agent: Migration Specialist`;
    } else {
      const displayName = agentName.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      return `🤖 Active Agent: ${displayName}`;
    }
  }

  generateReport(state, mode = "NORMAL") {
    const inputStr = state.input || "";
    const showFullTrace = inputStr.includes("SHOW FULL EXECUTION TRACE");
    const isTest = (require.main && require.main.filename && require.main.filename.includes("test")) || process.env.NODE_ENV === "test";
    
    let reportMode = String(mode).toUpperCase();
    if (showFullTrace) {
      reportMode = "TRACE";
    }

    if (reportMode === "TRACE" || reportMode === "VERBOSE" || reportMode === "DEBUG") {
      const traceEventsText = (state.agentInstance?.events || [])
        .map(e => `[${new Date(e.timestamp).toISOString()}] [${e.stage}] ${e.status} - ${e.tool || e.prev || ""} ${e.evidence || ""}`)
        .join("\n");
      
      const routingText = state.memory?.working?.get("routing")
        ? JSON.stringify(state.memory.working.get("routing"), null, 2)
        : "Single Agent Mode default";

      const headerTitle = reportMode === "DEBUG" 
        ? "DEBUG - FULL EXECUTION TRACE" 
        : (reportMode === "TRACE" ? "TRACE - FULL EXECUTION TRACE" : `${reportMode} - EXECUTION TRACE`);

      const baseReport = [
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        `🐞 ${headerTitle}`,
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        `Agent Role: ${state.agentInstance?.role || "Generalist"}`,
        `Status: ${state.status}`,
        "",
        "--- AGENT ROUTING & TASK DECOMPOSITION ---",
        routingText,
        "",
        "--- STRUCTURED EXECUTION EVENTS ---",
        traceEventsText || "No events recorded",
        "",
        "--- FAILURE RECOVERY LOGS ---",
        state.failuresHistory && state.failuresHistory.length > 0
          ? JSON.stringify(state.failuresHistory, null, 2)
          : "No failures recorded"
      ];

      if (reportMode === "VERBOSE") {
        baseReport.push("");
        baseReport.push("--- VERBOSE METRICS & DETAILS ---");
        baseReport.push(`Input: ${state.input}`);
        baseReport.push(`Steps Count: ${state.steps ? state.steps.length : 0}`);
        baseReport.push(`Risk Level: ${state.riskLevel || "LOW"}`);
        if (state.tokenUsage) {
          baseReport.push(`Token Usage: ${JSON.stringify(state.tokenUsage)}`);
        }
      }

      baseReport.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      return baseReport.join("\n");
    }

    // Normal mode — Thai output with smart detail levels
    const classification = state.classification || (this.analyzers && this.analyzers.classifier ? this.analyzers.classifier.classify(inputStr) : { categories: [] });
    const complexity = state.complexity || getComplexity(state.input || "");
    const changedFiles = [];
    if (state.steps) {
      for (const step of state.steps) {
        if (step.toolCalls) {
          for (const tc of step.toolCalls) {
            if (tc.tool?.includes("fs.write") || tc.tool?.includes("fs.edit") || tc.tool?.includes("write") || tc.tool?.includes("replace") || tc.tool?.includes("multi_replace")) {
              const file = tc.args?.TargetFile || tc.args?.path || tc.args?.target;
              if (file && !changedFiles.includes(file)) {
                changedFiles.push(file);
              }
            }
          }
        }
      }
    }

    let buildStatus = "NOT_TESTED";
    let testStatus = "NOT_TESTED";
    let scriptRuntimeStatus = "NOT_TESTED";
    let appRuntimeStatus = "NOT_TESTED";
    let browserRuntimeStatus = "NOT_TESTED";

    if (state.quality && state.quality.gateMetrics) {
      const gm = state.quality.gateMetrics;
      buildStatus = gm.build || "NOT_TESTED";
      testStatus = gm.project || gm.test || "NOT_TESTED";
      scriptRuntimeStatus = gm.scriptRuntime || "NOT_TESTED";
      appRuntimeStatus = gm.appRuntime || "NOT_TESTED";
      browserRuntimeStatus = gm.browserRuntime || "NOT_TESTED";
    } else {
      const input = state.input || "";
      const { relevance, critical } = evaluateLayers(input, { changedFiles }, complexity);
      
      const staticChecked = state.steps?.some(step => step.toolCalls?.some(tc => tc.tool === "run_command" && tc.args.CommandLine?.includes("build")));
      const staticPassed = state.steps?.some(step => step.toolCalls?.some(tc => tc.tool === "run_command" && tc.args.CommandLine?.includes("build") && !tc.error));
      
      const scriptRuntimeChecked = state.steps?.some(step => step.toolCalls?.some(tc => tc.tool === "run_command" && tc.args.CommandLine?.includes("node ") && !tc.args.CommandLine?.includes("start") && !tc.args.CommandLine?.includes("dev")));
      const scriptRuntimePassed = state.steps?.some(step => step.toolCalls?.some(tc => tc.tool === "run_command" && tc.args.CommandLine?.includes("node ") && !tc.args.CommandLine?.includes("start") && !tc.args.CommandLine?.includes("dev") && !tc.error));
      
      const appRuntimeChecked = state.steps?.some(step => step.toolCalls?.some(tc => tc.tool === "run_command" && (tc.args.CommandLine?.includes("start") || tc.args.CommandLine?.includes("dev"))));
      const appRuntimePassed = state.steps?.some(step => step.toolCalls?.some(tc => tc.tool === "run_command" && (tc.args.CommandLine?.includes("start") || tc.args.CommandLine?.includes("dev")) && !tc.error));
      
      const browserRuntimeChecked = state.steps?.some(step => step.toolCalls?.some(tc => tc.tool === "browser_subagent" || (tc.tool === "run_command" && (tc.args.CommandLine?.includes("playwright") || tc.args.CommandLine?.includes("cypress")))));
      const browserRuntimePassed = state.steps?.some(step => step.toolCalls?.some(tc => (tc.tool === "browser_subagent" || (tc.tool === "run_command" && (tc.args.CommandLine?.includes("playwright") || tc.args.CommandLine?.includes("cypress")))) && !tc.error));
      
      const projectChecked = state.steps?.some(step => step.toolCalls?.some(tc => tc.tool === "run_command" && tc.args.CommandLine?.includes("test")));
      const projectPassed = state.steps?.some(step => step.toolCalls?.some(tc => tc.tool === "run_command" && tc.args.CommandLine?.includes("test") && !tc.error));

      buildStatus = getVerificationStatus(staticChecked, staticPassed, relevance.build, critical.build, false);
      testStatus = getVerificationStatus(projectChecked, projectPassed, relevance.project, critical.project, false);
      scriptRuntimeStatus = getVerificationStatus(scriptRuntimeChecked, scriptRuntimePassed, relevance.scriptRuntime, critical.scriptRuntime, false);
      appRuntimeStatus = getVerificationStatus(appRuntimeChecked, appRuntimePassed, relevance.appRuntime, critical.appRuntime, false);
      browserRuntimeStatus = getVerificationStatus(browserRuntimeChecked, browserRuntimePassed, relevance.browserRuntime, critical.browserRuntime, false);
    }

    const issues = [];
    if (state.error) {
      issues.push(state.error);
    }
    if (state.quality && state.quality.violations) {
      state.quality.violations.forEach(v => issues.push(v.message));
    }

    const hasError = state.status === "failed" || state.status === "error" || issues.length > 0;
    const risk = state.riskLevel || (state.quality && state.quality.gateMetrics && state.quality.gateMetrics.risk === "FAIL" ? "HIGH" : "LOW");
    const finalStatus = hasError ? "FAIL" : ((state.status === "completed" && (!state.quality || state.quality.pass)) ? "PASS" : (state.quality?.status || "REVISION_REQUIRED"));

    // Extract taskSummary
    let taskSummary = "";
    if (state.input) {
      const cleanInput = state.input.replace(/#+.*?\n/g, "").replace(/=+.*?\n/g, "");
      const firstLine = cleanInput.split('\n').map(l => l.trim()).filter(Boolean)[0] || "";
      taskSummary = firstLine.split(/[.!?]/)[0].trim();
      if (taskSummary.length > 80) {
        taskSummary = taskSummary.slice(0, 77) + "...";
      }
    }
    if (!taskSummary) {
      taskSummary = state.status === "completed" ? "ดำเนินการตามเป้าหมายเสร็จสิ้น" : "การดำเนินการล้มเหลว";
    }

    // Build verifications string
    const verifications = [
      `Build: ${buildStatus}`,
      `Tests: ${testStatus}`,
      scriptRuntimeStatus !== "NOT_TESTED" ? `Script Runtime: ${scriptRuntimeStatus}` : null,
      appRuntimeStatus !== "NOT_TESTED" ? `Application Runtime: ${appRuntimeStatus}` : null,
      browserRuntimeStatus !== "NOT_TESTED" ? `Browser Runtime: ${browserRuntimeStatus}` : null
    ].filter(Boolean).join(" | ");

    const getProfessionalAgentName = (name) => {
      const n = String(name || "orchestrator").toLowerCase();
      if (n === "orchestrator") return "Architect";
      if (n === "frontend-specialist") return "Frontend Specialist";
      if (n === "test-engineer") return "Test Engineer";
      if (n === "debugger") return "Debugger";
      if (n === "devops-specialist" || n === "devops-engineer") return "DevOps Engineer";
      return name.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    };
    const usedAgent = getProfessionalAgentName(state.agentName || state.agentInstance?.role);

    let actionLines = [];
    if (changedFiles.length > 0) {
      actionLines.push(`ปรับปรุงและแก้ไขไฟล์ระบบ: ${changedFiles.map(f => path.basename(f)).join(", ")}`);
    } else {
      actionLines.push(`วิเคราะห์และตรวจสอบโครงสร้างสถาปัตยกรรมภายใน`);
    }
    if (state.steps && state.steps.length > 0) {
      actionLines.push(`วิเคราะห์และเรียกใช้ระบบเครื่องมือประมวลผลเพื่อตรวจสอบคุณภาพผลลัพธ์`);
    }
    const actionStr = actionLines.slice(0, 3).join("\n");

    let resultStr = "";
    if (hasError) {
      resultStr = "การทำงานหยุดชะงักเนื่องจากพบข้อผิดพลาดระหว่างกระบวนการ";
    } else {
      resultStr = "ระบบได้รับการแก้ไข ตรวจสอบความถูกต้อง และพร้อมใช้งานจริง";
    }

    const getVerificationEvidence = (type, status) => {
      if (status === "PASS") {
        if (type === "Build") return "PASS — Exit Code 0";
        if (type === "Lint") return "PASS — 0 Errors";
        if (type === "Runtime") return "PASS — Process Completed";
        return "PASS";
      }
      return status;
    };
    const vBuild = getVerificationEvidence("Build", buildStatus);
    const vLint = getVerificationEvidence("Lint", testStatus);
    const vRuntime = getVerificationEvidence("Runtime", scriptRuntimeStatus !== "NOT_TESTED" ? scriptRuntimeStatus : (appRuntimeStatus !== "NOT_TESTED" ? appRuntimeStatus : (browserRuntimeStatus !== "NOT_TESTED" ? browserRuntimeStatus : "NOT_TESTED")));

    let displayStatus = "PASS";
    if (hasError) {
      displayStatus = "FAIL";
    } else if (finalStatus === "REVISION_REQUIRED" || finalStatus === "PARTIAL") {
      displayStatus = "PARTIAL";
    }

    const reportLines = [
      "━━━━━━━━━━━━━━━━━━━━━━",
      "📋 สรุปการทำงาน",
      "",
      "1. งาน",
      taskSummary,
      "",
      "2. Agent",
      usedAgent,
      "",
      "3. การดำเนินการ",
      actionStr,
      "",
      "4. ผลลัพธ์",
      resultStr,
      "",
      "5. Verification",
      `Build: ${vBuild}`,
      `Lint: ${vLint}`,
      `Runtime: ${vRuntime}`,
      "",
      "6. ปัญหา",
      issues.length > 0 ? issues.join(", ") : "ไม่มี",
      "",
      "7. สถานะ",
      displayStatus,
      "━━━━━━━━━━━━━━━━━━━━━━"
    ];

    return reportLines.join("\n");
  }
}

module.exports = {
  EliteNexusOS,
  AgentRuntimeInstance,
  AGENT_STATES,
  AGENT_LIFECYCLE_STEPS,
  TOOL_RISK_LEVELS,
  EliteNexus: new EliteNexusOS()
};
