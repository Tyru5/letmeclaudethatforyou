import { Link, createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import Player from "@/components/Player";
import { MAX_PROMPT } from "@/lib/agents";

const getPageData = createServerFn().handler(async () => {
  const host = getRequestHeader("x-forwarded-host") ?? getRequestHeader("host") ?? "localhost:3999";
  const proto = getRequestHeader("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const { isLive } = await import("@/server/run");
  return { origin: `${proto}://${host}`, live: await isLive() };
});

export const Route = createFileRoute("/go")({
  validateSearch: (s: Record<string, unknown>) => ({ q: String(s.q ?? "").trim().slice(0, MAX_PROMPT) }),
  loaderDeps: ({ search }) => search,
  loader: () => getPageData(),
  // Deliberately anonymous: the link preview shows only the question.
  head: ({ match, loaderData }) => {
    const q = match.search.q;
    const title = q.length > 70 ? q.slice(0, 70) + "…" : q || "…";
    const image = `${loaderData?.origin ?? ""}/og?q=${encodeURIComponent(q)}`;
    return {
      meta: [
        { title },
        { name: "robots", content: "noindex" },
        { property: "og:title", content: title },
        { property: "og:image", content: image },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:image", content: image },
      ],
    };
  },
  component: Go,
});

function Go() {
  const { q } = Route.useSearch();
  const { live } = Route.useLoaderData();
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 gap-8">
      {q ? (
        <Player key={q} q={q} live={live} />
      ) : (
        <Link to="/" className="text-muted hover:text-fg">
          Let me Claude that for you
        </Link>
      )}
    </main>
  );
}
