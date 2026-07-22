/**
 * ryker-multi-agent-tech run — Execute agent with input
 */

const chalk = require("chalk");
const ora = require("ora");

const config = require("../core/config");
const agentRuntime = require("../core/agent-runtime");
const utils = require("../utils");
const { EliteNexus } = require("../core/elite-nexus");

async function run(input, options = {}) {
  const projectDir = process.cwd();

  if (!config.configExists(projectDir)) {
    console.log(chalk.red("No config directory found. Run `ryker-multi-agent-tech init` first.\n"));
    return;
  }

  const agentName = options.agent || utils.findDefaultAgent(projectDir);
  if (!agentName) {
    console.log(chalk.red("No agent found. Specify with --agent <name>\n"));
    return;
  }
  if (!utils.isValidAgentName(agentName)) {
    console.log(chalk.red(`Invalid agent name: "${agentName}" — cannot contain: / \\ : * ? " < > |\n`));
    return;
  }

  const provider = options.provider;
  const model = options.model;
  const maxSteps = options.maxSteps ? parseInt(options.maxSteps, 10) : undefined;
  const jsonMode = options.json || false;
  const verbose = options.verbose || false;
  const dryRun = options.dryRun || false;
  const noCache = options.noCache || false;
  const outputFormat = options.outputFormat || (jsonMode ? "json" : undefined);
  const noForm = options.noForm || false;
  const noQualityGate = options.noQualityGate || false;
  const strictQualityGate = options.strictQualityGate || false;
  const writeArtifactsDir = options.writeArtifacts;

  if (dryRun) {
    console.log(chalk.cyan("\n[DRY RUN] Would execute:"));
    console.log(chalk.gray(`  Agent:   ${agentName}`));
    console.log(chalk.gray(`  Input:   ${input.slice(0, 100)}`));
    console.log(chalk.gray(`  Provider: ${provider || "default"}`));
    console.log(chalk.gray(`  Model:   ${model || "default"}`));
    console.log(chalk.gray(`  Max steps: ${maxSteps || 10}\n`));
    return;
  }

  if (!jsonMode) {
    // Run pre-execution analysis for CLI feedback
    const analysis = EliteNexus.analyzeAndSchedule(input);
    const intent = analysis.analyzationResults.intent.primaryIntent;
    const complexity = analysis.analyzationResults.complexity.level;
    const priority = analysis.analyzationResults.priority.priority;
    const goals = analysis.analyzationResults.goals.goals;
    const category = analysis.analyzationResults.classification.categories.join(", ");
    const route = EliteNexus.router.agentRouter.route(input, analysis.analyzationResults.classification, complexity);

    console.log(chalk.cyan(`\n🚀 [Elite-Nexus Engine] กำลังวิเคราะห์และระบุระบบงาน (Initializing System Analyzers)...`));
    console.log(chalk.gray(`   ├─ Active Specialist:   ${chalk.green(agentName)} (Specialist: ${route.primarySpecialist})`));
    console.log(chalk.gray(`   ├─ Specialist Skills:   ${route.capabilities ? route.capabilities.join(", ") : "All System Capabilities"}`));
    console.log(chalk.gray(`   ├─ Task Classification: ${category}`));
    console.log(chalk.gray(`   ├─ Complexity Level:    ${complexity} (Est. Steps: ${analysis.analyzationResults.complexity.estimatedSteps})`));
    console.log(chalk.gray(`   ├─ Priority Level:      ${priority}`));
    console.log(chalk.gray(`   ├─ Extracted Goals:     ${goals.join(", ")}`));
    console.log(chalk.gray(`   ├─ Routing Decision:    ${route.routingMode} — ${route.explanation}`));
    console.log(chalk.gray(`   └─ Workflow Schedule:   ${analysis.schedule.executionOrder.join(" ➔ ")}`));
    console.log("");
  }

  let spinner = jsonMode ? null : ora("Thinking (กำลังประมวลผล)...").start();

  try {
    const state = await agentRuntime.runAgent({
      input,
      agentName,
      projectDir,
      provider,
      model,
      maxSteps,
      json: jsonMode,
      noCache,
      outputFormat,
      noForm,
      noQualityGate,
      strictQualityGate,
      onStep: (step, state) => {
        if (spinner) spinner.stop();

        // Streaming: print step details as they happen
        if (verbose && !jsonMode) {
          console.log(chalk.gray(`\n  ── [Nexus Process] Step ${step.step} ──`));
          if (step.thought) console.log(chalk.gray(`  Thought/วิเคราะห์: ${step.thought.slice(0, 200)}`));
        }

        if (step.toolCalls.length > 0) {
          step.toolCalls.forEach(tc => {
            if (tc.error) {
              console.log(chalk.red(`  ✗ Tool Error (${tc.tool}) — ${tc.error}`));
            } else {
              console.log(chalk.cyan(`  ✔ Tool Execution (${tc.tool}) สำเร็จ — Arguments: ${JSON.stringify(tc.args || {}).slice(0, 60)}`));
              if (verbose && tc.result) {
                const preview = JSON.stringify(tc.result).slice(0, 200);
                console.log(chalk.gray(`  Result/ผลลัพธ์: ${preview}...`));
              }
            }
          });
        }

        if (!jsonMode) spinner = ora("Thinking (กำลังประมวลผล)...").start();
      },
    });

    if (spinner) spinner.stop();

    if (writeArtifactsDir && typeof writeArtifactsDir === "string" && state.artifacts && state.artifacts.length > 0) {
      const path = require("path");
      const fs = require("fs");
      const guardrails = require("../core/guardrails");
      const dir = path.resolve(writeArtifactsDir);
      guardrails.pathTraversal(dir, projectDir);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      for (const artifact of state.artifacts) {
        const filePath = path.join(dir, artifact.filename);
        guardrails.pathTraversal(filePath, projectDir);
        guardrails.safeWrite(filePath, artifact.content, "utf-8", projectDir);
      }
      if (!jsonMode) console.log(chalk.gray(`  Artifacts written to: ${dir}`));
    }

    if (jsonMode) {
      console.log(JSON.stringify(state, null, 2));
      return state;
    }

    // Pretty output
    if (state.status === "completed") {
      console.log(chalk.green("\n✓ [Elite-Nexus Engine] ประมวลผลสำเร็จ (Output Result):\n"));
      console.log(state.output);
    } else if (state.status === "error") {
      console.log(chalk.red(`\n✗ [Elite-Nexus Engine] เกิดข้อผิดพลาด (Execution Error): ${state.error}\n`));
    } else if (state.status === "max_steps") {
      console.log(chalk.yellow("\n⚠ [Elite-Nexus Engine] สิ้นสุดเนื่องจากถึงขีดจำกัด Max Steps. ผลลัพธ์บางส่วน:\n"));
      console.log(state.output);
    }

    // Structured Reporting System (Normal vs Debug Mode)
    console.log("\n" + EliteNexus.generateReport(state, verbose ? "DEBUG" : "NORMAL") + "\n");

    return state;
  } catch (err) {
    if (spinner) spinner.fail(chalk.red("Agent execution failed"));
    console.error(chalk.red(`  ${err.message}\n`));
    throw err;
  }
}

module.exports = { run };
