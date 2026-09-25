import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const require = createRequire(import.meta.url);
const fontPath = require.resolve("@fontsource/geist-mono/files/geist-mono-latin-400-normal.woff");

export async function renderOg(q: string): Promise<ArrayBuffer> {
  const font = await readFile(fontPath);
  const text = q.length > 220 ? q.slice(0, 220) + "…" : q;
  const size = text.length > 120 ? 36 : text.length > 60 ? 44 : 54;

  const svg = await satori(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        background: "#0a0a0b",
        color: "#e8e6e3",
        padding: "80px 96px",
        fontSize: size,
        lineHeight: 1.35,
        fontFamily: "Geist Mono",
      }}
    >
      <span style={{ color: "#8b8b90", marginRight: 24 }}>&gt;</span>
      <span style={{ flex: 1 }}>{text}</span>
    </div>,
    { width: 1200, height: 630, fonts: [{ name: "Geist Mono", data: font, weight: 400, style: "normal" }] },
  );
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
  return png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer;
}
