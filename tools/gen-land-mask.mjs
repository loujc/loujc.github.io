// Regenerates the land masks inlined at the end of script.js for the dot-matrix footprint map.
// Land = Natural Earth 1:50m (public domain, via world-atlas), sampled on a Mercator-space lattice.
// No borders are ever drawn — only land dots.
//
// usage (outside the repo is fine):
//   npm i --no-save world-atlas@2 topojson-client@3
//   node tools/gen-land-mask.mjs world    # → window.LAND_MASK   (Europe–East Asia, 0.5°)
//   node tools/gen-land-mask.mjs europe   # → window.LAND_DETAIL (Europe detail, 0.125°)
// then replace the matching line at the end of script.js with the output.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { feature } from "topojson-client";

const PRESETS = {
  world: {
    name: "LAND_MASK", list: false, step: 0.5, x0: -15, x1: 155, yTop: 88, yBot: -12.5,
    comment: "// Land mask for the footprint map: Natural Earth 1:50m land (public domain) sampled on a",
  },
  europe: {
    name: "LAND_DETAIL", list: true, step: 0.125, x0: -14, x1: 30, yTop: 77.25, yBot: 40.875,
    comment: "// Europe detail layer for the footprint map (0.125° lattice): Natural Earth 1:50m land (public domain) on a",
  },
};
const preset = PRESETS[process.argv[2]];
if (!preset) {
  console.error(`usage: node tools/gen-land-mask.mjs ${Object.keys(PRESETS).join("|")}`);
  process.exit(1);
}

const require = createRequire(import.meta.url);
const topo = JSON.parse(readFileSync(require.resolve("world-atlas/land-50m.json"), "utf8"));
const land = feature(topo, topo.objects.land);
const polys = [];
for (const f of land.features ?? [land]) {
  const g = f.geometry;
  for (const rings of g.type === "Polygon" ? [g.coordinates] : g.coordinates) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of rings[0]) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    polys.push({ rings, minX, minY, maxX, maxY });
  }
}
const inRing = (ring, x, y) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const isLand = (lon, lat) => {
  for (const p of polys) {
    if (lon < p.minX || lon > p.maxX || lat < p.minY || lat > p.maxY) continue;
    let inside = false;
    for (const ring of p.rings) if (inRing(ring, lon, lat)) inside = !inside;
    if (inside) return true;
  }
  return false;
};

// lattice in Mercator units (x = lon, y = Mercator y in degrees); a cell is land when ≥ 3 of 9 sub-samples are
const DEG = Math.PI / 180;
const invMercY = (y) => (2 * Math.atan(Math.exp(y * DEG)) - Math.PI / 2) / DEG;
const { step, x0, x1, yTop, yBot } = preset;
const cols = Math.round((x1 - x0) / step) + 1;
const rows = Math.round((yTop - yBot) / step) + 1;
const bits = new Uint8Array(Math.ceil((cols * rows) / 8));
const SUB = [-1 / 3, 0, 1 / 3];
for (let j = 0; j < rows; j++) {
  const y = yTop - j * step;
  for (let i = 0; i < cols; i++) {
    const x = x0 + i * step;
    let hits = 0;
    for (const dy of SUB) for (const dx of SUB) if (isLand(x + dx * step, invMercY(y + dy * step))) hits++;
    if (hits >= 3) {
      const k = j * cols + i;
      bits[k >> 3] |= 1 << (k & 7);
    }
  }
}
const body = `{ x0: ${x0}, yTop: ${yTop}, step: ${step}, cols: ${cols}, rows: ${rows}, bits: "${Buffer.from(bits).toString("base64")}" }`;
console.log(`${preset.comment}
// Mercator-space lattice. Generated offline; no borders are drawn, only land dots.
window.${preset.name} = ${preset.list ? `[${body}]` : body};`);
