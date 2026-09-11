/**
 * Prompt Builder — Build system prompts for agent execution
 *
 * Separated from agent-runtime.js for maintainability.
 */

const toolRegistry = require("./tool-registry");
const agentSystem = require("./agent-system");

const MAX_SKILL_INSTRUCTION_CHARS = 8000; // Per-skill instruction limit in system prompt
const MAX_SKILL_INSTRUCTION_CHARS_GEMINI = 24000; // Expanded limit for Gemini 1M+ context window

function getSkillBudget(provider) {
  if (provider === "gemini" || provider === "google") {
    return MAX_SKILL_INSTRUCTION_CHARS_GEMINI;
  }
  return MAX_SKILL_INSTRUCTION_CHARS;
}

function truncateSkillContent(content, headingOffset = 0, customBudget = MAX_SKILL_INSTRUCTION_CHARS) {
  const budget = customBudget - headingOffset;
  if (budget <= 0) return content.slice(0, 200) + "\n...[truncated]";
  if (content.length <= budget) return content;

  // Section-aware truncation: keep headings + first paragraph of each section
  const lines = content.split("\n");
  const kept = [];
  let totalLen = 0;
  let inCodeBlock = false;
  let codeBlockLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track code blocks — always include them whole or skip entirely
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        codeBlockLines.push(line);
        const blockLen = codeBlockLines.join("\n").length;
        if (totalLen + blockLen <= budget) {
          kept.push(...codeBlockLines);
          totalLen += blockLen;
        }
        inCodeBlock = false;
        codeBlockLines = [];
      } else {
        inCodeBlock = true;
        codeBlockLines = [line];
      }
      continue;
    }
    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Always keep headings (## or ###)
    if (/^#{1,3}\s/.test(line)) {
      if (totalLen + line.length + 1 <= budget) {
        kept.push(line);
        totalLen += line.length + 1;
      }
      continue;
    }

    // Keep regular lines while space allows
    if (totalLen + line.length + 1 <= budget) {
      kept.push(line);
      totalLen += line.length + 1;
    } else {
      // Truncate this line to fit
      const remaining = budget - totalLen;
      if (remaining > 20) {
        kept.push(line.slice(0, remaining - 3) + "...");
      }
      break;
    }
  }

  return kept.join("\n");
}

function buildGeminiSystemPrompt(agentSpec, skillInstructions, projectProfile, outputFormat, memoryContext = "") {
  const roleLine = `You are ${agentSpec.name}, an AI agent specializing in ${agentSpec.description || "autonomous execution"}.\n\n`;
  let prompt = roleLine;

  if (agentSpec.instructions) {
    prompt += `## Instructions\n${agentSpec.instructions}\n\n`;
  }

  if (memoryContext) {
    prompt += `## Memory Context\n${memoryContext}\n\n`;
  }

  // Flattened tool list
  const allTools = toolRegistry.listTools();
  const toolSchemas = toolRegistry.TOOL_SCHEMAS || {};
  const toolDescriptions = allTools.map(t => {
    const schema = toolSchemas[t];
    const desc = schema?.description || "";
    return `- ${t}${desc ? " — " + desc : ""}`;
  });
  prompt += `## Available Tools\n${toolDescriptions.join("\n")}\n\n`;

  if (projectProfile) {
    prompt += agentSystem.buildProfilePrompt(projectProfile) + "\n\n";
  }

  if (skillInstructions && Object.keys(skillInstructions).length > 0) {
    const skillBudget = MAX_SKILL_INSTRUCTION_CHARS_GEMINI;
    for (const [name, content] of Object.entries(skillInstructions)) {
      const heading = `## Skill: ${name}\n`;
      const truncatedContent = truncateSkillContent(content, heading.length, skillBudget);
      prompt += `${heading}${truncatedContent}\n\n`;
    }
  }

  if (agentSpec.guardrails) {
    prompt += `## Guardrails & Principles\n- Never access files outside the project directory\n- Use safe write for all file operations\n- Respect rate limits\n- Only use allowed commands\n1. THINK FIRST: State assumptions explicitly.\n2. SIMPLICITY: Minimum code that solves the problem.\n3. SURGICAL: Touch only what you must.\n4. GOAL-DRIVEN: Define success criteria before implementing.\n\n`;
  }

  prompt += `## Tool Calling Format\n`;
  prompt += `To use a tool, output EXACTLY this format on its own line:\n`;
  prompt += `TOOL_CALL: namespace.tool({"arg1": "value1"})\n\n`;
  prompt += `Do not add any text before or after the TOOL_CALL line.\n`;
  prompt += `When you have the final answer, respond with just the answer (no TOOL_CALL prefix).\n`;

  if (outputFormat === "artifact") {
    prompt += `\n## Output Format\n`;
    prompt += `When returning code or files, specify the filename and language tag with complete, untruncated code.\n`;
  }

  return prompt;
}

function buildSystemPrompt(agentSpec, skillInstructions, projectProfile, outputFormat, memoryContext = "", provider = "") {
  if (provider === "gemini" || provider === "google") {
    return buildGeminiSystemPrompt(agentSpec, skillInstructions, projectProfile, outputFormat, memoryContext);
  }

  let prompt = `You are ${agentSpec.name}, an AI agent.\n\n`;

  // Prepend relevant persistent memories if present
  if (memoryContext) {
    prompt += `## Persistent Memory Context\n${memoryContext}\n\n`;
  }

  prompt += `## Description\n${agentSpec.description}\n\n`;
  prompt += `## Instructions\n${agentSpec.instructions}\n\n`;
  prompt += `## Available Tools\n${agentSpec.tools.map(t => `- ${toolRegistry.resolveToolName(t)}`).join("\n")}\n\n`;

  // Dynamic tool list from registry — includes custom/plugin tools
  const allTools = toolRegistry.listTools();
  const toolSchemas = toolRegistry.TOOL_SCHEMAS || {};
  const toolDescriptions = allTools.map(t => {
    const schema = toolSchemas[t];
    const desc = schema?.description || "";
    return `- ${t}${desc ? " — " + desc : ""}`;
  });
  prompt += `## All Available Tools\n${toolDescriptions.join("\n")}\n\n`;

  // Inject auto-detected project context (like Claude Design's design system auto-apply)
  if (projectProfile) {
    prompt += agentSystem.buildProfilePrompt(projectProfile) + "\n\n";
  }

  if (skillInstructions && Object.keys(skillInstructions).length > 0) {
    const skillBudget = getSkillBudget(provider);
    prompt += `## Skills\n`;
    for (const [name, content] of Object.entries(skillInstructions)) {
      const heading = `### ${name}\n`;
      const truncatedContent = truncateSkillContent(content, heading.length, skillBudget);
      prompt += `${heading}${truncatedContent}\n\n`;
    }
  }

  prompt += `## Response Format\n`;
  prompt += `When you need to use a tool, respond with:\n`;
  prompt += `TOOL_CALL: <namespace.tool>(<json_args>)\n`;
  prompt += `Example: TOOL_CALL: fs.read({"path": "/src/index.js"})\n`;
  prompt += `Example: TOOL_CALL: shell.exec({"command": "npm test"})\n\n`;
  prompt += `When you have the final answer, respond with just the answer (no TOOL_CALL prefix).\n`;

  if (outputFormat === "artifact") {
    prompt += `\n## Artifact Output Format\n`;
    prompt += `When returning code or files, wrap each artifact in an <artifact> tag with type and filename attributes.\n`;
    prompt += `Supported types: html, css, js, ts, json, yaml, md, python, shell.\n`;
    prompt += `Example: <artifact type="js" filename="example.js">\nconst x = 1;\n</artifact>\n`;
  }

  if (agentSpec.guardrails) {
    prompt += `\n## Guardrails\n- Never access files outside the project directory\n- Use safe write for all file operations\n- Respect rate limits\n- Only use allowed commands\n`;
    prompt += `\n## Behavioral Rules (Karpathy Principles)\n1. THINK FIRST: State assumptions explicitly. If uncertain, ASK — don't guess silently.\n2. SIMPLICITY: Minimum code that solves the problem. No speculative features or abstractions for single-use code.\n3. SURGICAL: Touch only what you must. Every changed line must trace directly to the user's request.\n4. GOAL-DRIVEN: Define success criteria before implementing. Write tests first, then make them pass.\n`;
  }

  return prompt;
}

module.exports = {
  buildSystemPrompt,
  buildGeminiSystemPrompt,
  truncateSkillContent,
  getSkillBudget,
  MAX_SKILL_INSTRUCTION_CHARS,
  MAX_SKILL_INSTRUCTION_CHARS_GEMINI,
};
