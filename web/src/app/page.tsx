"use client";

import React, { useState, useEffect, useRef } from "react";
import { marked } from "marked";

interface Agent {
  slug: string;
  name: string;
  description: string;
  color: string;
  emoji: string;
  vibe: string;
}

interface QuestionAnswer {
  question: string;
  answer: string;
}

interface AgentState {
  slug: string;
  name: string;
  emoji: string;
  color: string;
  status: "idle" | "thinking" | "streaming" | "completed" | "failed";
  output: string;
}

export default function Home() {
  // Application Steps: "input" | "questionnaire" | "running" | "done"
  const [step, setStep] = useState<"input" | "questionnaire" | "running" | "done">("input");
  
  // Input goal
  const [goal, setGoal] = useState("");
  
  // Available Agent Catalog
  const [agentsCatalog, setAgentsCatalog] = useState<Agent[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // Questionnaire Phase
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Running Phase States
  const [statusMessage, setStatusMessage] = useState("Initializing Swarm Kernel...");
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

  // Auto-scroll references for agent terminal panels
  const terminalRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const synthesisRef = useRef<HTMLDivElement | null>(null);

  // File loading effect for workspace explorer
  useEffect(() => {
    if (selectedFile) {
      async function fetchContent() {
        setLoadingFileContent(true);
        try {
          const res = await fetch(`/api/preview/${selectedFile}`);
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
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
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

  // Handle auto-scrolling terminal panels when outputs change
  useEffect(() => {
    Object.keys(activeAgents).forEach((slug) => {
      const el = terminalRefs.current[slug];
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }, [activeAgents]);

  useEffect(() => {
    if (synthesisRef.current) {
      synthesisRef.current.scrollTop = synthesisRef.current.scrollHeight;
    }
  }, [leadSynthesizerOutput]);

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
        body: JSON.stringify({ goal }),
      });
      const data = await res.json();
      if (data.questions) {
        setQuestions(data.questions);
        setAnswers(data.questions.map(() => ""));
      }
    } catch (err) {
      console.error("Error generating clarifying questions:", err);
      // Fallback
      setQuestions([
        "What is the exact name of your construction company?",
        "Do you have a preferred color theme or brand aesthetic (e.g. Modern Minimalist, Heavy Industrial, Eco-Friendly)?",
        "What primary sections do you want on the page (e.g. Hero, Our Services, Recent Projects Portfolio, Contact Form)?"
      ]);
      setAnswers(["", "", ""]);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Stage 2: Trigger full orchestration stream
  const handleStartOrchestration = async (skipQuestions = false) => {
    setStep("running");
    setSessionId(null); // Clear active session to generate a fresh project ID!
    setErrorMsg(null);
    setLeadSynthesizerOutput("");
    setSynthesisStatus("idle");
    setStatusMessage("Planning execution waves...");

    // Format clarifications
    const clarifications: QuestionAnswer[] = [];
    if (!skipQuestions) {
      questions.forEach((q, idx) => {
        if (answers[idx].trim()) {
          clarifications.push({ question: q, answer: answers[idx] });
        }
      });
    }

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, clarifications }),
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
                setStatusMessage("Wave planning complete. Spawning specialist agents...");
                const plannedStates: Record<string, AgentState> = {};
                data.agents.forEach((slug: string) => {
                  const catalogItem = agentsCatalog.find((a) => a.slug === slug);
                  plannedStates[slug] = {
                    slug,
                    name: catalogItem?.name || slug.replace(/-/g, " "),
                    emoji: catalogItem?.emoji || "🤖",
                    color: catalogItem?.color || "#6366f1",
                    status: "idle",
                    output: "",
                  };
                });
                setActiveAgents(plannedStates);
              } else if (event === "agent-start") {
                const slug = data.slug;
                if (slug === "lead-synthesizer") {
                  setSynthesisStatus("thinking");
                  setStatusMessage("Lead Synthesizer consolidating agent outcomes...");
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
    setLeadSynthesizerOutput("");
    setSynthesisStatus("idle");
    setStatusMessage("Continuous Strategy Dispatch: Incremental Tweaking...");

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: `Tweak the current codebase: "${goalForTweak}"\n\nCarefully read the existing code files and update, edit, or patch them as requested. Do NOT wipe files.`,
          sessionId: sessionId // PASS ACTIVE SESSION ID FOR CONTINUOUS CONTEXT!
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
                setStatusMessage("Tweaking plan formed. Spawning specialist agents...");
                const plannedStates: Record<string, AgentState> = {};
                data.agents.forEach((slug: string) => {
                  const catalogItem = agentsCatalog.find((a) => a.slug === slug);
                  plannedStates[slug] = {
                    slug,
                    name: catalogItem?.name || slug.replace(/-/g, " "),
                    emoji: catalogItem?.emoji || "🤖",
                    color: catalogItem?.color || "#6366f1",
                    status: "idle",
                    output: "",
                  };
                });
                setActiveAgents(plannedStates);
              } else if (event === "agent-start") {
                const slug = data.slug;
                if (slug === "lead-synthesizer") {
                  setSynthesisStatus("thinking");
                  setStatusMessage("Consolidating incremental adjustments...");
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
    setAnswers(["", "", ""]);
    setActiveAgents({});
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

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Glow Effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <nav className="border-b border-zinc-800/80 px-8 py-4 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              S
            </div>
            <span className="font-mono text-xl font-bold bg-gradient-to-r from-zinc-50 to-zinc-400 bg-clip-text text-transparent">
              SWARM <span className="text-emerald-400 text-xs font-mono px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-950/40 ml-1">WEB v1.0</span>
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className={`px-3.5 py-1.5 rounded-xl border font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                isHistoryOpen
                  ? "bg-indigo-950/40 border-indigo-500/40 text-indigo-300 shadow-md shadow-indigo-950/20"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
              }`}
            >
              📂 Project Vault ({history.length})
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-800/80 bg-zinc-900/60 shadow-inner">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-zinc-400 font-mono">Gemini API Connection Active</span>
            </div>
          </div>
        </div>
      </nav>

      {/* App Body Wrapper */}
      <div className="flex-grow flex overflow-hidden w-full relative">
        {/* Left Side: Project Vault History Sidebar */}
        {isHistoryOpen && (
          <aside className="w-80 border-r border-zinc-800/60 bg-zinc-900/25 backdrop-blur-sm flex flex-col z-20 shrink-0">
            <div className="p-4 border-b border-zinc-800/60 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-zinc-500">📂 Project Build Vault</span>
              <button 
                onClick={() => setIsHistoryOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 text-xs px-2 py-1 rounded hover:bg-zinc-850/60 cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <div className="flex-grow overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {history.length === 0 ? (
                <div className="text-center py-12 text-zinc-600 text-xs italic">
                  No saved builds found yet.
                </div>
              ) : (
                history.map((proj) => {
                  const isActive = sessionId === proj.sessionId;
                  return (
                    <button
                      key={proj.sessionId}
                      onClick={() => handleRestoreProject(proj.sessionId)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1.5 cursor-pointer ${
                        isActive 
                          ? 'bg-indigo-950/30 border-indigo-500/50 shadow-md shadow-indigo-950/20' 
                          : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800/40'
                      }`}
                    >
                      <div className="font-semibold text-xs text-zinc-200 line-clamp-1 group-hover:text-white">
                        {proj.title}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
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
        <div className="flex-grow overflow-y-auto scrollbar-thin">
          <div className="mx-auto w-full max-w-6xl px-6 py-12 flex flex-col justify-start gap-8 z-10">
        
        {/* Step: Input Goal */}
        {step === "input" && (
          <div className="max-w-3xl mx-auto w-full flex flex-col gap-10 py-12">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-950/20 text-xs text-indigo-300 font-mono">
                🚀 Unified Multi-Agent Engine
              </div>
              <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-zinc-50 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                What should the swarm <br/>
                <span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">build for you today?</span>
              </h1>
              <p className="text-zinc-400 text-lg max-w-xl mx-auto">
                Explain your goal in plain English. We'll spawn specialized AI developers, researchers, and testers in parallel to architect, write, and verify your project.
              </p>
            </div>

            {/* Input card */}
            <form onSubmit={handleIntakeSubmit} className="relative group rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm shadow-xl focus-within:border-zinc-700/80 transition-all duration-300">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/5 to-emerald-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="flex flex-col gap-4 relative">
                <textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g. Build a modern landing page for a premium construction company named 'Ironclad Builds'. Make it highly visual with dark HSL styling, glassmorphic client testimonial grids, and service portfolios."
                  className="w-full h-32 bg-transparent border-0 outline-none text-zinc-100 placeholder-zinc-500 resize-none text-base leading-relaxed"
                />
                <div className="flex items-center justify-between border-t border-zinc-800/80 pt-4">
                  <span className="text-xs text-zinc-500 font-mono">
                    Press Enter to clarify details
                  </span>
                  <button
                    type="submit"
                    disabled={!goal.trim()}
                    className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-400 hover:to-emerald-400 disabled:opacity-50 text-white shadow-lg shadow-indigo-500/10 cursor-pointer flex items-center gap-2 hover:scale-[1.02] transition-all"
                  >
                    Next Phase
                    <span>→</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Agent Catalog Catalog */}
            <div className="border-t border-zinc-800/60 pt-10">
              <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-6 text-center">
                Available Specialized Agent Fleet
              </h3>
              {loadingCatalog ? (
                <div className="flex justify-center py-4">
                  <span className="h-6 w-6 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {agentsCatalog.map((agent) => (
                    <div
                      key={agent.slug}
                      className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700/80 transition-colors flex items-start gap-3"
                    >
                      <span className="text-2xl">{agent.emoji}</span>
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold text-zinc-200">{agent.name}</h4>
                        <p className="text-xs text-zinc-500 line-clamp-2">{agent.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step: Questionnaire */}
        {step === "questionnaire" && (
          <div className="max-w-2xl mx-auto w-full flex flex-col gap-8 py-6">
            <div className="space-y-2 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-950/20 text-xs text-emerald-300 font-mono">
                🤝 Phase 1: Intake & Clarifications
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-zinc-100">
                Let's narrow down the scope
              </h2>
              <p className="text-zinc-400 text-sm">
                Our Intake Receptionist analyzed your goal. Answering these questions helps the swarm deliver flawless results.
              </p>
            </div>

            {loadingQuestions ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center backdrop-blur-sm shadow-xl flex flex-col items-center gap-4">
                <span className="h-10 w-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                <span className="text-zinc-400 font-mono text-sm animate-pulse">
                  Analyzing goal and generating clarifying questions...
                </span>
              </div>
            ) : (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm shadow-xl space-y-6">
                {questions.map((q, idx) => (
                  <div key={idx} className="space-y-2">
                    <label className="block text-sm font-medium text-zinc-300 font-mono">
                      Q{idx + 1}: {q}
                    </label>
                    <input
                      type="text"
                      value={answers[idx]}
                      onChange={(e) => {
                        const newAnswers = [...answers];
                        newAnswers[idx] = e.target.value;
                        setAnswers(newAnswers);
                      }}
                      placeholder="Type your answer here..."
                      className="w-full px-4 py-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-colors text-sm"
                    />
                  </div>
                ))}

                <div className="flex items-center gap-4 pt-4 border-t border-zinc-800/80">
                  <button
                    onClick={() => handleStartOrchestration(true)}
                    className="flex-1 px-5 py-3 rounded-xl font-semibold text-sm border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    Skip & Launch Swarm
                  </button>
                  <button
                    onClick={() => handleStartOrchestration(false)}
                    className="flex-1 px-5 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-500 to-indigo-500 hover:from-emerald-400 hover:to-indigo-400 text-white shadow-lg cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform"
                  >
                    Begin Swarm Strategy
                    <span>⚡</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step: Running */}
        {step === "running" && (
          <div className="w-full flex flex-col gap-8">
            {/* Stage Indicator Bar */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm shadow-xl flex items-center justify-between gap-6">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-indigo-400">
                  <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
                  Orchestrator Kernel Executing
                </div>
                <h2 className="text-lg font-bold text-zinc-100">{statusMessage}</h2>
              </div>
              <div className="h-10 w-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-400 animate-spin flex-shrink-0" />
            </div>

            {/* Grid of Agent Terminals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.values(activeAgents).map((agent) => {
                const isRunning = agent.status === "thinking" || agent.status === "streaming";
                return (
                  <div
                    key={agent.slug}
                    className="rounded-2xl border bg-zinc-900/40 overflow-hidden shadow-lg flex flex-col h-[320px] transition-colors"
                    style={{ borderColor: isRunning ? `${agent.color}80` : "#27272a" }}
                  >
                    {/* Header */}
                    <div className="px-5 py-3 border-b border-zinc-800/80 bg-zinc-950/40 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{agent.emoji}</span>
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-semibold text-zinc-200">{agent.name}</h4>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{
                                backgroundColor:
                                  agent.status === "completed"
                                    ? "#10b981"
                                    : agent.status === "failed"
                                    ? "#ef4444"
                                    : isRunning
                                    ? agent.color
                                    : "#71717a",
                              }}
                            />
                            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                              {agent.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {isRunning && (
                        <div className="flex gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      )}
                    </div>

                    {/* Console Output */}
                    <div
                      ref={(el) => {
                        terminalRefs.current[agent.slug] = el;
                      }}
                      className="flex-1 p-5 overflow-y-auto font-mono text-xs text-zinc-400 bg-zinc-950/90 leading-relaxed scrollbar-thin select-text"
                    >
                      {agent.output ? (
                        <pre className="whitespace-pre-wrap break-words">{agent.output}</pre>
                      ) : (
                        <div className="text-zinc-600 italic">
                          {agent.status === "idle"
                            ? "Waiting in queue..."
                            : "Initializing agent runtime, compiling system prompt..."}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Consolidator/Lead Synthesizer Terminal */}
            {(synthesisStatus !== "idle" || leadSynthesizerOutput) && (
              <div
                className="rounded-2xl border bg-zinc-900/40 overflow-hidden shadow-lg flex flex-col h-[320px] transition-colors border-emerald-500/40"
              >
                {/* Header */}
                <div className="px-5 py-3 border-b border-zinc-800/80 bg-zinc-950/40 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">✍️</span>
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-semibold text-zinc-200">Swarm Lead Synthesizer</h4>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"
                        />
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                          {synthesisStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Console Output */}
                <div
                  ref={synthesisRef}
                  className="flex-1 p-5 overflow-y-auto font-mono text-xs text-emerald-400 bg-zinc-950/90 leading-relaxed scrollbar-thin select-text"
                >
                  {leadSynthesizerOutput ? (
                    <pre className="whitespace-pre-wrap break-words">{leadSynthesizerOutput}</pre>
                  ) : (
                    <div className="text-zinc-600 italic">
                      Consolidating sub-agent outputs... Synthesizing final report.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step: Done / Report */}
        {step === "done" && (
          <div className="w-full flex flex-col gap-8 max-w-4xl mx-auto">
            {errorMsg ? (
              <div className="rounded-2xl border border-red-900/30 bg-red-950/20 p-8 text-center backdrop-blur-sm shadow-xl flex flex-col items-center gap-4">
                <span className="text-4xl">💥</span>
                <h3 className="text-xl font-bold text-red-300">Orchestration Aborted</h3>
                <p className="text-zinc-400 max-w-md mx-auto text-sm">{errorMsg}</p>
                <button
                  onClick={handleReset}
                  className="px-5 py-2.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-xl font-semibold text-sm border border-zinc-800 cursor-pointer"
                >
                  Return to Launchpad
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header Action card */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="space-y-1 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-mono uppercase tracking-wider text-emerald-400">
                      <span>✔</span> Success
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-100">Project Synthesis Complete</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-semibold text-xs border border-zinc-700/80 cursor-pointer transition-colors"
                    >
                      Build Another
                    </button>
                    <button
                      onClick={handleCopyReport}
                      className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 rounded-xl font-semibold text-xs border border-zinc-800 cursor-pointer transition-colors"
                    >
                      Copy Report
                    </button>
                    <button
                      onClick={handleDownloadReport}
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-indigo-500 hover:from-emerald-400 hover:to-indigo-400 text-white rounded-xl font-semibold text-xs shadow-lg shadow-emerald-500/10 cursor-pointer transition-all hover:scale-[1.02]"
                    >
                      Download Markdown (.md)
                    </button>
                  </div>
                </div>

                {/* Tabs Bar */}
                <div className="flex border-b border-zinc-800">
                  {generatedFiles.some(f => f.path.endsWith('.html') || f.path === 'index.html') && (
                    <button
                      onClick={() => setActiveDoneTab("preview")}
                      className={`px-6 py-3 font-semibold text-sm border-b-2 cursor-pointer transition-colors ${
                        activeDoneTab === "preview"
                          ? "border-emerald-400 text-emerald-400 bg-emerald-950/15"
                          : "border-transparent text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      ⚡ Live Output Preview
                    </button>
                  )}
                  <button
                    onClick={() => setActiveDoneTab("explorer")}
                    className={`px-6 py-3 font-semibold text-sm border-b-2 cursor-pointer transition-colors ${
                      activeDoneTab === "explorer"
                        ? "border-emerald-400 text-emerald-400 bg-emerald-950/15"
                        : "border-transparent text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    📁 Workspace Code Explorer
                  </button>
                  <button
                    onClick={() => setActiveDoneTab("report")}
                    className={`px-6 py-3 font-semibold text-sm border-b-2 cursor-pointer transition-colors ${
                      activeDoneTab === "report"
                        ? "border-emerald-400 text-emerald-400 bg-emerald-950/15"
                        : "border-transparent text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    📝 Execution Synthesis Report
                  </button>
                </div>

                {/* Tab Content: Live Preview */}
                {activeDoneTab === "preview" && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden shadow-2xl backdrop-blur-sm flex flex-col">
                    {/* Mock Browser Header */}
                    <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950/50 flex items-center justify-between gap-4">
                      {/* Browser Dots */}
                      <div className="flex gap-1.5 items-center flex-shrink-0">
                        <span className="h-3 w-3 rounded-full bg-red-500/70" />
                        <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
                        <span className="h-3 w-3 rounded-full bg-green-500/70" />
                      </div>
                      
                      {/* Mock Address Bar */}
                      <div className="flex-1 max-w-xl mx-auto flex items-center justify-between px-4 py-1.5 rounded-xl border border-zinc-850 bg-zinc-950/80 font-mono text-xs text-zinc-400 shadow-inner">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-emerald-400">🔒</span>
                          <span className="truncate text-zinc-300">https://swarm-engine.local/preview/index.html</span>
                        </div>
                        <button 
                          onClick={() => {
                            const iframe = document.getElementById("preview-iframe") as HTMLIFrameElement;
                            if (iframe) iframe.src = iframe.src;
                          }} 
                          className="text-[10px] text-zinc-500 hover:text-zinc-300 font-semibold cursor-pointer transition-colors"
                        >
                          ↻ Refresh
                        </button>
                      </div>
                      
                      {/* Device Mode Toggle */}
                      <div className="flex items-center gap-1 border border-zinc-800 rounded-lg p-0.5 bg-zinc-950">
                        <button
                          onClick={() => setPreviewMode("desktop")}
                          className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                            previewMode === "desktop" ? "bg-zinc-850 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          Desktop
                        </button>
                        <button
                          onClick={() => setPreviewMode("mobile")}
                          className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                            previewMode === "mobile" ? "bg-zinc-850 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          Mobile
                        </button>
                      </div>
                    </div>
                    
                    {/* Live Preview Iframe */}
                    <div className="flex-grow bg-zinc-950 p-4 min-h-[600px] flex items-center justify-center transition-all duration-300">
                      <div 
                        className="h-[600px] bg-white rounded-lg shadow-xl overflow-hidden transition-all duration-300 border border-zinc-800"
                        style={{ width: previewMode === "mobile" ? "375px" : "100%" }}
                      >
                        <iframe 
                          id="preview-iframe"
                          src="/api/preview/index.html" 
                          className="w-full h-full border-0 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab Content: Code Explorer */}
                {activeDoneTab === "explorer" && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden shadow-2xl backdrop-blur-sm flex flex-col md:flex-row min-h-[600px]">
                    {/* Sidebar Folder list */}
                    <div className="w-full md:w-64 border-r border-zinc-800 bg-zinc-950/40 p-4 space-y-3 flex flex-col">
                      <div className="text-xs font-semibold font-mono text-zinc-500 uppercase tracking-wider">
                        📁 Generated Source Files
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin">
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
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left font-mono text-xs cursor-pointer border transition-all ${
                                isSelected 
                                  ? 'bg-emerald-950/20 text-emerald-300 border-emerald-500/20' 
                                  : 'bg-zinc-900/30 text-zinc-400 border-transparent hover:bg-zinc-850 hover:text-zinc-200'
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

                    {/* Editor Panel */}
                    <div className="flex-1 bg-zinc-950/80 flex flex-col min-h-[500px]">
                      {/* Editor Title */}
                      <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-950/40 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                          <span className="text-emerald-500">✔</span> {selectedFile || 'Select a file'}
                        </div>
                        <button
                          onClick={() => {
                            if (selectedFileContent) {
                              navigator.clipboard.writeText(selectedFileContent);
                              alert("File content copied to clipboard!");
                            }
                          }}
                          className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-855 text-[10px] text-zinc-300 rounded border border-zinc-800 font-mono font-bold cursor-pointer transition-colors"
                        >
                          Copy Code
                        </button>
                      </div>

                      {/* Code Content */}
                      <div className="flex-1 p-5 overflow-auto font-mono text-xs leading-relaxed select-text bg-zinc-950 text-zinc-300">
                        {loadingFileContent ? (
                          <div className="flex items-center justify-center h-full text-zinc-500 italic">
                            Reading compiled workspace asset...
                          </div>
                        ) : selectedFileContent ? (
                          <pre className="whitespace-pre-wrap break-all">{selectedFileContent}</pre>
                        ) : (
                          <div className="flex items-center justify-center h-full text-zinc-500 italic">
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
                    {/* Generated Files Box */}
                    {generatedFiles.length > 0 && (
                      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/10 p-6 backdrop-blur-sm shadow-xl space-y-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400 font-mono">
                          <span>📂</span> Production Assets Generated!
                        </div>
                        <p className="text-xs text-zinc-400">
                          The Swarm has successfully written the actual production files directly inside your workspace directory under <code className="font-mono text-zinc-300">/project-output/</code>:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {generatedFiles.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-zinc-850 bg-zinc-950/60 font-mono text-xs">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <span className="text-base">📄</span>
                                <span className="text-zinc-300 truncate font-semibold" title={file.path}>{file.path}</span>
                              </div>
                              <span className="text-[10px] text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                                {activeAgents[file.slug]?.name || file.slug}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Markdown Preview Document */}
                    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/20 backdrop-blur-sm shadow-xl overflow-hidden">
                      <div className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between">
                        <span className="text-xs font-mono text-zinc-500">swarm_output.md</span>
                        <div className="flex gap-1">
                          <span className="h-2 w-2 rounded-full bg-zinc-800" />
                          <span className="h-2 w-2 rounded-full bg-zinc-800" />
                          <span className="h-2 w-2 rounded-full bg-zinc-800" />
                        </div>
                      </div>

                      {/* Rendered Document */}
                      <div
                        className="p-8 md:p-12 overflow-x-auto select-text prose prose-invert prose-emerald max-w-none prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800 prose-headings:font-bold font-sans text-zinc-300 text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: marked.parse(leadSynthesizerOutput),
                        }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Continuous Session Chat Tweak Box */}
                {sessionId && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm shadow-xl space-y-4 w-full mt-6">
                    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-indigo-400">
                      <span>💬</span> Continuous Session Chat
                    </div>
                    <form onSubmit={handleTweakSubmit} className="relative group rounded-xl border border-zinc-800 bg-zinc-950 p-4 focus-within:border-zinc-700 transition-all duration-300">
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/5 to-emerald-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />
                      <div className="flex gap-4 items-center relative">
                        <input
                          type="text"
                          value={tweakPrompt}
                          onChange={(e) => setTweakPrompt(e.target.value)}
                          placeholder="Tweak this project (e.g. 'Add a search bar to navbar', 'Change primary color to neon green')..."
                          className="flex-grow bg-transparent border-0 outline-none text-zinc-100 placeholder-zinc-500 text-sm py-1"
                        />
                        <button
                          type="submit"
                          disabled={!tweakPrompt.trim()}
                          className="px-4 py-2 rounded-lg font-semibold text-xs bg-indigo-600 hover:bg-indigo-550 disabled:opacity-50 text-white shadow-lg shadow-indigo-500/10 cursor-pointer flex items-center gap-1.5 transition-all hover:scale-[1.02]"
                        >
                          Send Tweak 🚀
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
      <footer className="border-t border-zinc-900 px-8 py-8 text-center text-xs text-zinc-600 bg-zinc-950/40 mt-auto">
        <p className="font-mono">
          Agent Swarm Web Orchestrator · MIT License · Powered by Gemini LLM Kernel
        </p>
      </footer>
    </main>
  );
}
