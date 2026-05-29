# Agent Swarm

Multi-agent orchestration from the terminal. One install, many agents, pick your models and tools.

**Node.js 18+** required.

**Community:** Discord (living swarm chat) · [GitHub Issues](https://github.com/Anasabubakar/Swarm/issues) (tracked bugs).

---

## Install / Run

Run from source / dev:

```bash
git clone https://github.com/Anasabubakar/Swarm.git
cd Swarm
npm ci
npm run build          # compiles swarm entry + bootstrap → dist/
npm install -g .       # link local install for testing and running globally
```

---

## Requirements

| What | Why |
| --- | --- |
| **Node.js 18+** | Runs the `swarm` launcher and optional Studio UI (`dist/main.js`). |
| **Python 3** | Default orchestrator (`orchestrator.py`). On first launch, Swarm tries to install Python automatically (Windows: `winget`, macOS: Homebrew when present, Linux: non-interactive `apt`/`dnf` when passwordless sudo works). Override with **`SWARM_PYTHON`** or skip auto-setup with **`SWARM_SKIP_DEPS_BOOTSTRAP=1`**. |

**Windows note:** teammate “split panes” use **tmux** on Linux/macOS. On native Windows terminals, teammates run **in‑process** (no WSL required). Want real tmux tiling? Use **WSL** or Linux/macOS.

---

## Usage

```bash
# Interactive swarm (Python orchestrator)
swarm

# Pass-through to orchestrator examples
swarm --list-agents
swarm "your objective here"

# Full Ink/React Studio (needs dist/main.js in the package)
SWARM_STUDIO=1 swarm
# or: swarm --studio
```

Disable optional prompts:

```bash
export SWARM_SKIP_DEPS_BOOTSTRAP=1    # skip Python auto-install attempts
```

---

## Community — living swarm

Ships fly better together. Discord is where people hang out, share setups, shout about releases, and get unstuck quickly. GitHub stays the **source of truth** for bugs that need reproduction and fixes.

### Where to go

| Place | Best for |
| --- | --- |
| **Discord** | Chat, help, showcases, vibes, announcements (you run the server) |
| **[GitHub Issues](https://github.com/Anasabubakar/agent-swarm/issues)** | Crashes, reproducible bugs, concrete feature asks |
| **[GitHub Discussions](https://github.com/Anasabubakar/agent-swarm/discussions)** | Long proposals, FAQs, brainstorming (optional — enable in repo settings if you want it) |

**Discord invite (you add this once):**

1. In Discord: **Create my server** (or use one you already run).
2. **Settings → Invite people → Edit invite link** → expiration **Never** → generate link.
3. Replace the URL below with yours in this README and commit.

👉 **[Join the Swarm Discord](https://discord.gg/REPLACE_ME_WITH_YOUR_INVITE)** ← change `REPLACE_ME_WITH_YOUR_INVITE` only (leave `https://discord.gg/` as-is).

### Channel ideas that keep the swarm alive

- `#announcements` — releases, changelog highlights (muted by default OK).
- `#intro` — who you are, what you ship.
- `#help` — quick questions (`swarm` errors, Python, installs).
- `#bugs` — “open a GitHub Issue + drop the link here” reminder in the pinned post.
- `#showcase` — agents, demos, pipelines.

Pin one short rule: **no API keys**, **be respectful**.

### Contributing

Issues and PRs are welcome. For behavior changes or big ideas, an Issue first helps everyone orient; small doc fixes can go straight as a PR.

---

## Philosophy

Composable agents, parallel work, minimal ceremony: your keys, your machine, registry updates when you choose.

MIT License.
