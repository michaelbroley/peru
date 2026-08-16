/**
 * Packs the llama's sprite sheet for the web.
 *
 * The handoff ships a 174 KB PNG master. Re-encoded as lossless WebP it is
 * 13 KB and byte-for-byte the same pixels — verified, not assumed: the script
 * decodes both and compares the raw buffers before writing. Nothing is
 * resampled, recut or recoloured, which the handoff asks for explicitly.
 *
 *   node scripts/pack-llama.mjs
 */
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';

const SOURCE = new URL('../src/silly_virtual_llama/sprites/chaska-master-4x.png', import.meta.url).pathname;
const TARGET = new URL('../public/llama/chaska-4x.webp', import.meta.url).pathname;

const packed = await sharp(SOURCE).webp({ lossless: true, effort: 6 }).toBuffer();

const before = await sharp(SOURCE).ensureAlpha().raw().toBuffer();
const after = await sharp(packed).ensureAlpha().raw().toBuffer();
if (before.length !== after.length || !before.equals(after)) {
  throw new Error('lossless round-trip changed the pixels — not writing');
}

writeFileSync(TARGET, packed);

const meta = await sharp(packed).metadata();
console.log(
  `wrote public/llama/chaska-4x.webp — ${meta.width}×${meta.height}, ` +
    `${(packed.length / 1024).toFixed(0)} KB, pixels identical to the PNG master`,
);
