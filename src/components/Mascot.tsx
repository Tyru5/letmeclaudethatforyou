import { useEffect, useState } from "react";

// Clawd, as Claude Code draws it in the terminal, on a quadrant-block grid (18 x 6 units):
//    ▐▛███▜▌      head row, eyes are the two missing quadrants
//   ▝▜█████▛▘     shoulders, rounded underneath
//     ▘▘ ▝▝       four feet
// Terminal cells are ~1:2, so a unit is 1 wide by 2 tall.
const ORANGE = "#DD775B";

function Clawd() {
  return (
    <svg viewBox="0 0 18 6" preserveAspectRatio="none" shapeRendering="crispEdges">
      <g className="mascot-legs" fill={ORANGE}>
        <rect x="4" y="4" width="1" height="1" />
        <rect x="6" y="4" width="1" height="1" />
        <rect x="11" y="4" width="1" height="1" />
        <rect x="13" y="4" width="1" height="1" />
      </g>
      <g className="mascot-body" fill={ORANGE}>
        <rect x="3" y="0" width="12" height="2" />
        <rect x="1" y="2" width="16" height="1" />
        <rect x="3" y="3" width="12" height="1" />
        <g className="mascot-eyes" fill="#0a0a0b">
          <rect x="5" y="1" width="1" height="1" />
          <rect x="12" y="1" width="1" height="1" />
        </g>
      </g>
    </svg>
  );
}

export function PeekingMascot() {
  return (
    <span className="peeking-mascot" aria-hidden>
      <Clawd />
    </span>
  );
}

/** Hops in bottom-left, bounces diagonally across, exits top-right. Unmounts itself when done. */
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
      <div className="mascot-hop">
        <Clawd />
      </div>
    </div>
  );
}
