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
| `days/01-sept-16.json` … ×11 | One file per day: date, location point, weather, glance, logistics, journey, reservations, picks |
| `places.json`               | The Little Black Book — 57 entries, each tagged with a category |
| `categories.json`           | The 13 recommendation categories and their anchor slugs       |
| `trip.json`                 | Snapshot: flights, meeting point, meals, luggage, altitude, booked tables |
| `weather.json`              | The September averages table                                  |
| `packing.json`              | Packing groups                                                |
| `checklist.json`            | Book-ahead / verify list                                      |
| `maps.json`                 | The five map views — route, Lima, Cusco, valley, Puno — and their pins |

Two conventions worth knowing:

- **`lens`** is `food`, `art`, `skate` or `wild` — which traveller's interest an entry serves. The filter shows food or skate on demand; `art` and `wild` appear under Everything.
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

Initial payload: ~60 KB gzipped HTML plus fonts — the day status panels and the baked map geometry are most of the growth from the original ~35 KB. Leaflet adds ~43 KB gzipped, but only once you reach a map.

### Components

`MegaNav` · `TodayPanel` / `TodayLoader` · `SectionFold` / `SectionHeader` / `RegionBar` · `DayCard` · `TravelCallout` · `ReservationCard` · `DayStatus` / `MapSprite` · `Icon` · `PlaceCard` · `ReservationBanner` · `WeatherCard` / `WeatherChip` / `WeatherIcon` · `JourneyStrip` · `LbbPanel` · `MapPanel` / `MapLoader` · `SnapshotTable` · `PackingList` · `VerifyList`

Link helpers live in `src/lib/links.ts`: `gmapsUrl(q)`, `telUrl(phone)`, `waUrl(phone)`. Phone numbers default to `tel:` because nearly all of them are Lima landlines; `waUrl` is there for any mobile number added later.

### Photography

The section heads (01–06) and the four leg dividers in the day list are full-bleed photographs with the number and title set over a scrim. `src/lib/covers.ts` is the manifest: it imports each photo, gives it alt text and an `object-position`, and exposes it under a short key. Sections take that key as a prop; a day's `regionStart.cover` carries it as data.

The originals were 3–24 MB camera JPEGs, several with GPS EXIF. `node scripts/optimise-images.mjs --replace` converts them to WebP masters — EXIF orientation applied then all metadata stripped, long edge capped at 2400 px — which took the set from 154 MB to 8 MB. Astro generates the responsive sizes from those masters at build time.

The masthead has the alpaca shot behind it, under a pink wash that runs 70–97% across the block — densest under the wordmark, thinnest where there's no type — so it stays the comp's pink hero with the photograph reading as texture. That image is served at quality 45, since nothing under a wash that heavy is visible anyway, and the flat pink shows through unchanged if it never loads.

Bands are sized to actually show the photograph: 285–420 px on a phone, 390–570 px on a desktop, with the leg dividers about two-thirds of that.

The hero image loads eagerly; of the ten section and leg covers, only the first does. A phone's initial load is ~134 KB including two images, and the rest arrive as you scroll. Print drops every photograph and returns the headings to the flow in black.

Four images from the first upload are unused and listed at the top of `covers.ts` if you want to swap any in.

### The day status panel

Family follow along with this, so each day carries a panel in the space beside its summary answering three things with the day still collapsed: **where in Peru**, **how high up**, and **what the weather is doing**. Today's weather is the live reading (the same fetch the header makes); every other day shows its September average, labelled as such.

It is the *itinerary*, not a GPS tracker — the section lead says so on the page, because a map with a dot on it invites the other reading.

The locator is inline SVG with no network at all. `src/lib/geo.ts` holds a real Peru outline projected once from Natural Earth data, generated by `scripts/generate-map-outline.mjs` (`npm i --no-save world-atlas topojson-client` first — neither is a project dependency, the output is committed). Its `project(lat, lng)` shares the frame the paths were drawn in, so the day's coordinates land exactly right. `MapSprite` puts that geometry in the document once and each day `<use>`s it, rather than repeating ~16 KB of path data eleven times.

The panel is laid out wide rather than tall — an 84 px locator beside the facts — so a collapsed day and its panel are the same height and the row has no hole in it. It lives inside the `<summary>`, so it reads with the day collapsed and clicking it still toggles the day.

It's on every screen size. Above 1080 px it takes its own track beside the day's text; below that it runs full width under the text, with a smaller locator and the two facts side by side rather than stacked — about 107 px on a phone. Under 360 px the columns are too narrow to hold "~20° / 15°" together, so those fall back to the wide panel's label-left/value-right rows. The elevation and weather chips are gone from the day header at every size now, since the panel says both properly.

Every track inside the panel has an explicit zero minimum and the fact rows are flex-wrap: at 1080 px the panel is only 264 px, and label/value pairs that can't shrink will otherwise push the whole card past the viewport.

In print the locator and the gauge go, the block turns white, and the panel becomes the only place the elevation and weather appear. Its grid drops to one track there — with the locator hidden the facts would otherwise fall into the `auto` column and shrink to their own text.

Day elevations use the source's own wording (`Sea level`, `3,450 m`, the weather table's `2,000–2,900 m` band for the cloud-forest days); the `metres` value only scales the gauge.

### The little black book

Thirteen lists one after another, all set the same way on cream, was a wall you couldn't get a purchase on. Three things break it up:

**Chapters.** The lists group into four — Lima, Across Peru, Cusco & the Sacred Valley, Puno & Lake Titicaca — each introduced by a photographic band carrying its counts ("7 lists · 30 places"). It's the same `RegionBar` the day list uses for the legs of the trip, at a `compact` height so a chapter marker inside a section doesn't compete with the section head. Two new covers came off the unused half of the upload for this. The grouping lives in `RECOMMENDATION_CHAPTERS` in `index.astro` and only says where the breaks fall — the order is still the content's. A region no chapter claims lands in an "Elsewhere" chapter at the end rather than dropping off the page.

**List headers.** Each list sits under a solid ink bar with its icon in gold and its counts on the right — how many entries, and how many of those we'd go out of our way for. Enough to decide whether to read it.

**Top picks as cards.** A ★ entry gets a warm gold wash and padding here, so the ones worth a detour surface out of the grid. Days keep the quieter rule-only treatment — there are only ever two or three in front of you there.

That nests a level deeper than a day does (chapter → list → entry), so `PlaceCard` takes a `level` prop and the recommendations pass `5`. The section costs about 35% more height than the undifferentiated wall did, which is the trade: it's longer, but you can find your way down it — and the whole section folds away now.

### Booked tables in the day list

The three bookings — Lady Bee, Maido, the Machu Picchu tour — carry a photograph in their day as well as in the snapshot's booked row. `ReservationBanner` takes a `cover` key like the section heads do; without one it's the text-only pink box it always was, so nothing else that uses it changes.

The picture takes 38% of the banner rather than a fixed width: the banner runs the full width of an open day, and 300 px of photograph across 1,100 is a strip, not a picture. A `min-height` stops a short booking flattening it. Below 700 px the photo goes on top. It's lazy and inside a `<details>`, so a shut day costs nothing — the initial payload is unchanged.

The covers are per-reservation in the day JSON (`"cover": "lady-bee-sign"`), so swapping in a different shot is one string. The two venues deliberately use a *different* photograph in the day than on the snapshot card — the room and the sign in the day list, the dish and the cocktail on the cards — so the same shot never appears twice on one page. Print drops the photographs and keeps the booking.

The Lady Bee sign is only 711 px wide, which is the largest copy there is; it's sharp on a phone and slightly soft on a 2× desktop. Astro won't upscale past the source.

### Folding a section away

Every numbered section shuts to its cover photograph. It's a `<details>` — the cover band is the `<summary>` — so it works with no JavaScript, takes the keyboard for free, and Chrome opens it to show a find-in-page hit. A **Hide / Show** pill sits in the top corner of the band as the affordance; the whole band is the click target.

Shut, the band comes down to `clamp(168px, 24vw, 300px)` and the lead paragraph goes with it. Six full-height covers stacked is a slideshow, not an index, and being able to scroll past a section is the point — all six shut, the page is ~2,550 px on a desktop and ~1,875 px on a phone.

Which sections are shut is kept in `localStorage` under `peru-folded-sections`. The restore runs from an `is:inline` script sitting in the body after `</main>`, not from the bundled module: it has to execute while the parser is still there, or a section you left shut gets painted open first and the page jumps.

`MegaNav`'s `openTarget` walks *every* disclosure above the destination rather than the nearest one — a day is a `<details>` inside a section's fold — and opens a section's own fold when you jump at the section itself.

Print forces all of it open. That rule used to be `details { display: block }`, which hasn't revealed closed content for years; it's now `::details-content { content-visibility: visible }` with the old child rule kept for engines that still hide it the old way. Collapsed days weren't printing their contents before this either.

### How a day is laid out

Above 1080 px a day runs on three tracks: the date, the text at `--measure`, and the status panel taking the rest. Sizing the text track to the measure rather than letting it stretch is what closes the gap between the words and the panel — a stretched track with capped prose inside it is where the dead space came from.

An open day's body starts past the date gutter so it hangs off its own title instead of returning to the card edge, and runs on a two-column grid. Running text, the travel callout, the journey strip, reservations and maps take the full width; picks and little-black-book panels pair up. A lone panel or an odd last pick takes the row rather than leaving a half-row hanging, and paired panels stretch to a common height.

Splitting the body into a narrative column and a reference rail was tried first and dropped: the reference material runs roughly twice the height of the narrative on most days, so the rail left a taller hole than the one it closed.

### Travel days and iconography

Five of the eleven days are mostly getting somewhere, so transit has a block of its own rather than one line in a list. `TravelCallout` carries the mode icon, the headline duration, the route, and the day's transit notes; a gold **Travel day · ~7.5 hrs** badge sits in the day header so it's visible with the day collapsed.

Those facts moved out of `logistics` and into `travel` on the day. Nothing was dropped — every logistics line the source carries still appears, once, in whichever block owns it. If you edit a callout, check you're not removing the only copy of something.

`Icon.astro` holds the set: travel modes, the snapshot's row labels, the packing groups, and one per recommendation category. They're inline SVG on the same 24×24 grid as the weather glyphs, decorative by default (each labels text that already says the same thing) and `aria-hidden` unless given a `label`.

Reservations say **Booked** on a pink chip with a ticket mark, and put the address and phone on their own row rather than threading them through the sentence — a long venue address wraps, and its full stop ends up stranded at the start of the next line.

There are two shapes of them. `ReservationCard` is the photographed card used for the row of three at the top of the snapshot, sitting above the altitude profile; `ReservationBanner` is the flatter block that interrupts a day. A reservation's photograph comes from the same `covers.ts` manifest as everything else, via `cover` on the trip entry.

### The header panel

Where the standing blurb used to be, the masthead carries a live panel that reads the device clock and shows one of three states:

| When | Shows | Button |
| --- | --- | --- |
| Before | "31 days to go" + departure day | Start at Day 1 |
| During | "Day 6 of 11" + today's date and title | **Jump to today** — scrolls to today's card and opens it |
| After | "That was Peru" + how long ago | Back to Day 1 |

Underneath sits the weather for the day it's pointing at. The seasonal average from the content renders immediately — no network, no layout shift — and a live reading from [Open-Meteo](https://open-meteo.com) (no key, no account) replaces it when there's signal, with the condition icon switching to match the WMO code. The last reading is cached for a day, so an offline load still shows real conditions rather than falling back to the average; anything over three hours old is labelled "earlier".

The lookup uses the coordinates of *the trip's* locations, which come from the map pins. Nothing asks for the reader's location, and the panel is left out of print.

Without JavaScript the panel renders the trip dates and a plain link to Day 1, so the header is never empty.

Day dates live in each day file as `iso` (`2026-09-21`), which is what the panel matches against; `point` is the day's location for the weather lookup.

### Navigation

A slim sticky bar and a mega panel, the same at every width. The bar carries only what's useful while reading — the section you're currently in, a jump to today, and the menu trigger — and is about 50 px tall.

The panel opens as one view of the whole guide: the six sections, all eleven days, all thirteen recommendation lists grouped under the same four chapters the section itself uses, and the lens filter. It closes on selection, Escape, or a click outside; focus moves in on open, is trapped while open, and returns to the trigger on dismissal (but follows the destination when you pick something). Choosing a day opens that day's card as well as scrolling to it.

The panel is `position: fixed` rather than part of the sticky flow. That's deliberate: locking body scroll with `overflow: hidden` — the usual way to hold the page still behind a menu — removes the scrollport the sticky bar depends on, and the bar drops out of position the moment the menu opens.

`--nav-h` is measured from the bar alone and drives `scroll-margin-top`, so anchors clear it exactly.

### Responsive layout

Mobile is the comp, unchanged. Above that the card grows in steps and the extra width buys layout rather than longer lines — running text is capped at `--measure` everywhere, so nothing ever stretches to an unreadable line length.

| From    | What changes                                                                                  |
| ------- | --------------------------------------------------------------------------------------------- |
| 600 px  | Card widens a little                                                                            |
| 700 px  | Recommendations, weather, packing, the snapshot table and the booked cards go two-up            |
| 720 px  | Menu panel goes to three columns                                                                |
| 860 px  | Masthead splits (wordmark left, today panel right); snapshot blocks pair; checklist goes two-up |
| 1080 px | Snapshot table and the booked cards go three-up; day gutters widen                               |
| 1200 px | Recommendations go three-up; packing four-up; a day's Little Black Book panels pair side by side |
| 1440 px | Card reaches 1320 px; weather goes four-up                                                       |

### Maps

Five pinned maps: the whole route in the snapshot, and one each inside the Lima, Cusco, Sacred Valley and Puno days. Gold pins are the ★ picks; tapping one opens a popup with a Google Maps link.

Leaflet is **self-hosted** in `public/vendor/leaflet/` and **lazy-loaded** — nothing is fetched until a map is about to scroll into view, and a map inside a collapsed day waits until you open it. Because the library is precached, the only thing a map needs from the network is its tiles (CARTO's light basemap, OpenStreetMap data).

Three things happen when the tiles can't load:

- Tiles you've already looked at are served from a capped runtime cache, so a map you opened on hotel wifi still draws later with no signal.
- Failing that, the map says "map tiles need a signal" rather than showing an empty rectangle.
- Each map is its own stacking context (`isolation: isolate`). Leaflet puts its controls at `z-index: 1000` and its panes at 400; without that, they escape the card and ride over the sticky nav as you scroll.
- Every pin is also listed as plain text under the map — name, note and the same Google Maps link. That list is keyboard-reachable, works with no tiles at all, and is what gets printed.

Pin links reuse the place's address where the content has one (`src/lib/addressBook.ts` gathers them from places, days and the trip snapshot) and fall back to the pin's exact coordinates otherwise.

### Offline

`public/sw.js` precaches the page, fonts, icons and Leaflet. Navigations are network-first (fresh copy when there's signal, cached copy in the Andes); everything else is cache-first. Map tiles use a separate capped cache that survives content releases. `public/manifest.webmanifest` makes it installable to the home screen as "Peru Field Guide".

**When the content changes, bump `CACHE` in `public/sw.js`** (`peru-guide-v7` → `v8`) so returning devices drop the old cache. Leave `TILE_CACHE` alone unless the tile source changes.

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
2. **It has a desktop layout.** The comp is a fixed 520 px phone frame; stretching that one column across a monitor would have left most of the screen empty. See below.

The comp embedded its maps as iframes pointing at a separate page. Here they're inline components instead, sharing the page's tokens and lazy-loading a self-hosted Leaflet — same maps, same pins, same coordinates, without the second document or the CDN dependency.
