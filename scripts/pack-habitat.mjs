/**
 * Packs the habitat's backdrops.
 *
 * These are pixel art, so they go through lossless WebP at full resolution —
 * 2356 × 982 for about 6 KB each, because a limited palette and dithered
 * gradients are exactly what lossless compresses well. Quality-92 lossy is
 * *thirty times* bigger and softens every edge, which is the one thing pixel
 * art can't survive. Don't be tempted.
 *
 * They land in public/ under stable names rather than going through
 * astro:assets, so the service worker can precache them by path.
 *
 *   node scripts/pack-habitat.mjs
 */
import { writeFileSync, mkdirSync, statSync } from 'node:fs';
import sharp from 'sharp';

const dir = new URL('../src/images/', import.meta.url).pathname;
const outDir = new URL('../public/habitat/', import.meta.url).pathname;

/** Keep in step with HABITAT_BACKDROPS in src/lib/habitat.ts. */
const BACKDROPS = ['backdrop1', 'backdrop2', 'backdrop3', 'backdrop4'];

mkdirSync(outDir, { recursive: true });

let before = 0;
let after = 0;
for (const name of BACKDROPS) {
  const source = `${dir}${name}.png`;
  const packed = await sharp(source).webp({ lossless: true, effort: 6 }).toBuffer();

  // Same check the sprite packers make: the pixels have to survive.
  const a = await sharp(source).ensureAlpha().raw().toBuffer();
  const b = await sharp(packed).ensureAlpha().raw().toBuffer();
  if (a.length !== b.length || !a.equals(b)) throw new Error(`${name}: lossless round-trip changed the pixels`);

  writeFileSync(`${outDir}${name}.webp`, packed);
  const meta = await sharp(packed).metadata();
  before += statSync(source).size;
  after += packed.length;
  console.log(`${name}.png → ${name}.webp  ${meta.width}×${meta.height}  ${(packed.length / 1024).toFixed(1)} KB`);
}

console.log(`${BACKDROPS.length} backdrops: ${(before / 1024).toFixed(0)} KB → ${(after / 1024).toFixed(0)} KB`);
