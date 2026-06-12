// Generate a hexagon-dot world map for hero-section from Nimiq's real
// home-hero/map.svg (977x362, thousands of dot paths). We rasterize their map,
// then lay a flat-top hexagon grid over it and keep every hex whose
// neighborhood contains map ink — exact Nimiq continents, true hexagon dots.
// Output: a single <path> d attribute in globe coordinates (1200x800 viewBox,
// map placed at x=25 y=545, scale 1150/977).
import { readFile, writeFile } from 'node:fs/promises';

const SRC = process.argv[2] ?? '/tmp/nimiq-map.svg';
const OUT = process.argv[3] ?? '/tmp/hex-map-path.txt';

const MAP_W = 977, MAP_H = 362;
const SCALE = 1150 / 977;          // globe-space scale
const OX = 25, OY = 545;           // map origin in globe space
const R = 2.6;                     // hex circumradius (globe units) -> width 5.2
const DX = 6.2, DY = 7.2;          // grid pitch (globe units)
const WINDOW = 4;                  // ink-search radius in map px
const Y_MAX = 815;                 // skip rows below the visible viewport

const { chromium } = await import('playwright');
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: MAP_W, height: MAP_H } });
const svg = await readFile(SRC, 'utf8');
await page.setContent(`<body style="margin:0">${svg.replace('<svg ', `<svg width="${MAP_W}" height="${MAP_H}" `)}</body>`);
await page.waitForTimeout(300);
const data = await page.evaluate(async ([w, h]) => {
  const el = document.querySelector('svg');
  const xml = new XMLSerializer().serializeToString(el);
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
  await img.decode();
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  // pack alpha channel as 0/1 ink bytes
  const ink = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) ink[i] = d[i * 4 + 3] > 24 ? 1 : 0;
  return Array.from(ink);
}, [MAP_W, MAP_H]);
await b.close();

const ink = (x, y) => {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return 0;
  return data[y * MAP_W + x];
};
const hasInk = (mx, my) => {
  for (let dy = -WINDOW; dy <= WINDOW; dy += 2)
    for (let dx = -WINDOW; dx <= WINDOW; dx += 2)
      if (ink(mx + dx, my + dy)) return true;
  return false;
};

// flat-top hexagon as a compact relative subpath, centered at (x, y)
const hx = R, hy = R * Math.sqrt(3) / 2;
const f = n => +n.toFixed(1);
function hexAt(x, y) {
  return `M${f(x + hx)} ${f(y)}l${f(-hx / 2)} ${f(hy)}h${f(-hx)}l${f(-hx / 2)} ${f(-hy)}l${f(hx / 2)} ${f(-hy)}h${f(hx)}z`;
}

let d = '', count = 0;
let row = 0;
for (let gy = OY + 4; gy <= Y_MAX; gy += DY, row++) {
  const xOff = (row % 2) * (DX / 2);
  for (let gx = OX + 4 + xOff; gx <= OX + 1150 - 4; gx += DX) {
    const mx = (gx - OX) / SCALE, my = (gy - OY) / SCALE;
    if (hasInk(mx, my)) { d += hexAt(gx, gy); count++; }
  }
}
await writeFile(OUT, d);
console.log(`hexes: ${count}, path bytes: ${d.length}`);
