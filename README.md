# Peru Field Guide

A mobile-first field guide for Michael & Laura's Peru trip, **Sept 16–26 2026** — eleven days, the Little Black Book of places, packing, and what still needs booking.

Built to be used on a phone while travelling: one long page, no framework, works offline once loaded, and prints back to a clean PDF.

## Local development

```bash
npm install
npm run dev        # http://localhost:4321
```

| Command           | What it does                                  |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Dev server with hot reload                    |
| `npm run build`   | Static build to `dist/`                       |
| `npm run preview` | Serve the built `dist/` locally               |
| `npm run check`   | `astro check` — TypeScript and content schemas |

Node 22.12 or newer — Astro 7 requires it, and the Netlify build pins 22.

## Editing the content

All copy lives in typed content collections under `src/content/`, not in templates. Schemas are in `src/content.config.ts`; the build fails loudly if a field is missing or the wrong shape.

| File                        | Holds                                                        |
| --------------------------- | ------------------------------------------------------------ |
| `days/01-sept-16.json` … ×11 | One file per day: weather, glance, logistics, journey, reservations, picks |
| `places.json`               | The Little Black Book — 45 entries, each tagged with a category |
| `categories.json`           | The 12 recommendation categories and their anchor slugs       |
| `trip.json`                 | Snapshot: flights, meeting point, meals, luggage, altitude, booked tables |
| `weather.json`              | The September averages table                                  |
| `packing.json`              | Packing groups                                                |
| `checklist.json`            | Book-ahead / verify list                                      |
| `maps.json`                 | The five map views — route, Lima, Cusco, valley, Puno — and their pins |

Two conventions worth knowing:

- **`pick: true` is the ★** from the source markdown. It drives the gold treatment everywhere.
- **`order`** on `places` and `weather` entries preserves source order — the content loader keys entries by `id`, so without it the list would render alphabetically.
- **Map pins carry their own coordinates**, taken from the design comp's map page rather than derived from the addresses. A pin and its address are therefore two independent records of the same place; if they ever disagree, the address is the one to trust.

Anchor `slug` values match the Quick Links TOC in `Peru_Trip_Content.md` exactly, so links written against the original document still resolve.

## How it's put together

- **Astro 7**, static output, no adapter, no UI framework.
- **Zero component-framework JS.** The only scripts are a sticky-nav island (active-section tracking, the collapsible TOC, the lens filter), expand/collapse-all, checklist persistence, the map loader, and service-worker registration — all vanilla, all inlined into the HTML by the build. The only separate JS file is Leaflet, and it's only fetched if you scroll to a map.
- **CSS custom properties** in `src/styles/global.css` hold every design token (colour, type scale, spacing, radii). Nothing hard-codes a hex.
- **Self-hosted fonts** — Anton and Work Sans (variable, 400–700), subset to latin + latin-ext, in `public/fonts/`.
- **Inlined stylesheet**, so the page has no render-blocking request.

Initial payload: ~35 KB gzipped HTML plus fonts. Leaflet adds ~43 KB gzipped, but only once you reach a map.

### Components

`TocNav` · `DayCard` · `PlaceCard` · `ReservationBanner` · `WeatherCard` / `WeatherChip` / `WeatherIcon` · `JourneyStrip` · `LbbPanel` · `MapPanel` / `MapLoader` · `SnapshotTable` · `PackingList` · `VerifyList` · `SectionHeader`

Link helpers live in `src/lib/links.ts`: `gmapsUrl(q)`, `telUrl(phone)`, `waUrl(phone)`. Phone numbers default to `tel:` because nearly all of them are Lima landlines; `waUrl` is there for any mobile number added later.

### Maps

Five pinned maps: the whole route in the snapshot, and one each inside the Lima, Cusco, Sacred Valley and Puno days. Gold pins are the ★ picks; tapping one opens a popup with a Google Maps link.

Leaflet is **self-hosted** in `public/vendor/leaflet/` and **lazy-loaded** — nothing is fetched until a map is about to scroll into view, and a map inside a collapsed day waits until you open it. Because the library is precached, the only thing a map needs from the network is its tiles (CARTO's light basemap, OpenStreetMap data).

Three things happen when the tiles can't load:

- Tiles you've already looked at are served from a capped runtime cache, so a map you opened on hotel wifi still draws later with no signal.
- Failing that, the map says "map tiles need a signal" rather than showing an empty rectangle.
- Every pin is also listed as plain text under the map — name, note and the same Google Maps link. That list is keyboard-reachable, works with no tiles at all, and is what gets printed.

Pin links reuse the place's address where the content has one (`src/lib/addressBook.ts` gathers them from places, days and the trip snapshot) and fall back to the pin's exact coordinates otherwise.

### Offline

`public/sw.js` precaches the page, fonts, icons and Leaflet. Navigations are network-first (fresh copy when there's signal, cached copy in the Andes); everything else is cache-first. Map tiles use a separate capped cache that survives content releases. `public/manifest.webmanifest` makes it installable to the home screen as "Peru Field Guide".

**When the content changes, bump `CACHE` in `public/sw.js`** (`peru-guide-v2` → `v3`) so returning devices drop the old cache. Leave `TILE_CACHE` alone unless the tile source changes.

### Icons

`node scripts/generate-icons.mjs` regenerates the PWA icons and OG image from the design's mark — no image dependencies, geometry and palette are at the bottom of that script.

## Deploying to Netlify

`netlify.toml` is committed and complete:

```toml
[build]
  command = "npm run build"
  publish = "dist"
[build.environment]
  NODE_VERSION = "22"
```

Static site — no functions, no edge handlers. The Node pin matters: Astro 7 will not run on Node 20. Connect the repo in Netlify and it builds as-is; or `netlify deploy --prod --dir=dist` after a local build.

The site is private: `noindex` meta, `X-Robots-Tag` header, and a `robots.txt` that disallows everything. There is no analytics.

## Notes on the design

The layout follows the supplied Claude Design comp — palette (`#12100F` ink, `#FFFBF5` cream, `#E4007C` pink, `#FFC300` gold), Anton/Work Sans, square edges, numbered sections, the 520 px phone column. Two deliberate departures:

1. **Recommendations is its own section (04).** The comp folded the Little Black Book into the day cards. Both are here: each category still appears on the day it's useful, *and* all twelve get a full section with the TOC's anchor ids, as the brief requires. The in-day panels link through to it.
2. **The column widens to 660 px above 900 px**, and the recommendations go to two columns above 720 px. The comp is a fixed 520 px phone frame; everything else about the composition is unchanged.

The comp embedded its maps as iframes pointing at a separate page. Here they're inline components instead, sharing the page's tokens and lazy-loading a self-hosted Leaflet — same maps, same pins, same coordinates, without the second document or the CDN dependency.
