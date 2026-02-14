"use client";

import { useState } from "react";

export type OutputLine = {
  type: "error" | "warning" | "success" | "info";
  text: string;
};

type Props = {
  lines: OutputLine[];
  onClear: () => void;
};

export default function OutputPanel({ lines, onClear }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const errorCount = lines.filter((l) => l.type === "error").length;
  const warningCount = lines.filter((l) => l.type === "warning").length;

  if (lines.length === 0) return null;

  return (
    <div className="border-t border-zinc-800 bg-zinc-950 flex flex-col">
      {/* Panel header / toggle bar */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-3 px-4 py-2 text-xs font-medium bg-zinc-900/80 hover:bg-zinc-800/80 transition-colors text-left w-full"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className={`shrink-0 transition-transform ${collapsed ? "-rotate-90" : ""}`}
          fill="currentColor"
        >
          <path d="M2 4l4 4 4-4z" />
        </svg>

        <span className="text-zinc-400">Output</span>

        {errorCount > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-red-900/60 text-red-300 text-[10px] font-semibold">
            {errorCount} error{errorCount !== 1 ? "s" : ""}
          </span>
        )}
        {warningCount > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-300 text-[10px] font-semibold">
            {warningCount} warning{warningCount !== 1 ? "s" : ""}
          </span>
        )}

        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              onClear();
            }
          }}
          className="ml-auto text-zinc-600 hover:text-zinc-400 transition-colors"
          title="Clear output"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
          </svg>
        </span>
      </button>

      {/* Panel content */}
      {!collapsed && (
        <div className="overflow-auto max-h-56 p-3 font-mono text-xs leading-relaxed select-text">
          {lines.map((line, i) => {
            let colorClass: string;
            let prefix: string;
            switch (line.type) {
              case "error":
                colorClass = "text-red-400";
                prefix = "ERROR";
                break;
              case "warning":
                colorClass = "text-amber-400";
                prefix = "WARN ";
                break;
              case "success":
                colorClass = "text-green-400";
                prefix = "OK   ";
                break;
              default:
                colorClass = "text-zinc-400";
                prefix = "INFO ";
                break;
            }
            return (
              <div key={i} className={`${colorClass} whitespace-pre-wrap break-all`}>
                <span className="text-zinc-600 select-none">{prefix}  </span>
                {line.text}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
