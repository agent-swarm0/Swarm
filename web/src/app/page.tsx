const features = [
  {
    icon: "⚡",
    title: "Parallel agents",
    description:
      "Spawn multiple agents simultaneously. Each runs independently with its own context, tools, and model.",
  },
  {
    icon: "🔧",
    title: "Your tools, your models",
    description:
      "Bring any LLM — Claude, GPT, Gemini, local models. Attach MCP servers and custom tools per agent.",
  },
  {
    icon: "🐍",
    title: "Python orchestrator",
    description:
      "A battle-tested Python core coordinates agents, handles retries, and streams results back to your terminal.",
  },
  {
    icon: "🖥️",
    title: "Terminal-first",
    description:
      "Full Ink/React TUI with split panes, live output, and keyboard shortcuts. No browser required.",
  },
  {
    icon: "📦",
    title: "Skills & agents library",
    description:
      "150+ pre-built agent definitions and skill packs. Drop them in and go — or write your own in minutes.",
  },
  {
    icon: "🔄",
    title: "Auto-updates",
    description:
      "Built-in update notifier keeps your install current. Answer y to upgrade, n to continue — your call.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-zinc-800 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="font-mono text-lg font-bold text-emerald-400">
            swarm
          </span>
          <div className="flex items-center gap-6 text-sm text-zinc-400">
            <a
              href="#features"
              className="transition-colors hover:text-zinc-100"
            >
              Features
            </a>
            <a href="#install" className="transition-colors hover:text-zinc-100">
              Install
            </a>
            <a
              href="https://github.com/Anasabubakar/agent-swarm"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-zinc-700 px-3 py-1.5 transition-colors hover:border-zinc-500 hover:text-zinc-100"
            >
              GitHub
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 inline-block rounded-full border border-emerald-800 bg-emerald-950 px-3 py-1 text-xs text-emerald-400">
            Node.js 18+ · MIT License
          </div>
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-zinc-50 sm:text-6xl">
            Multi-agent orchestration
            <br />
            <span className="text-emerald-400">from the terminal</span>
          </h1>
          <p className="mb-10 text-lg text-zinc-400">
            One install, many agents, pick your models and tools.
            <br />
            Parallel work, minimal ceremony — your keys, your machine.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="#install"
              className="rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
            >
              Get started
            </a>
            <a
              href="https://github.com/Anasabubakar/agent-swarm"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-zinc-700 px-6 py-3 font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Terminal demo */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-red-500/70" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
            <span className="h-3 w-3 rounded-full bg-green-500/70" />
            <span className="ml-2 text-xs text-zinc-500">terminal</span>
          </div>
          <pre className="overflow-x-auto p-6 text-sm leading-relaxed text-zinc-300">
            <code>
              <span className="text-zinc-500">$ </span>
              <span className="text-emerald-400">npm install -g @anas.abubakar/swarm</span>
              {"\n"}
              <span className="text-zinc-500">$ </span>
              <span className="text-zinc-100">swarm</span>
              {"\n\n"}
              <span className="text-emerald-400">
                ✓ Swarm ready · 3 agents online
              </span>
              {"\n"}
              <span className="text-zinc-500">
                {"  "}orchestrator · researcher · coder
              </span>
              {"\n\n"}
              <span className="text-zinc-500">{">"} </span>
              <span className="text-zinc-100">
                Build a REST API with tests
              </span>
              {"\n"}
              <span className="text-zinc-500">
                {"  "}[coder] Scaffolding Express app...
              </span>
              {"\n"}
              <span className="text-zinc-500">
                {"  "}[coder] Writing test suite...
              </span>
              {"\n"}
              <span className="text-emerald-400">
                {"  "}✓ Done in 42s
              </span>
            </code>
          </pre>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-zinc-50">
            Everything you need to run a swarm
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-6"
              >
                <div className="mb-3 text-2xl">{f.icon}</div>
                <h3 className="mb-2 font-semibold text-zinc-100">{f.title}</h3>
                <p className="text-sm text-zinc-400">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Install */}
      <section id="install" className="px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-zinc-50">
            Up and running in seconds
          </h2>
          <p className="mb-10 text-zinc-400">
            Requires Node.js 18+ and Python 3. Swarm handles the rest.
          </p>
          <div className="space-y-4 text-left">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                Global install (recommended)
              </p>
              <code className="font-mono text-emerald-400">
                npm install -g @anas.abubakar/swarm
              </code>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                Try without installing
              </p>
              <code className="font-mono text-emerald-400">
                npx @anas.abubakar/swarm@latest --help
              </code>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                Then launch
              </p>
              <code className="font-mono text-emerald-400">swarm</code>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="mb-4 text-3xl font-bold text-zinc-50">
            Ready to run your swarm?
          </h2>
          <p className="mb-8 text-zinc-400">
            Join the community on Discord or open an issue on GitHub.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="https://discord.gg/REPLACE_ME_WITH_YOUR_INVITE"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              Join Discord
            </a>
            <a
              href="https://github.com/Anasabubakar/agent-swarm/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-zinc-700 px-6 py-3 font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
            >
              Open an issue
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-8 text-center text-sm text-zinc-500">
        <p>
          MIT License ·{" "}
          <a
            href="https://www.npmjs.com/package/@anas.abubakar/swarm"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-zinc-300"
          >
            npm
          </a>{" "}
          ·{" "}
          <a
            href="https://github.com/Anasabubakar/agent-swarm"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-zinc-300"
          >
            GitHub
          </a>
        </p>
      </footer>
    </main>
  );
}
