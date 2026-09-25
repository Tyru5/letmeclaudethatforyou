import { existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
// inlined as a data URL at build time so nothing has to be file-traced at runtime;
// resvg only takes font *paths*, so it's written to tmp once per process.
import fontDataUrl from "./fonts/GeistMono-Regular.ttf?inline";

let fontPath: string | null = null;
function fontFile(): string {
  if (!fontPath) {
    const p = join(tmpdir(), "GeistMono-Regular.ttf");
    if (!existsSync(p)) writeFileSync(p, Buffer.from(fontDataUrl.slice(fontDataUrl.indexOf(",") + 1), "base64"));
    fontPath = p;
  }
  return fontPath;
}

const W = 1200;
const H = 630;
const PAD = 96;
const CHAR = 0.6; // monospace advance, em

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const lines: string[] = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const last = lines[lines.length - 1];
    if (last !== undefined && last.length + 1 + word.length <= maxChars) lines[lines.length - 1] = `${last} ${word}`;
    else if (word.length <= maxChars) lines.push(word);
    else for (let i = 0; i < word.length; i += maxChars) lines.push(word.slice(i, i + maxChars));
  }
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].slice(0, maxChars - 1) + "…";
  }
  return lines;
}

export function renderOg(q: string): ArrayBuffer {
  const text = q.length > 220 ? q.slice(0, 220) + "…" : q;
  const size = text.length > 120 ? 36 : text.length > 60 ? 44 : 54;
  const lineH = size * 1.35;
  const promptW = size * CHAR * 2; // "> " plus gap
  const x = PAD + promptW;
  const maxChars = Math.floor((W - PAD * 2 - promptW) / (size * CHAR));
  const lines = wrap(text, maxChars, Math.floor((H - PAD * 2) / lineH));
  const top = H / 2 - ((lines.length - 1) * lineH) / 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="#0a0a0b"/>
<g font-family="Geist Mono" font-size="${size}" dominant-baseline="middle">
<text x="${PAD}" y="${top}" fill="#8b8b90">&gt;</text>
${lines.map((l, i) => `<text x="${x}" y="${top + i * lineH}" fill="#e8e6e3" xml:space="preserve">${esc(l)}</text>`).join("\n")}
</g>
</svg>`;

  const png = new Resvg(svg, { font: { fontFiles: [fontFile()], loadSystemFonts: false, defaultFontFamily: "Geist Mono" } })
    .render()
    .asPng();
  return png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer;
}
