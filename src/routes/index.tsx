import { createFileRoute } from "@tanstack/react-router";
import Generator from "@/components/Generator";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        name: "description",
        content:
          "For all those people who find it more convenient to bother you with their question rather than ask the agent themselves.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 gap-10">
      <header className="text-center max-w-xl">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
          Let me <span className="text-accent">Claude</span> that for you
        </h1>
        <p className="mt-4 text-muted">
          For all those people who find it more convenient to bother you with their question
          rather than ask the agent themselves.
        </p>
      </header>
      <Generator />
    </main>
  );
}
