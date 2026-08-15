/**
 * Generates the PWA icons and the OG image from the design's mark —
 * the pink field, ink cordillera, gold sun and the two rule bars.
 *
 * Rendered here rather than committed as opaque binaries so the marks stay
 * editable: change the palette or the geometry below and re-run
 * `node scripts/generate-icons.mjs`. No image dependencies.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

const INK = [0x12, 0x10, 0x0f];
const CREAM = [0xff, 0xfb, 0xf5];
const PINK = [0xe4, 0x00, 0x7c];
const GOLD = [0xff, 0xc3, 0x00];

/** Supersampling factor — drawn big, boxed down, so edges are smooth. */
const SS = 4;

/* ── Tiny raster surface ────────────────────────────────────────────────── */

function createSurface(width, height, background) {
  const pixels = new Uint8Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    pixels[i * 3] = background[0];
    pixels[i * 3 + 1] = background[1];
    pixels[i * 3 + 2] = background[2];
  }
  return { width, height, pixels };
}

function setPixel(surface, x, y, colour) {
  if (x < 0 || y < 0 || x >= surface.width || y >= surface.height) return;
  const i = (y * surface.width + x) * 3;
  surface.pixels[i] = colour[0];
  surface.pixels[i + 1] = colour[1];
  surface.pixels[i + 2] = colour[2];
}

function fillRect(surface, x, y, w, h, colour) {
  for (let py = Math.round(y); py < Math.round(y + h); py++) {
    for (let px = Math.round(x); px < Math.round(x + w); px++) setPixel(surface, px, py, colour);
  }
}

function fillCircle(surface, cx, cy, r, colour) {
  const r2 = r * r;
  for (let py = Math.floor(cy - r); py <= Math.ceil(cy + r); py++) {
    for (let px = Math.floor(cx - r); px <= Math.ceil(cx + r); px++) {
      const dx = px + 0.5 - cx;
      const dy = py + 0.5 - cy;
      if (dx * dx + dy * dy <= r2) setPixel(surface, px, py, colour);
    }
  }
}

/** Even-odd scanline polygon fill. */
function fillPolygon(surface, points, colour) {
  const ys = points.map((p) => p[1]);
  const top = Math.max(0, Math.floor(Math.min(...ys)));
  const bottom = Math.min(surface.height - 1, Math.ceil(Math.max(...ys)));

  for (let y = top; y <= bottom; y++) {
    const sampleY = y + 0.5;
    const crossings = [];
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      if (y1 === y2) continue;
      if (sampleY >= Math.min(y1, y2) && sampleY < Math.max(y1, y2)) {
        crossings.push(x1 + ((sampleY - y1) / (y2 - y1)) * (x2 - x1));
      }
    }
    crossings.sort((a, b) => a - b);
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      for (let x = Math.round(crossings[i]); x < Math.round(crossings[i + 1]); x++) setPixel(surface, x, y, colour);
    }
  }
}

/** Box-downsample by SS to get anti-aliased edges. */
function downsample(surface, factor) {
  const width = surface.width / factor;
  const height = surface.height / factor;
  const out = createSurface(width, height, [0, 0, 0]);
  const samples = factor * factor;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < factor; sy++) {
        for (let sx = 0; sx < factor; sx++) {
          const i = ((y * factor + sy) * surface.width + (x * factor + sx)) * 3;
          r += surface.pixels[i];
          g += surface.pixels[i + 1];
          b += surface.pixels[i + 2];
        }
      }
      const i = (y * width + x) * 3;
      out.pixels[i] = Math.round(r / samples);
      out.pixels[i + 1] = Math.round(g / samples);
      out.pixels[i + 2] = Math.round(b / samples);
    }
  }
  return out;
}

/* ── PNG encoding ───────────────────────────────────────────────────────── */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(surface) {
  const { width, height, pixels } = surface;
  const stride = width * 3;
  // One filter byte (0 = none) per scanline.
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(pixels.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ── The mark ───────────────────────────────────────────────────────────── */

/**
 * Draws the mark into a square, in a 0–100 unit space scaled by `unit`.
 * `inset` shrinks and centres it — used for the maskable safe zone.
 */
function drawMark(surface, size, inset = 0) {
  const scale = (size * (1 - inset * 2)) / 100;
  const offset = size * inset;
  const u = (value) => offset + value * scale;

  fillPolygon(
    surface,
    [
      [u(10), u(76)],
      [u(34), u(30)],
      [u(48), u(52)],
      [u(70), u(18)],
      [u(92), u(76)],
    ],
    INK,
  );
  fillCircle(surface, u(70), u(18), 6 * scale, GOLD);
  fillRect(surface, u(10), u(83), 82 * scale, 5 * scale, CREAM);
  fillRect(surface, u(10), u(91), 48 * scale, 5 * scale, GOLD);
}

function writeIcon(name, size, inset = 0) {
  const surface = createSurface(size * SS, size * SS, PINK);
  drawMark(surface, size * SS, inset);
  writeFileSync(resolve(OUT, name), encodePng(downsample(surface, SS)));
  console.log(`wrote icons/${name} (${size}×${size})`);
}

function writeOgImage() {
  const width = 1200;
  const height = 630;
  const surface = createSurface(width * SS, height * SS, PINK);
  const s = SS;
  // Same mark, laid out landscape with the bars running as a wordmark rule.
  const scale = (height * 0.62) / 100;
  const ox = width * 0.5 * s;
  const oy = height * 0.18 * s;
  const u = (x, y) => [ox + (x - 50) * scale * s, oy + y * scale * s];

  fillPolygon(surface, [u(10, 76), u(34, 30), u(48, 52), u(70, 18), u(92, 76)], INK);
  fillCircle(surface, ...u(70, 18), 6 * scale * s, GOLD);
  fillRect(surface, ...u(10, 83), 82 * scale * s, 5 * scale * s, CREAM);
  fillRect(surface, ...u(10, 91), 48 * scale * s, 5 * scale * s, GOLD);

  writeFileSync(resolve(OUT, 'og.png'), encodePng(downsample(surface, SS)));
  console.log('wrote icons/og.png (1200×630)');
}

mkdirSync(OUT, { recursive: true });
writeIcon('icon-192.png', 192);
writeIcon('icon-512.png', 512);
writeIcon('icon-180.png', 180);
// Maskable icons get cropped to a circle on some launchers — keep the mark
// inside the inner 80% safe zone.
writeIcon('icon-maskable-512.png', 512, 0.12);
writeOgImage();
