// Shared types for the orchestration flow: structured questionnaire + planner output.

export type QuestionType = "single" | "multi" | "text";

export interface QOption {
  id: string;
  label: string;
  description?: string;
  /**
   * Optional self-contained HTML snippet (inline styles, no scripts) rendered
   * inside a sandboxed iframe as a live visual preview of this option.
   */
  previewHtml?: string;
}

export interface Question {
  id: string;
  prompt: string;
  type: QuestionType;
  /** Present for "single" / "multi". Omitted for "text". */
  options?: QOption[];
  /** Show an "Other…" free-text field alongside the options. */
  allowCustom?: boolean;
}

export interface QuestionnaireResponse {
  questions: Question[];
}

/** A clarification answer sent to /api/run (unchanged contract). */
export interface Clarification {
  question: string;
  answer: string;
}

/** One agent the planner chose to dispatch, with a one-line description of its job. */
export interface PlannedAgent {
  slug: string;
  task: string;
  /** Skills this agent runs with (every agent runs with at least one). */
  skills?: string[];
}

/** Planner output: its reasoning plus the agents it dispatched. */
export interface PlanResult {
  reasoning: string;
  agents: PlannedAgent[];
}
