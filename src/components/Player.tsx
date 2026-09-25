import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import Terminal from "@/components/Terminal";
import { AGENTS, type AgentId } from "@/lib/agents";

type Line = { text: string; color?: string; muted?: boolean; prefix?: string; prefixColor?: string };
type Typing = { prefix: string; prefixColor?: string; text: string } | null;

const REDIRECT_SECS = 4;

export default function Player({ agentId, q, live }: { agentId: AgentId; q: string; live: boolean }) {
  const agent = AGENTS[agentId];
  const target = agent.webUrl?.(q);

  const [lines, setLines] = useState<Line[]>([]);
  const [typing, setTyping] = useState<Typing>(null);
  const [step, setStep] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [output, setOutput] = useState("");
  const [done, setDone] = useState(false);
  const [secs, setSecs] = useState<number | null>(null);
  const skipRef = useRef(false);
  const pendingRef = useRef("");

  useEffect(() => {
    let cancelled = false;
    let es: EventSource | null = null;
    let reveal: ReturnType<typeof setInterval> | null = null;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fast = () => skipRef.current || reduce;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, fast() ? 0 : ms));
    const push = (l: Line) => {
      if (!cancelled) setLines((p) => [...p, l]);
    };

    async function type(prefix: string, prefixColor: string | undefined, text: string, perChar: number) {
      for (let i = 1; i <= text.length; i++) {
        if (cancelled) return;
        if (fast()) i = text.length;
        setTyping({ prefix, prefixColor, text: text.slice(0, i) });
        await sleep(perChar + (Math.random() * perChar) / 2);
      }
      await sleep(300);
      if (!cancelled) setTyping(null);
    }

    function finish() {
      if (cancelled) return;
      setStatus(null);
      setStep("Was that so hard?");
      setDone(true);
      if (target && !live) setSecs(REDIRECT_SECS);
    }

    function runLive() {
      setStatus("Thinking");
      const p = new URLSearchParams({ a: agentId, q });
      es = new EventSource(`/api/run?${p}`);
      // reveal streamed text a few chars at a time so it reads like a terminal
      reveal = setInterval(() => {
        if (!pendingRef.current) return;
        const n = reduce ? pendingRef.current.length : 3;
        const chunk = pendingRef.current.slice(0, n);
        pendingRef.current = pendingRef.current.slice(n);
        setOutput((o) => o + chunk);
      }, 16);
      let sawError = false;
      es.onmessage = (m) => {
        let e: { type: string; text?: string; message?: string };
        try { e = JSON.parse(m.data); } catch { return; }
        if (e.type === "status") setStatus(e.text ?? null);
        else if (e.type === "text") { setStatus(null); pendingRef.current += e.text ?? ""; }
        else if (e.type === "tool") { setStatus(null); push({ text: e.text ?? "", prefix: "⏺ ", prefixColor: agent.color, muted: true }); }
        else if (e.type === "error") { sawError = true; push({ text: `(${e.message ?? "failed"})`, muted: true }); }
        else if (e.type === "done") { es?.close(); waitForReveal().then(finish); }
      };
      es.onerror = () => {
        es?.close();
        if (!sawError) push({ text: "(the VM didn't answer)", muted: true });
        waitForReveal().then(finish);
      };
    }

    function waitForReveal() {
      return new Promise<void>((r) => {
        const t = setInterval(() => {
          if (!pendingRef.current || cancelled) { clearInterval(t); r(); }
        }, 50);
      });
    }

    async function run() {
      await sleep(500);
      setTyping({ prefix: "$ ", text: "" });
      await sleep(600);
      await type("$ ", undefined, agent.cmd, 90);
      push({ text: `$ ${agent.cmd}`, muted: true });
      await sleep(400);
      for (const [i, b] of agent.banner.entries()) {
        push(i === 0 ? { text: b, color: agent.color } : { text: b, muted: true });
        await sleep(100);
      }
      await sleep(500);
      setTyping({ prefix: `${agent.promptChar} `, prefixColor: agent.color, text: "" });
      setStep("Step 1: Type in your question");
      await sleep(900);
      const perChar = Math.max(18, Math.min(60, 3500 / Math.max(q.length, 1)));
      await type(`${agent.promptChar} `, agent.color, q, perChar);
      if (cancelled) return;
      setTyping({ prefix: `${agent.promptChar} `, prefixColor: agent.color, text: q });
      setStep("Step 2: Press Enter");
      await sleep(1100);
      if (cancelled) return;
      setTyping(null);
      push({ text: q, prefix: `${agent.promptChar} `, prefixColor: agent.color });
      setStep(null);
      if (live) return runLive();
      setStatus("Thinking");
      await sleep(1200);
      finish();
    }
    run();
    return () => {
      cancelled = true;
      es?.close();
      if (reveal) clearInterval(reveal);
      pendingRef.current = "";
      setLines([]);
      setTyping(null);
      setStep(null);
      setStatus(null);
      setOutput("");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (secs === null) return;
    if (secs <= 0) {
      window.location.href = target!;
      return;
    }
    const t = setTimeout(() => setSecs((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [secs, target]);

  const showSkip = !done && !status && !output;

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-4">
      <div className="h-9 flex justify-center">
        {step && (
          <div key={step} className="pop rounded-md px-3 py-1.5 text-sm font-medium text-black" style={{ background: agent.color }}>
            {step}
          </div>
        )}
      </div>

      <Terminal title={live ? `${agent.cmd} — sandbox` : agent.cmd}>
        {lines.map((l, i) => (
          <div key={i} style={l.color ? { color: l.color } : undefined} className={l.muted ? "text-muted" : ""}>
            {l.prefix && <span style={{ color: l.prefixColor }}>{l.prefix}</span>}
            {l.text}
          </div>
        ))}
        {typing && (
          <div>
            <span style={typing.prefixColor ? { color: typing.prefixColor } : undefined} className={typing.prefixColor ? "" : "text-muted"}>
              {typing.prefix}
            </span>
            <span className="cursor">{typing.text}</span>
          </div>
        )}
        {output && (
          <div className="mt-2 flex gap-2">
            <span style={{ color: agent.color }}>⏺</span>
            <span className={done ? "" : "cursor"}>{output}</span>
          </div>
        )}
        {status && (
          <div className="mt-2" style={{ color: agent.color }}>
            <span className="spin">✻</span> {status}…
          </div>
        )}
        {showSkip && (
          <button type="button" onClick={() => (skipRef.current = true)} className="absolute bottom-3 right-4 text-xs text-muted hover:text-fg">
            skip
          </button>
        )}
      </Terminal>

      <div className="h-9 text-center text-sm">
        {done &&
          (target ? (
            <p className="pop text-muted">
              {live ? "Or " : "Taking you to "}
              <a href={target} className="text-fg underline underline-offset-2">
                {live ? `ask ${agent.short} yourself` : agent.short}
              </a>
              {secs !== null && secs > 0 ? ` in ${secs}…` : ""}
              {secs !== null && secs > 0 && (
                <>
                  {" "}
                  <button type="button" onClick={() => setSecs(null)} className="text-muted hover:text-fg">
                    (cancel)
                  </button>
                </>
              )}
            </p>
          ) : (
            <p className="pop text-muted">
              <a href={agent.installUrl} target="_blank" rel="noreferrer" className="text-fg underline underline-offset-2">
                Install {agent.name}
              </a>
            </p>
          ))}
      </div>

      <p className="text-center text-xs">
        <Link to="/" className="text-muted hover:text-fg">
          Make your own
        </Link>
      </p>
    </div>
  );
}
