# Usage Guide — Ryker MultiAgent Tech

> Complete guide for using the AI Agent Platform

---

## Quick start

```bash
# Install globally
npm install -g ryker-multi-agent-tech

# Initialize a project
ryker-multi-agent-tech init

# Run an agent
ryker-multi-agent-tech run "Create a REST API with Express"

# Chat interactively
ryker-multi-agent-tech chat
```

---

## All commands

| Command | Description |
|---------|-------------|
| `ryker-multi-agent-tech init` | Interactive agent generator |
| `ryker-multi-agent-tech update` | Update config to latest version |
| `ryker-multi-agent-tech version` | Show version + check updates |
| `ryker-multi-agent-tech status` | Show project statistics |
| `ryker-multi-agent-tech list` | List all slash commands |
| `ryker-multi-agent-tech info <agent>` | Show agent details: skills, tools, rules |
| `ryker-multi-agent-tech checklist [url]` | Run master checklist |
| `ryker-multi-agent-tech uninstall` | Remove config directories |
| `ryker-multi-agent-tech run <input>` | Execute agent with input |
| `ryker-multi-agent-tech run-from-file <path>` | Execute agent from markdown with frontmatter |
| `ryker-multi-agent-tech chat` | Interactive chat session |
| `ryker-multi-agent-tech dev` | REPL dev mode with verbose logging |
| `ryker-multi-agent-tech engines` | List CLI engines detected in PATH |
| `ryker-multi-agent-tech health` | System health check |
| `ryker-multi-agent-tech traces` | View recent distributed traces |
| `ryker-multi-agent-tech inspect` | Observability — stats, tool usage, latency, errors |
| `ryker-multi-agent-tech usage` | Show usage statistics and deployment history |
| `ryker-multi-agent-tech serve` | Start HTTP API + WebSocket server |
| `ryker-multi-agent-tech mcp` | Start MCP server (stdio) |
| `ryker-multi-agent-tech add skill <name>` | Install skill from npm |
| `ryker-multi-agent-tech remove skill <name>` | Uninstall skill |
| `ryker-multi-agent-tech test` | Run agent test suite |
| `ryker-multi-agent-tech test --compliance` | Spec compliance (15 checks) |
| `ryker-multi-agent-tech test --unit` | Unit tests (41 tests) |
| `ryker-multi-agent-tech test --production` | Production module tests (25 tests) |
| `ryker-multi-agent-tech test --integration` | Integration tests (12 tests) |
| `ryker-multi-agent-tech publish` | Publish agent to npm |
| `ryker-multi-agent-tech generate <type>` | Generate MCP server / config (experimental) |

---

## WebSocket API

Real-time agent execution with step-by-step streaming — inspired by Claude Design's live canvas.

```javascript
// Connect to WebSocket
const ws = new WebSocket("ws://localhost:3000/ws");

// Run agent with real-time step events
ws.send(JSON.stringify({
  type: "run",
  agentName: "backend-specialist",
  input: "Create a REST API",
  provider: "openai"
}));

// Receive events:
// { type: "step", runId, step, thought, action, result, error, duration_ms }
// { type: "complete", runId, status, output, usage }
// { type: "error", runId, message }

// Create chat session
ws.send(JSON.stringify({ type: "chat.create", agentName: "frontend-specialist" }));
// → { type: "chat.created", sessionId: "chat_xxx" }

// Send message in chat
ws.send(JSON.stringify({ type: "chat.send", sessionId: "chat_xxx", input: "Hello" }));
// → { type: "chat.step", ... } (per step)
// → { type: "chat.complete", sessionId, content, usage }

// Intervene mid-run (inject feedback while agent is running)
ws.send(JSON.stringify({ type: "intervene", runId: "run_xxx", message: "Use dark mode" }));
```

---

## Agent handoff

Chain agents together — Agent A completes, produces a handoff bundle, Agent B receives enriched context.

```bash
# Chain: frontend-specialist designs UI → backend-specialist implements API
curl -X POST http://localhost:3000/handoff \
  -H "Content-Type: application/json" \
  -d '{
    "from_agent": "frontend-specialist",
    "to_agent": "backend-specialist",
    "input": "Design a task dashboard"
  }'
```

**Response:**
```json
{
  "handoffId": "bundle_xxx",
  "from": { "agent": "frontend-specialist", "status": "complete", "steps": 5 },
  "to": { "agent": "backend-specialist", "status": "complete", "output": "..." },
  "artifacts": 3,
  "pendingTasks": 0
}
```

**Retrieve bundle:**
```bash
curl http://localhost:3000/handoff/bundle_xxx
```

---

## Inline intervention

Inject feedback mid-run to redirect an agent without restarting.

```bash
# Via HTTP API
curl -X POST http://localhost:3000/agents/intervene \
  -H "Content-Type: application/json" \
  -d '{"run_id": "run_xxx", "message": "Use TypeScript instead of JavaScript"}'
```

```javascript
// Via WebSocket
ws.send(JSON.stringify({
  type: "intervene",
  runId: "run_xxx",
  message: "Use TypeScript instead of JavaScript"
}));
// → { type: "intervene.ack", runId }
```

---

## Execution Engine

### `ryker-multi-agent-tech run`

Execute an agent with a single input. The core of the platform.

```bash
# Basic usage
ryker-multi-agent-tech run "Create a REST API with Express"

# Specify agent
ryker-multi-agent-tech run "Fix the login bug" --agent backend-specialist

# Use real LLM
OPENAI_API_KEY=sk-... ryker-multi-agent-tech run "Refactor auth module" --provider openai
ANTHROPIC_API_KEY=sk-ant-... ryker-multi-agent-tech run "Add tests" --provider claude

# Use local LLM (Ollama)
ollama serve
ryker-multi-agent-tech run "Explain this code" --provider local --model llama3

# JSON output (for CI/CD pipelines)
ryker-multi-agent-tech run "Analyze codebase" --json

# Limit steps
ryker-multi-agent-tech run "Quick fix" --max-steps 3

# Mock provider (testing/demo)
ryker-multi-agent-tech run "Hello world" --provider mock
```

**Options:**

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--agent <name>` | `-a` | Agent to run | First found |
| `--provider <p>` | `-p` | LLM provider | `mock` |
| `--model <m>` | `-m` | LLM model name | `gpt-4` |
| `--max-steps <n>` | | Max ReAct loop steps | `10` |
| `--json` | | Output as JSON | `false` |
| `--verbose` | | Show step-by-step thinking | `false` |
| `--dry-run` | | Preview without running | `false` |
| `--no-cache` | | Skip cache, always re-run | `false` |
| `--output-format <fmt>` | | Output format: text, json, artifact | `text` |
| `--no-form` | | Skip question-form guardrail on first turn | `false` |
| `--no-quality-gate` | | Skip anti-slop quality gate | `false` |
| `--strict-quality-gate` | | Fail on quality violations | `false` |
| `--write-artifacts <dir>` | | Write parsed artifacts to directory | — |

### `ryker-multi-agent-tech chat`

Interactive session with continuous context. Like ChatGPT in your terminal.

```bash
# Start chat
ryker-multi-agent-tech chat

# With specific agent
ryker-multi-agent-tech chat --agent backend-specialist

# With real LLM
ryker-multi-agent-tech chat --provider openai --model gpt-4o
```

**In-session commands:**

| Command | Description |
|---------|-------------|
| `exit` / `quit` | End session |
| `history` | Show chat history |
| `help` | Show available commands |

**Options:**

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--agent <name>` | `-a` | Agent to chat with | First found |
| `--provider <p>` | `-p` | LLM provider | `mock` |
| `--model <m>` | `-m` | LLM model name | `gpt-4` |
| `--output-format <fmt>` | | Output format: text, json, artifact | `text` |
| `--no-form` | | Skip question-form guardrail on first turn | `false` |
| `--no-quality-gate` | | Skip anti-slop quality gate | `false` |
| `--strict-quality-gate` | | Fail on quality violations | `false` |

### `ryker-multi-agent-tech run-from-file <path>`

Execute an agent from a markdown file with frontmatter. Useful for repeatable tasks and CI/CD pipelines.

```bash
# Run from markdown file
ryker-multi-agent-tech run-from-file task.md

# Override provider
ryker-multi-agent-tech run-from-file task.md --provider openai

# JSON output
ryker-multi-agent-tech run-from-file task.md --json
```

**Frontmatter format:**

```markdown
---
agent: backend-specialist
provider: openai
model: gpt-4o
maxSteps: 15
---

Create a REST API with Express and PostgreSQL for a todo app.
Include authentication with JWT tokens.
```

**Options:**

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--agent <name>` | `-a` | Override agent (default: from frontmatter) | Frontmatter |
| `--provider <p>` | `-p` | Override provider | Frontmatter |
| `--model <m>` | `-m` | Override model | Frontmatter |
| `--max-steps <n>` | | Override max ReAct loop steps | Frontmatter |
| `--json` | | Output as JSON | `false` |
| `--verbose` | | Show step-by-step thinking | `false` |
| `--dry-run` | | Preview without running | `false` |
| `--no-cache` | | Skip cache, always re-run | `false` |
| `--output-format <fmt>` | | Output format: text, json, artifact | `text` |
| `--no-form` | | Skip question-form guardrail | `false` |
| `--no-quality-gate` | | Skip anti-slop quality gate | `false` |
| `--strict-quality-gate` | | Fail on quality violations | `false` |
| `--write-artifacts <dir>` | | Write parsed artifacts to directory | — |

### `ryker-multi-agent-tech dev`

REPL dev mode with verbose logging. Shows every tool call, LLM response, and internal state.

```bash
ryker-multi-agent-tech dev
```

### `ryker-multi-agent-tech update`

Update config to latest version. Preserves user-modified files.

```bash
ryker-multi-agent-tech update
ryker-multi-agent-tech update --dry-run    # Preview without writing
```

### `ryker-multi-agent-tech inspect`

Observability dashboard — agent stats, tool usage, latency, errors.

```bash
ryker-multi-agent-tech inspect
ryker-multi-agent-tech inspect --agent backend-specialist
```

---

## LLM providers

### OpenAI

```bash
export OPENAI_API_KEY=sk-...
ryker-multi-agent-tech run "..." --provider openai
ryker-multi-agent-tech run "..." --provider openai --model gpt-4o
ryker-multi-agent-tech run "..." --provider openai --model gpt-3.5-turbo
```

### Claude (Anthropic)

```bash
export ANTHROPIC_API_KEY=sk-ant-...
ryker-multi-agent-tech run "..." --provider claude
ryker-multi-agent-tech run "..." --provider claude --model claude-sonnet-4-20250514
```

### Local (Ollama)

```bash
# Start Ollama first
ollama serve

# Pull a model
ollama pull llama3

# Run
ryker-multi-agent-tech run "..." --provider local --model llama3
ryker-multi-agent-tech run "..." --provider local --model mistral
ryker-multi-agent-tech run "..." --provider local --model codellama
```

### Groq

```bash
export GROQ_API_KEY=gsk_...
ryker-multi-agent-tech run "..." --provider groq
ryker-multi-agent-tech run "..." --provider groq --model llama-3.3-70b-versatile
ryker-multi-agent-tech run "..." --provider groq --model mixtral-8x7b-32768
```

OpenAI-compatible API at `api.groq.com`. Free tier: 14,400 req/day at console.groq.com. Default model: `llama-3.3-70b-versatile`, configurable via `GROQ_MODEL`.

### Mock (Testing / Default)

```bash
ryker-multi-agent-tech run "..." --provider mock
```

Returns canned responses. Mock is the default provider when no API keys are configured. No env var required. Perfect for testing and demos.

### CLI engines

Use AI CLIs installed in `$PATH` as LLM providers. Auto-detected by the `engines` command.

```bash
# List detected CLI engines
ryker-multi-agent-tech engines
ryker-multi-agent-tech engines --json

# Use a CLI engine as provider
ryker-multi-agent-tech run "..." --provider cli:claude
ryker-multi-agent-tech run "..." --provider cli:codex
```

Spawn safety: `shell: false`, 120s timeout, 1MB output cap, limited env passthrough.

---

## Built-in tools

All tools use **namespace.name** format. Legacy names are auto-aliased.

| Namespaced Name | Legacy Alias | Required Args | Description |
|----------------|-------------|---------------|-------------|
| `fs.read` | `Read` | `path` | Read file contents |
| `fs.write` | `Write` | `path`, `content` | Write file (atomic) |
| `fs.edit` | `Edit` | `path`, `old_string`, `new_string` | Find & replace |
| `fs.glob` | `Glob` | `pattern` | Find files by name |
| `search.grep` | `Grep` | `pattern` | Search file contents |
| `shell.exec` | `Bash` | `command` | Execute allowed commands |

**Arg Validation:** Required args are checked before execution. Missing args return an error.

**Tool Timeout:** Default 30 seconds per tool call. Configurable via `timeout` arg on `shell.exec`.

**Allowed Shell Commands:** `ls`, `cat`, `echo`, `pwd`, `mkdir`, `git`, `node`, `npm`, `npx`, `python3`, `grep`, `find`, `head`, `tail`, `curl`, `wget`

### Custom Tools

Register custom tools with namespace enforcement:

```javascript
const { registerTool } = require("ryker-multi-agent-tech/lib/core/agent-runtime");

registerTool("db.query", async (args) => {
  // args validated: { sql: required, params: optional }
  const result = await db.query(args.sql, args.params);
  return { rows: result.rows, count: result.rowCount };
});
```

> Custom tool names **must** contain a `.` (e.g., `db.query`). Non-namespaced names are rejected.

---

## Plugin system

### Install a Skill

```bash
# Install from npm
ryker-multi-agent-tech add skill clean-code

# Auto-approve permissions (CI/CD)
ryker-multi-agent-tech add skill clean-code --auto-approve
```

If the skill requires permissions, you'll be prompted:

```
⚠️ Skill requires: filesystem access, network access
Allow? (y/N)
```

Denying permissions rolls back the installation.

### Remove a Skill

```bash
ryker-multi-agent-tech remove skill clean-code
```

### Skill Package Convention

Skills on npm follow the naming pattern: `ryker-multi-agent-tech-skill-<name>`

```bash
# These are equivalent
ryker-multi-agent-tech add skill clean-code
ryker-multi-agent-tech add skill ryker-multi-agent-tech-skill-clean-code
```

### Skill config.json

```json
{
  "name": "my-skill",
  "version": "1.0.0",
  "description": "What this skill provides",
  "permissions": {
    "fs": true,
    "network": false,
    "exec": false,
    "env": false
  }
}
```

| Permission | Scope | Default |
|-----------|-------|---------|
| `fs` | File system read/write | Ask on install |
| `network` | HTTP requests | Deny by default |
| `exec` | Shell command execution | Deny by default |
| `env` | Environment variable access | Deny by default |

---

## Agent testing

### Write a Test

Create `.agent/tests/*.test.md` files:

```markdown
---
agent: backend-specialist
provider: mock
---

# Backend Agent Test

## Test: API Generation

**prompt:** Create a REST API with Express

**assertions:**
- output contains "express"
- output contains "router"
- status equals "complete"
```

### Run Tests

```bash
# Run all tests
ryker-multi-agent-tech test

# TAP format (CI/CD)
ryker-multi-agent-tech test --tap

# Watch mode
ryker-multi-agent-tech test --watch
```

### Assertion Types

| Assertion | Example |
|-----------|---------|
| `output contains <text>` | `output contains "express"` |
| `output not contains <text>` | `output not contains "error"` |
| `status equals <value>` | `status equals "complete"` |
| `steps less than <n>` | `steps less than 5` |

---

## Publishing

### Publish Your Agent

```bash
# Validate + publish
ryker-multi-agent-tech publish

# Dry run (validate only)
ryker-multi-agent-tech publish --dry-run

# Override package name
ryker-multi-agent-tech publish --name my-awesome-agent

# Override version
ryker-multi-agent-tech publish --version 1.0.0

# Set author
ryker-multi-agent-tech publish --author "Your Name"

# npm access level
ryker-multi-agent-tech publish --access public

# Block publish if leaked secrets detected
ryker-multi-agent-tech publish --strict

# npm dist-tag
ryker-multi-agent-tech publish --tag next

# Set license
ryker-multi-agent-tech publish --license MIT
```

**Publish options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--dry-run` | Validate and package without publishing | `false` |
| `--strict` | Block publish if leaked secrets detected | `false` |
| `--name <name>` | Override package name | From `package.json` |
| `--version <version>` | Override version | From `package.json` |
| `--author <author>` | Set author | From `package.json` |
| `--license <license>` | Set license | `MIT` |
| `--access <level>` | npm access level (public/restricted) | `public` |
| `--tag <tag>` | npm dist-tag | `latest` |

### Install a Published Agent

```bash
npx my-awesome-agent
```

This installs the agent config into the current project.

---

## Usage statistics

```bash
ryker-multi-agent-tech usage
```

Shows:
- Days active
- Last used timestamp
- Total commands run
- Top 5 commands
- Skills installed
- Test runs + pass rate
- Deployment history (last 5)

All data stored locally in `.agent/usage.json`. **No external telemetry.**

---

## Smart init

```bash
ryker-multi-agent-tech init            # Interactive setup
ryker-multi-agent-tech init --dry-run  # Preview without writing
ryker-multi-agent-tech init --windsurf-only   # Create .windsurf/ only (no .agent/)
ryker-multi-agent-tech init --agent-only     # Create .agent/ only (no .windsurf/ symlink)
ryker-multi-agent-tech init --cursor-only   # Generate .cursor/ only (Cursor IDE)
ryker-multi-agent-tech init --cursor        # Generate .windsurf/ + .cursor/ together
ryker-multi-agent-tech init --roo-only      # Generate Roo Code files only (.roomodes, .roorules, .roo/)
ryker-multi-agent-tech init --no-roo        # Skip Roo Code file generation
ryker-multi-agent-tech init --cursor-only --force  # Re-sync .cursor/ after .windsurf/ changes
```

Interactive prompts:
1. **Use case** — Backend, Automation, Dev Assistant, or Custom
2. **Provider** — OpenAI, Claude, Local, or Mock
3. **Memory** — None, File, or Vector
4. **Guardrails** — Enable/disable security layer

**Init flags:**

| Flag | Description |
|------|-------------|
| `--dry-run` | Preview without writing files |
| `--windsurf-only` | Create `.windsurf/` only (no `.agent/` directory) |
| `--agent-only` | Create `.agent/` only (no `.windsurf/` symlink) |
| `--cursor-only` | Generate `.cursor/` only (Cursor IDE rules + commands) |
| `--cursor` | Also generate `.cursor/` alongside `.windsurf/` / `.agent/` |
| `--roo-only` | Generate Roo Code files only (`.roomodes`, `.roorules`, `.roo/`) |
| `--no-roo` | Skip Roo Code file generation |
| `--force` | Overwrite existing config directories |

Creates:
- `.agent/` — Universal config directory
- `.windsurf/` — Symlink for Windsurf IDE compatibility
- `.cursor/` — Cursor IDE rules and slash commands (with `--cursor` or `--cursor-only`)
- `.roomodes` — Roo Code custom modes (84 agents)
- `.roorules` — Roo Code rules
- `.roo/` — Roo Code system prompts
- Agent definition with your selections
- Config files and test directory

---

## Cursor IDE support

First-class Cursor IDE integration via auto-generated `.cursor/rules/*.mdc` and `.cursor/commands/*.md`.

```bash
# Generate Cursor config from existing .windsurf/
ryker-multi-agent-tech init --cursor-only

# Generate both Windsurf and Cursor configs
ryker-multi-agent-tech init --cursor

# Force re-sync after .windsurf/ changes
ryker-multi-agent-tech init --cursor-only --force
```

**Generated structure:**

| Directory | Contents | Count |
|-----------|----------|-------|
| `.cursor/rules/agents/` | Agent rules (Agent-Requested `.mdc`) | 84 |
| `.cursor/rules/skills/` | Skill rules (Agent-Requested `.mdc`) | 45 |
| `.cursor/rules/domain/` | Domain rules (Auto-Attached `.mdc`) | 9 |
| `.cursor/commands/` | Slash commands (`.md`) | 78 |
| `.cursor/mcp.json` | MCP server config | 1 |
| `.cursor/rules/00-project-overview.mdc` | Always-applied overview | 1 |

**Rule types:**
- **Agent-Requested** — AI decides when to apply based on context (`@orchestrator`, `@backend-specialist`)
- **Auto-Attached** — Automatically applied when matching file globs (e.g., `*.ts`, `**/api/**`)
- **Always** — Applied in every conversation (project overview, GEMINI protocol)

Coexists with Windsurf — both `.windsurf/` and `.cursor/` can live in the same project.

Full guide: [`docs/CURSOR-IDE.md`](CURSOR-IDE.md)

---

## Roo Code support

First-class Roo Code (VS Code extension) integration via auto-generated `.roomodes`, `.roorules`, and `.roo/`.

```bash
# Generate Roo Code files from existing .agent/
ryker-multi-agent-tech init --roo-only

# Skip Roo generation during regular init
ryker-multi-agent-tech init --no-roo

# Re-generate after .agent/ updates
ryker-multi-agent-tech init --roo-only --force
```

**Generated files:**
- `.roomodes` — 84 custom modes (one per agent) for Roo Code mode selector
- `.roorules` — Project rules mirroring `.windsurfrules`
- `.roo/` — System prompts per agent

Source: `lib/core/roo-generator.js`

---

## Security

### Guardrails (Always Active)

- **Path Traversal Protection** — All file operations restricted to project root
- **Atomic Safe Write** — Files written to temp then renamed (no partial writes)
- **Rate Limiting** — 60 operations per minute per key
- **Sandbox Exec** — Only whitelisted commands allowed, with timeout and maxBuffer

### Permission System (On Skill Install)

- Skills declare required permissions in `config.json`
- User prompted before granting access
- Installation rolled back if denied
- `--auto-approve` flag for CI/CD

---

## Runtime correctness

### Parser Fallback Chain

When an LLM returns a response, the runtime tries 4 strategies to parse tool calls:

1. **Structured JSON** — OpenAI-style `tool_calls` array
2. **TOOL_CALL regex** — `TOOL_CALL: fs.read({"path": "/src"})` format
3. **JSON code blocks** — ` ```json { "tool": "fs.read" }``` ` format
4. **Final answer** — No tool calls found, treat as output

### Step Logging

Every step in the ReAct loop produces a standard record:

```json
{
  "step": 1,
  "thought": "I need to read the file first...",
  "action": { "name": "fs.read", "args": { "path": "/src/index.js" } },
  "result": { "content": "...", "lines": 42 },
  "error": null,
  "duration_ms": 120,
  "toolCalls": [...]
}
```

### Deterministic Mode

For stable test results:

```yaml
# In agent frontmatter
deterministic: true
```

Sets `temperature: 0` — eliminates randomness in LLM responses.

### Output Contract

```yaml
# In agent frontmatter
output:
  format: json
```

Enforces JSON output. If the LLM returns plain text, it's wrapped: `{"text": "..."}`

### LLM Retry/Backoff

All LLM providers automatically retry on transient failures:

- **Retryable errors**: 429 (rate limit), 503 (overloaded), timeout, ECONNRESET, ETIMEDOUT
- **Strategy**: Exponential backoff — 1s → 2s → 4s (max 10s), up to 3 retries
- **Configurable**: `callLLM(messages, { maxRetries: 5 })` for custom retry count

### Claude & Ollama Tool Use

- **Claude**: Parses `tool_use` content blocks from Anthropic API — returns structured `toolCalls` array
- **Ollama**: Parses `message.tool_calls` from Ollama API — supports models with tool capabilities
- Both integrate with the parser fallback chain — tool calls work regardless of provider

### Chat Session ReAct Loop

Chat sessions (`ryker-multi-agent-tech chat`) now run a full ReAct loop (max 5 steps per message), not just a single follow-up. If the LLM requests a tool, the result is fed back and the loop continues until a final answer is reached.

### Cross-Platform Tools

`fs.glob` and `search.grep` use Node.js native implementations — no dependency on `grep` or `find` commands. Works on Windows, macOS, and Linux.

### Safe Write EXDEV Fallback

Atomic file writes (`guardrails.safeWrite`) now handle cross-partition renames. On Linux where `/tmp` is a separate tmpfs mount, `renameSync` would fail with `EXDEV`. The fallback uses `copyFileSync` + `unlinkSync`.

### Agent Name Validation

Agent names are validated to prevent path traversal attacks. Characters not allowed: `/ \ : * ? " < > |`

---

## Config directory structure

```
.agent/                          # Universal config (primary)
├── agents/                      # AI Agent definitions
│   └── backend-specialist.md
├── skills/
│   ├── core/                    # Built-in skills
│   └── installed/               # npm-installed skills
├── tests/                       # Test files (*.test.md)
├── config.yaml                  # Project configuration
└── usage.json                   # Usage statistics

.windsurf/                       # Symlink → .agent/ (IDE compatibility)
```

---

## Environment variables

| Variable | Purpose | Required For |
|----------|---------|-------------|
| `OPENAI_API_KEY` | OpenAI API access | `--provider openai` |
| `ANTHROPIC_API_KEY` | Anthropic API access | `--provider claude` |
| `GROQ_API_KEY` | Groq API access | `--provider groq` |
| `GROQ_MODEL` | Override default Groq model | `--provider groq` (optional) |
| `RYKER_ENABLE_MOCK` | (Legacy, no longer required) | `--provider mock` |
| `RYKER_API_KEY` | API server auth key | `serve` command |
| `RYKER_CORS_ORIGIN` | CORS origin for API server | `serve` command |
| `RYKER_TRUST_PROXY` | Trust X-Forwarded-For header | Reverse proxy |
| `OLLAMA_HOST` | Ollama server URL | `--provider local` |
| `RYKER_LOG_LEVEL` | Log level (debug/info/warn/error) | Optional |
| `RYKER_CONFIG_DIR` | Override config directory | Optional |

---

## Common workflows

### Development

```bash
ryker-multi-agent-tech init                              # Setup project
ryker-multi-agent-tech run "Create Express API" --provider mock  # Quick test
ryker-multi-agent-tech add skill clean-code              # Add coding standards
ryker-multi-agent-tech test                              # Run tests
ryker-multi-agent-tech run "Refactor routes" --provider openai    # Real run
```

### CI/CD Pipeline

```bash
ryker-multi-agent-tech run "Validate API spec" --json --provider mock
ryker-multi-agent-tech test --tap
ryker-multi-agent-tech publish --dry-run
```

### Publishing & Sharing

```bash
ryker-multi-agent-tech publish --dry-run                 # Validate first
ryker-multi-agent-tech publish --access public           # Publish to npm
# Others can now: npx your-agent-name
```

### Cursor IDE Setup

```bash
ryker-multi-agent-tech init --cursor-only                # Generate .cursor/ from .windsurf/
ryker-multi-agent-tech init --cursor                     # Generate both Windsurf + Cursor
ryker-multi-agent-tech init --cursor-only --force        # Re-sync after changes
```

### Debugging

```bash
ryker-multi-agent-tech status                            # Check project state
ryker-multi-agent-tech usage                             # See command history
ryker-multi-agent-tech health                            # System health check
ryker-multi-agent-tech traces                            # View recent traces
ryker-multi-agent-tech traces --id <traceId>             # Specific trace details
ryker-multi-agent-tech traces --metrics                  # Trace metrics summary
ryker-multi-agent-tech run "Debug auth" --max-steps 3     # Limit loop
ryker-multi-agent-tech run "Test output" --json          # Structured output
ryker-multi-agent-tech run "Generate API" --output-format artifact --write-artifacts ./out
```
