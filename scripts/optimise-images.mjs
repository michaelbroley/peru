/**
 * Converts the photographs in src/images to WebP masters.
 *
 * The originals are 3–24 MB camera files, several carrying GPS EXIF. This
 * strips all metadata, applies the EXIF orientation before doing so, caps the
 * long edge, and writes WebP alongside. Astro then generates the actual
 * responsive sizes from these masters at build time.
 *
 *   node scripts/optimise-images.mjs           # convert, keep originals
 *   node scripts/optimise-images.mjs --replace # convert and delete the JPGs
 */
import { readdir, stat, unlink } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import sharp from 'sharp';

const DIR = new URL('../src/images/', import.meta.url).pathname;

/** Wide enough for the largest band (1320 px) on a 2× screen, with headroom. */
const MAX_WIDTH = 2400;
const QUALITY = 82;

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

/** Filesystem-friendly: no spaces, no parentheses, lowercase. */
function tidyName(file) {
  return basename(file, extname(file))
    .toLowerCase()
    .replace(/\((\d+)\)/g, '-$1')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Not every image in here is a photograph.
 *
 * The habitat's backdrops are pixel art, and `pack-habitat.mjs` reads these
 * PNGs as its source. Running them through a quality-82 resample would soften
 * every edge, and `--replace` would then delete the only copy. Lossless is
 * what pixel art wants; that's the packer's job, not this one's.
 */
const NOT_PHOTOGRAPHS = /^backdrop\d+\.png$/i;

const replace = process.argv.includes('--replace');
const files = (await readdir(DIR))
  .filter((f) => /\.(jpe?g|png)$/i.test(f) && !NOT_PHOTOGRAPHS.test(f))
  .sort();

let before = 0;
let after = 0;

for (const file of files) {
  const source = join(DIR, file);
  const target = join(DIR, `${tidyName(file)}.webp`);
  const originalSize = (await stat(source)).size;

  const info = await sharp(source)
    // Honour the EXIF orientation before metadata is dropped, or portrait
    // shots come out sideways.
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 6 })
    .toFile(target);

  before += originalSize;
  after += info.size;
  console.log(
    `${file}\n  → ${basename(target)}  ${mb(originalSize)} → ${kb(info.size)}  (${info.width}×${info.height})`,
  );

  if (replace) await unlink(source);
}

console.log(`\n${files.length} images: ${mb(before)} → ${mb(after)} (${((1 - after / before) * 100).toFixed(1)}% smaller)`);
if (!replace) console.log('Originals kept. Re-run with --replace to remove them.');
