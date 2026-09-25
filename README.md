# Let me Claude that for you

lmgtfy for coding agents. Type the question, send the link. It types it into the agent for them.
With credentials set, it actually runs the agent in a Vercel Sandbox microVM and streams the answer.

TanStack Start + Vite + Tailwind + `@vercel/sandbox`.

```
npm i
npm run dev      # :3999
npm run build    # dist/
```

Links: `/go?a=<claude|codex|gemini|cursor|copilot>&q=<question>`

## Live runs

Without creds the share page fakes it. To run for real:

```
vercel login
vercel env pull          # -> .env.local with VERCEL_OIDC_TOKEN (12h)
echo ANTHROPIC_API_KEY=sk-ant-... >> .env.local
```

Or durable: `VERCEL_TOKEN` + `VERCEL_TEAM_ID` + `VERCEL_PROJECT_ID` (see `.env.example`).
`OPENAI_API_KEY` enables Codex, `GEMINI_API_KEY` enables Gemini.

How a run works (`src/server/run.ts`):
- boots `vercel/sandbox/universal`, 1 vCPU, non-persistent, 3 min cap
- egress allow-list is only the model API host; the real key is injected at the sandbox firewall, the VM only ever holds a placeholder
- runs `claude -p … --output-format stream-json`, streams to the page over SSE (`/api/run`)
- limits: per-IP, concurrent, daily (`RUN_*` in `.env.example`)
