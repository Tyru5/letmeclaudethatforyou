import { Link, createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import Player from "@/components/Player";
import { parseShareQuestion } from "@/lib/agents";

type ShareSearch = { d?: string; q?: string; s?: string };

const getPageData = createServerFn()
  .inputValidator((d: { q: string; s: string }) => d)
  .handler(async ({ data }) => {
    const host = getRequestHeader("x-forwarded-host") ?? getRequestHeader("host") ?? "localhost:3999";
    const proto = getRequestHeader("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    const { isLive } = await import("@/server/run");
    const { verify } = await import("@/server/sign");
    // unsigned links still play the bit, they just don't get a VM
    return { origin: `${proto}://${host}`, live: verify(data.q, data.s) && (await isLive()) };
  });

export const Route = createFileRoute("/go")({
  validateSearch: (s: Record<string, unknown>): ShareSearch => {
    const search: ShareSearch = {};
    if (typeof s.d === "string") search.d = s.d;
    else if (s.q !== undefined) search.q = String(s.q).trim();
    if (typeof s.s === "string" && s.s) search.s = s.s;
    return search;
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getPageData({ data: { q: parseShareQuestion(deps), s: deps.s ?? "" } }),
  head: ({ loaderData }) => {
    const title = "Quick question";
    const image = `${loaderData?.origin ?? ""}/og`;
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
  const search = Route.useSearch();
  const q = parseShareQuestion(search);
  const s = search.s ?? "";
  const { live } = Route.useLoaderData();
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 gap-8">
      {q ? (
        <Player key={q} q={q} sig={s} live={live} />
      ) : (
        <Link to="/" className="text-muted hover:text-fg">
          Let me Claude that for you
        </Link>
      )}
    </main>
  );
}
