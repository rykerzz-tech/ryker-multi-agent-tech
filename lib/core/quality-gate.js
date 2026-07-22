const BLACKLIST = [
  { pattern: /I'd be happy to help/i, severity: "p1", message: "Avoid generic assistant filler." },
  { pattern: /Let me know if you need anything else/i, severity: "p2", message: "Avoid unnecessary closing filler." },
  { pattern: /console\.log\((['\"])?here\1?\)/i, severity: "p1", message: "Remove debug console.log statements." },
  { pattern: /\beval\s*\(/, severity: "p0", message: "Avoid eval()." },
  { pattern: /(api[_-]?key|secret|token)\s*[:=]\s*['\"][^'\"]{8,}['\"]/i, severity: "p0", message: "Do not hardcode secrets." },
];

const SEVERITY_WEIGHT = { p0: 40, p1: 20, p2: 10 };

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

  // Determine gate metrics for specific checkpoints
  const gateMetrics = {
    requirementCompletion: options.requirementChecked ? (options.requirementPassed ? "PASS" : "FAIL") : "PASS",
    codeHealth: hasP0 ? "FAIL" : (score >= 90 ? "PASS" : "PASS"),
    build: options.buildChecked ? (options.buildPassed ? "PASS" : "FAIL") : "NOT_TESTED",
    runtime: options.runtimeChecked ? (options.runtimePassed ? "PASS" : "FAIL") : "NOT_TESTED",
    interaction: options.interactionChecked ? (options.interactionPassed ? "PASS" : "FAIL") : "NOT_TESTED",
    responsive: options.responsiveChecked ? (options.responsivePassed ? "PASS" : "FAIL") : "NOT_TESTED",
    security: hasP0 ? "FAIL" : "PASS",
    performance: "PASS",
    risk: options.riskLevel === "HIGH" ? "FAIL" : "PASS"
  };

  const requiredPassed = [
    gateMetrics.requirementCompletion,
    gateMetrics.codeHealth,
    gateMetrics.security
  ].every(status => status === "PASS" || status === "NOT_APPLICABLE");

  const overallPass = !hasP0 && score >= threshold && requiredPassed;

  return {
    pass: overallPass,
    score,
    threshold,
    violations,
    mode: options.strict ? "strict" : "warn",
    gateMetrics,
    status: overallPass ? "PASS" : (hasP0 ? "FAIL" : "REVISION_REQUIRED")
  };
}

function applyQualityGate(state, options = {}) {
  if (!state || state.output == null || options.noQualityGate) return state;

  const checkOptions = {
    ...options,
    requirementChecked: true,
    requirementPassed: state.status === "completed" || state.status === "running",
    buildChecked: state.steps?.some(step => step.toolCalls?.some(tc => tc.tool === "run_command" && tc.args.CommandLine?.includes("build"))),
    buildPassed: state.steps?.some(step => step.toolCalls?.some(tc => tc.tool === "run_command" && tc.args.CommandLine?.includes("build") && !tc.error)),
    runtimeChecked: state.steps?.some(step => step.toolCalls?.some(tc => tc.tool === "run_command" && (tc.args.CommandLine?.includes("start") || tc.args.CommandLine?.includes("node")))),
    runtimePassed: state.steps?.some(step => step.toolCalls?.some(tc => tc.tool === "run_command" && (tc.args.CommandLine?.includes("start") || tc.args.CommandLine?.includes("node")) && !tc.error)),
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
  checkQuality,
  applyQualityGate,
};
