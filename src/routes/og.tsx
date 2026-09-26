import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/og")({
  server: {
    handlers: {
      GET: async () => {
        const { renderOg } = await import("@/server/og");
        return new Response(renderOg(), {
          headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
        });
      },
    },
  },
});
