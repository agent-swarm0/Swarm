# 🎬 SWARM v1.0 Demo Guide

This document contains the script and talking points for the 3-minute SWARM demo.

## ⏱️ Demo Timeline (180 Seconds)

### 0:00 - 0:45 | Part 1: The TUI & CLI Mode
**Visual:** Open terminal, run `swarm`.
**Action:** 
1. Show the banner.
2. Type `swarm --agents` to show the massive catalog of 245+ agents.
3. Run a simple goal: `swarm "Create a basic React component for a user profile"`.
**Talking Points:**
- "Meet SWARM: a multi-agent orchestrator that turns complex goals into executable tasks."
- "We have a registry of over 200 specialized agents, from frontend experts to security auditors."
- "In CLI mode, SWARM leverages the power of agents you already have installed locally."

### 0:45 - 1:30 | Part 2: Zero-Setup API Mode
**Visual:** Terminal.
**Action:** 
1. Run `swarm --provider anthropic --api-key sk-ant-... "Write a system design document for a scalable chat app"`.
2. Show the output streaming in real-time.
**Talking Points:**
- "But not everyone wants to manage local CLI tools. That's why we built API Mode."
- "With one flag and an API key, anyone can harness the swarm. No local agents, no configuration, just results."
- "Our custom API router handles the dispatching and concurrency, ensuring high-speed delivery."

### 1:30 - 2:30 | Part 3: The Web Dashboard
**Visual:** Browser window showing the SWARM Dashboard.
**Action:** 
1. Show the landing page and the clean, modern UI.
2. Enter the Dashboard $\rightarrow$ Select Provider $\rightarrow$ Paste API Key $\rightarrow$ Type Goal.
3. Watch the **Live Agent Feed** stream tokens as the swarm works.
4. Navigate to the **Agent Catalog** and click a specialized agent to pre-fill the goal.
**Talking Points:**
- "For the ultimate experience, we have the SWARM Dashboard."
- "It brings the power of the orchestrator to a beautiful, intuitive GUI."
- "You can watch the agents collaborate in real-time through our WebSocket stream, making the 'black box' of AI transparent."

### 2:30 - 3:00 | Part 4: Conclusion & The Pitch
**Visual:** Final summary screen or the GitHub README.
**Talking Points:**
- "SWARM isn't just a wrapper; it's a coordination layer that makes AI agents truly collaborative."
- "From zero-setup API access to deep local integration, SWARM is the bridge between raw LLMs and production-ready software engineering."
- "We've built the infrastructure for the future of autonomous work."

---

## 🎤 Pitch Talking Points (The "Hooks")

1. **The "Friction" Hook:** "Most AI agents require complex setups, local environments, and constant tinkering. SWARM removes that friction."
2. **The "Scale" Hook:** "We don't just give you one agent; we give you a swarm of 245+ specialists, coordinated by a single orchestrator."
3. **The "Accessibility" Hook:** "Whether you're a hardcore dev in the terminal or a product manager in a browser, SWARM gives you the same elite engineering capabilities."

---

## 🎥 GIF Recording Checklist
- [ ] **GIF 1:** `swarm --agents` $\rightarrow$ scrolling through the list.
- [ ] **GIF 2:** API Mode command $\rightarrow$ output streaming.
- [ ] **GIF 3:** Dashboard $\rightarrow$ Goal input $\rightarrow$ Live token stream.
- [ ] **GIF 4:** Agent Catalog $\rightarrow$ clicking an agent.
