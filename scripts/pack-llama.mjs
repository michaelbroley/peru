/**
 * Packs the llama's sprite sheet for the web.
 *
 * The handoff ships a 174 KB PNG master of seventeen animations. Two more
 * arrived later as loose strips, so this stacks them under the master and
 * re-encodes the lot as lossless WebP — 17 KB, and byte-for-byte the same
 * pixels. That's verified rather than assumed: every row is decoded back out
 * of the packed sheet and compared against its source before anything is
 * written. Nothing is resampled, recut or recoloured, which the handoff asks
 * for explicitly.
 *
 *   node scripts/pack-llama.mjs
 */
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';

const dir = new URL('../src/silly_virtual_llama/sprites/', import.meta.url).pathname;
const TARGET = new URL('../public/llama/chaska-4x.webp', import.meta.url).pathname;

const CELL = 160;
const COLUMNS = 8;
const MASTER_ROWS = 17;

/** Appended under the master, in this order. Keep in step with src/lib/llama.ts. */
const EXTRA = [
  { id: 'moonwalk', file: 'chaska-moonwalk@4x.png', frames: 8 },
  { id: 'sleep', file: 'chaska-sleep@4x.png', frames: 6 },
];

const rows = MASTER_ROWS + EXTRA.length;
const width = COLUMNS * CELL;
const height = rows * CELL;

const master = await sharp(`${dir}chaska-master-4x.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
if (master.info.width !== width || master.info.height !== MASTER_ROWS * CELL) {
  throw new Error(`master is ${master.info.width}×${master.info.height}, expected ${width}×${MASTER_ROWS * CELL}`);
}

const composites = [{ input: `${dir}chaska-master-4x.png`, top: 0, left: 0 }];
for (const [i, extra] of EXTRA.entries()) {
  const meta = await sharp(`${dir}${extra.file}`).metadata();
  if (meta.width !== extra.frames * CELL || meta.height !== CELL) {
    throw new Error(`${extra.file} is ${meta.width}×${meta.height}, expected ${extra.frames * CELL}×${CELL}`);
  }
  // Short rows keep transparent cells on the right; frame counts come from
  // src/lib/llama.ts, never from the sheet width.
  composites.push({ input: `${dir}${extra.file}`, top: (MASTER_ROWS + i) * CELL, left: 0 });
}

const packed = await sharp({
  create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite(composites)
  .webp({ lossless: true, effort: 6 })
  .toBuffer();

/** Decode the packed sheet and check every source row survived untouched. */
const out = await sharp(packed).ensureAlpha().raw().toBuffer();
const stride = width * 4;

function compare(source, rowIndex, sourceWidth) {
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < sourceWidth; x++) {
      const a = (y * sourceWidth + x) * 4;
      const b = (rowIndex + y) * stride + x * 4;
      for (let c = 0; c < 4; c++) {
        if (source[a + c] !== out[b + c]) {
          throw new Error(`pixel changed at row ${rowIndex / CELL + y / CELL}, ${x},${y} — not writing`);
        }
      }
    }
  }
}

for (let row = 0; row < MASTER_ROWS; row++) {
  const slice = master.data.subarray(row * CELL * stride, (row + 1) * CELL * stride);
  compare(slice, row * CELL, width);
}
for (const [i, extra] of EXTRA.entries()) {
  const src = await sharp(`${dir}${extra.file}`).ensureAlpha().raw().toBuffer();
  compare(src, (MASTER_ROWS + i) * CELL, extra.frames * CELL);
}

writeFileSync(TARGET, packed);
console.log(
  `wrote public/llama/chaska-4x.webp — ${width}×${height} (${rows} rows), ` +
    `${(packed.length / 1024).toFixed(0)} KB, every row identical to its source`,
);
