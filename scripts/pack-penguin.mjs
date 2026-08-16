/**
 * Packs Pancho the penguin's strips into one sheet.
 *
 * Same shape as the llama's: 40 × 40 logical frames exported at 4×, one row
 * per animation, ground line on y 38 so the two stand on the same floor.
 * Lossless WebP, and every row is decoded back out of the packed sheet and
 * compared against its source before anything is written — nothing is
 * resampled, recut or recoloured.
 *
 * `penguin-idle.png` is byte-identical to `penguin-walk.png`, so it isn't
 * packed twice: standing about is the walk row at a slower frame rate with no
 * travel, which reads as shifting his weight. If a distinct idle ever lands,
 * add it here and in src/lib/penguin.ts.
 *
 *   node scripts/pack-penguin.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

const dir = new URL('../src/silly_virtual_llama/sprites/', import.meta.url).pathname;
const outDir = new URL('../public/llama/', import.meta.url).pathname;
const TARGET = `${outDir}pancho-4x.webp`;

const CELL = 160;

/** Row order. Keep in step with src/lib/penguin.ts. */
const ROWS = [
  { id: 'walk', file: 'penguin-walk.png', frames: 6 },
  { id: 'slide', file: 'penguin-slide.png', frames: 6 },
  { id: 'eat', file: 'penguin-eat-fish.png', frames: 8 },
];

const columns = Math.max(...ROWS.map((r) => r.frames));
const width = columns * CELL;
const height = ROWS.length * CELL;

const composites = [];
for (const [i, row] of ROWS.entries()) {
  const meta = await sharp(`${dir}${row.file}`).metadata();
  if (meta.width !== row.frames * CELL || meta.height !== CELL) {
    throw new Error(`${row.file} is ${meta.width}×${meta.height}, expected ${row.frames * CELL}×${CELL}`);
  }
  // Short rows keep transparent cells on the right; frame counts come from
  // src/lib/penguin.ts, never from the sheet width.
  composites.push({ input: `${dir}${row.file}`, top: i * CELL, left: 0 });
}

const packed = await sharp({
  create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite(composites)
  .webp({ lossless: true, effort: 6 })
  .toBuffer();

const out = await sharp(packed).ensureAlpha().raw().toBuffer();
const stride = width * 4;
for (const [i, row] of ROWS.entries()) {
  const src = await sharp(`${dir}${row.file}`).ensureAlpha().raw().toBuffer();
  const srcWidth = row.frames * CELL;
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < srcWidth; x++) {
      const a = (y * srcWidth + x) * 4;
      const b = (i * CELL + y) * stride + x * 4;
      for (let c = 0; c < 4; c++) {
        if (src[a + c] !== out[b + c]) throw new Error(`${row.id} changed at ${x},${y} — not writing`);
      }
    }
  }
}

mkdirSync(outDir, { recursive: true });
writeFileSync(TARGET, packed);
console.log(
  `wrote public/llama/pancho-4x.webp — ${width}×${height} (${ROWS.length} rows × ${columns}), ` +
    `${(packed.length / 1024).toFixed(1)} KB, every row identical to its source`,
);
