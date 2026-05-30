"use client";

import React, { useState, useEffect, useRef } from "react";
import { marked } from "marked";
import { QuestionnaireStepper } from "@/components/QuestionnaireStepper";
import { ExecutorGraph } from "@/components/ExecutorGraph";
import type { Question, Clarification } from "@/types/orchestration";

interface Agent {
  slug: string;
  name: string;
  description: string;
  color: string;
  emoji: string;
  vibe: string;
}

type QuestionAnswer = Clarification;

interface AgentState {
  slug: string;
  name: string;
  emoji: string;
  color: string;
  status: "idle" | "thinking" | "streaming" | "completed" | "failed";
  output: string;
  task?: string;
  skills?: string[];
}

// Minimal client-side fallback if the questionnaire API itself is unreachable.
const FALLBACK_QUESTIONS: Question[] = [
  { id: "name", type: "text", prompt: "What's the exact name and tagline for your project?" },
  {
    id: "aesthetic",
    type: "single",
    prompt: "Which aesthetic should the swarm commit to?",
    allowCustom: true,
    options: [
      { id: "minimal", label: "Modern Minimalist", description: "Clean, lots of whitespace." },
      { id: "industrial", label: "Heavy Industrial", description: "Bold, dark, utilitarian." },
      { id: "warm", label: "Warm & Friendly", description: "Soft tones, rounded, approachable." },
    ],
  },
  {
    id: "sections",
    type: "multi",
    prompt: "Which sections do you want?",
    options: [
      { id: "hero", label: "Hero" },
      { id: "services", label: "Services" },
      { id: "portfolio", label: "Portfolio" },
      { id: "contact", label: "Contact" },
    ],
  },
];

export default function Dashboard() {
  // Application Steps: "input" | "questionnaire" | "running" | "done"
  const [step, setStep] = useState<"input" | "questionnaire" | "running" | "done">("input");

  // API Keys (persisted in localStorage)
  const [geminiKey, setGeminiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [deepseekKey, setDeepseekKey] = useState("");
  const [showKeys, setShowKeys] = useState(false);

  // Load keys from localStorage on mount
  useEffect(() => {
    setGeminiKey(localStorage.getItem("swarm_gemini_key") || "");
    setAnthropicKey(localStorage.getItem("swarm_anthropic_key") || "");
    setDeepseekKey(localStorage.getItem("swarm_deepseek_key") || "");
  }, []);

  const saveKeys = () => {
    localStorage.setItem("swarm_gemini_key", geminiKey);
    localStorage.setItem("swarm_anthropic_key", anthropicKey);
    localStorage.setItem("swarm_deepseek_key", deepseekKey);
    setShowKeys(false);
  };

  // Input goal
  const [goal, setGoal] = useState("");
  
  // Available Agent Catalog
  const [agentsCatalog, setAgentsCatalog] = useState<Agent[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // Questionnaire Phase
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Running Phase States
  const [statusMessage, setStatusMessage] = useState("Initializing Swarm Kernel...");
  const [plannerReasoning, setPlannerReasoning] = useState("");
  const [activeAgents, setActiveAgents] = useState<Record<string, AgentState>>({});
  const [leadSynthesizerOutput, setLeadSynthesizerOutput] = useState("");
  const [synthesisStatus, setSynthesisStatus] = useState<"idle" | "thinking" | "streaming" | "completed">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedFiles, setGeneratedFiles] = useState<{ slug: string; path: string }[]>([]);
  const [activeDoneTab, setActiveDoneTab] = useState<"preview" | "explorer" | "report">("preview");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string>("");
  const [loadingFileContent, setLoadingFileContent] = useState<boolean>(false);

  // File loading effect for workspace explorer
  useEffect(() => {
    if (selectedFile) {
      const fileToLoad = selectedFile;
      async function fetchContent() {
        setLoadingFileContent(true);
        try {
          const encodedPath = fileToLoad.split("/").map(encodeURIComponent).join("/");
          const res = await fetch(`/api/preview/${encodedPath}`);
          const text = await res.text();
          setSelectedFileContent(text);
        } catch (err) {
          setSelectedFileContent("Failed to load file content.");
        } finally {
          setLoadingFileContent(false);
        }
      }
      fetchContent();
    }
  }, [selectedFile]);

  // Dynamic default tab and auto-select first file on completion
  useEffect(() => {
    if (step === "done" && generatedFiles.length > 0) {
      const hasHtml = generatedFiles.some(
        (f) => f.path.endsWith(".html") || f.path === "index.html"
      );
      if (hasHtml) {
        setActiveDoneTab("preview");
      } else {
        setActiveDoneTab("explorer");
      }
      setSelectedFile(generatedFiles[0].path);
    }
  }, [step, generatedFiles]);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [tweakPrompt, setTweakPrompt] = useState("");

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      if (data.history) {
        setHistory(data.history);
      }
    } catch (e) {
      console.warn("Failed to fetch history:", e);
    }
  };

  const handleRestoreProject = async (pastSessionId: string) => {
    setErrorMsg(null);
    try {
      const res = await fetch("/api/history/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: pastSessionId })
      });
      const data = await res.json();
      if (data.success) {
        const project = history.find(h => h.sessionId === pastSessionId);
        if (project) {
          setSessionId(pastSessionId);
          setGoal(project.prompt);
          setLeadSynthesizerOutput(
            `### Restored Workspace: ${project.title}\n\nThis project has been fully restored from your active history vault.\n\nBrowse the generated workspace source files in the **Workspace Code Explorer** or run it live in the **Live Output Preview** panel!`
          );
          
          const mappedFiles = project.files.map((path: string) => ({
            slug: 'restored',
            path
          }));
          setGeneratedFiles(mappedFiles);
          setStep("done");
        }
      } else {
        setErrorMsg(data.error || "Failed to restore project.");
      }
    } catch (e: any) {
      setErrorMsg("Error restoring project: " + e.message);
    }
  };

  // Load available agents and history on mount
  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch("/api/agents");
        const data = await res.json();
        if (data.agents) {
          setAgentsCatalog(data.agents);
        }
      } catch (err) {
        console.error("Failed to load agents catalog:", err);
      } finally {
        setLoadingCatalog(false);
      }
    }
    fetchAgents();
    fetchHistory();
  }, []);

  // Stage 1: Call questionnaire API
  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) return;

    setLoadingQuestions(true);
    setStep("questionnaire");

    try {
      const res = await fetch("/api/questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, geminiKey, anthropicKey, deepseekKey }),
      });
      const data = await res.json();
      if (Array.isArray(data.questions) && data.questions.length > 0) {
        setQuestions(data.questions);
      } else {
        setQuestions(FALLBACK_QUESTIONS);
      }
    } catch (err) {
      console.error("Error generating clarifying questions:", err);
      setQuestions(FALLBACK_QUESTIONS);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Stage 2: Trigger full orchestration stream
  const handleStartOrchestration = async (clarifications: QuestionAnswer[] = []) => {
    setStep("running");
    setSessionId(null); // Clear active session to generate a fresh project ID!
    setErrorMsg(null);
    setActiveAgents({});
    setPlannerReasoning("");
    setLeadSynthesizerOutput("");
    setSynthesisStatus("idle");
    setStatusMessage("Planning execution waves...");

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, clarifications, geminiKey, anthropicKey, deepseekKey }),
      });

      if (!response.body) {
        throw new Error("ReadableStream is not supported in your browser.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || ""; // Keep the last incomplete block in buffer

        for (const line of lines) {
          if (line.trim().startsWith("data: ")) {
            try {
              const { event, data } = JSON.parse(line.substring(6));

              if (event === "init") {
                setStatusMessage(data.message);
              } else if (event === "plan") {
                setStatusMessage("Planning complete. Specialist agents dispatched in parallel...");
                setPlannerReasoning(data.reasoning || "");
                const plannedStates: Record<string, AgentState> = {};
                (data.agents || []).forEach((a: { slug: string; task?: string; skills?: string[] }) => {
                  const catalogItem = agentsCatalog.find((c) => c.slug === a.slug);
                  plannedStates[a.slug] = {
                    slug: a.slug,
                    name: catalogItem?.name || a.slug.replace(/-/g, " "),
                    emoji: catalogItem?.emoji || "🤖",
                    color: catalogItem?.color || "#12a85a",
                    status: "idle",
                    output: "",
                    task: a.task,
                    skills: a.skills,
                  };
                });
                setActiveAgents(plannedStates);
              } else if (event === "agent-start") {
                const slug = data.slug;
                if (slug === "lead-synthesizer") {
                  setSynthesisStatus("thinking");
                  setStatusMessage("Lead Builder assembling your styled app...");
                } else {
                  setActiveAgents((prev) => {
                    if (!prev[slug]) return prev;
                    return {
                      ...prev,
                      [slug]: { ...prev[slug], status: "thinking" },
                    };
                  });
                }
              } else if (event === "agent-token") {
                const slug = data.slug;
                const token = data.token;
                if (slug === "lead-synthesizer") {
                  setSynthesisStatus("streaming");
                  setLeadSynthesizerOutput((prev) => prev + token);
                } else {
                  setActiveAgents((prev) => {
                    if (!prev[slug]) return prev;
                    return {
                      ...prev,
                      [slug]: {
                        ...prev[slug],
                        status: "streaming",
                        output: prev[slug].output + token,
                      },
                    };
                  });
                }
              } else if (event === "agent-complete") {
                const slug = data.slug;
                if (slug === "lead-synthesizer") {
                  setSynthesisStatus("completed");
                } else {
                  setActiveAgents((prev) => {
                    if (!prev[slug]) return prev;
                    return {
                      ...prev,
                      [slug]: {
                        ...prev[slug],
                        status: "completed",
                        output: data.output,
                      },
                    };
                  });
                }
              } else if (event === "agent-error") {
                const slug = data.slug;
                const output = data.output || data.message || "Agent failed without returning details.";
                if (slug === "lead-synthesizer") {
                  setSynthesisStatus("completed");
                  setLeadSynthesizerOutput((prev) => prev || output);
                } else {
                  setActiveAgents((prev) => {
                    if (!prev[slug]) return prev;
                    return {
                      ...prev,
                      [slug]: {
                        ...prev[slug],
                        status: "failed",
                        output,
                      },
                    };
                  });
                }
              } else if (event === "complete") {
                setStatusMessage("Orchestration successfully finalized!");
                setLeadSynthesizerOutput(data.finalSummary);
                if (data.sessionId) {
                  setSessionId(data.sessionId);
                }
                setStep("done");
                fetchHistory(); // Refresh history catalog visual list
              } else if (event === "file-written") {
                setGeneratedFiles((prev) => {
                  if (prev.some((f) => f.path === data.path)) return prev;
                  return [...prev, { slug: data.slug, path: data.path }];
                });
              } else if (event === "error") {
                setErrorMsg(data.message);
                setStep("done");
              }
            } catch (err) {
              console.warn("Failed to parse SSE event payload:", err, line);
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Stream execution error:", err);
      setErrorMsg(err.message || "A network error occurred while running the Swarm.");
      setStep("input");
    }
  };

  // Continuous chat / Incremental tweak execution handler
  const handleTweakSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tweakPrompt.trim() || !sessionId) return;

    const goalForTweak = tweakPrompt.trim();
    setTweakPrompt("");
    setStep("running");
    setErrorMsg(null);
    setActiveAgents({});
    setPlannerReasoning("");
    setLeadSynthesizerOutput("");
    setSynthesisStatus("idle");
    setStatusMessage("Continuous Strategy Dispatch: Incremental Tweaking...");

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: `Tweak the current codebase: "${goalForTweak}"\n\nCarefully read the existing code files and update, edit, or patch them as requested. Do NOT wipe files.`,
          sessionId: sessionId,
          geminiKey,
          anthropicKey,
          deepseekKey,
        }),
      });

      if (!response.body) {
        throw new Error("ReadableStream is not supported in your browser.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim().startsWith("data: ")) {
            try {
              const { event, data } = JSON.parse(line.substring(6));

              if (event === "init") {
                setStatusMessage(data.message);
              } else if (event === "plan") {
                setStatusMessage("Tweaking plan formed. Agents dispatched in parallel...");
                setPlannerReasoning(data.reasoning || "");
                const plannedStates: Record<string, AgentState> = {};
                (data.agents || []).forEach((a: { slug: string; task?: string; skills?: string[] }) => {
                  const catalogItem = agentsCatalog.find((c) => c.slug === a.slug);
                  plannedStates[a.slug] = {
                    slug: a.slug,
                    name: catalogItem?.name || a.slug.replace(/-/g, " "),
                    emoji: catalogItem?.emoji || "🤖",
                    color: catalogItem?.color || "#12a85a",
                    status: "idle",
                    output: "",
                    task: a.task,
                    skills: a.skills,
                  };
                });
                setActiveAgents(plannedStates);
              } else if (event === "agent-start") {
                const slug = data.slug;
                if (slug === "lead-synthesizer") {
                  setSynthesisStatus("thinking");
                  setStatusMessage("Lead Builder applying your changes...");
                } else {
                  setActiveAgents((prev) => {
                    if (!prev[slug]) return prev;
                    return {
                      ...prev,
                      [slug]: { ...prev[slug], status: "thinking" },
                    };
                  });
                }
              } else if (event === "agent-token") {
                const slug = data.slug;
                const token = data.token;
                if (slug === "lead-synthesizer") {
                  setSynthesisStatus("streaming");
                  setLeadSynthesizerOutput((prev) => prev + token);
                } else {
                  setActiveAgents((prev) => {
                    if (!prev[slug]) return prev;
                    return {
                      ...prev,
                      [slug]: {
                        ...prev[slug],
                        status: "streaming",
                        output: prev[slug].output + token,
                      },
                    };
                  });
                }
              } else if (event === "agent-complete") {
                const slug = data.slug;
                if (slug === "lead-synthesizer") {
                  setSynthesisStatus("completed");
                } else {
                  setActiveAgents((prev) => {
                    if (!prev[slug]) return prev;
                    return {
                      ...prev,
                      [slug]: {
                        ...prev[slug],
                        status: "completed",
                        output: data.output,
                      },
                    };
                  });
                }
              } else if (event === "agent-error") {
                const slug = data.slug;
                const output = data.output || data.message || "Agent failed without returning details.";
                if (slug === "lead-synthesizer") {
                  setSynthesisStatus("completed");
                  setLeadSynthesizerOutput((prev) => prev || output);
                } else {
                  setActiveAgents((prev) => {
                    if (!prev[slug]) return prev;
                    return {
                      ...prev,
                      [slug]: {
                        ...prev[slug],
                        status: "failed",
                        output,
                      },
                    };
                  });
                }
              } else if (event === "file-written") {
                const newFile = { slug: data.slug, path: data.path };
                setGeneratedFiles((prev) => {
                  if (prev.some((f) => f.path === data.path)) return prev;
                  return [...prev, newFile];
                });
              } else if (event === "complete") {
                setStatusMessage("Tweaks fully applied!");
                setLeadSynthesizerOutput(data.finalSummary);
                if (data.sessionId) {
                  setSessionId(data.sessionId);
                }
                setStep("done");
                fetchHistory(); // Refresh history catalog
              } else if (event === "error") {
                setErrorMsg(data.message);
                setStep("done");
              }
            } catch (err) {
              console.error("Failed to parse line:", line, err);
            }
          }
        }
      }
    } catch (err: any) {
      console.error("SSE run request failed:", err);
      setErrorMsg(err.message || "Network request failed.");
      setStep("done");
    }
  };

  const handleCopyReport = () => {
    navigator.clipboard.writeText(leadSynthesizerOutput);
    alert("Synthesized report copied to clipboard!");
  };

  const handleDownloadReport = () => {
    const element = document.createElement("a");
    const file = new Blob([leadSynthesizerOutput], { type: "text/markdown" });
    element.href = URL.createObjectURL(file);
    element.download = "swarm_report.md";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleReset = () => {
    setGoal("");
    setQuestions([]);
    setActiveAgents({});
    setPlannerReasoning("");
    setLeadSynthesizerOutput("");
    setSynthesisStatus("idle");
    setErrorMsg(null);
    setGeneratedFiles([]);
    setActiveDoneTab("preview");
    setSelectedFile(null);
    setSelectedFileContent("");
    setSessionId(null);
    setStep("input");
  };

  const hasKey = Boolean(geminiKey || anthropicKey || deepseekKey);
  const previewHtmlFile = generatedFiles.find((f) => f.path === "index.html")
    || generatedFiles.find((f) => f.path.endsWith(".html"));
  const previewSrc = previewHtmlFile
    ? `/api/preview/${previewHtmlFile.path.split("/").map(encodeURIComponent).join("/")}`
    : "/api/preview";

  return (
    <main className="relative flex min-h-screen flex-col overflow-x-hidden bg-bg text-ink selection:bg-mint/40">
      {/* Soft aurora background */}
      <div className="aurora">
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-line bg-bg/70 px-8 py-4 backdrop-blur-xl">
        <div className="relative mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-[9px] font-mono text-[19px] tracking-wide">
            <span className="pulse-dot h-2 w-2 rounded-full bg-greenb shadow-[0_0_9px_var(--color-greenb)]" />
            swar<b className="font-medium text-green">m</b>
            <span className="ml-2 rounded border border-line2 px-2 py-[3px] text-[10px] uppercase tracking-wider text-dim">web</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-1.5 font-mono text-xs font-medium transition-colors ${
                isHistoryOpen
                  ? "border-green/50 bg-surface text-green"
                  : "border-line2 bg-surface text-ink2 hover:border-green/40 hover:text-ink"
              }`}
            >
              ▣ Vault ({history.length})
            </button>
            <button
              onClick={() => setShowKeys(!showKeys)}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-1.5 font-mono text-xs font-medium transition-colors ${
                showKeys
                  ? "border-amber/50 bg-surface text-amber"
                  : hasKey
                  ? "border-green/50 bg-surface text-green"
                  : "border-amber/50 bg-surface text-amber"
              }`}
            >
              ⬡ {hasKey ? "Keys set" : "Add API key"}
            </button>
          </div>
        </div>
      </nav>

      {/* API Key Settings Panel */}
      {showKeys && (
        <div className="z-40 border-b border-line bg-surface/90 px-8 py-4 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl flex-col gap-3">
            <p className="font-mono text-xs text-dim">
              Keys live only in your browser (localStorage) and go straight to the model API. Never logged, never saved as a password.
            </p>
            <div className="flex flex-wrap gap-3">
              {([
                ["Gemini API key", geminiKey, setGeminiKey, "AIza…", "swarm-gemini-token"],
                ["DeepSeek API key", deepseekKey, setDeepseekKey, "sk-…", "swarm-deepseek-token"],
                ["Anthropic API key", anthropicKey, setAnthropicKey, "sk-ant-…", "swarm-anthropic-token"],
              ] as const).map(([label, val, setter, ph, fieldName]) => (
                <div key={fieldName} className="flex min-w-[260px] flex-1 flex-col gap-1">
                  <label className="font-mono text-[10px] uppercase tracking-widest text-dim">{label}</label>
                  <input
                    type="text"
                    name={fieldName}
                    value={val}
                    onChange={(e) => setter(e.target.value)}
                    placeholder={ph}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-1p-ignore
                    data-lpignore="true"
                    data-form-type="other"
                    className="key-mask rounded-lg border border-line2 bg-bg px-3 py-2 font-mono text-sm text-ink placeholder-dim outline-none focus:border-green"
                  />
                </div>
              ))}
              <div className="flex items-end">
                <button
                  onClick={saveKeys}
                  className="cursor-pointer rounded-lg bg-green px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-greenb"
                >
                  Save keys
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* App Body Wrapper */}
      <div className="relative z-10 flex w-full flex-grow overflow-hidden">
        {/* Left Side: Project Vault History Sidebar */}
        {isHistoryOpen && (
          <aside className="z-20 flex w-80 shrink-0 flex-col border-r border-line bg-surface/50 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-line p-4">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-dim">▣ Project build vault</span>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="cursor-pointer rounded px-2 py-1 text-xs text-dim hover:bg-bg3 hover:text-ink"
              >
                ✕ Close
              </button>
            </div>
            <div className="flex-grow space-y-3 overflow-y-auto p-4">
              {history.length === 0 ? (
                <div className="py-12 text-center text-xs italic text-dim">
                  No saved builds yet.
                </div>
              ) : (
                history.map((proj) => {
                  const isActive = sessionId === proj.sessionId;
                  return (
                    <button
                      key={proj.sessionId}
                      onClick={() => handleRestoreProject(proj.sessionId)}
                      className={`flex w-full cursor-pointer flex-col gap-1.5 rounded-lg border p-3.5 text-left transition-colors ${
                        isActive
                          ? "border-green/50 bg-bg3"
                          : "border-line2 bg-surface hover:border-green/40 hover:bg-bg3"
                      }`}
                    >
                      <div className="line-clamp-1 text-xs font-semibold text-ink">
                        {proj.title}
                      </div>
                      <div className="flex items-center justify-between font-mono text-[10px] text-dim">
                        <span>{proj.files?.length || 0} assets</span>
                        <span>{new Date(proj.createdAt).toLocaleDateString()}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        )}

        {/* Right Side: Scrollable Dashboard Content */}
        <div className="flex-grow overflow-y-auto">
          <div className="z-10 mx-auto flex w-full max-w-6xl flex-col justify-start gap-8 px-6 py-12">

        {/* Step: Input Goal */}
        {step === "input" && (
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 py-10 sm:py-16">
            <div className="space-y-4 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-green/30 bg-surface px-3 py-1 font-mono text-xs text-green">
                ⬡ Unified multi-agent engine
              </div>
              <h1 className="font-serif text-[clamp(34px,7vw,60px)] leading-[1.04] tracking-tight text-ink">
                What should the swarm <span className="italic text-green">build for you today?</span>
              </h1>
              <p className="mx-auto max-w-xl text-base text-ink2 sm:text-lg">
                Describe your goal in plain English. The swarm spawns specialist agents in parallel to architect, write, and verify your project.
              </p>
            </div>

            {/* Input card */}
            <form onSubmit={handleIntakeSubmit} className="rounded-2xl border border-line2 bg-surface p-5 shadow-[0_24px_60px_-50px_rgba(10,40,20,.6)] transition-colors focus-within:border-green sm:p-6">
              <div className="flex flex-col gap-4">
                <textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g. Build a modern landing page for a premium construction company named 'Ironclad Builds': bold, editorial, with a services grid and a project portfolio."
                  className="h-28 w-full resize-none border-0 bg-transparent text-base leading-relaxed text-ink placeholder-dim outline-none sm:h-32"
                />
                <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
                  <span className="hidden font-mono text-xs text-dim sm:inline">Describe it, then clarify details</span>
                  <button
                    type="submit"
                    disabled={!goal.trim()}
                    className="ml-auto flex cursor-pointer items-center gap-2 rounded-xl bg-green px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-greenb disabled:opacity-40"
                  >
                    Next phase <span>→</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Step: Questionnaire */}
        {step === "questionnaire" && (
          loadingQuestions ? (
            <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 rounded-xl border border-line2 bg-surface p-12 text-center">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-green/20 border-t-green" />
              <span className="font-mono text-sm text-ink2">
                Designing your clarifying questionnaire…
              </span>
            </div>
          ) : questions.length > 0 ? (
            <QuestionnaireStepper
              questions={questions}
              onComplete={(clarifications) => handleStartOrchestration(clarifications)}
              onSkip={() => handleStartOrchestration([])}
            />
          ) : null
        )}

        {/* Step: Running */}
        {step === "running" && (
          <ExecutorGraph
            statusMessage={statusMessage}
            plannerReasoning={plannerReasoning}
            plannerActive={Object.keys(activeAgents).length === 0}
            agents={Object.values(activeAgents)}
            synthesis={{ status: synthesisStatus, output: leadSynthesizerOutput }}
          />
        )}

        {/* Step: Done / Report */}
        {step === "done" && (
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
            {errorMsg ? (
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-red/30 bg-surface p-8 text-center">
                <span className="text-4xl">⚠️</span>
                <h3 className="text-xl font-bold text-red">Orchestration aborted</h3>
                <p className="mx-auto max-w-md text-sm text-ink2">{errorMsg}</p>
                <button
                  onClick={handleReset}
                  className="cursor-pointer rounded-xl border border-line2 bg-surface px-5 py-2.5 text-sm font-semibold text-ink hover:border-green/40"
                >
                  Return to launchpad
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header Action card */}
                <div className="flex flex-col items-center justify-between gap-6 rounded-2xl border border-line2 bg-surface p-6 sm:flex-row">
                  <div className="space-y-1 text-center sm:text-left">
                    <div className="flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-wider text-green sm:justify-start">
                      <span>✔</span> Shipped
                    </div>
                    <h2 className="font-serif text-3xl text-ink">Project synthesis complete</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleReset}
                      className="cursor-pointer rounded-xl border border-line2 bg-surface px-4 py-2 text-xs font-semibold text-ink2 transition-colors hover:border-green/40 hover:text-ink"
                    >
                      Build another
                    </button>
                    <button
                      onClick={handleCopyReport}
                      className="cursor-pointer rounded-xl border border-line2 bg-surface px-4 py-2 text-xs font-semibold text-ink2 transition-colors hover:border-green/40 hover:text-ink"
                    >
                      Copy report
                    </button>
                    <button
                      onClick={handleDownloadReport}
                      className="cursor-pointer rounded-xl bg-green px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-greenb"
                    >
                      Download .md
                    </button>
                  </div>
                </div>

                {/* Tabs Bar */}
                <div className="flex border-b border-line">
                  {generatedFiles.some(f => f.path.endsWith('.html') || f.path === 'index.html') && (
                    <button
                      onClick={() => setActiveDoneTab("preview")}
                      className={`cursor-pointer border-b-2 px-6 py-3 text-sm font-semibold transition-colors ${
                        activeDoneTab === "preview"
                          ? "border-green text-green"
                          : "border-transparent text-dim hover:text-ink"
                      }`}
                    >
                      ⚡ Live preview
                    </button>
                  )}
                  <button
                    onClick={() => setActiveDoneTab("explorer")}
                    className={`cursor-pointer border-b-2 px-6 py-3 text-sm font-semibold transition-colors ${
                      activeDoneTab === "explorer"
                        ? "border-green text-green"
                        : "border-transparent text-dim hover:text-ink"
                    }`}
                  >
                    ▤ Code explorer
                  </button>
                  <button
                    onClick={() => setActiveDoneTab("report")}
                    className={`cursor-pointer border-b-2 px-6 py-3 text-sm font-semibold transition-colors ${
                      activeDoneTab === "report"
                        ? "border-green text-green"
                        : "border-transparent text-dim hover:text-ink"
                    }`}
                  >
                    ▦ Synthesis report
                  </button>
                </div>

                {/* Tab Content: Live Preview */}
                {activeDoneTab === "preview" && (
                  <div className="flex flex-col overflow-hidden rounded-2xl border border-line2 bg-surface">
                    {/* Mock Browser Header */}
                    <div className="flex items-center justify-between gap-4 border-b border-line bg-bg3 px-4 py-3">
                      <div className="flex flex-shrink-0 items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full bg-red/60" />
                        <span className="h-3 w-3 rounded-full bg-amber/60" />
                        <span className="h-3 w-3 rounded-full bg-greenb/70" />
                      </div>
                      <div className="mx-auto flex max-w-xl flex-1 items-center justify-between rounded-lg border border-line2 bg-bg px-4 py-1.5 font-mono text-xs text-ink2">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-green">🔒</span>
                          <span className="truncate text-ink2">swarm.local/preview/{previewHtmlFile?.path || "workspace"}</span>
                        </div>
                        <button
                          onClick={() => {
                            const iframe = document.getElementById("preview-iframe") as HTMLIFrameElement;
                            if (iframe) iframe.src = iframe.src;
                          }}
                          className="cursor-pointer text-[10px] font-semibold text-dim transition-colors hover:text-ink"
                        >
                          ↻ Refresh
                        </button>
                      </div>
                      <div className="flex items-center gap-1 rounded-lg border border-line2 bg-bg p-0.5">
                        <button
                          onClick={() => setPreviewMode("desktop")}
                          className={`cursor-pointer rounded px-3 py-1 text-[10px] font-bold uppercase transition-colors ${
                            previewMode === "desktop" ? "bg-surface text-green" : "text-dim hover:text-ink"
                          }`}
                        >
                          Desktop
                        </button>
                        <button
                          onClick={() => setPreviewMode("mobile")}
                          className={`cursor-pointer rounded px-3 py-1 text-[10px] font-bold uppercase transition-colors ${
                            previewMode === "mobile" ? "bg-surface text-green" : "text-dim hover:text-ink"
                          }`}
                        >
                          Mobile
                        </button>
                      </div>
                    </div>
                    <div className="flex min-h-[600px] flex-grow items-center justify-center bg-bg3 p-4">
                      <div
                        className="h-[600px] overflow-hidden rounded-lg border border-line2 bg-white shadow-lg transition-all duration-300"
                        style={{ width: previewMode === "mobile" ? "375px" : "100%" }}
                      >
                        <iframe
                          id="preview-iframe"
                          src={previewSrc}
                          className="h-full w-full border-0 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab Content: Code Explorer */}
                {activeDoneTab === "explorer" && (
                  <div className="flex min-h-[600px] flex-col overflow-hidden rounded-2xl border border-line2 bg-surface md:flex-row">
                    <div className="flex w-full flex-col space-y-3 border-r border-line bg-bg3 p-4 md:w-64">
                      <div className="font-mono text-xs font-semibold uppercase tracking-wider text-dim">
                        ▤ Generated source files
                      </div>
                      <div className="flex-1 space-y-1.5 overflow-y-auto">
                        {generatedFiles.map((file, idx) => {
                          const isSelected = selectedFile === file.path;
                          const ext = file.path.split('.').pop() || '';
                          let icon = '📄';
                          if (ext === 'html') icon = '🌐';
                          else if (ext === 'css') icon = '🎨';
                          else if (ext === 'js' || ext === 'ts' || ext === 'tsx') icon = '⚙️';
                          else if (ext === 'py') icon = '🐍';
                          else if (ext === 'json') icon = '🔧';
                          else if (ext === 'md') icon = '📝';

                          return (
                            <button
                              key={idx}
                              onClick={() => setSelectedFile(file.path)}
                              className={`flex w-full cursor-pointer items-center justify-between rounded-lg border p-2.5 text-left font-mono text-xs transition-colors ${
                                isSelected
                                  ? 'border-green/30 bg-surface text-green'
                                  : 'border-transparent text-ink2 hover:bg-surface hover:text-ink'
                              }`}
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                <span>{icon}</span>
                                <span className="truncate">{file.path}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex min-h-[500px] flex-1 flex-col bg-surface">
                      <div className="flex items-center justify-between border-b border-line bg-bg3 px-5 py-3">
                        <div className="flex items-center gap-2 font-mono text-xs text-ink2">
                          <span className="text-green">✔</span> {selectedFile || 'Select a file'}
                        </div>
                        <button
                          onClick={() => {
                            if (selectedFileContent) {
                              navigator.clipboard.writeText(selectedFileContent);
                              alert("File content copied to clipboard!");
                            }
                          }}
                          className="cursor-pointer rounded border border-line2 bg-bg px-2.5 py-1 font-mono text-[10px] font-bold text-ink2 transition-colors hover:text-ink"
                        >
                          Copy code
                        </button>
                      </div>
                      <div className="flex-1 select-text overflow-auto bg-tbg p-5 font-mono text-xs leading-relaxed text-mint">
                        {loadingFileContent ? (
                          <div className="flex h-full items-center justify-center italic text-dim">
                            Reading compiled workspace asset…
                          </div>
                        ) : selectedFileContent ? (
                          <pre className="whitespace-pre-wrap break-all">{selectedFileContent}</pre>
                        ) : (
                          <div className="flex h-full items-center justify-center italic text-dim">
                            Empty file content.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab Content: Text Report & Files */}
                {activeDoneTab === "report" && (
                  <div className="space-y-6">
                    {generatedFiles.length > 0 && (
                      <div className="space-y-4 rounded-2xl border border-green/30 bg-surface p-6">
                        <div className="flex items-center gap-2 font-mono text-sm font-semibold text-green">
                          <span>▣</span> Production assets generated
                        </div>
                        <p className="text-xs text-ink2">
                          The swarm wrote production files into your workspace under <code className="font-mono text-ink">/project-output/</code>:
                        </p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {generatedFiles.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between rounded-lg border border-line2 bg-bg p-3 font-mono text-xs">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <span className="text-base">📄</span>
                                <span className="truncate font-semibold text-ink" title={file.path}>{file.path}</span>
                              </div>
                              <span className="rounded border border-line2 bg-surface px-2 py-0.5 text-[10px] text-dim">
                                {activeAgents[file.slug]?.name || file.slug}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="overflow-hidden rounded-2xl border border-line2 bg-surface">
                      <div className="flex items-center justify-between border-b border-line bg-bg3 px-6 py-4">
                        <span className="font-mono text-xs text-dim">swarm_output.md</span>
                        <div className="flex gap-1">
                          <span className="h-2 w-2 rounded-full bg-line2" />
                          <span className="h-2 w-2 rounded-full bg-line2" />
                          <span className="h-2 w-2 rounded-full bg-line2" />
                        </div>
                      </div>
                      <div
                        className="prose prose-green max-w-none select-text overflow-x-auto p-8 font-sans text-sm leading-relaxed text-ink2 md:p-12"
                        dangerouslySetInnerHTML={{
                          __html: marked.parse(leadSynthesizerOutput),
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Continuous Session Chat Tweak Box */}
                {sessionId && (
                  <div className="mt-6 w-full space-y-4 rounded-2xl border border-line2 bg-surface p-6">
                    <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-green">
                      <span>💬</span> Continuous session chat
                    </div>
                    <form onSubmit={handleTweakSubmit} className="rounded-xl border border-line2 bg-bg p-4 transition-colors focus-within:border-green">
                      <div className="flex items-center gap-4">
                        <input
                          type="text"
                          value={tweakPrompt}
                          onChange={(e) => setTweakPrompt(e.target.value)}
                          placeholder="Tweak this project (e.g. 'Add a search bar to the navbar', 'Make the hero bolder')…"
                          className="flex-grow border-0 bg-transparent py-1 text-sm text-ink placeholder-dim outline-none"
                        />
                        <button
                          type="submit"
                          disabled={!tweakPrompt.trim()}
                          className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-green px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-greenb disabled:opacity-40"
                        >
                          Send tweak 🚀
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  </div>

      {/* Footer */}
      <footer className="relative z-10 mt-auto border-t border-line bg-surface/40 px-8 py-8 text-center text-xs text-dim">
        <p className="font-mono">
          swarm web orchestrator · MIT license · every agent runs with a skill
        </p>
      </footer>
    </main>
  );
}
