import { createFileRoute } from "@tanstack/react-router";
import { MAX_PROMPT } from "@/lib/agents";

export const Route = createFileRoute("/og")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { renderOg } = await import("@/server/og");
        const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, MAX_PROMPT);
        return new Response(renderOg(q), {
          headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
        });
      },
    },
  },
});
