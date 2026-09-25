import type { ReactNode } from "react";

export default function Terminal({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="relative w-full rounded-lg border border-line bg-elev overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line">
        <span className="size-3 rounded-full bg-[#ff5f57]" />
        <span className="size-3 rounded-full bg-[#febc2e]" />
        <span className="size-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-xs text-muted font-mono truncate">{title}</span>
      </div>
      <div className="p-4 sm:p-5 font-mono text-[13px] sm:text-sm leading-relaxed min-h-[220px] whitespace-pre-wrap break-words">
        {children}
      </div>
    </div>
  );
}
