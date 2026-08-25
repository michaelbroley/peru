/**
 * Downloads the map tiles listed in tile-manifest.json into public/tiles/,
 * so the five maps work with no signal.
 *
 *   node scripts/plan-tiles.mjs    # only when the maps or their pins change
 *   npm run tiles                  # this
 *
 * Resumable and idempotent: a tile already on disk is left alone, so a run
 * that dies halfway can just be run again. Kept deliberately slow and serial-
 * ish — this is a courtesy CDN, ~300 tiles is a rounding error to them and
 * hammering it would be rude. The whole thing takes a couple of minutes.
 *
 * Attribution stays on the map either way: © OpenStreetMap contributors © CARTO.
 */
import { mkdirSync, writeFileSync, existsSync, statSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const manifest = JSON.parse(readFileSync(join(root, 'scripts/tile-manifest.json'), 'utf8'));
const outDir = join(root, 'public/tiles');

const SUBDOMAINS = ['a', 'b', 'c', 'd'];
const CONCURRENCY = 4;
const PAUSE_MS = 120;
const RETRIES = 3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A real PNG, not an error page or an empty body dressed up as one. */
function looksLikePng(buf) {
  return buf.length > 100 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
}

async function grab(tile, i) {
  const target = join(outDir, `${tile}.png`);
  if (existsSync(target) && statSync(target).size > 100) return { tile, skipped: true, bytes: statSync(target).size };

  const [z, x, y] = tile.split('/');
  const sub = SUBDOMAINS[i % SUBDOMAINS.length];
  const url = `https://${sub}.basemaps.cartocdn.com/light_all/${z}/${x}/${y}.png`;

  let last;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          // Say who this is. An anonymous scraper is what tile policies are for.
          'User-Agent': 'peru-field-guide/1.0 (personal offline trip guide; +https://broleyperu.netlify.app)',
          Accept: 'image/png,image/*',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (!looksLikePng(buf)) throw new Error(`not a PNG (${buf.length} bytes)`);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, buf);
      return { tile, bytes: buf.length };
    } catch (err) {
      last = err;
      if (attempt < RETRIES) await sleep(400 * attempt);
    }
  }
  return { tile, error: last?.message ?? 'failed' };
}

console.log(`${manifest.length} tiles → public/tiles/`);

let done = 0;
let fetched = 0;
let skipped = 0;
let bytes = 0;
const failed = [];

for (let i = 0; i < manifest.length; i += CONCURRENCY) {
  const batch = manifest.slice(i, i + CONCURRENCY);
  const results = await Promise.all(batch.map((t, n) => grab(t, i + n)));
  for (const r of results) {
    done += 1;
    if (r.error) failed.push(`${r.tile}: ${r.error}`);
    else {
      bytes += r.bytes;
      if (r.skipped) skipped += 1;
      else fetched += 1;
    }
  }
  if (done % 40 === 0 || done === manifest.length) {
    process.stdout.write(`\r  ${done}/${manifest.length}  ${(bytes / 1024 / 1024).toFixed(1)} MB`);
  }
  if (fetched > 0) await sleep(PAUSE_MS);
}
process.stdout.write('\n');

/* The service worker warms its cache from this, so it lists what is actually
   on disk rather than what was asked for — a tile that failed shouldn't be
   something the worker retries forever. */
const onDisk = manifest.filter((t) => existsSync(join(outDir, `${t}.png`)));
writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(onDisk)}\n`);

console.log(`  ${fetched} downloaded, ${skipped} already there, ${(bytes / 1024 / 1024).toFixed(1)} MB total`);
console.log(`  wrote public/tiles/manifest.json (${onDisk.length} tiles)`);
if (failed.length > 0) {
  console.error(`\n${failed.length} failed — run again to retry just those:`);
  for (const f of failed.slice(0, 10)) console.error(`  ${f}`);
  process.exit(1);
}
console.log('\nCommit public/tiles/ so the deployed guide has them too.');
