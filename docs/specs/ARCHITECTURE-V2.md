# Architecture V2 — AI Agent Platform

> Shift from "CLI tool" → "AI Agent Platform"

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Direction | Open Source Platform | Community ecosystem, global use |
| Runtime | Node + Bun Dual | Max compatibility + speed |
| Config Dir | Hybrid `.agent/` + symlink `.windsurf/` | Universal + Windsurf native |
| Plugin Source | npm packages | Leverage existing ecosystem |

---

## CLI commands

```
ryker-multi-agent-tech init                    # Interactive agent generator
ryker-multi-agent-tech update                  # Update config to latest
ryker-multi-agent-tech version                 # Show version + check updates
ryker-multi-agent-tech status                  # Project statistics
ryker-multi-agent-tech list                    # List all slash commands
ryker-multi-agent-tech info <agent>            # Agent details
ryker-multi-agent-tech checklist [url]         # Quality verification
ryker-multi-agent-tech uninstall               # Remove config directories
ryker-multi-agent-tech run <input>             # Execute agent with input
ryker-multi-agent-tech run-from-file <path>    # Run from markdown with frontmatter
ryker-multi-agent-tech chat                    # Interactive chat session
ryker-multi-agent-tech dev                     # Dev REPL with verbose logging
ryker-multi-agent-tech engines                 # List CLI engines in PATH
ryker-multi-agent-tech health                  # System health check
ryker-multi-agent-tech traces                  # View distributed traces
ryker-multi-agent-tech inspect                 # Observability dashboard
ryker-multi-agent-tech usage                   # Usage statistics
ryker-multi-agent-tech serve                   # Start HTTP API + WebSocket server
ryker-multi-agent-tech mcp                     # Start MCP server (stdio)
ryker-multi-agent-tech add skill <name>        # Install skill from npm
ryker-multi-agent-tech remove skill <name>     # Uninstall skill
ryker-multi-agent-tech test                    # Run agent test suite
ryker-multi-agent-tech test --watch            # Watch mode
ryker-multi-agent-tech publish                 # Publish agent to npm
ryker-multi-agent-tech generate mcp <type>     # MCP server generator
```

---

## Architecture overview

```
┌──────────────────────────────────────────────────────┐
│                    CLI Layer                          │
│  bin/cli.js — Commander.js-based command router      │
└──────────────────────┬───────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────┐
│                  Core Engine                          │
│  lib/core/                                           │
│  ├── config.js      — Config loader (.agent/ first)  │
│  ├── plugin.js      — Plugin lifecycle manager        │
│  ├── runtime.js     — Agent runtime (Node + Bun)      │
│  ├── guardrails.js  — Security & safety layer         │
│  └── logger.js      — Structured logging              │
└──────────────────────┬───────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────┐
│               Plugin System                           │
│  .agent/skills/                                      │
│  ├── core/          — Built-in skills (shipped)      │
│  └── installed/     — npm-installed skills            │
│                                                      │
│  Each skill:                                         │
│  ├── SKILL.md       — Metadata + prompts             │
│  ├── scripts/      — Tool functions                  │
│  └── config.json   — Plugin manifest                 │
└──────────────────────┬───────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────┐
│              Test Framework                           │
│  lib/test/                                           │
│  ├── runner.js      — Test orchestrator               │
│  ├── assertions.js  — Prompt/output assertions        │
│  ├── simulator.js   — Tool call simulator             │
│  └── reporter.js    — Results formatter              │
│                                                      │
│  .agent/tests/                                       │
│  └── *.test.md     — Test cases in markdown           │
└──────────────────────┬───────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────┐
│            Publish System                             │
│  lib/publish/                                        │
│  ├── packager.js    — Bundle agent for npm            │
│  ├── validator.js   — Pre-publish checks             │
│  └── registry.js    — npm publish wrapper             │
├──────────────────────────────────────────────────────┤
│              API Layer (V2.4+)                       │
│  lib/api/                                            │
│  ├── server.js      — Express + routes               │
│  ├── ws.js          — WebSocket real-time stream  │
│  ├── handoff.js     — Agent handoff + intervene   │
│  ├── jobs.js        — Async job model                │
│  └── middleware.js  — Logging, shutdown, rate-limit│
├──────────────────────────────────────────────────────┤
│              Core Engine (V2.5+)                     │
│  lib/core/                                           │
│  ├── handoff.js     — Bundle format (A→B)        │
│  ├── agent-system.js— Auto-detect project context │
│  └── fetch.url      — Built-in HTTP fetch tool     │
├──────────────────────────────────────────────────────┤
│         Decomposed Modules (V2.6+)                   │
│  agent-runtime.js  — Re-export (backward compat)     │
│  react-loop.js     — ReAct loop execution         │
│  chat-session.js   — Interactive chat             │
│  failover.js       — Per-provider CB + failover   │
│  cache.js          — LRU cache                     │
│  agent-loader.js   — Agent spec + skill loading    │
│  prompt-builder.js — System prompt construction   │
│  input-sanitizer.js— Input validation              │
│  tool-parser.js    — Tool call parsing             │
│  tool-registry.js  — Re-export (backward compat)     │
│  tool-definitions.js—Tools + schemas + registry    │
│  search-tools.js   — Grep + Glob                  │
│  command-parser.js — Shell arg parse + safe regex  │
│  types.d.ts        — TypeScript declarations         │
└──────────────────────────────────────────────────────┘
```

---

## Directory structure

```
ryker-multi-agent-tech/
├── bin/
│   ├── cli.js              # CLI entry (refactored)
│   └── postinstall.js
├── lib/
│   ├── utils.js            # Shared utilities (existing)
│   ├── core/
│   │   ├── config.js       # Config loader (.agent/ → .windsurf/ symlink)
│   │   ├── plugin.js       # Plugin install/remove/lifecycle
│   │   ├── runtime.js      # Agent runtime engine
│   │   ├── guardrails.js   # Security layer
│   │   ├── logger.js       # Structured logger
│   │   ├── agent-runtime.js# Re-export (V2.6 decomposition)
│   │   ├── react-loop.js   # ReAct loop execution (V2.6)
│   │   ├── chat-session.js # Interactive chat session (V2.6)
│   │   ├── failover.js     # Per-provider CB + failover (V2.6)
│   │   ├── cache.js        # LRU cache (V2.6)
│   │   ├── agent-loader.js # Agent spec + skill loading (V2.6)
│   │   ├── prompt-builder.js#System prompt builder (V2.6)
│   │   ├── input-sanitizer.js#Input validation (V2.6)
│   │   ├── tool-parser.js  # Tool call parsing (V2.6)
│   │   ├── tool-registry.js# Re-export (V2.6 decomposition)
│   │   ├── tool-definitions.js#Tools + schemas + registry (V2.6)
│   │   ├── search-tools.js # Grep + Glob (V2.6)
│   │   ├── command-parser.js#Shell arg parse + safe regex (V2.6)
│   │   ├── types.d.ts      # TypeScript declarations (V2.6)
│   │   ├── handoff.js      # Agent-to-agent bundle format (V2.5)
│   │   ├── agent-system.js # Auto-detect project context (V2.5)
│   ├── commands/
│   │   ├── init.js         # Smart init (interactive)
│   │   ├── add.js          # ryker-multi-agent-tech add skill <name>
│   │   ├── remove.js       # ryker-multi-agent-tech remove skill <name>
│   │   ├── test.js         # ryker-multi-agent-tech test
│   │   ├── publish.js      # ryker-multi-agent-tech publish
│   │   ├── inspect.js      # ryker-multi-agent-tech inspect
│   │   ├── dev.js          # ryker-multi-agent-tech dev
│   │   └── generate.js     # ryker-multi-agent-tech generate mcp <type>
│   ├── test/
│   │   ├── runner.js       # Test runner
│   │   ├── assertions.js   # Assert helpers
│   │   ├── simulator.js    # Tool call simulator
│   │   └── reporter.js     # Output formatter
│   └── publish/
│       ├── packager.js     # Bundle for npm
│       ├── validator.js    # Pre-publish validation
│       └── registry.js     # npm publish
├── templates/
│   ├── agent/              # Agent templates for init
│   │   ├── backend.md
│   │   ├── automation.md
│   │   ├── scraping.md
│   │   └── dev-assistant.md
│   ├── skill/              # Skill scaffold template
│   │   ├── SKILL.md
│   │   └── config.json
│   ├── test/               # Test template
│   │   └── agent.test.md
│   └── mcp/                # MCP server templates
│       ├── rest/
│       └── grpc/
├── .agent/                 # NEW: Universal config directory
│   ├── agents/
│   ├── skills/
│   │   ├── core/           # Built-in skills
│   │   └── installed/      # npm-installed skills
│   ├── workflows/
│   ├── rules/
│   ├── tests/
│   └── config.yaml
├── .windsurf/              # Symlink → .agent/ (if Windsurf IDE)
├── package.json
└── README.md
```

---

## Implementation phases

### Phase 1: foundation
**Goal**: Replace dumb `init` with interactive agent generator

1. Create `lib/commands/init.js` — interactive prompts (use case, provider, memory)
2. Create `lib/core/config.js` — `.agent/` loader + `.windsurf/` symlink
3. Create `templates/agent/` — 4 agent templates (backend, automation, scraping, dev-assistant)
4. Refactor `bin/cli.js` — use command modules from `lib/commands/`
5. Add `inquirer` dependency for interactive prompts

**Deliverable**: `ryker-multi-agent-tech init` → interactive → generates tailored agent config

### Phase 2: plugin system
**Goal**: `ryker-multi-agent-tech add skill X` installs from npm

1. Create `lib/core/plugin.js` — install/remove/validate skill packages
2. Create `lib/commands/add.js` — `ryker-multi-agent-tech add skill <name>`
3. Create `lib/commands/remove.js` — `ryker-multi-agent-tech remove skill <name>`
4. Create `templates/skill/` — scaffold for skill authors
5. Skill package convention: `ryker-multi-agent-tech-skill-<name>` on npm
6. Inject: config → `.agent/skills/installed/`, prompt → SKILL.md, tools → scripts/

**Deliverable**: `ryker-multi-agent-tech add skill postgres` → installs + configures

### Phase 3: agent testing
**Goal**: `ryker-multi-agent-tech test` runs prompt/output assertions

1. Create `lib/test/runner.js` — discovers + runs test files
2. Create `lib/test/assertions.js` — assertOutput, assertToolCall, assertNoError
3. Create `lib/test/simulator.js` — mock tool calls, mock LLM responses
4. Create `lib/test/reporter.js` — TAP + pretty output
5. Create `lib/commands/test.js` — `ryker-multi-agent-tech test [--watch]`
6. Test file format: `.agent/tests/*.test.md` with frontmatter

**Deliverable**: `ryker-multi-agent-tech test` → runs assertions against agent behavior

### Phase 4: publish/install agent
**Goal**: `ryker-multi-agent-tech publish` → others can `npx your-agent`

1. Create `lib/publish/packager.js` — bundle agent as standalone npm package
2. Create `lib/publish/validator.js` — pre-publish checks (manifest, tests pass)
3. Create `lib/publish/registry.js` — npm publish wrapper
4. Create `lib/commands/publish.js` — `ryker-multi-agent-tech publish`
5. Published agent = standalone CLI that runs `ryker-multi-agent-tech init --template=<agent>`

**Deliverable**: `ryker-multi-agent-tech publish` → agent on npm → `npx your-agent init`

---

## Guardrails

```js
// lib/core/guardrails.js
module.exports = {
  pathTraversal(filePath) { /* block ../ and absolute paths */ },
  safeWrite(filePath, content) { /* atomic write: tmp → rename */ },
  rateLimit(key, maxPerMin) { /* in-memory rate limiter */ },
  sandboxExec(cmd, args, options) { /* whitelist allowed commands */ },
};
```

---

## Runtime detection

```js
// lib/core/runtime.js
const isBun = typeof Bun !== "undefined";
const runtime = isBun ? "bun" : "node";

module.exports = {
  runtime,
  exec: isBun ? Bun.exec : require("child_process").execFileSync,
  readDir: isBun ? Bun.readDirSync : (p) => require("fs").readdirSync(p),
};
```

---

## Config hybrid

```js
// lib/core/config.js
const fs = require("fs");
const path = require("path");

function initConfig(projectDir) {
  const agentDir = path.join(projectDir, ".agent");
  const windsurfDir = path.join(projectDir, ".windsurf");

  // Create .agent/ as source of truth
  if (!fs.existsSync(agentDir)) {
    fs.mkdirSync(agentDir, { recursive: true });
    // ... copy structure
  }

  // Symlink .windsurf/ → .agent/ if Windsurf IDE detected
  if (!fs.existsSync(windsurfDir) && fs.existsSync(path.join(projectDir, ".windsurfrules"))) {
    fs.symlinkSync(agentDir, windsurfDir, "junction");
  }
}
```

---

## Smart Init Flow

```
$ ryker-multi-agent-tech init

? What will this agent do?
  ❯ Backend API
    Automation / Scraping
    Dev Assistant
    Custom

? Which LLM provider?
  ❯ OpenAI
    Claude (Anthropic)
    Local (Ollama)
    Multi-provider

? Memory strategy?
  ❯ None (stateless)
    File-based (.agent/memory/)
    Vector (requires add skill vector)

? Enable guardrails? (Y/n) Y

✨ Generating agent config...

  Created: .agent/agents/main.md
  Created: .agent/skills/core/ (3 built-in)
  Created: .agent/config.yaml
  Created: .agent/tests/main.test.md
  Linked:  .windsurf/ → .agent/

  Next: ryker-multi-agent-tech add skill postgres
        ryker-multi-agent-tech test
```

---

## Dependencies to Add

```json
{
  "dependencies": {
    "inquirer": "^9.x",
    "commander": "^12.x",
    "chalk": "^5.x",
    "ora": "^8.x",
    "yaml": "^2.x",
    "glob": "^10.x"
  }
}
```

---

## Not Doing (Per ChatGPT Advice)

- ❌ Not just a wrapper CLI — must be a platform
- ❌ Not Windsurf-only — universal via `.agent/`
- ❌ Not over-engineering — implement phase by phase
