import { useEffect, useState } from "react";

/** Hops in from the left edge, bounces across, exits right. Unmounts itself when done. */
export default function Mascot({ play, delay = 0 }: { play: boolean; delay?: number }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!play || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setOn(true), delay);
    return () => clearTimeout(t);
  }, [play, delay]);

  if (!on) return null;
  return (
    <div
      className="mascot"
      aria-hidden
      onAnimationEnd={(e) => {
        if (e.animationName === "mascot-run") setOn(false);
      }}
    >
      <div className="mascot-shadow" />
      <div className="mascot-hop">
        <svg width="56" height="56" viewBox="0 0 64 64">
          <rect className="mascot-leg" x="17" y="48" width="9" height="10" rx="4" fill="#d97757" />
          <rect className="mascot-leg mascot-leg-r" x="38" y="48" width="9" height="10" rx="4" fill="#d97757" />
          <rect x="8" y="10" width="48" height="42" rx="13" fill="#d97757" />
          <g className="mascot-eyes">
            <rect x="22" y="24" width="6" height="12" rx="3" fill="#0a0a0b" />
            <rect x="36" y="24" width="6" height="12" rx="3" fill="#0a0a0b" />
          </g>
        </svg>
      </div>
    </div>
  );
}
