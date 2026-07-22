const BLACKLIST = [
  { pattern: /I'd be happy to help/i, severity: "p1", message: "Avoid generic assistant filler." },
  { pattern: /Let me know if you need anything else/i, severity: "p2", message: "Avoid unnecessary closing filler." },
  { pattern: /console\.log\((['\"])?here\1?\)/i, severity: "p1", message: "Remove debug console.log statements." },
  { pattern: /\beval\s*\(/, severity: "p0", message: "Avoid eval()." },
  { pattern: /(api[_-]?key|secret|token)\s*[:=]\s*['\"][^'\"]{8,}['\"]/i, severity: "p0", message: "Do not hardcode secrets." },
];

const SEVERITY_WEIGHT = { p0: 40, p1: 20, p2: 10 };

function getTaskCategories(input) {
  const categories = [];
  const text = String(input || "").toLowerCase();
  if (/(ui|frontend|css|html|react|next|view|layout|page|component|dashboard|styling|styles)/i.test(text)) categories.push("frontend");
  if (/(api|backend|express|db|database|server|endpoint|route|router|controller|model)/i.test(text)) categories.push("backend");
  if (/(test|jest|vitest|mocha|qa|assert|spec)/i.test(text)) categories.push("testing");
  if (/(ci|cd|docker|deploy|aws|git|pipeline|yml|yaml)/i.test(text)) categories.push("devops");
  if (/(security|auth|jwt|encrypt|token|vulnerability|cors|helmet|credentials)/i.test(text)) categories.push("security");
  if (categories.length === 0) categories.push("general");
  return categories;
}

function getComplexity(input) {
  const text = String(input || "");
  if (text.length < 50 && !/(build|create|implement|integrate|refactor|optimize|test)/i.test(text)) {
    return "LOW";
  }
  if (text.length > 200 || /(complex|integrate|multipage|architecture|fullstack|database|auth)/i.test(text)) {
    return "HIGH";
  }
  return "MEDIUM";
}

function evaluateLayers(input, context = {}, complexity) {
  const categories = getTaskCategories(input);
  const isSmall = complexity === "LOW";
  const changedFiles = context.changedFiles || [];
  const hasCodeChanges = changedFiles.length > 0;

  // Determine relevance based on categories and input keywords
  const relevance = {
    build: hasCodeChanges || categories.includes("backend") || categories.includes("frontend") || categories.includes("testing") || categories.includes("devops") || categories.includes("security"),
    scriptRuntime: /(script|cli|tool|node\b|run\b|exec\b)/i.test(input) || categories.includes("devops") || categories.includes("backend"),
    appRuntime: /(app|server|express|next|vite|api|backend|frontend)/i.test(input) && !/(script|cli|tool)/i.test(input),
    browserRuntime: categories.includes("frontend") || /(ui|dashboard|page|layout|web|browser|css|styling|styles)/i.test(input),
    interaction: categories.includes("frontend") && /(button|form|input|click|submit|hover|event|interactive)/i.test(input),
    responsive: categories.includes("frontend") && /(responsive|mobile|tablet|desktop|layout|viewport|screen)/i.test(input),
    project: categories.includes("testing") || /(test|jest|vitest|mocha|spec)/i.test(input) || changedFiles.length > 0
  };

  // Determine criticality: for LOW complexity, most things are not critical unless explicitly relevant
  const critical = {
    build: relevance.build && hasCodeChanges, // Build is always critical if we modified code
    scriptRuntime: relevance.scriptRuntime && !isSmall,
    appRuntime: relevance.appRuntime && !isSmall,
    browserRuntime: relevance.browserRuntime && !isSmall,
    interaction: relevance.interaction && !isSmall,
    responsive: relevance.responsive && !isSmall,
    project: relevance.project && !isSmall
  };

  return { relevance, critical };
}

function getVerificationStatus(checked, passed, isRelevant, isCritical, hasLimitation) {
  if (checked) {
    return passed ? "PASS" : "FAIL";
  }
  if (!isRelevant) {
    return "NOT_APPLICABLE";
  }
  if (hasLimitation) {
    return "BLOCKED";
  }
  return "NOT_TESTED";
}

function checkQuality(output, options = {}) {
  const text = String(output || "");
  const violations = [];

  for (const rule of BLACKLIST) {
    if (rule.pattern.test(text)) {
      violations.push({ severity: rule.severity, message: rule.message });
    }
  }

  if (text.length > (options.maxOutputChars || 200000)) {
    violations.push({ severity: "p1", message: "Output is unusually large." });
  }

  const penalty = violations.reduce((sum, violation) => sum + (SEVERITY_WEIGHT[violation.severity] || 10), 0);
  const score = Math.max(0, 100 - penalty);
  const threshold = options.threshold ?? 70;
  const hasP0 = violations.some(v => v.severity === "p0");

  const input = options.input || "";
  const complexity = options.complexity || getComplexity(input);
  const changedFiles = options.changedFiles || [];
  const browserAvailable = options.browserAvailable !== false; // default true unless false

  const { relevance, critical } = evaluateLayers(input, { changedFiles }, complexity);

  // Determine gate metrics for specific checkpoints
  const gateMetrics = {
    requirementCompletion: options.requirementChecked ? (options.requirementPassed ? "PASS" : "FAIL") : "PASS",
    codeHealth: hasP0 ? "FAIL" : (score >= 90 ? "PASS" : "PASS"),
    build: getVerificationStatus(options.buildChecked, options.buildPassed, relevance.build, critical.build, false),
    scriptRuntime: getVerificationStatus(options.scriptRuntimeChecked, options.scriptRuntimePassed, relevance.scriptRuntime, critical.scriptRuntime, false),
    appRuntime: getVerificationStatus(options.appRuntimeChecked, options.appRuntimePassed, relevance.appRuntime, critical.appRuntime, false),
    browserRuntime: getVerificationStatus(options.browserRuntimeChecked, options.browserRuntimePassed, relevance.browserRuntime, critical.browserRuntime, !browserAvailable),
    interaction: getVerificationStatus(options.interactionChecked, options.interactionPassed, relevance.interaction, critical.interaction, !browserAvailable),
    responsive: getVerificationStatus(options.responsiveChecked, options.responsivePassed, relevance.responsive, critical.responsive, !browserAvailable),
    security: hasP0 ? "FAIL" : "PASS",
    performance: "PASS",
    risk: options.riskLevel === "HIGH" ? "FAIL" : "PASS"
  };

  const hasCriticalNotTested = Object.keys(critical).some(key => {
    return critical[key] && gateMetrics[key] === "NOT_TESTED";
  });

  const hasFailedMetric = Object.values(gateMetrics).some(status => status === "FAIL");

  const requiredPassed = [
    gateMetrics.requirementCompletion,
    gateMetrics.codeHealth,
    gateMetrics.security
  ].every(status => status === "PASS" || status === "NOT_APPLICABLE");

  const overallPass = !hasP0 && score >= threshold && requiredPassed && !hasFailedMetric && !hasCriticalNotTested;

  return {
    pass: overallPass,
    score,
    threshold,
    violations,
    mode: options.strict ? "strict" : "warn",
    gateMetrics,
    status: overallPass ? "PASS" : (hasFailedMetric || hasP0 ? "FAIL" : "REVISION_REQUIRED")
  };
}

function applyQualityGate(state, options = {}) {
  if (!state || state.output == null || options.noQualityGate) return state;

  const changedFilesList = [];
  if (state.steps) {
    for (const s of state.steps) {
      if (s.toolCalls) {
        for (const tc of s.toolCalls) {
          if (tc.tool?.includes("fs.write") || tc.tool?.includes("fs.edit") || tc.tool?.includes("write") || tc.tool?.includes("replace") || tc.tool?.includes("multi_replace")) {
            const file = tc.args?.TargetFile || tc.args?.path || tc.args?.target;
            if (file && !changedFilesList.includes(file)) {
              changedFilesList.push(file);
            }
          }
        }
      }
    }
  }

  const checkOptions = {
    ...options,
    input: state.input,
    complexity: state.complexity || (state.input ? getComplexity(state.input) : "MEDIUM"),
    changedFiles: changedFilesList,
    requirementChecked: true,
    requirementPassed: state.status === "completed" || state.status === "running",
    buildChecked: state.steps?.some(step => step.toolCalls?.some(tc => tc.tool === "run_command" && tc.args.CommandLine?.includes("build"))),
    buildPassed: state.steps?.some(step => step.toolCalls?.some(tc => tc.tool === "run_command" && tc.args.CommandLine?.includes("build") && !tc.error)),
    scriptRuntimeChecked: state.steps?.some(step => step.toolCalls?.some(tc => tc.tool === "run_command" && tc.args.CommandLine?.includes("node ") && !tc.args.CommandLine?.includes("start") && !tc.args.CommandLine?.includes("dev"))),
    scriptRuntimePassed: state.steps?.some(step => step.toolCalls?.some(tc => tc.tool === "run_command" && tc.args.CommandLine?.includes("node ") && !tc.args.CommandLine?.includes("start") && !tc.args.CommandLine?.includes("dev") && !tc.error)),
    appRuntimeChecked: state.steps?.some(step => step.toolCalls?.some(tc => tc.tool === "run_command" && (tc.args.CommandLine?.includes("start") || tc.args.CommandLine?.includes("dev")))),
    appRuntimePassed: state.steps?.some(step => step.toolCalls?.some(tc => tc.tool === "run_command" && (tc.args.CommandLine?.includes("start") || tc.args.CommandLine?.includes("dev")) && !tc.error)),
    browserRuntimeChecked: state.steps?.some(step => step.toolCalls?.some(tc => tc.tool === "browser_subagent" || (tc.tool === "run_command" && (tc.args.CommandLine?.includes("playwright") || tc.args.CommandLine?.includes("cypress"))))),
    browserRuntimePassed: state.steps?.some(step => step.toolCalls?.some(tc => (tc.tool === "browser_subagent" || (tc.tool === "run_command" && (tc.args.CommandLine?.includes("playwright") || tc.args.CommandLine?.includes("cypress")))) && !tc.error)),
    interactionChecked: state.steps?.some(step => step.toolCalls?.some(tc => tc.tool === "run_command" && tc.args.CommandLine?.includes("interaction"))),
    interactionPassed: state.steps?.some(step => step.toolCalls?.some(tc => tc.tool === "run_command" && tc.args.CommandLine?.includes("interaction") && !tc.error)),
    responsiveChecked: state.steps?.some(step => step.toolCalls?.some(tc => tc.tool === "run_command" && tc.args.CommandLine?.includes("responsive"))),
    responsivePassed: state.steps?.some(step => step.toolCalls?.some(tc => tc.tool === "run_command" && tc.args.CommandLine?.includes("responsive") && !tc.error)),
    browserAvailable: options.browserAvailable !== false,
    riskLevel: state.riskLevel || "LOW"
  };

  const quality = checkQuality(state.output, checkOptions);
  state.quality = quality;
  
  if (options.strict && !quality.pass) {
    state.status = "error";
    state.error = `Quality gate failed: ${quality.violations.map(v => v.message).join("; ")}`;
  }
  return state;
}

module.exports = {
  BLACKLIST,
  getTaskCategories,
  getComplexity,
  evaluateLayers,
  getVerificationStatus,
  checkQuality,
  applyQualityGate,
};
