/**
 * Packs the choque — the crash the llama and the penguin have when they walk
 * into each other.
 *
 * It's the one sprite that isn't a single character: an 80 × 40 logical cell
 * with both of them in it, composed llama-left and penguin-right. Ten frames:
 * they close, collide, disappear into a dust cloud, and come out having swapped
 * sides. Mirroring the whole cell gives the other arrangement — penguin-left,
 * llama-right — and the swap and the exits both survive the flip, so one strip
 * covers either approach.
 *
 * Lossless WebP, verified pixel-for-pixel before writing, same as the others.
 *
 *   node scripts/pack-choque.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

const SOURCE = new URL('../src/silly_virtual_llama/sprites/chaska-crash@4x.png', import.meta.url).pathname;
const outDir = new URL('../public/llama/', import.meta.url).pathname;
const TARGET = `${outDir}choque-4x.webp`;

/** Double-width cell: two 40px characters side by side. */
const CELL_W = 320;
const CELL_H = 160;
const FRAMES = 10;

const meta = await sharp(SOURCE).metadata();
if (meta.width !== FRAMES * CELL_W || meta.height !== CELL_H) {
  throw new Error(`crash strip is ${meta.width}×${meta.height}, expected ${FRAMES * CELL_W}×${CELL_H}`);
}

const packed = await sharp(SOURCE).webp({ lossless: true, effort: 6 }).toBuffer();

const before = await sharp(SOURCE).ensureAlpha().raw().toBuffer();
const after = await sharp(packed).ensureAlpha().raw().toBuffer();
if (before.length !== after.length || !before.equals(after)) {
  throw new Error('lossless round-trip changed the pixels — not writing');
}

mkdirSync(outDir, { recursive: true });
writeFileSync(TARGET, packed);
console.log(
  `wrote public/llama/choque-4x.webp — ${meta.width}×${meta.height} (${FRAMES} frames of ${CELL_W}×${CELL_H}), ` +
    `${(packed.length / 1024).toFixed(1)} KB, pixels identical to the source`,
);
