# System Architecture & Codebase Map — Ryker Multi-Agent Tech v1.0.0

This document provides a comprehensive overview of the **Ryker Multi-Agent Tech v1.0.0** architecture, codebase layout, and module dependencies.

---

## 🎯 Architecture Overview

Ryker Multi-Agent Tech is built as a modular Node.js engine designed for autonomous agent execution, multi-provider LLM failover, and multi-IDE configuration generation.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Ryker CLI & API Server                          │
├───────────────────────────────────┬────────────────────────────────────┤
│         Core Runtime              │            API & MCP               │
│  - Agent Loader (agent-loader.js) │  - REST Server (lib/api/server.js) │
│  - Failover Chain (failover.js)   │  - WS Engine (lib/api/ws.js)       │
│  - Guardrails (guardrails.js)     │  - MCP Tools (lib/mcp/server.js)   │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 📁 Core Directory Map

### `bin/`
- **`cli.js`**: Primary executable CLI entrypoint (`npx ryker-multi-agent-tech`).
- **`server.js`**: Background server launcher for API & WebSocket server.
- **`postinstall.js`**: Post-installation welcome banner and setup check.

### `lib/`
- **`lib/commands/`**: Command handlers (`init.js`, `run.js`, `chat.js`, `add.js`, `test.js`, `inspect.js`, `publish.js`).
- **`lib/core/`**: Core runtime engines (`agent-loader.js`, `guardrails.js`, `failover.js`, `plugin.js`, `react-loop.js`, `roo-generator.js`).
- **`lib/api/`**: HTTP/WebSocket API server endpoints and authentication middleware.
- **`lib/mcp/`**: Model Context Protocol (MCP) server definitions and inspect tools.

### `ryker-multi-agent-tech-dashboard/`
- Next.js web dashboard for visual agent management, log monitoring, and workflow execution.

---

## 📄 License

Apache License 2.0 © 2026 Ryker MultiAgent Tech — Created & Maintained by **rykerzz-tech**.
