import { diffLines } from "diff";
import React from "react";

type Change = { path: string; reason: string; before?: unknown; after?: unknown };

export default function DiffView({ before, after, changes }: { before: unknown; after: unknown; changes: Change[] }) {
  const a = JSON.stringify(before, null, 2);
  const b = JSON.stringify(after, null, 2);
  const parts = diffLines(a, b);
  return (
    <div className="space-y-4">
      {changes.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-sm font-medium">LLM-proposed changes ({changes.length})</h3>
          <ul className="space-y-1">
            {changes.map((c, i) => (
              <li key={i} className="text-xs rounded-md border border-border px-2.5 py-1.5">
                <code className="font-mono">{c.path}</code> — {c.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="rounded-md border border-border overflow-hidden">
        <div className="bg-muted px-3 py-1.5 text-xs font-medium border-b border-border flex justify-between">
          <span>Submitted</span><span>← / →</span><span>LLM corrected</span>
        </div>
        <pre className="font-mono text-xs leading-relaxed max-h-[500px] overflow-auto">
          {parts.map((p, i) => (
            <div
              key={i}
              className={
                p.added ? "bg-green-500/10 text-green-800 dark:text-green-300"
                : p.removed ? "bg-red-500/10 text-red-800 dark:text-red-300"
                : "text-foreground"
              }
            >
              {p.value.split("\n").filter((_, j, arr) => j < arr.length - 1 || arr.length === 1).map((line, k) => (
                <div key={k} className="px-3">
                  <span className="select-none opacity-50 mr-2">
                    {p.added ? "+" : p.removed ? "-" : " "}
                  </span>{line}
                </div>
              ))}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
