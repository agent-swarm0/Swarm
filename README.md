# 🛡️ SWARM v1.0

**Multi-agent orchestration for the modern engineer.**

SWARM is a high-performance agent orchestrator that allows you to dispatch complex goals to a swarm of specialized AI agents. Whether you're a developer with local CLI agents installed or a user who prefers a plug-and-play API experience, SWARM provides a unified interface to get things done.

[![Build Status](https://github.com/agent-swarm0/Swarm/actions/workflows/main.yml/badge.svg)](https://github.com/agent-swarm0/Swarm/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🚀 Two Ways to Swarm

SWARM operates in two distinct modes to accommodate different user needs:

### 1. CLI Mode (Local Power)
**For developers who want full control.**
In CLI mode, SWARM orchestrates local agents installed on your machine (e.g., Claude Code, Gemini CLI). It manages the workspace, handles the goal breakdown, and pipes output from your local tools.
- **Requirement:** Local CLI agents installed and authenticated.
- **Best for:** Deep system integration and local file manipulation.

### 2. API Mode (Zero Setup)
**For everyone else.**
API mode allows you to use the swarm without installing a single local agent. Simply provide your API key for one of the supported providers, and SWARM calls the models directly via a high-performance API router.
- **Supported Providers:** OpenAI, Anthropic, Gemini, Groq.
- **Best for:** Fast prototyping, non-technical users, and cloud-native workflows.

---

## 📦 Installation

### Prerequisites
- **Node.js 18+**
- **Python 3.12+** for the local TUI orchestrator

### Install From NPM
```bash
npm install -g swarm
swarm
```

### Install From GitHub
```bash
git clone https://github.com/agent-swarm0/Swarm.git
cd Swarm
npm install
npm run build
npm run build:web
npm install -g .
swarm
```

`swarm` starts both local surfaces:
- The terminal TUI for technical users.
- The browser dashboard for non-technical users.

The TUI prints the dashboard URL when it starts, usually:
```text
Dashboard running: http://127.0.0.1:3001/dashboard
```

This is fully local. You do not need Vercel or any hosted dashboard deployment.

---

## 🛠️ Usage

### Running Swarm
Launch the interactive TUI and local dashboard:
```bash
swarm
```

Pass a goal directly:
```bash
swarm "Build a landing page with Tailwind CSS"
```

Choose a different dashboard port:
```bash
swarm --dashboard-port 3010
```

Skip the dashboard when you only want the terminal:
```bash
swarm --no-dashboard
```

### Running in API Mode
Use the `--provider` and `--api-key` flags to bypass local installation:
```bash
# Use OpenAI
swarm --provider openai --api-key sk-your-key-here "Create a REST API for a bookstore"

# Use Anthropic
swarm --provider anthropic --api-key sk-ant-your-key-here "Audit this codebase for security flaws"
```

### Useful Commands
- `swarm --agents`: List all 245+ available specialized agents.
- `swarm --agent [slug] "goal"`: Dispatch a specific agent for a task.
- `/help`: Show all available slash commands within the TUI.

---

## 🔑 Provider Setup Guide

To use API Mode, you will need an API key from one of these providers:

| Provider | Where to get your key | Recommended Model |
| :--- | :--- | :--- |
| **OpenAI** | [platform.openai.com](https://platform.openai.com) | GPT-4o |
| **Anthropic** | [console.anthropic.com](https://console.anthropic.com) | Claude 3.5 Sonnet |
| **Gemini** | [aistudio.google.com](https://aistudio.google.com) | Gemini 1.5 Pro |
| **Groq** | [console.groq.com](https://console.groq.com) | Llama 3 70B |

---

## 👥 Team Credits

Developed during a high-intensity 19-hour sprint by:
- **Anas** — Lead / Orchestration
- **Saheed** — Backend / API Layer
- **David** — Web Dashboard
- **Annointed** — Agent Engine
- **Lekan** — CLI + QA

---

## 📄 License
MIT License. See `LICENSE` for details.
