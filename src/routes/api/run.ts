import { createFileRoute } from "@tanstack/react-router";
import { MAX_PROMPT } from "@/lib/agents";

export const Route = createFileRoute("/api/run")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { runAgent, isLive } = await import("@/server/run");
        const { acquire, release } = await import("@/server/limits");

        const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, MAX_PROMPT);
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";

        if (!q) return new Response("missing q", { status: 400 });
        if (!isLive()) return new Response("not configured", { status: 503 });
        const denied = acquire(ip);
        if (denied) return new Response(denied, { status: 429 });

        const enc = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            const send = (e: unknown) => {
              try { controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`)); } catch {}
            };
            const ping = setInterval(() => { try { controller.enqueue(enc.encode(": ping\n\n")); } catch {} }, 15_000);
            try {
              await runAgent(q, send, request.signal);
            } catch (err) {
              send({ type: "error", message: err instanceof Error ? err.message.slice(0, 200) : "failed" });
              send({ type: "done", exitCode: 1 });
            } finally {
              clearInterval(ping);
              release();
              try { controller.close(); } catch {}
            }
          },
        });
        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
