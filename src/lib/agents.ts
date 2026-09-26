export const AGENT = {
  name: "Claude Code",
  short: "Claude",
  cmd: "claude",
  promptChar: ">",
  color: "#d97757",
  banner: ["✻ Welcome to Claude Code!", "  /help for help"],
  webUrl: (q: string) => `https://claude.ai/new?q=${encodeURIComponent(q)}`,
};

export const MAX_PROMPT = 2000;

function encodeQuestion(q: string): string {
  const bytes = new TextEncoder().encode(q);
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decodeQuestion(value: string): string {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return new TextDecoder().decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)));
}

export function parseShareQuestion(search: Record<string, unknown>): string {
  if (typeof search.d === "string") {
    try {
      return decodeQuestion(search.d).trim().slice(0, MAX_PROMPT);
    } catch {
      return "";
    }
  }
  return String(search.q ?? "").trim().slice(0, MAX_PROMPT);
}

export function buildSharePath(q: string, s = "") {
  const p = new URLSearchParams({ d: encodeQuestion(q.trim().slice(0, MAX_PROMPT)) });
  if (s) p.set("s", s);
  return `/go?${p.toString()}`;
}
