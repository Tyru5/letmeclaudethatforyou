export type AgentId = "claude" | "codex" | "gemini" | "cursor" | "copilot";

export type Agent = {
  id: AgentId;
  name: string;
  short: string;
  cmd: string;
  promptChar: string;
  color: string;
  banner: string[];
  webUrl?: (q: string) => string;
  installUrl: string;
};

export const AGENTS: Record<AgentId, Agent> = {
  claude: {
    id: "claude",
    name: "Claude Code",
    short: "Claude",
    cmd: "claude",
    promptChar: ">",
    color: "#d97757",
    banner: ["✻ Welcome to Claude Code!", "  /help for help"],
    webUrl: (q) => `https://claude.ai/new?q=${encodeURIComponent(q)}`,
    installUrl: "https://docs.anthropic.com/en/docs/claude-code/quickstart",
  },
  codex: {
    id: "codex",
    name: "Codex",
    short: "Codex",
    cmd: "codex",
    promptChar: "›",
    color: "#10a37f",
    banner: ["OpenAI Codex", "  model: gpt-5-codex"],
    webUrl: (q) => `https://chatgpt.com/?q=${encodeURIComponent(q)}`,
    installUrl: "https://github.com/openai/codex",
  },
  gemini: {
    id: "gemini",
    name: "Gemini CLI",
    short: "Gemini",
    cmd: "gemini",
    promptChar: ">",
    color: "#4e8cff",
    banner: ["Gemini CLI"],
    installUrl: "https://github.com/google-gemini/gemini-cli",
  },
  cursor: {
    id: "cursor",
    name: "Cursor",
    short: "Cursor",
    cmd: "cursor-agent",
    promptChar: "❯",
    color: "#a78bfa",
    banner: ["Cursor Agent"],
    installUrl: "https://cursor.com/cli",
  },
  copilot: {
    id: "copilot",
    name: "Copilot",
    short: "Copilot",
    cmd: "copilot",
    promptChar: ">",
    color: "#2dd4bf",
    banner: ["GitHub Copilot CLI"],
    installUrl: "https://github.com/github/copilot-cli",
  },
};

export const AGENT_LIST = Object.values(AGENTS);
export const DEFAULT_AGENT: AgentId = "claude";
export const MAX_PROMPT = 2000;

export function isAgentId(v: unknown): v is AgentId {
  return typeof v === "string" && v in AGENTS;
}

export function buildSharePath(agent: AgentId, q: string) {
  const p = new URLSearchParams({ a: agent, q: q.trim().slice(0, MAX_PROMPT) });
  return `/go?${p.toString()}`;
}
