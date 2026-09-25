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

export function buildSharePath(q: string, s = "") {
  const p = new URLSearchParams({ q: q.trim().slice(0, MAX_PROMPT) });
  if (s) p.set("s", s);
  return `/go?${p.toString()}`;
}
