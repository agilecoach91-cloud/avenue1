"use client";

import { useState } from "react";

export function CopyField({ value, label, multiline }: { value: string; label: string; multiline?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked: the text is selectable as a fallback.
    }
  }
  const id = `copy-${label.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <div className="flex gap-2">
        {multiline ? (
          <textarea id={id} readOnly value={value} className="field text-sm" rows={3} onFocus={(e) => e.currentTarget.select()} />
        ) : (
          <input id={id} readOnly value={value} className="field text-sm" onFocus={(e) => e.currentTarget.select()} />
        )}
        <button type="button" onClick={copy} className="btn btn-dark btn-sm shrink-0 self-start" aria-live="polite">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
