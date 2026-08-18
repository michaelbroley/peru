/**
 * Bundles every scrap of content in the guide into one JSON file.
 *
 * The site reads a dozen typed collections and derives a few things at build
 * time (the region grouping, the section order, the cover manifest). Anything
 * rebuilding this content elsewhere — a native app, a widget, a print job —
 * wants all of that in one place rather than having to re-derive it, so this
 * flattens the lot and says where each piece came from.
 *
 *   node scripts/export-bundle.mjs [outfile]
 *
 * It is a read-only export: nothing here is a source of truth, and re-running
 * it after any content edit reproduces the file exactly.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const content = join(root, 'src/content');
const out = process.argv[2] ?? join(root, 'peru-guide.json');

const read = (p) => JSON.parse(readFileSync(join(content, p), 'utf8'));
const one = (p) => read(p)[0];

/* --- the days, in trip order ------------------------------------------- */
const days = readdirSync(join(content, 'days'))
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(content, 'days', f), 'utf8')))
  .sort((a, b) => a.order - b.order);

const trip = one('trip.json');
const currency = one('currency.json');
const categories = read('categories.json').sort((a, b) => a.order - b.order);
const places = read('places.json').sort((a, b) => a.order - b.order);
const weather = read('weather.json').sort((a, b) => a.order - b.order);
const packing = read('packing.json').sort((a, b) => a.order - b.order);
const phrases = read('phrases.json').sort((a, b) => a.order - b.order);
const tipping = read('tipping.json').sort((a, b) => a.order - b.order);
const maps = read('maps.json').sort((a, b) => a.order - b.order);

/* --- the cover manifest, parsed out of the TypeScript -------------------
   covers.ts is code rather than content, but the alt text and the crop focus
   in it are content by any other name, and an app rebuilding these screens
   needs both plus the actual filename. */
const coversSrc = readFileSync(join(root, 'src/lib/covers.ts'), 'utf8');
const imports = Object.fromEntries(
  [...coversSrc.matchAll(/import\s+(\w+)\s+from\s+'\.\.\/images\/([^']+)'/g)].map((m) => [m[1], m[2]]),
);
const images = {};
for (const m of coversSrc.matchAll(/'?([\w-]+)'?:\s*\{\s*src:\s*(\w+),\s*alt:\s*(['"])((?:\\.|(?!\3).)*)\3,?\s*(?:focus:\s*'([^']+)',?\s*)?\}/g)) {
  const [, key, ident, , alt, focus] = m;
  if (!imports[ident]) continue;
  images[key] = {
    file: `src/images/${imports[ident]}`,
    alt: alt.replace(/\\(['"])/g, '$1'),
    ...(focus ? { objectPosition: focus } : {}),
  };
}

/* --- the region grouping and the section order --------------------------
   Both are derived in index.astro rather than authored, so they are repeated
   here and then checked against the built page below. */
const REGIONS = [
  { title: 'Lima', slug: 'recommendations-lima', regions: ['Lima'], cover: 'lima-cathedral' },
  { title: 'Across Peru', slug: 'recommendations-across-peru', regions: ['Peru'], cover: 'alpaca' },
  {
    title: 'Cusco & the Sacred Valley',
    slug: 'recommendations-cusco-and-the-sacred-valley',
    regions: ['Cusco', 'Sacred Valley', 'Aguas Calientes'],
    cover: 'terraces',
  },
  { title: 'Puno & Lake Titicaca', slug: 'recommendations-puno-and-lake-titicaca', regions: ['Puno'], cover: 'uros-boat' },
];

const regions = REGIONS.map((r) => {
  const lists = categories.filter((c) => r.regions.includes(c.region));
  return {
    title: r.title,
    slug: r.slug,
    cover: r.cover,
    categories: lists.map((c) => c.id ?? c.slug),
    placeCount: lists.reduce((n, c) => n + places.filter((p) => p.category === (c.id ?? c.slug)).length, 0),
  };
});

const orphans = categories.filter((c) => !regions.some((r) => r.categories.includes(c.id ?? c.slug)));
if (orphans.length > 0) {
  throw new Error(`categories in no region: ${orphans.map((c) => c.slug).join(', ')} — update REGIONS`);
}

const sections = [
  { href: 'trip-snapshot', label: 'Trip snapshot' },
  { href: 'weather-september-50-year-averages', label: 'Weather' },
  { href: 'day-by-day', label: 'Day by day' },
  ...regions.map((r) => ({ href: r.slug, label: r.title })),
  {
    href: 'packing-tuned-to-this-trip-sea-level-to-3800-m-cold-nights-rustic-homestay-early-machu-picchu',
    label: 'Packing',
  },
  { href: 'common-spanish-phrases', label: 'Spanish phrases' },
  { href: 'key-quechua-phrases-for-the-homestay', label: 'Quechua phrases' },
  { href: 'key-aymara-phrases-just-in-case', label: 'Aymara phrases' },
  { href: 'currency-soles-to-canadian-dollars', label: 'Currency' },
  { href: 'tipping-what-to-leave-and-where', label: 'Tipping' },
].map((s, i) => ({ num: String(i + 1).padStart(2, '0'), ...s }));

/* The section list above is hand-kept, so check it against what the build
   actually shipped rather than letting the two drift apart in silence. */
const built = join(root, 'dist/index.html');
if (existsSync(built)) {
  // Scripts out first: the inline fold-restore carries the attribute name in
  // its own source, which otherwise counts as a fourteenth section.
  const html = readFileSync(built, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
  const shipped = [...html.matchAll(/data-section-fold="([^"]+)"/g)].map((m) => m[1]);
  const mine = sections.map((s) => s.href);
  if (shipped.length !== mine.length || shipped.some((s, i) => s !== mine[i])) {
    throw new Error(`section list is out of date.\n  built: ${shipped.join(', ')}\n  here:  ${mine.join(', ')}`);
  }
} else {
  console.warn('! dist/index.html not found — section order not cross-checked. Run `npx astro build` first.');
}

let commit = null;
try {
  commit = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
} catch {
  /* not a checkout, or no git — the bundle is still fine without it */
}

const bundle = {
  $schema: 'https://broleyperu.netlify.app/ — exported by scripts/export-bundle.mjs',
  meta: {
    title: 'Peru Field Guide',
    travellers: trip.travellers,
    dates: trip.onTheGround,
    tour: trip.tour,
    site: 'https://broleyperu.netlify.app',
    commit,
    note: 'Every field is content from src/content/, unchanged. Re-run the script after any edit.',
  },
  sections,
  trip: {
    stats: trip.stats,
    flights: trip.flights,
    snapshot: trip.snapshot,
    altitude: trip.altitude,
    reservations: trip.reservations,
  },
  days,
  regions,
  categories,
  places,
  weather,
  packing,
  phrases: {
    spanish: phrases.filter((p) => p.book === 'spanish'),
    quechua: phrases.filter((p) => p.book === 'quechua'),
    aymara: phrases.filter((p) => p.book === 'aymara'),
  },
  currency,
  tipping,
  maps,
  images,
};

writeFileSync(out, JSON.stringify(bundle, null, 2) + '\n');

const kb = (statSync(out).size / 1024).toFixed(0);
console.log(`wrote ${out} — ${kb} KB`);
console.log(
  `  ${bundle.days.length} days · ${bundle.places.length} places · ${bundle.categories.length} lists in ` +
    `${bundle.regions.length} regions · ${bundle.sections.length} sections`,
);
console.log(
  `  ${Object.values(bundle.phrases).flat().reduce((n, g) => n + g.items.length, 0)} phrases · ` +
    `${bundle.maps.length} maps · ${bundle.trip.reservations.length} bookings · ` +
    `${Object.keys(bundle.images).length} images`,
);
