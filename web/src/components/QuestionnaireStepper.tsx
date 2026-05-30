"use client";

import React, { useState } from "react";
import type { Question, Clarification } from "@/types/orchestration";
import { OptionCard } from "./OptionCard";

interface QuestionnaireStepperProps {
  questions: Question[];
  onComplete: (clarifications: Clarification[]) => void;
  onSkip: () => void;
}

interface AnswerState {
  selected: string[]; // option ids
  custom: string; // "Other…" text
  text: string; // text-type answer
}

function emptyAnswer(): AnswerState {
  return { selected: [], custom: "", text: "" };
}

/**
 * Presents clarifying questions ONE AT A TIME with options + live previews.
 * Builds {question, answer}[] clarifications on completion.
 */
export function QuestionnaireStepper({ questions, onComplete, onSkip }: QuestionnaireStepperProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});

  const q = questions[index];
  const total = questions.length;
  const isLast = index === total - 1;
  const ans = answers[q.id] ?? emptyAnswer();

  const update = (patch: Partial<AnswerState>) =>
    setAnswers((prev) => ({ ...prev, [q.id]: { ...emptyAnswer(), ...prev[q.id], ...patch } }));

  const toggleOption = (optId: string) => {
    if (q.type === "multi") {
      const next = ans.selected.includes(optId)
        ? ans.selected.filter((id) => id !== optId)
        : [...ans.selected, optId];
      update({ selected: next });
    } else {
      update({ selected: ans.selected[0] === optId ? [] : [optId] });
    }
  };

  const answeredCurrent = (() => {
    if (q.type === "text") return ans.text.trim().length > 0;
    return ans.selected.length > 0 || (q.allowCustom && ans.custom.trim().length > 0);
  })();

  const buildClarifications = (): Clarification[] => {
    const result: Clarification[] = [];
    for (const question of questions) {
      const a = answers[question.id];
      if (!a) continue;
      let answer = "";
      if (question.type === "text") {
        answer = a.text.trim();
      } else {
        const labels = (question.options ?? [])
          .filter((o) => a.selected.includes(o.id))
          .map((o) => o.label);
        if (a.custom.trim()) labels.push(a.custom.trim());
        answer = labels.join(", ");
      }
      if (answer) result.push({ question: question.prompt, answer });
    }
    return result;
  };

  const goNext = () => {
    if (isLast) onComplete(buildClarifications());
    else setIndex((i) => i + 1);
  };
  const goBack = () => setIndex((i) => Math.max(0, i - 1));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-4">
      {/* Header: phase + progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-green">
          <span className="inline-block h-1.5 w-1.5 bg-green" />
          Intake · {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </div>
        <button
          onClick={onSkip}
          className="cursor-pointer font-mono text-[11px] uppercase tracking-wider text-dim hover:text-ink"
        >
          Skip all →
        </button>
      </div>

      {/* Progress ticks */}
      <div className="flex gap-1.5">
        {questions.map((qq, i) => {
          const done = Boolean(answers[qq.id] && (answers[qq.id].text.trim() || answers[qq.id].selected.length || answers[qq.id].custom.trim()));
          return (
            <div
              key={qq.id}
              className={`h-0.5 flex-1 transition-colors ${
                i === index ? "bg-green" : done ? "bg-green/40" : "bg-line2"
              }`}
            />
          );
        })}
      </div>

      {/* Question card */}
      <div className="rounded-2xl border border-line2 bg-surface p-6">
        <h2 className="font-serif text-2xl leading-snug text-ink">{q.prompt}</h2>
        {q.type === "multi" && (
          <p className="mt-1.5 font-mono text-[11px] uppercase tracking-wider text-dim">
            Select all that apply
          </p>
        )}

        {/* Options */}
        {q.type !== "text" && q.options && (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {q.options.map((opt) => (
              <OptionCard
                key={opt.id}
                option={opt}
                selected={ans.selected.includes(opt.id)}
                multi={q.type === "multi"}
                onToggle={() => toggleOption(opt.id)}
              />
            ))}
          </div>
        )}

        {/* Text input */}
        {q.type === "text" && (
          <textarea
            autoFocus
            value={ans.text}
            onChange={(e) => update({ text: e.target.value })}
            placeholder="Type your answer…"
            className="mt-5 h-28 w-full resize-none rounded-lg border border-line2 bg-bg px-3.5 py-3 font-mono text-sm text-ink placeholder-dim outline-none focus:border-green"
          />
        )}

        {/* Custom "Other…" field */}
        {q.type !== "text" && q.allowCustom && (
          <div className="mt-3">
            <input
              type="text"
              value={ans.custom}
              onChange={(e) => update({ custom: e.target.value })}
              placeholder="Other… (your own answer)"
              className="w-full rounded-lg border border-line2 bg-bg px-3.5 py-2.5 font-mono text-sm text-ink placeholder-dim outline-none focus:border-green"
            />
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={goBack}
          disabled={index === 0}
          className="cursor-pointer rounded-xl border border-line2 bg-surface px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-ink2 transition-colors hover:border-green/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
        >
          ← Back
        </button>
        <button
          onClick={goNext}
          className={`cursor-pointer rounded-xl border px-6 py-2.5 font-mono text-xs uppercase tracking-wider transition-colors ${
            answeredCurrent
              ? "border-green bg-green text-white hover:bg-greenb"
              : "border-line2 bg-surface text-ink2 hover:border-green/40 hover:text-ink"
          }`}
        >
          {isLast ? "Launch swarm ⚡" : answeredCurrent ? "Next →" : "Skip this →"}
        </button>
      </div>
    </div>
  );
}
