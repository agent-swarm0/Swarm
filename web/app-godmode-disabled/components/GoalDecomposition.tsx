"use client";
 
import React from "react";
 
interface GoalDecompositionProps {
  plan: any | null;
}
 
export default function GoalDecomposition({ plan }: GoalDecompositionProps) {
  if (!plan) return (
    <div className="flex h-full items-center justify-center text-center">
      <div className="font-mono text-[11px] text-dim">Awaiting orchestrator plan...</div>
    </div>
  );
 
  const { goal, subgoals, agentAssignments } = plan;
 
  return (
    <div className="flex h-full flex-col font-mono p-6 overflow-auto bg-tbg">
      <div className="mb-8 text-center">
        <div className="text-[10px] uppercase tracking-[3px] text-dim mb-2">Master Goal</div>
        <div className="font-serif text-2xl italic text-ink">{goal}</div>
      </div>
 
      <div className="flex flex-col items-center gap-6">
        {subgoals.map((subgoal: string, i: number) => {
          const agent = Object.entries(agentAssignments).find(([_, s]) => s === subgoal)?.[0] 
                        || Object.entries(agentAssignments).find(([a, _]) => subgoal.includes(a))?.[0]
                        || "unknown";
          return (
            <React.Fragment key={i}>
              <div className="flex items-center gap-4 w-full max-w-md">
                <div className="flex-1 h-px bg-line" />
                <div className="relative p-4 rounded-xl border border-line bg-surface shadow-sm min-w-[240px]">
                  <div className="absolute -top-2 -left-2 h-4 w-4 rounded-full bg-green flex items-center justify-center text-[8px] text-black font-bold">
                    {i + 1}
                  </div>
                  <div className="text-[12px] text-ink2 leading-relaxed">{subgoal}</div>
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <span className="text-[9px] text-dim uppercase">Assigned to</span>
                    <span className="text-[10px] font-medium text-green">{agent}</span>
                  </div>
                </div>
                <div className="flex-1 h-px bg-line" />
              </div>
              {i < subgoals.length - 1 && <div className="h-6 w-px bg-line" />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
