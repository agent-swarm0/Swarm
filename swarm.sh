#!/bin/bash
# Agent Swarm Quick Start
# Usage: ./swarm.sh "Build a landing page for TeenovateX"
#!/bin/bash
SWARM_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG="$SWARM_DIR/swarm.config.json"

echo "🛡️ Agent Swarm Orchestrator"
echo "=========================="

if [ -z "$1" ]; then
    echo ""
    echo "Usage:"
    echo "  ./swarm.sh \"Your goal here\""
    echo "  ./swarm.sh --agent <agent-name> \"Your task\""
    echo ""
    echo "Available agents (grouped by category):"
    echo ""

    # --- colour map per category ---
    # read config, group by source, print with colours
    python3 - <<'EOF'
import json, sys

# colour codes
COLOURS = {
    "engineering":       "\033[34m",   # blue
    "marketing":         "\033[35m",   # magenta
    "sales":             "\033[32m",   # green
    "design":            "\033[36m",   # cyan
    "testing":           "\033[33m",   # yellow
    "product":           "\033[95m",   # bright magenta
    "gsd":               "\033[96m",   # bright cyan
    "specialized":       "\033[91m",   # bright red
    "game-development":  "\033[94m",   # bright blue
    "ecc":               "\033[93m",   # bright yellow
    "management":        "\033[92m",   # bright green
    "support":           "\033[90m",   # grey
    "strategy":          "\033[97m",   # white
    "academic":          "\033[31m",   # red
    "paid-media":        "\033[38;5;208m", # orange
    "spatial-computing": "\033[38;5;141m", # purple
    "project-management":"\033[38;5;45m",  # sky blue
    "creative":          "\033[38;5;213m", # pink
    "core":              "\033[38;5;82m",  # lime
    "integrations":      "\033[38;5;220m", # gold
}
RESET = "\033[0m"
BOLD  = "\033[1m"

with open("swarm.config.json") as f:
    config = json.load(f)

# group agents by source
groups = {}
for name, info in config["agents"].items():
    src = info.get("source", "other")
    groups.setdefault(src, []).append(name)

for category in sorted(groups):
    colour = COLOURS.get(category, "\033[37m")
    print(f"{colour}{BOLD}[{category}]{RESET}")
    for agent in sorted(groups[category]):
        print(f"  {colour}•{RESET} {agent}")
    print()
EOF

    # engines from config
    ENGINES=$(python3 -c "
import json
with open('swarm.config.json') as f:
    c = json.load(f)
print(', '.join(c.get('api_mode', {}).get('providers', ['claude'])))
")
    echo "Engines: $ENGINES"
    exit 0
fi

cd "$SWARM_DIR"
python3 orchestrator.py "$@"