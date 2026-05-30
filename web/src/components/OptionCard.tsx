"use client";

import React, { useState } from "react";
import type { QOption } from "@/types/orchestration";

interface OptionCardProps {
  option: QOption;
  selected: boolean;
  multi: boolean;
  onToggle: () => void;
}

/**
 * A selectable option. When the option carries `previewHtml`, it renders a live,
 * scaled-down sandboxed iframe (scripts disabled) as a visual preview thumbnail.
 */
export function OptionCard({ option, selected, multi, onToggle }: OptionCardProps) {
  const [zoomed, setZoomed] = useState(false);
  const hasPreview = Boolean(option.previewHtml);

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className={`group relative flex flex-col overflow-hidden rounded-lg border text-left transition-colors cursor-pointer ${
          selected
            ? "border-green bg-bg3"
            : "border-line2 bg-surface hover:border-green/40"
        }`}
      >
        {/* Preview viewport */}
        {hasPreview && (
          <div className="relative h-40 w-full overflow-hidden border-b border-line bg-white">
            <iframe
              title={`preview-${option.id}`}
              sandbox=""
              srcDoc={option.previewHtml}
              tabIndex={-1}
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 origin-top-left"
              style={{ width: 1000, height: 640, transform: "scale(0.4)" }}
            />
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                setZoomed(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  setZoomed(true);
                }
              }}
              className="absolute bottom-2 right-2 rounded border border-line2 bg-surface/90 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-ink2 opacity-0 transition-opacity hover:text-green group-hover:opacity-100"
            >
              ⛶ Expand
            </span>
          </div>
        )}

        {/* Label row */}
        <div className="flex items-start gap-3 p-3.5">
          <span
            className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center border text-[10px] ${
              multi ? "rounded-sm" : "rounded-full"
            } ${selected ? "border-green bg-green text-white" : "border-line2 text-transparent"}`}
          >
            {selected ? (multi ? "✓" : "●") : ""}
          </span>
          <div className="space-y-1">
            <div className={`font-mono text-sm font-medium ${selected ? "text-green" : "text-ink"}`}>
              {option.label}
            </div>
            {option.description && (
              <div className="text-xs leading-relaxed text-dim">{option.description}</div>
            )}
          </div>
        </div>
      </button>

      {/* Full-size preview modal */}
      {zoomed && hasPreview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-tbg/70 p-6"
          onClick={() => setZoomed(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-line2 bg-surface"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="font-mono text-xs text-ink2">
                preview · <span className="text-green">{option.label}</span>
              </span>
              <button
                onClick={() => setZoomed(false)}
                className="cursor-pointer font-mono text-xs text-dim hover:text-ink"
              >
                ✕ Close
              </button>
            </div>
            <iframe
              title={`preview-full-${option.id}`}
              sandbox=""
              srcDoc={option.previewHtml}
              className="h-[70vh] w-full border-0 bg-white"
            />
          </div>
        </div>
      )}
    </>
  );
}
