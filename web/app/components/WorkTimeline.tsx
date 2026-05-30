"use client";
 
import React from "react";
 
interface WorkTimelineProps {
  logs: any[];
}
 
export default function WorkTimeline({ logs }: WorkTimelineProps) {
  return (
    <div className="flex h-full flex-col font-mono">
      <div className="border-b border-line px-4 py-2 bg-surface">
        <div className="text-[10px] uppercase tracking-wider text-dim">Session Timeline</div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-dim text-[11px]">No work recorded in this session</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="group relative pl-4 border-l border-line hover:border-green transition-colors">
              <div className="absolute -left-[4px] top-1 h-2 w-2 rounded-full bg-line group-hover:bg-green transition-colors" />
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] text-dim">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className="text-[10px] font-medium text-green">{log.agentId}</span>
              </div>
              <div className="text-[12px] text-ink2">{log.message}</div>
              {log.artifact && (
                <div className="mt-1 inline-flex items-center gap-1 rounded border border-line2 bg-surface px-2 py-0.5 text-[10px] text-dim">
                  <span className="text-green">✓</span> {log.artifact}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
