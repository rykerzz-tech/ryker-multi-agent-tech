/**
 * Canonical Agent Registry
 * Single Source of Truth for all agent configurations and boundaries
 */

const CANONICAL_REGISTRY = {
  "orchestrator": {
    id: "orchestrator",
    displayName: "Orchestrator",
    role: "System Orchestrator",
    responsibilities: ["Orchestration", "Task Decomposition", "Specialist Routing", "Synthesis"],
    capabilities: ["Orchestration", "Routing", "Synthesis"],
    boundaries: [],
    allowedTasks: ["Orchestrate multiple agents", "Coordinate execution flow", "Route tasks to specialists"],
    excludedTasks: []
  },
  "prompt-engineer": {
    id: "prompt-engineer",
    displayName: "Prompt Engineer",
    role: "Prompt Engineer",
    responsibilities: [
      "Prompt Design",
      "System Instructions",
      "Context Strategy",
      "Agent Behavior",
      "Prompt Evaluation",
      "Output Quality"
    ],
    capabilities: [
      "Prompt Design",
      "System Instructions",
      "Context Strategy",
      "Agent Behavior",
      "Prompt Evaluation",
      "Output Quality"
    ],
    boundaries: [
      "Model Training",
      "LLM Infrastructure",
      "Embedding Pipeline",
      "Vector Database Architecture",
      "Model Inference Infrastructure"
    ],
    allowedTasks: [
      "Prompt Design",
      "System Instructions",
      "Context Strategy",
      "Agent Behavior",
      "Prompt Evaluation",
      "Output Quality"
    ],
    excludedTasks: [
      "Model Training",
      "LLM Infrastructure",
      "Embedding Pipeline",
      "Vector Database Architecture",
      "Model Inference Infrastructure"
    ]
  },
  "ai-ml-specialist": {
    id: "ai-ml-specialist",
    displayName: "AI/ML Specialist",
    role: "AI/ML Specialist",
    responsibilities: [
      "LLM Architecture",
      "Model Selection",
      "RAG",
      "Embeddings",
      "Model Evaluation",
      "AI Pipeline",
      "Inference Strategy",
      "Model Training",
      "LLM Infrastructure",
      "Embedding Pipeline",
      "Vector Database Architecture",
      "Model Inference Infrastructure"
    ],
    capabilities: [
      "LLM Architecture",
      "Model Selection",
      "RAG",
      "Embeddings",
      "Model Evaluation",
      "AI Pipeline",
      "Inference Strategy"
    ],
    boundaries: [
      "UI Design",
      "Generic Prompt Writing",
      "Deployment ทั้งระบบ"
    ],
    allowedTasks: [
      "LLM Architecture",
      "Model Selection",
      "RAG",
      "Embeddings",
      "Model Evaluation",
      "AI Pipeline",
      "Inference Strategy",
      "Model Training",
      "LLM Infrastructure",
      "Embedding Pipeline",
      "Vector Database Architecture",
      "Model Inference Infrastructure"
    ],
    excludedTasks: [
      "UI Design",
      "Generic Prompt Writing",
      "Deployment ทั้งระบบ"
    ]
  },
  "database-architect": {
    id: "database-architect",
    displayName: "Database Architect",
    role: "Database Architect",
    responsibilities: [
      "Schema",
      "Migrations",
      "Query Design",
      "Indexing",
      "Database Architecture"
    ],
    capabilities: [
      "Schema Design",
      "Migrations",
      "Query Design",
      "Indexing",
      "Database Architecture"
    ],
    boundaries: [
      "Frontend UI",
      "API Routing",
      "Server Infrastructure"
    ],
    allowedTasks: [
      "Schema",
      "Migrations",
      "Query Design",
      "Indexing",
      "Database Architecture"
    ],
    excludedTasks: [
      "Frontend UI",
      "API Routing",
      "Server Infrastructure"
    ]
  },
  "data-engineer": {
    id: "data-engineer",
    displayName: "Data Engineer",
    role: "Data Engineer",
    responsibilities: [
      "Data Pipeline",
      "ETL/ELT",
      "Data Processing",
      "Data Quality",
      "Data Transformation"
    ],
    capabilities: [
      "Data Pipeline",
      "ETL/ELT",
      "Data Processing",
      "Data Quality",
      "Data Transformation"
    ],
    boundaries: [],
    allowedTasks: [
      "Data Pipeline",
      "ETL/ELT",
      "Data Processing",
      "Data Quality",
      "Data Transformation"
    ],
    excludedTasks: []
  },
  "backend-specialist": {
    id: "backend-specialist",
    displayName: "Backend Specialist",
    role: "Backend Specialist",
    responsibilities: [
      "Server Logic",
      "Business Logic",
      "API Implementation",
      "Authentication Logic"
    ],
    capabilities: [
      "Server Logic",
      "Business Logic",
      "API Implementation",
      "Authentication Logic"
    ],
    boundaries: [],
    allowedTasks: [
      "Server Logic",
      "Business Logic",
      "API Implementation",
      "Authentication Logic"
    ],
    excludedTasks: []
  },
  "api-specialist": {
    id: "api-specialist",
    displayName: "API Specialist",
    role: "API Specialist",
    responsibilities: [
      "API Contract",
      "API Design",
      "Versioning",
      "Documentation",
      "Integration Contract"
    ],
    capabilities: [
      "API Contract",
      "API Design",
      "Versioning",
      "Documentation",
      "Integration Contract"
    ],
    boundaries: [],
    allowedTasks: [
      "API Contract",
      "API Design",
      "Versioning",
      "Documentation",
      "Integration Contract"
    ],
    excludedTasks: []
  },
  "test-engineer": {
    id: "test-engineer",
    displayName: "Test Engineer",
    role: "Test Engineer",
    responsibilities: [
      "Unit Tests",
      "Integration Tests",
      "E2E Tests",
      "Test Strategy"
    ],
    capabilities: [
      "Unit Tests",
      "Integration Tests",
      "E2E Tests",
      "Test Strategy"
    ],
    boundaries: [],
    allowedTasks: [
      "Unit Tests",
      "Integration Tests",
      "E2E Tests",
      "Test Strategy"
    ],
    excludedTasks: []
  },
  "code-reviewer": {
    id: "code-reviewer",
    displayName: "Code Reviewer",
    role: "Code Reviewer",
    responsibilities: [
      "Code Quality",
      "Maintainability",
      "Architecture Compliance",
      "Code Review"
    ],
    capabilities: [
      "Code Quality",
      "Maintainability",
      "Architecture Compliance",
      "Code Review"
    ],
    boundaries: [],
    allowedTasks: [
      "Code Quality",
      "Maintainability",
      "Architecture Compliance",
      "Code Review"
    ],
    excludedTasks: []
  },
  "debugger": {
    id: "debugger",
    displayName: "Debugger",
    role: "Debugger",
    responsibilities: [
      "Error Investigation",
      "Root Cause Analysis",
      "Log Analysis",
      "Targeted Fix"
    ],
    capabilities: [
      "Error Investigation",
      "Root Cause Analysis",
      "Log Analysis",
      "Targeted Fix"
    ],
    boundaries: [],
    allowedTasks: [
      "Error Investigation",
      "Root Cause Analysis",
      "Log Analysis",
      "Targeted Fix"
    ],
    excludedTasks: []
  },
  "accessibility-specialist": {
    id: "accessibility-specialist",
    displayName: "Accessibility Specialist",
    role: "Accessibility Specialist",
    responsibilities: ["WCAG Compliance", "Screen Reader optimization", "A11y testing"],
    capabilities: ["Accessibility audits", "A11y remediation"],
    boundaries: [],
    allowedTasks: ["Check WCAG guidelines", "Improve color contrast", "Fix screen reader attributes"],
    excludedTasks: []
  },
  "cloud-architect": {
    id: "cloud-architect",
    displayName: "Cloud Architect",
    role: "Cloud Architect",
    responsibilities: ["Cloud infrastructure", "AWS design", "Resource scaling"],
    capabilities: ["Cloud design", "Serverless architecture"],
    boundaries: [],
    allowedTasks: ["Design AWS layout", "Setup VPC and gateways", "Optimize cloud cost"],
    excludedTasks: []
  },
  "content-specialist": {
    id: "content-specialist",
    displayName: "Content Specialist",
    role: "Content Specialist",
    responsibilities: ["UX Copy", "Localization", "Multilingual content"],
    capabilities: ["Copywriting", "Localization translation"],
    boundaries: [],
    allowedTasks: ["Write UI labels", "Localize text into languages", "Proofread descriptions"],
    excludedTasks: []
  },
  "devops-specialist": {
    id: "devops-specialist",
    displayName: "DevOps Specialist",
    role: "DevOps Specialist",
    responsibilities: ["CI/CD pipelines", "Dockerization", "System deployment"],
    capabilities: ["Docker", "GitHub Actions", "CI/CD pipeline config"],
    boundaries: [],
    allowedTasks: ["Write Dockerfile", "Setup GitHub Actions workflow", "Configure PM2 process manager"],
    excludedTasks: []
  },
  "documentation-specialist": {
    id: "documentation-specialist",
    displayName: "Documentation Specialist",
    role: "Documentation Specialist",
    responsibilities: ["Technical documentation", "API reference generation", "README files"],
    capabilities: ["Markdown writing", "API documentation design"],
    boundaries: [],
    allowedTasks: ["Create API reference doc", "Structure project README", "Document architectural decisions"],
    excludedTasks: []
  },
  "explorer-agent": {
    id: "explorer-agent",
    displayName: "Explorer Agent",
    role: "Explorer Agent",
    responsibilities: ["Project structure discovery", "Dependency scan", "Workspace exploration"],
    capabilities: ["Directory traversal", "Dependency lookup"],
    boundaries: [],
    allowedTasks: ["Map folder hierarchy", "List workspace packages", "Inspect codebase"],
    excludedTasks: []
  },
  "frontend-specialist": {
    id: "frontend-specialist",
    displayName: "Frontend Specialist",
    role: "Frontend Specialist",
    responsibilities: ["UI development", "Responsive layout", "CSS / Styling", "React components"],
    capabilities: ["HTML", "CSS", "React", "Next.js", "Vite", "Responsive design"],
    boundaries: [],
    allowedTasks: ["Develop user interface components", "Implement CSS styled designs", "Verify visual layout on mobile"],
    excludedTasks: []
  },
  "integration-specialist": {
    id: "integration-specialist",
    displayName: "Integration Specialist",
    role: "Integration Specialist",
    responsibilities: ["System integration", "Third party services connector", "Data mappings"],
    capabilities: ["Integrate external APIs", "Data conversion maps"],
    boundaries: [],
    allowedTasks: ["Connect Stripe gateway", "Map auth providers", "Establish Webhook receivers"],
    excludedTasks: []
  },
  "migration-specialist": {
    id: "migration-specialist",
    displayName: "Migration Specialist",
    role: "Migration Specialist",
    responsibilities: ["Legacy system upgrades", "Framework migrations", "Library version conversions"],
    capabilities: ["Upgrading obsolete dependencies", "Framework migration mappings"],
    boundaries: [],
    allowedTasks: ["Migrate code from Next Pages Router to App Router", "Upgrade dependency versions"],
    excludedTasks: []
  },
  "mobile-developer": {
    id: "mobile-developer",
    displayName: "Mobile Developer",
    role: "Mobile Developer",
    responsibilities: ["Native mobile apps", "Cross platform UI (React Native, Flutter, Expo)"],
    capabilities: ["React Native", "Flutter", "Expo", "iOS/Android patterns"],
    boundaries: [],
    allowedTasks: ["Develop cross platform mobile views", "Configure native iOS/Android settings"],
    excludedTasks: []
  },
  "network-specialist": {
    id: "network-specialist",
    displayName: "Network Specialist",
    role: "Network Specialist",
    responsibilities: ["Network routing", "DNS setup", "SSL certificates"],
    capabilities: ["TCP/IP", "DNS record handling", "Reverse proxy config"],
    boundaries: [],
    allowedTasks: ["Setup DNS entries", "Renew SSL certificate", "Configure nginx routing rules"],
    excludedTasks: []
  },
  "performance-specialist": {
    id: "performance-specialist",
    displayName: "Performance Specialist",
    role: "Performance Specialist",
    responsibilities: ["Performance optimization", "Caching strategy", "Bundle size reduction"],
    capabilities: ["Vitals profiling", "Caching configurations", "Webpack / Vite optimization"],
    boundaries: [],
    allowedTasks: ["Profile slow requests", "Implement Redis caching", "Analyze bundle chunking"],
    excludedTasks: []
  },
  "project-planner": {
    id: "project-planner",
    displayName: "Project Planner",
    role: "Project Planner",
    responsibilities: ["Task scheduling", "Gantt timeline design", "Milestone specification"],
    capabilities: ["Timeline planning", "Subtask dependencies scheduling"],
    boundaries: [],
    allowedTasks: ["Draft development phases", "Order tasks sequentially", "Establish project milestones"],
    excludedTasks: []
  },
  "release-manager": {
    id: "release-manager",
    displayName: "Release Manager",
    role: "Release Manager",
    responsibilities: ["Release checklist verification", "Versioning strategy", "Rollback setup"],
    capabilities: ["Git tag handling", "SemVer parsing", "Deployment checks"],
    boundaries: [],
    allowedTasks: ["Verify deployment checklist", "Bump package version", "Establish fallback version tag"],
    excludedTasks: []
  },
  "requirements-analyst": {
    id: "requirements-analyst",
    displayName: "Requirements Analyst",
    role: "Requirements Analyst",
    responsibilities: ["Scope refinement", "Use-case analysis", "System specifications"],
    capabilities: ["Requirement gathering", "System spec modeling"],
    boundaries: [],
    allowedTasks: ["Clarify vague prompt inputs", "Design functional use cases", "Map out epic criteria"],
    excludedTasks: []
  },
  "security-specialist": {
    id: "security-specialist",
    displayName: "Security Specialist",
    role: "Security Specialist",
    responsibilities: ["Vulnerability scanning", "Authentication audit", "Secrets check"],
    capabilities: ["Auth security audits", "Token validation"],
    boundaries: [],
    allowedTasks: ["Run dependency security scanning", "Validate JWT auth schemes", "Audit secrets in repository"],
    excludedTasks: []
  },
  "seo-specialist": {
    id: "seo-specialist",
    displayName: "SEO Specialist",
    role: "SEO Specialist",
    responsibilities: ["Metadata management", "Technical SEO audits", "Sitemaps generation"],
    capabilities: ["SEO checklist verification", "Search indexing layout"],
    boundaries: [],
    allowedTasks: ["Add page meta headers", "Setup sitemap configuration", "Verify page SEO ranking elements"],
    excludedTasks: []
  },
  "sre-specialist": {
    id: "sre-specialist",
    displayName: "SRE Specialist",
    role: "SRE Specialist",
    responsibilities: ["System observability", "Alert configurations", "Centralized logging"],
    capabilities: ["Log collection", "Service monitoring configuration"],
    boundaries: [],
    allowedTasks: ["Configure Prometheus metrics", "Setup Grafana logs", "Establish critical system alerts"],
    excludedTasks: []
  },
  "uiux-specialist": {
    id: "uiux-specialist",
    displayName: "UIUX Specialist",
    role: "UIUX Specialist",
    responsibilities: ["Wireframing layout", "User experience flow", "Design systems consistency"],
    capabilities: ["UI mockups", "Theme styling variables mapping"],
    boundaries: [],
    allowedTasks: ["Design dashboard UX layout", "Define color token schemas", "Create CSS style guide"],
    excludedTasks: []
  }
};

/**
 * Get agent details by canonical ID
 */
function getAgent(id) {
  if (!id) return null;
  const normId = String(id).toLowerCase().trim();
  // Address database architect and mobile developer aliases
  if (normId === "database-specialist") return CANONICAL_REGISTRY["database-architect"];
  if (normId === "mobile-specialist") return CANONICAL_REGISTRY["mobile-developer"];
  return CANONICAL_REGISTRY[normId] || null;
}

/**
 * List all available canonical agent configs
 */
function listAgents() {
  return Object.values(CANONICAL_REGISTRY);
}

module.exports = {
  CANONICAL_REGISTRY,
  getAgent,
  listAgents
};
