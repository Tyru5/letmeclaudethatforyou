import { Writable } from "node:stream";
import { Sandbox, type NetworkPolicy } from "@vercel/sandbox";
import { getVercelOidcToken } from "@vercel/oidc";

export type RunEvent =
  | { type: "status"; text: string }
  | { type: "text"; text: string }
  | { type: "tool"; text: string }
  | { type: "done"; exitCode: number }
  | { type: "error"; message: string };

const MODEL = () => process.env.CLAUDE_MODEL || "claude-haiku-4-5";

/** OIDC token: `.env.local` locally, request header on Vercel. Empty when neither is present. */
async function oidcToken(): Promise<string> {
  try {
    return await getVercelOidcToken();
  } catch {
    return "";
  }
}

/** AI Gateway credential: explicit key, or the OIDC token when opted in (team needs gateway credits). */
async function gatewayKey(): Promise<string> {
  return process.env.AI_GATEWAY_API_KEY || (process.env.AI_GATEWAY_USE_OIDC ? await oidcToken() : "");
}

/** Host Claude Code talks to + the auth header injected at the sandbox firewall. The VM never sees the key. */
async function broker(): Promise<{ domain: string; headers: Record<string, string>; env: Record<string, string> } | null> {
  if (process.env.ANTHROPIC_API_KEY)
    return {
      domain: "api.anthropic.com",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY },
      env: { ANTHROPIC_API_KEY: "brokered-at-firewall" },
    };
  const key = await gatewayKey();
  if (key)
    return {
      domain: "ai-gateway.vercel.sh",
      headers: { authorization: `Bearer ${key}` },
      env: { ANTHROPIC_API_KEY: "", ANTHROPIC_AUTH_TOKEN: "brokered-at-firewall", ANTHROPIC_BASE_URL: "https://ai-gateway.vercel.sh/claude-code" },
    };
  return null;
}

async function hasVercelAuth() {
  const e = process.env;
  return Boolean((e.VERCEL_TOKEN && e.VERCEL_TEAM_ID && e.VERCEL_PROJECT_ID) || (await oidcToken()));
}

export const isLive = async () => (await hasVercelAuth()) && (await broker()) !== null;

const text = (t: string): RunEvent[] => (t ? [{ type: "text", text: t }] : []);

function parse(line: string): RunEvent[] {
  let j: any;
  try { j = JSON.parse(line); } catch { return []; }
  if (j.type === "stream_event" && j.event?.type === "content_block_delta" && j.event.delta?.type === "text_delta")
    return text(j.event.delta.text);
  if (j.type === "assistant")
    return (j.message?.content ?? [])
      .filter((c: any) => c.type === "tool_use")
      .map((c: any) => ({ type: "tool", text: `${c.name}(${summarize(c.input)})` }));
  if (j.type === "result" && j.is_error) return [{ type: "error", message: String(j.result ?? "failed") }];
  return [];
}

function summarize(input: unknown): string {
  if (!input || typeof input !== "object") return "";
  const v = Object.values(input as Record<string, unknown>)[0];
  const s = typeof v === "string" ? v : JSON.stringify(v ?? "");
  return s.length > 60 ? s.slice(0, 60) + "…" : s;
}

export async function runAgent(q: string, emit: (e: RunEvent) => void, signal: AbortSignal): Promise<void> {
  const b = await broker();
  if (!b) return emit({ type: "error", message: "not configured" });

  const policy: NetworkPolicy = { allow: { [b.domain]: [{ transform: [{ headers: b.headers }] }] } };

  emit({ type: "status", text: "Booting a VM" });
  const sandbox = await Sandbox.create({
    image: "vercel/sandbox/universal", // ships claude
    persistent: false,
    resources: { vcpus: 1 },
    timeout: 90_000,
    env: { ...b.env, DISABLE_TELEMETRY: "1", DISABLE_ERROR_REPORTING: "1", CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1" },
    networkPolicy: policy,
  });

  try {
    if (signal.aborted) return;
    emit({ type: "status", text: "Running" });

    let buf = "";
    let failed = false;
    const out = (e: RunEvent) => {
      if (e.type === "error") failed = true;
      emit(e);
    };
    const sink = new Writable({
      write(chunk, _enc, cb) {
        buf += chunk.toString();
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const l of lines) for (const e of parse(l)) out(e);
        cb();
      },
    });
    let err = "";
    const errSink = new Writable({ write(c, _e, cb) { err += c.toString(); cb(); } });

    const cmd = await sandbox.runCommand({
      cmd: "claude",
      args: [
        "-p", q,
        "--model", MODEL(),
        "--output-format", "stream-json", "--verbose", "--include-partial-messages",
        "--max-turns", "6", "--max-budget-usd", "0.25", "--dangerously-skip-permissions",
      ],
      stdout: sink,
      stderr: errSink,
      signal,
      timeoutMs: 60_000,
    });
    if (buf) for (const e of parse(buf)) out(e);
    if (cmd.exitCode !== 0 && !failed)
      emit({ type: "error", message: cmd.exitCode === 137 ? "took longer than a minute" : err.trim().split("\n").pop()?.slice(0, 200) || `exit ${cmd.exitCode}` });
    emit({ type: "done", exitCode: cmd.exitCode });
  } finally {
    await sandbox.stop().catch(() => {});
  }
}
