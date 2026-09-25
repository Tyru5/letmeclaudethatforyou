import { Writable } from "node:stream";
import { Sandbox, type NetworkPolicy } from "@vercel/sandbox";
import type { AgentId } from "@/lib/agents";

export type RunEvent =
  | { type: "status"; text: string }
  | { type: "text"; text: string }
  | { type: "tool"; text: string }
  | { type: "done"; exitCode: number }
  | { type: "error"; message: string };

type Spec = {
  bin: string;
  pkg: string;
  args: (q: string) => string[];
  /** host the agent talks to + the auth header injected at the sandbox firewall */
  broker: () => { domain: string; headers: Record<string, string> } | null;
  env: Record<string, string>;
  parse: (line: string) => RunEvent[];
};

const text = (t: string): RunEvent[] => (t ? [{ type: "text", text: t }] : []);

const SPECS: Partial<Record<AgentId, Spec>> = {
  claude: {
    bin: "claude",
    pkg: "@anthropic-ai/claude-code",
    args: (q) => [
      "-p", q,
      "--output-format", "stream-json", "--verbose", "--include-partial-messages",
      "--max-turns", "6", "--max-budget-usd", "0.25", "--dangerously-skip-permissions",
    ],
    broker: () =>
      process.env.ANTHROPIC_API_KEY
        ? { domain: "api.anthropic.com", headers: { "x-api-key": process.env.ANTHROPIC_API_KEY } }
        : null,
    env: {
      ANTHROPIC_API_KEY: "brokered-at-firewall",
      DISABLE_TELEMETRY: "1",
      DISABLE_ERROR_REPORTING: "1",
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
    },
    parse: (line) => {
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
    },
  },
  codex: {
    bin: "codex",
    pkg: "@openai/codex",
    args: (q) => ["exec", "--json", "--skip-git-repo-check", "--full-auto", q],
    broker: () =>
      process.env.OPENAI_API_KEY
        ? { domain: "api.openai.com", headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
        : null,
    env: { OPENAI_API_KEY: "brokered-at-firewall" },
    parse: (line) => {
      let j: any;
      try { j = JSON.parse(line); } catch { return []; }
      if (j.type === "item.completed" && j.item?.type === "agent_message") return text(j.item.text + "\n");
      if (j.type === "item.started" && j.item?.type === "command_execution") return [{ type: "tool", text: `$ ${j.item.command}` }];
      if (j.type === "turn.failed" || j.type === "error") return [{ type: "error", message: String(j.error?.message ?? j.message ?? "failed") }];
      return [];
    },
  },
  gemini: {
    bin: "gemini",
    pkg: "@google/gemini-cli",
    args: (q) => ["-p", q, "--yolo"],
    broker: () =>
      process.env.GEMINI_API_KEY
        ? { domain: "generativelanguage.googleapis.com", headers: { "x-goog-api-key": process.env.GEMINI_API_KEY } }
        : null,
    env: { GEMINI_API_KEY: "brokered-at-firewall" },
    parse: (line) => text(line + "\n"),
  },
};

function summarize(input: unknown): string {
  if (!input || typeof input !== "object") return "";
  const v = Object.values(input as Record<string, unknown>)[0];
  const s = typeof v === "string" ? v : JSON.stringify(v ?? "");
  return s.length > 60 ? s.slice(0, 60) + "…" : s;
}

function hasVercelAuth() {
  const e = process.env;
  return Boolean(e.VERCEL_OIDC_TOKEN || (e.VERCEL_TOKEN && e.VERCEL_TEAM_ID && e.VERCEL_PROJECT_ID) || e.VERCEL);
}

export function liveAgents(): AgentId[] {
  if (!hasVercelAuth()) return [];
  return (Object.keys(SPECS) as AgentId[]).filter((id) => SPECS[id]!.broker());
}

export async function runAgent(
  agentId: AgentId,
  q: string,
  emit: (e: RunEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const spec = SPECS[agentId];
  const broker = spec?.broker();
  if (!spec || !broker) return emit({ type: "error", message: "not configured" });

  const policy = (extra: string[] = []): NetworkPolicy => ({
    allow: {
      [broker.domain]: [{ transform: [{ headers: broker.headers }] }],
      ...Object.fromEntries(extra.map((d) => [d, []])),
    },
  });

  emit({ type: "status", text: "Booting a VM" });
  const sandbox = await Sandbox.create({
    image: "vercel/sandbox/universal",
    persistent: false,
    resources: { vcpus: 1 },
    timeout: 180_000,
    env: spec.env,
    networkPolicy: policy(),
  });

  try {
    if (signal.aborted) return;
    const probe = await sandbox.runCommand("bash", ["-c", `command -v ${spec.bin} >/dev/null && echo ok`]);
    if (!(await probe.stdout()).includes("ok")) {
      emit({ type: "status", text: `Installing ${spec.bin}` });
      // npm registry isn't in the allow-list on purpose; open it just for the install.
      await sandbox.update({ networkPolicy: policy(["registry.npmjs.org"]) });
      const inst = await sandbox.runCommand("npm", ["i", "-g", spec.pkg]);
      if (inst.exitCode !== 0) return emit({ type: "error", message: `install failed: ${(await inst.stderr()).slice(-300)}` });
      await sandbox.update({ networkPolicy: policy() });
    }

    emit({ type: "status", text: "Running" });
    let buf = "";
    const sink = new Writable({
      write(chunk, _enc, cb) {
        buf += chunk.toString();
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const l of lines) for (const e of spec.parse(l)) emit(e);
        cb();
      },
    });
    let err = "";
    const errSink = new Writable({ write(c, _e, cb) { err += c.toString(); cb(); } });

    const cmd = await sandbox.runCommand({
      cmd: spec.bin,
      args: spec.args(q),
      cwd: "/vercel/sandbox",
      stdout: sink,
      stderr: errSink,
      signal,
      timeoutMs: 150_000,
    });
    if (buf) for (const e of spec.parse(buf)) emit(e);
    if (cmd.exitCode !== 0) emit({ type: "error", message: err.trim().split("\n").pop()?.slice(0, 200) || `exit ${cmd.exitCode}` });
    emit({ type: "done", exitCode: cmd.exitCode });
  } finally {
    await sandbox.stop().catch(() => {});
  }
}
