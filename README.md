<div align="center">

```
███╗   ██╗██╗███╗   ██╗ █████╗
████╗  ██║██║████╗  ██║██╔══██╗
██╔██╗ ██║██║██╔██╗ ██║███████║
██║╚██╗██║██║██║╚██╗██║██╔══██║
██║ ╚████║██║██║ ╚████║██║  ██║
╚═╝  ╚═══╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝
```

**Terminal AI Coding Agent — 24/7 Automatic Vibe Coder**

[![npm](https://img.shields.io/npm/v/@zoeyefe/nina?color=ff4a6e&label=npm&logo=npm&logoColor=white)](https://www.npmjs.com/package/@zoeyefe/nina)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-111827)](https://github.com/zoeyefe/nina)
[![License](https://img.shields.io/badge/License-MIT-2563eb)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Active%20Development-16a34a)](https://github.com/zoeyefe/nina)
[![Website](https://img.shields.io/badge/Website-nina.efeservili.dev-ff4a6e)](https://nina.efeservili.dev)

</div>

---

## What Does It Do?

NINA is an AI coding agent that **runs in the terminal**. You give it a goal — NINA plans, writes files, runs commands, and fixes errors. You just watch.

```bash
$ nina
> /team build a simple user management panel

  ◆ Planner   → Goal analyzed, 4 steps created
  ◆ Architect → File structure designed
  ◆ Coder     → src/App.jsx written
  ◆ Tester    → npm run test executed ✓
```

---

## Features

| | |
|---|---|
| 🤖 **8 Provider Support** | Ollama, OpenAI, Anthropic, Gemini, Groq, Mistral, Cohere, OpenRouter |
| ⚡ **Action Engine** | `WRITE_FILE` / `RUN_CMD` / `DELETE_FILE` — works directly on the file system |
| 🧠 **Team Mode** | Multi-agent role distribution — planner, coder, reviewer at the same time |
| 📋 **Task Planner** | Step-by-step roadmap to the goal with `/tasks` |
| 🔄 **Automatic Error Recovery** | Self-recovery loop on command/action failures |
| 📺 **Live Monitor** | In team mode, agent states are tracked live on a single screen |
| 🔐 **Secure Auth** | API keys are stored in `~/.nina/credentials.json`, never committed |
| 🖥️ **Cross-Platform** | Windows + Unix command compatibility layer |

---

## Installation

```bash
npm install -g @zoeyefe/nina
nina
```

> **Requirement:** Node.js 18 or higher

---

## Quick Start

```bash
# 1. Add a provider
/auth web

# 2. Select a model
/use ollama qwen3:8b
# or
/use openai gpt-4o
# or
/use anthropic claude-sonnet-4-5

# 3. Single-agent mode
/tasks write a REST API with Express + JWT auth

# 4. Team mode — NINA assigns roles automatically
/team build an e-commerce product page, React + Tailwind
```

---

## Command Reference

```
/auth add|web|oauth|remove|list   → Provider credential management
/use <provider> [model]           → Change active model
/team <goal>                      → Start multi-agent mode
/tasks <goal>                     → Planned single-agent mode
/run <command>                    → Execute shell command
/debug                            → Show debug info
/daemon                           → Background mode
/system                           → System settings
/help                             → List all commands
```

---

## How Team Mode Works?

When you type `/team`, NINA does the following:

```
User enters goal
        ↓
  Goal is analyzed
        ↓
  Roles are assigned automatically
  (Planner / Coder / Reviewer / ...)
        ↓
  Agents run in parallel
  (Visible live in terminal monitor)
        ↓
  Actions are applied
  (Files are written, commands are run)
        ↓
  Unified result is produced
```

The user only writes the goal. NINA handles the rest.

---

## Project Structure

```
nina/
├── nina.js          # Main CLI loop & entry point
├── core/            # Executor, planner, agents, shell adapter, system prompt
├── providers/       # LLM provider integrations (8 total)
├── auth/            # Credential & auth flows
├── ui/              # Terminal banner, input, color system
├── plugins/         # Browser, system, debug, daemon capabilities
├── memory/          # Session & memory management
└── website/         # Source code of nina.efeservili.dev
```

---

## Supported Providers

```
ollama      → Local models, zero cost
openai      → GPT-4o, o1, o3
anthropic   → Claude Sonnet, Opus
gemini      → Gemini 1.5 Pro/Flash
groq        → Llama 3, Mixtral (very fast)
mistral     → Mistral Large/Small
cohere      → Command R+
openrouter  → 200+ models, one API
```

---

## Security

- API keys are stored only in `~/.nina/credentials.json` — never committed to the repository
- Use the `.env.example` template, never commit real values
- The `main` branch is protected — direct push is disabled
- PR review is required, critical files are controlled with CODEOWNERS

For details → [SECURITY.md](SECURITY.md)

---

## Contributing

```bash
git clone https://github.com/zoeyefe/nina.git
cd nina
npm install
node nina.js
```

Before opening a PR, check the relevant file in CODEOWNERS.

---

<div align="center">

**[🌐 Website](https://nina.efeservili.dev)** · **[🐛 Issues](https://github.com/zoeyefe/nina/issues)** · **[📋 Changelog](https://github.com/zoeyefe/nina/commits/main)**

MIT License © 2025 [zoeyefe](https://github.com/zoeyefe)

*NINA is still evolving — getting smarter with every commit.*

</div>
