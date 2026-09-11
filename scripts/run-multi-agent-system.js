/**
 * AI Multi-Agent System Prototype for Software Development Helper
 * Implements: Orchestrator, Classification, Complexity, Routing, Context, Memory, Tools, Recovery, Quality Gate
 */

const chalk = require("chalk");

// ==========================================
// 1. CANONICAL REGISTRY & BOUNDARY SYSTEM
// ==========================================

const AGENT_REGISTRY = {
  "api-specialist": {
    id: "api-specialist",
    displayName: "API Specialist",
    role: "Backend API Designer",
    responsibilities: ["API Design", "REST contracts", "Express routing"],
    allowedTasks: ["design rest api", "write controller", "setup router"],
    excludedTasks: ["model training", "prompt design", "ui styling"]
  },
  "prompt-engineer": {
    id: "prompt-engineer",
    displayName: "Prompt Engineer",
    role: "Prompt Optimization Specialist",
    responsibilities: ["Prompt Design", "System Instructions", "Context strategy"],
    allowedTasks: ["design prompt layout", "write system instructions", "optimize prompts"],
    excludedTasks: ["model training", "inference infrastructure", "write database migrations"]
  },
  "ai-ml-specialist": {
    id: "ai-ml-specialist",
    displayName: "AI/ML Specialist",
    role: "Machine Learning Engineer",
    responsibilities: ["Model Selection", "Model Evaluation", "Fine-tuning", "Model Training", "Inference strategy"],
    allowedTasks: ["model selection", "evaluate models", "write ml inference code", "configure embedding model"],
    excludedTasks: ["ui styling", "generic prompt writing", "client side router"]
  },
  "test-engineer": {
    id: "test-engineer",
    displayName: "Test Engineer",
    role: "Quality Assurance Specialist",
    responsibilities: ["Unit Testing", "Integration Testing", "Test Schema Validation"],
    allowedTasks: ["write unit tests", "mock dependencies", "run assertions"],
    excludedTasks: ["deploy production infrastructure", "write raw queries without checks"]
  }
};

// ==========================================
// 2. SUB-SYSTEM IMPLEMENTATIONS
// ==========================================

class TaskClassification {
  static classify(request) {
    const query = request.toLowerCase();
    const categories = [];
    if (/(api|rest|express|router|route)/i.test(query)) categories.push("api");
    if (/(prompt|system instruction|llm template)/i.test(query)) categories.push("prompt");
    if (/(model|ml|ai|evaluation|train|inference)/i.test(query)) categories.push("ai_ml");
    if (/(test|unit test|assert|mock)/i.test(query)) categories.push("testing");
    return categories;
  }
}

class ComplexityDetection {
  static detect(request, categories) {
    const words = request.split(/\s+/).length;
    let level = "LOW";
    let score = 0.2;
    
    if (categories.length >= 3 || words > 20) {
      level = "HIGH";
      score = 0.9;
      return { level, score, stepsCount: 4 };
    } else if (categories.length === 2 || words > 10) {
      level = "MEDIUM";
      score = 0.55;
      return { level, score, stepsCount: 2 };
    }
    return { level, score, stepsCount: 1 };
  }
}

class AgentRouting {
  static route(stepDescription) {
    const query = stepDescription.toLowerCase();
    
    // Check boundaries and match specialists
    for (const [id, agent] of Object.entries(AGENT_REGISTRY)) {
      const isAllowed = agent.allowedTasks.some(t => query.includes(t)) || 
                        agent.responsibilities.some(r => query.includes(r.toLowerCase()));
      const isExcluded = agent.excludedTasks.some(e => query.includes(e));
      
      if (isAllowed && !isExcluded) {
        return agent;
      }
    }
    
    // Default fallback (generalist)
    return { id: "generalist", displayName: "Generalist Specialist", role: "Software Engineer", boundaries: [] };
  }
}

class ShortTermMemory {
  constructor() {
    this.variables = {};
    this.history = [];
  }
  set(key, val) { this.variables[key] = val; }
  get(key) { return this.variables[key]; }
  logEvent(agentId, action, status, details = {}) {
    this.history.push({ agentId, action, status, details, timestamp: Date.now() });
  }
}

class ProjectMemory {
  static retrieve(query) {
    // Mock RAG response representing previous project learnings
    if (query.includes("security")) {
      return "[Project Memory] Avoid storing API secrets in plain text. Always extract variables from process.env.";
    }
    return "[Project Memory] Standard template conforms to Next.js App Router guidelines.";
  }
}

class ToolRegistry {
  constructor() {
    this.failures = {};
  }
  
  async call(toolName, args, shouldFailOnce = false) {
    console.log(chalk.gray(`      [Tool Calling] Invoking ${toolName} with args: ${JSON.stringify(args)}`));
    
    // Failure simulation logic for demonstrating recovery
    if (shouldFailOnce && !this.failures[toolName]) {
      this.failures[toolName] = true;
      throw new Error(`Tool ${toolName} failed: Connection timeout / file lock issue.`);
    }
    
    // Normal execution
    switch (toolName) {
      case "writeCode":
        return { status: "success", code: args.code, file: args.filename };
      case "runCommand":
        return { status: "success", stdout: "Build successful. All checks passed." };
      default:
        return { status: "success", result: "Operation completed." };
    }
  }
}

class FailureRecovery {
  static analyzeAndRetry(error, attempt) {
    console.log(chalk.red(`    [Failure Recovery] Attempt ${attempt} failed: ${error.message}`));
    if (attempt >= 3) {
      return { shouldRetry: false };
    }
    
    // Dynamic strategy selection
    const strategy = attempt === 1 
      ? "RETRY_WITH_BACKOFF (Refreshing session workspace and retrying the call)" 
      : "ESCALATE_TO_FALLBACK (Bypassing primary adapter settings)";
      
    return { shouldRetry: true, nextStrategy: strategy };
  }
}

class QualityGate {
  static check(output, agentId) {
    const checks = {
      noPlainSecrets: !/mySecretKey123/i.test(output),
      noEvalUsage: !/eval\(/i.test(output)
    };
    
    if (agentId === "test-engineer") {
      checks.hasTests = /describe\(|test\(|assert/i.test(output);
    }
    
    const failed = Object.entries(checks).filter(([_, passed]) => !passed);
    return {
      pass: failed.length === 0,
      failedChecks: failed.map(([name]) => name)
    };
  }
}

// ==========================================
// 3. ORCHESTRATOR (THE COORDINATION BRAIN)
// ==========================================

class MultiAgentOrchestrator {
  constructor() {
    this.memory = new ShortTermMemory();
    this.tools = new ToolRegistry();
  }

  async processRequest(request) {
    console.log(chalk.bold.cyan(`\n⚡ [Orchestrator] Received User Request:\n   "${request}"\n`));

    // 1. Task Classification
    const categories = TaskClassification.classify(request);
    console.log(chalk.green(`📌 [Task Classification] Categories: [${categories.join(", ")}]`));

    // 2. Complexity Detection
    const complexity = ComplexityDetection.detect(request, categories);
    console.log(chalk.green(`📊 [Complexity Detection] Level: ${complexity.level} (Score: ${complexity.score}, Steps: ${complexity.stepsCount})`));

    // 3. Task Decomposition (Step Planning)
    const planSteps = [
      { id: 1, desc: "Design REST API schema for evaluations", agentId: "api-specialist", fail: false },
      { id: 2, desc: "Design prompt layout system config", agentId: "prompt-engineer", fail: true }, // trigger failure demonstration here
      { id: 3, desc: "Evaluate models inference schema", agentId: "ai-ml-specialist", fail: false },
      { id: 4, desc: "Write unit tests for the schema", agentId: "test-engineer", fail: false }
    ].slice(0, complexity.stepsCount);

    console.log(chalk.blue(`\n📝 [Planning] Decomposed Task into ${planSteps.length} Sequential Steps:`));
    planSteps.forEach(s => console.log(chalk.blue(`   Step ${s.id}: ${s.desc}`)));
    
    const stepResults = [];

    // 4. Execution Loop
    for (const step of planSteps) {
      console.log(chalk.yellow(`\n🚀 [Orchestrator] Initiating Step ${step.id}: ${step.desc}`));

      // 4.1 Routing with boundary check
      const activeAgent = AgentRouting.route(step.desc);
      console.log(chalk.yellow(`    ↳ [Agent Routing] Assigned to Specialist: ${activeAgent.displayName} (${activeAgent.role})`));

      // 4.2 Context Management
      const ragContext = ProjectMemory.retrieve(step.desc);
      console.log(chalk.gray(`    ↳ [Context Management] RAG Context: "${ragContext}"`));
      
      // 4.3 Execute tool with failure handling & retry loop
      let output = "";
      let attempt = 1;
      let success = false;
      let shouldFail = step.fail;

      while (!success && attempt <= 3) {
        try {
          this.memory.logEvent(activeAgent.id, "execute_step", "started", { step: step.id });
          
          // Mock generating code code block
          let codeSnippet = "";
          if (activeAgent.id === "api-specialist") {
            codeSnippet = `const express = require('express');\nconst router = express.Router();\nrouter.post('/evaluate', (req, res) => res.json({ status: 'ok' }));`;
          } else if (activeAgent.id === "prompt-engineer") {
            codeSnippet = `const systemPrompt = "You are a helpful assistant.";`;
          } else if (activeAgent.id === "ai-ml-specialist") {
            codeSnippet = `const evaluateModel = (pred, truth) => pred === truth ? 1.0 : 0.0;`;
          } else if (activeAgent.id === "test-engineer") {
            codeSnippet = `const assert = require('assert');\ndescribe('API tests', () => {\n  test('should pass', () => assert.strictEqual(1, 1));\n});`;
          }

          const toolResult = await this.tools.call("writeCode", {
            filename: `${activeAgent.id}.js`,
            code: codeSnippet
          }, shouldFail);
          
          output = toolResult.code;
          
          // 4.4 Quality Gate Check
          const qCheck = QualityGate.check(output, activeAgent.id);
          if (!qCheck.pass) {
            throw new Error(`Quality Gate validation failed: [${qCheck.failedChecks.join(", ")}]`);
          }
          
          success = true;
          this.memory.logEvent(activeAgent.id, "execute_step", "completed", { step: step.id, file: toolResult.file });
          console.log(chalk.green(`    ✔ [Quality Gate] Passed verification checks successfully.`));
          stepResults.push({ step: step.id, agent: activeAgent.displayName, file: toolResult.file, status: "SUCCESS" });
        } catch (error) {
          this.memory.logEvent(activeAgent.id, "execute_step", "failed", { step: step.id, error: error.message });
          const recovery = FailureRecovery.analyzeAndRetry(error, attempt);
          
          if (recovery.shouldRetry) {
            console.log(chalk.magenta(`    🔄 [Recovery Strategy] Executing strategy: ${recovery.nextStrategy}`));
            attempt++;
            shouldFail = false; // Disable failure on retry to simulate successful correction
          } else {
            console.log(chalk.red(`    ✗ [Fatal Error] Max recovery attempts reached for Step ${step.id}.`));
            stepResults.push({ step: step.id, agent: activeAgent.displayName, status: "FAILED", error: error.message });
            break;
          }
        }
      }
    }

    // 5. Execution Summary
    this.printThaiSummary(stepResults);
  }

  printThaiSummary(results) {
    console.log(chalk.bold.green("\n========================================================"));
    console.log(chalk.bold.green("📊 สรุปผลการทำงานของระบบ AI Multi-Agent System (Prototype)"));
    console.log(chalk.bold.green("========================================================"));
    
    let successCount = 0;
    results.forEach(r => {
      const statusColor = r.status === "SUCCESS" ? chalk.green("✔ สำเร็จ") : chalk.red("✗ ล้มเหลว");
      console.log(chalk.white(`  • ขั้นที่ ${r.step} — ${r.agent}: ${statusColor} ${r.file ? `(ไฟล์: ${r.file})` : ""}`));
      if (r.status === "SUCCESS") successCount++;
    });
    
    const totalSteps = results.length;
    const rate = Math.round((successCount / totalSteps) * 100);
    console.log(chalk.cyan(`\n  สถานะภาพรวม: ทำสำเร็จทั้งหมด ${successCount}/${totalSteps} ขั้นตอน (${rate}%)`));
    console.log(chalk.green("========================================================\n"));
  }
}

// Run the orchestrator simulation
if (require.main === module) {
  const orchestrator = new MultiAgentOrchestrator();
  const mockRequest = "Build a secure REST API for model evaluation, design the prompt layout in the system config, and write unit tests for the schema";
  orchestrator.processRequest(mockRequest);
}

module.exports = {
  MultiAgentOrchestrator,
  TaskClassification,
  ComplexityDetection,
  AgentRouting,
  QualityGate,
  FailureRecovery
};
