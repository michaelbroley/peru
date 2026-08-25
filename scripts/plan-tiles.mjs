/**
 * Works out exactly which map tiles the guide needs, and writes the list to
 * scripts/tile-manifest.json for `fetch-tiles.mjs` to download.
 *
 * It doesn't guess at zoom levels or bounding boxes. It drives the real page
 * in a real browser at three widths, visits every map, works the zoom control
 * two steps in and three out, and records every tile Leaflet asks for. Tiles
 * are stubbed as successful, because a map that never paints one behaves
 * differently on zoom and the list would be short.
 *
 *   npm run preview          # in another shell
 *   node scripts/plan-tiles.mjs
 *
 * Then a one-tile ring is added around the city zooms, so a small pan doesn't
 * immediately hit a hole. Not at the wide zooms — those already cover Peru and
 * a good deal of the Pacific, and ringing them triples the download for a view
 * nobody needs.
 */
import { writeFileSync } from 'node:fs';
import { chromium } from '../node_modules/playwright-core/index.mjs';

const URL_ = process.env.PERU_URL ?? 'http://localhost:4321/';
const OUT = new URL('./tile-manifest.json', import.meta.url).pathname;

/** Below this, the fitted view is already most of a continent. */
const RING_FROM_ZOOM = 12;

const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const tiles = new Set();

for (const [tag, width, height] of [
  ['phone', 390, 844],
  ['desktop', 1440, 1000],
  ['wide', 1920, 1200],
]) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  /* Both shapes: the layer asks /tiles/ first and only reaches for the CDN
     when that misses, so a run with tiles already on disk would otherwise
     record nothing. */
  page.on('request', (r) => {
    const m = r.url().match(/(?:light_all|\/tiles)\/(\d+)\/(\d+)\/(\d+)(?:@2x)?\.png/);
    if (m) tiles.add(`${m[1]}/${m[2]}/${m[3]}`);
  });
  /* A regex, not a glob: the host is `b.basemaps.cartocdn.com`, so a
     `**\/basemaps.cartocdn.com/**` pattern has no `/` to match before the
     name and silently never fires. */
  await page.route(/basemaps\.cartocdn\.com/, (r) =>
    r.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }),
  );
  await page.route('**/open.er-api.com/**', (r) => r.abort());

  await page.goto(URL_, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
  await page.waitForTimeout(500);

  const count = await page.evaluate(() => document.querySelectorAll('[data-map]').length);
  if (count === 0) throw new Error('no maps found — is the preview server serving the built site?');

  for (let i = 0; i < count; i++) {
    await page.evaluate((n) => document.querySelectorAll('[data-map]')[n].scrollIntoView({ block: 'center' }), i);
    await page.waitForTimeout(1800);
    for (const dir of ['in', 'in', 'out', 'out', 'out']) {
      await page.evaluate(
        ([n, d]) => {
          const el = document.querySelectorAll('[data-map]')[n];
          const cls = d === 'in' ? '.leaflet-control-zoom-in' : '.leaflet-control-zoom-out';
          el.querySelector(cls)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        },
        [i, dir],
      );
      await page.waitForTimeout(900);
    }
  }
  console.log(`  ${tag.padEnd(8)} ${tiles.size} tiles so far`);
  await ctx.close();
}
await browser.close();

const seen = tiles.size;
for (const t of [...tiles]) {
  const [z, x, y] = t.split('/').map(Number);
  if (z < RING_FROM_ZOOM) continue;
  const span = 2 ** z;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const [nx, ny] = [x + dx, y + dy];
      if (nx >= 0 && ny >= 0 && nx < span && ny < span) tiles.add(`${z}/${nx}/${ny}`);
    }
  }
}

const list = [...tiles].sort((a, b) => {
  const A = a.split('/').map(Number);
  const B = b.split('/').map(Number);
  return A[0] - B[0] || A[1] - B[1] || A[2] - B[2];
});
writeFileSync(OUT, `${JSON.stringify(list, null, 0).replace(/","/g, '",\n"')}\n`);

const byZoom = {};
for (const t of list) byZoom[t.split('/')[0]] = (byZoom[t.split('/')[0]] ?? 0) + 1;
console.log(`\nwrote scripts/tile-manifest.json`);
console.log(`  ${seen} requested + ${list.length - seen} for pan tolerance = ${list.length} tiles`);
console.log(`  by zoom: ${JSON.stringify(byZoom)}`);
console.log(`  roughly ${((list.length * 12) / 1024).toFixed(1)} MB to download`);
