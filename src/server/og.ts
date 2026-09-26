import { Resvg } from "@resvg/resvg-js";

const W = 1200;
const H = 630;
export function renderOg(): ArrayBuffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#111318"/>
    <stop offset="1" stop-color="#252a35"/>
  </linearGradient>
  <radialGradient id="orb" cx="35%" cy="30%" r="70%">
    <stop offset="0" stop-color="#a9b7d0" stop-opacity=".9"/>
    <stop offset="1" stop-color="#59657b" stop-opacity=".25"/>
  </radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<circle cx="600" cy="315" r="205" fill="url(#orb)"/>
<circle cx="600" cy="315" r="244" fill="none" stroke="#b8c2d4" stroke-opacity=".16" stroke-width="2"/>
<circle cx="600" cy="315" r="286" fill="none" stroke="#b8c2d4" stroke-opacity=".08" stroke-width="2"/>
<circle cx="537" cy="250" r="24" fill="#edf1f7" fill-opacity=".7"/>
</svg>`;

  const png = new Resvg(svg).render().asPng();
  return png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer;
}
