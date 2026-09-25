import { useState, useSyncExternalStore } from "react";
import { AGENT, MAX_PROMPT, buildSharePath } from "@/lib/agents";

export default function Generator() {
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState(false);
  const origin = useSyncExternalStore(() => () => {}, () => window.location.origin, () => "");

  const ready = q.trim().length > 0;
  const path = buildSharePath(q);
  const url = origin + path;

  async function copy() {
    if (!ready) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy:", url);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        copy();
      }}
      className="w-full max-w-xl mx-auto flex flex-col gap-4"
    >
      <div className="flex items-start gap-2 rounded-lg border border-line bg-elev px-4 py-3 font-mono text-sm focus-within:border-fg/40">
        <span style={{ color: AGENT.color }}>{AGENT.promptChar}</span>
        <textarea
          value={q}
          onChange={(e) => setQ(e.target.value.slice(0, MAX_PROMPT))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              copy();
            }
          }}
          rows={2}
          autoFocus
          aria-label="Question"
          className="flex-1 bg-transparent outline-none resize-none"
        />
      </div>

      <div className="flex gap-2">
        <input
          readOnly
          value={ready ? url : ""}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Link"
          className="flex-1 min-w-0 rounded-lg border border-line bg-elev px-3 py-2 font-mono text-sm text-muted focus:text-fg outline-none"
        />
        <button
          type="submit"
          disabled={!ready}
          className="rounded-lg px-4 py-2 text-sm font-medium text-black disabled:opacity-40"
          style={{ background: AGENT.color }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <a
          href={ready ? path : undefined}
          target="_blank"
          rel="noreferrer"
          aria-disabled={!ready}
          className="rounded-lg border border-line px-4 py-2 text-sm text-muted hover:text-fg aria-disabled:opacity-40 aria-disabled:pointer-events-none"
        >
          Preview
        </a>
      </div>
    </form>
  );
}
