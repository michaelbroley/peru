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
| `places.json`               | The Little Black Book — 56 entries, each tagged with a category |
| `categories.json`           | The 13 recommendation categories and their anchor slugs       |
| `trip.json`                 | Snapshot: flights, meeting point, meals, luggage, altitude, booked tables |
| `weather.json`              | The September averages table                                  |
| `packing.json`              | Packing groups                                                |
| `checklist.json`            | Book-ahead / verify list                                      |
| `currency.json`             | The soles/dollars reference rate, and Peru's coins and notes   |
| `tipping.json`              | What to leave, in three groups                                 |
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

`MegaNav` · `TodayPanel` / `TodayLoader` · `SectionFold` / `SectionHeader` / `RegionBar` · `DayCard` · `TravelCallout` · `ReservationCard` · `DayStatus` / `MapSprite` · `Icon` · `PlaceCard` · `ReservationBanner` · `WeatherCard` / `WeatherChip` / `WeatherIcon` · `JourneyStrip` · `LbbPanel` · `MapPanel` / `MapLoader` · `SnapshotTable` · `PackingList` · `PhraseList` · `CurrencyConverter` · `TipCalculator` / `TipList` · `ScrollEdge` · `Habitat` / `Penguin` · `Llama`

Link helpers live in `src/lib/links.ts`: `gmapsUrl(q)`, `telUrl(phone)`, `waUrl(phone)`. Phone numbers default to `tel:` because nearly all of them are Lima landlines; `waUrl` is there for any mobile number added later.

### Photography

The section heads (01–10) and the four leg dividers in the day list are full-bleed photographs with the number and title set over a scrim. `src/lib/covers.ts` is the manifest: it imports each photo, gives it alt text and an `object-position`, and exposes it under a short key. Sections take that key as a prop; a day's `regionStart.cover` carries it as data.

The originals were 3–24 MB camera JPEGs, several with GPS EXIF. `node scripts/optimise-images.mjs --replace` converts them to WebP masters — EXIF orientation applied then all metadata stripped, long edge capped at 2400 px — which took the set from 154 MB to 8 MB. Astro generates the responsive sizes from those masters at build time.

The masthead has the alpaca shot behind it, under a pink wash that runs 70–97% across the block — densest under the wordmark, thinnest where there's no type — so it stays the comp's pink hero with the photograph reading as texture. That image is served at quality 45, since nothing under a wash that heavy is visible anyway, and the flat pink shows through unchanged if it never loads.

Bands are sized to actually show the photograph: 285–420 px on a phone, 390–570 px on a desktop, with the leg dividers about two-thirds of that.

The hero image loads eagerly; of the ten section and leg covers, only the first does. A phone's initial load is ~134 KB including two images, and the rest arrive as you scroll. Print drops every photograph and returns the headings to the flow in black.

A second upload added eight more photographs; the Urubamba market is section 10's cover and the other seven are spare. Anything unused is listed at the top of `covers.ts` if you want to swap one in.

`optimise-images.mjs` skips `backdrop*.png`. Those are the habitat's pixel art and `pack-habitat.mjs` reads them as its source — a quality-82 resample would soften every edge, and `--replace` would then delete the only copy. Lossless is what pixel art wants, and that's the packer's job, not the optimiser's.

### The scrolling edges

While you're scrolling, the top and bottom of the viewport go soft, so a very long page reads as passing through a window rather than jumping in a box. At rest it fades out completely and is pulled from the tree — nothing is ever permanently veiled, and there are no backdrop filters left running behind a page nobody is scrolling.

**Three stacked layers per edge, not one.** A single masked blur fades the blurred copy out against the sharp original underneath, which reads as a ghosted double image. Stacking blurs that each cover less of the band means every layer filters the one below it, so the strength ramps instead of cross-fading.

**The fade lives on the layers, never on their parent.** An ancestor with `opacity` becomes a *backdrop root*, and every `backdrop-filter` inside it then filters an empty backdrop — no blur at all, and no error to tell you. Same trap with `filter` or `mix-blend-mode` on a wrapper.

It sits at `z-index: 800`: over the guide, under the llama at 900 and the nav at 1200. The mascot is pixel art and the bar is the thing you navigate by; neither should ever go soft. For the same reason the bottom edge stands down entirely once the habitat is on screen, so she is never sharp on a blurred floor.

The top band starts at `var(--nav-h)` rather than 0. The nav bar is opaque ink, so a band starting at the top would spend two thirds of itself invisible behind it and then begin abruptly at its lower edge.

Off under `prefers-reduced-motion`, off on paper, and off where `backdrop-filter` isn't supported — the script checks before it does anything. Scrolling a phone viewport at 4× CPU throttle measured 60 fps with no dropped frames either way, so it costs nothing where it matters.

### The day status panel

Family follow along with this, so each day carries a panel in the space beside its summary answering three things with the day still collapsed: **where in Peru**, **how high up**, and **what the weather is doing**. Today's weather is the live reading (the same fetch the header makes); every other day shows its September average, labelled as such.

It is the *itinerary*, not a GPS tracker — the section lead says so on the page, because a map with a dot on it invites the other reading.

The locator is inline SVG with no network at all. `src/lib/geo.ts` holds a real Peru outline projected once from Natural Earth data, generated by `scripts/generate-map-outline.mjs` (`npm i --no-save world-atlas topojson-client` first — neither is a project dependency, the output is committed). Its `project(lat, lng)` shares the frame the paths were drawn in, so the day's coordinates land exactly right. `MapSprite` puts that geometry in the document once and each day `<use>`s it, rather than repeating ~16 KB of path data eleven times.

The panel is laid out wide rather than tall — an 84 px locator beside the facts — so a collapsed day and its panel are the same height and the row has no hole in it. It lives inside the `<summary>`, so it reads with the day collapsed and clicking it still toggles the day.

It's on every screen size. Above 1080 px it takes its own track beside the day's text; below that it runs full width under the text, with a smaller locator and the two facts side by side rather than stacked — about 107 px on a phone. Under 360 px the columns are too narrow to hold "~20° / 15°" together, so those fall back to the wide panel's label-left/value-right rows. The elevation and weather chips are gone from the day header at every size now, since the panel says both properly.

Every track inside the panel has an explicit zero minimum and the fact rows are flex-wrap: at 1080 px the panel is only 264 px, and label/value pairs that can't shrink will otherwise push the whole card past the viewport.

In print the locator and the gauge go, the block turns white, and the panel becomes the only place the elevation and weather appear. Its grid drops to one track there — with the locator hidden the facts would otherwise fall into the `auto` column and shrink to their own text.

Day elevations use the source's own wording (`Sea level`, `3,450 m`, the weather table's `2,000–2,900 m` band for the cloud-forest days); the `metres` value only scales the gauge.

### The phrasebooks

Sections 06, 07 and 08 are a Spanish phrasebook (43 phrases in four groups), a short Quechua one for the Titicaca homestay (14), and an Aymara one for the same homestay if the family greets you that way instead (13). They sit together at `#common-spanish-phrases`, `#key-quechua-phrases-for-the-homestay` and `#key-aymara-phrases-just-in-case` — the same slug-the-whole-heading style as every other anchor. The Quechua book's Aymara caveat links through to the Aymara one, since there is now somewhere to send you.

`PhraseList` renders a `<dl>`, because that's what a phrasebook is: a term and its definition. A screen reader announces the pairing, so "Sulpayki, thank you" reads correctly without the punctuation between them having to carry it. The em dash is drawn in CSS rather than written into the markup, so it can't be read aloud or swept up when you copy a phrase to show someone. Terms carry `lang="es"` / `lang="qu"`.

Only the Quechua and Aymara entries have a pronunciation hint — Spanish reads close enough to how it's written. On a phone the hint drops to its own line under the meaning; from 600 px it goes inline in brackets.

The two columns are `columns: 2` rather than a grid. The Spanish groups run 8 to 16 phrases, and a grid row would leave a hole under the short group while the tall one carried on; the browser balances a multi-column better than a fixed row can. It's safe here in a way it wouldn't be around a Leaflet map — nothing in a phrase list is positioned or scripted. The Quechua and Aymara books are single groups with nothing to balance against, so there the *phrases* take the two columns instead. Watch for `display: grid` on anything you want `columns` to split — grid wins, and the column count is silently ignored.

Print keeps both columns and won't split a group across a page. This is the one part of the guide you might genuinely want folded in a pocket.

The two prose bits that aren't phrases — the Aymara caveat and the gift tip — use the guide's existing idioms: the gold `!` flag the recommendations use for anything unconfirmed, and the grey note box the days use. If another section is ever appended, move it again — a farewell stranded mid-document reads as a mistake.

### Currency

Section 09, at `#currency-soles-to-canadian-dollars`: soles to Canadian dollars. Three parts, in the order you need them — the rate, a table of money, and a calculator.

**The table is the section; the calculator is the extra.** It lists every Peruvian coin and note — S/ 1, 2, 5 and S/ 10 through 200 — against what each is worth, so a price tag converts by looking rather than typing. It's rendered on the server from the baked rate, which means it works with no script and no signal, and it prints. The calculator ships `hidden` and script reveals it, so a no-JS reader gets a table rather than two dead boxes.

**The rate is baked into content and refreshed at runtime.** `src/content/currency.json` holds a hand-checked figure and the date it was checked — that's what a plane or a homestay with no bars gets. Anywhere online, the page fetches a live rate, repaints everything from it, and caches it for a week, exactly as `TodayLoader` does for the weather. Same failure posture too: no signal or a dead service and the baked figure simply stays.

**A live rate has to be believable before it's taken.** Anything beyond a third of the baked rate either way is a broken response, not a currency crisis — the sol has traded in a narrow band for twenty years. A wrong number here is worse than a stale one, so an implausible reading is dropped and the stamp keeps saying "checked", not "live".

Both inputs are two-way and parse leniently: a comma means a decimal point to half the world and a thousands separator to the other half, and either way the person typing means a number. Writing to one input fires the other's `input` event, so an `echo` flag stops a rounded value bouncing between them as you type.

Updating the rate by hand is one number and one date in `currency.json`. Nothing else needs to change.

`src/lib/fx.ts` owns the rate rather than the component, because section 10 needs the same number and the two must never disagree. One fetch, one cache, one value, however many subscribers — and a component that subscribes *after* the rate has arrived is told immediately rather than waiting for a broadcast it missed. That's why it's a module and not an event: import order can't matter.

### Tipping

Section 10, at `#tipping-what-to-leave-and-where`. Three groups — eating and drinking, guides and trekking staff, hotels and taxis — each row giving who, how much, and the caveat.

**The service charge is the warning, not the amounts.** Peruvian restaurants often add 10–13% as *cargo de servicio* or *recargo de consumo*, and tipping on top of that is the mistake worth not making. It's the first thing in the section, in the same gold `!` flag the recommendations use for anything unconfirmed.

**The calculator only does the one sum that needs doing.** Everything else in the section is a flat figure you hand over — a few soles a bag, ten to twenty for a guide, nothing for a taxi. Only a percentage of a restaurant bill needs arithmetic, so that's all it computes: 5/10/15% of a bill, in soles, with the dollar equivalent underneath from the shared rate.

**It counts in centimos, not floating point.** 15% of S/ 86.50 is 12.975, which as a double is 12.97499…, and `toFixed(2)` hands back S/ 12.97 — a penny short, every time, for no visible reason. Rounding to whole centimos first fixes it, and there's a test pinned to exactly that bill.

`amount` in the content is a string on purpose. Half of these are ranges and two of them are "not expected"; a number field would mean inventing precision Peru doesn't have. `TipList` sets the ones with digits in display type and the ones without in small caps, so "not expected" answers the question without pretending to be a sum.

The figures come from Peruvian tour operators' own tipping guides, gathered August 2026. They're customs, not prices — treat them as the shape of the thing rather than a tariff.

### The habitat

The page ends in 500 px of ground for the llama to stand in. `Habitat.astro`, straight off `.shell` after `</main>`.

**She needs no code to get there.** She's fixed to the bottom of the viewport, and at full scroll the bottom of the viewport *is* this band — so scrolling to the end walks her out of the guide and into her habitat, with nothing watching for it. `.page`'s bottom padding had to go, though: a strip of ink under the card would have left her hovering off the end of her own ground.

No negative margin on the band either. The section covers bleed out of the padding their `<section>` carries; this hangs straight off `.shell`, which has none, so it's already the full width of the card. Giving it the usual `calc(var(--pad) * -1)` pushed it 40 px past the card on each side.

**The backdrop changes with the clock.** Four pixel scenes, picked by the reader's own hour: the coast in the morning, a green valley through the middle of the day, the Andes at dusk, and the night sky after nine. Whoever's reading late gets the one with the message in the stars. It's set from script rather than rendered, so only the scene that's wanted is ever fetched, and it waits for the guide to finish loading. Until it arrives a drawn horizon holds the band, so a slow connection gets a footer rather than a hole.

All four are lossless WebP at full 2356 × 982 — **22 KB for the set, down from 545 KB of PNG**. Pixel art is exactly what lossless compresses well: a limited palette and dithered gradients. Quality-92 lossy is *thirty times* bigger and softens every edge, which is the one thing pixel art can't survive. `scripts/pack-habitat.mjs` checks the round-trip pixel-for-pixel and refuses to write if anything moved.

### Pancho

The penguin lives in the habitat and nowhere else. He waddles its length, drops onto his belly and slides, and eats a fish if you poke him. Unlike the llama he isn't fixed to the viewport — he's absolutely placed inside the footer on the same ground line she stands on, so he only exists once you've scrolled to him, and an IntersectionObserver means nothing runs until the band is actually on screen.

**He arrives on his belly.** A 26 px/s waddle is a convincing penguin and took him *forty seconds* to cross the band — nobody's idea of a cameo. He now slides on from off the right edge at 130 px/s, which both gets him there and shows the slide off immediately rather than making you wait for a 30% branch to come up.

`penguin-idle.png` shipped byte-identical to `penguin-walk.png`, so it isn't packed twice: standing about is the walk row at 3 fps with no travel, which reads as shifting his weight. If a distinct idle ever lands, add a row in `pack-penguin.mjs` and `lib/penguin.ts` — those two are the only places that have to agree.

**One switch for the whole menagerie.** Sending the llama to sleep takes him with her: the toggle dispatches `peru:llama` and he listens. The backdrop stays either way — it's scenery, not motion.

### Chaska

There is a llama at the bottom of the page. She has no job.

She stands in the corner, and every fourteen-to-thirty-eight seconds does something: paces along the floor and turns at the edges, waves, catches a hoof and goes over, or dances. Poke her and she spits — an interrupt that plays over whatever she was doing and hands control back, so a second poke restarts it rather than queueing. On each of the eleven days of the trip she has a turn of her own and says so.

**Once in a blue moon she moonwalks.** 6% of her decisions, so roughly every seven minutes you have the page open. It's the first branch in `act()` so the days she has a turn of her own can't squeeze it out; the number is one line if it wants tuning.

**Turning her off doesn't delete her — she curls up in the left corner and sleeps.** Zs and all. She stops wandering, stops talking, and stops being a button (`pointer-events: none`, and the label says she's asleep), so she can't take a tap meant for the guide. The handoff warns that a mascot frozen mid-stride reads as a bug; asleep reads as asleep.

The art is a handoff in `src/silly_virtual_llama/` — seventeen animations at 40 × 40 logical pixels, exported at 4×, plus a moonwalk and a sleep that arrived afterwards as loose strips. `scripts/pack-llama.mjs` stacks the three sources into one nineteen-row sheet; `src/lib/llama.ts` carries the geometry and the day mapping; `Llama.astro` is the whole implementation.

**The day mapping isn't the sheet's.** The sheet numbers its day animations 1–11, and taking them in order would put the Nazca lines on a Cusco rest day and a parrot on the flight home. Four land exactly — Lady Bee on the 16th, Maido on the 17th, the terraces on the 21st, the reed boat on the 24th — and the rest are matched to what we're actually doing, with reasons in the file.

**What she costs:** 14 KB, once. The handoff's 174 KB PNG master, plus the two later strips, re-encode to a single lossless WebP at 14 KB with byte-identical pixels — the pack script decodes every row back out of the packed sheet and compares it against its source before it will write anything. Nothing is resampled, recut or recoloured. The sheet is fetched on idle after `load`, so she never competes with the guide arriving, and she's precached for offline.

**Behaviour worth knowing:**

- Frames advance on accumulated milliseconds, not ticks, so she moves at the same speed on a 60 Hz laptop and a 120 Hz phone.
- **The art faces right.** Head, muzzle and the spit all leave to the right, so it's walking *left* that takes the `scaleX(-1)` mirror. Shipping that backwards makes her moonwalk, which is exactly what happened the first time; `llama.mjs` now paces her with `Math.random` stubbed and fails if any step travels against her facing.
- **The moonwalk inverts that**, and only the moonwalk: she's drawn facing right with the dust trailing off to her left, so on that row the mirror runs *against* the direction of travel. It's the `backwards` flag in `llama.ts`, and it has the same test in reverse.
- Every pending piece of behaviour goes in one `Set` so a state change cancels all of it. A stray `stand()` landing after she's gone to sleep would stand her up asleep — the sort of thing a mascot gets away with for months.
- The loop stops while the tab is hidden. This page gets left open.
- Her floor is the `.shell` card, not the whole monitor. On a wide screen the card is centred with the ink field either side, and a llama straddling that edge reads as a mistake rather than a joke.
- `pointer-events: none` on the container, `auto` on her 80 px hit box, `z-index: 900` — under the nav, over everything else, never in the way of a tap meant for the guide.
- She's off in one click (the switch is in the menu, beside the lens filter) and remembers it. Under `prefers-reduced-motion` the default flips to off; an explicit choice always wins.
- No paper. She's a treat, not a fixture.

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

Shut, the band comes down to `clamp(168px, 24vw, 300px)` and the lead paragraph goes with it. Full-height covers stacked is a slideshow, not an index, and being able to scroll past a section is the point.

A shut section also gives up its own vertical spacing, so the bands stack flush and the folded page reads as one strip of photographs rather than nine cards. That's why `.section` puts all its room on the bottom edge — `padding: 0 var(--pad) 40px` — instead of splitting it above and below: the gap then belongs to the *content*, and a `.section:has([data-section-fold]:not([open]))` rule can drop it in one line. Splitting it would need a previous-sibling selector, which CSS doesn't have. Two open sections are still 40 px apart, exactly as before.

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

The panel opens as one view of the whole guide: the eight sections, all eleven days, all thirteen recommendation lists grouped under the same four chapters the section itself uses, and the lens filter. It closes on selection, Escape, or a click outside; focus moves in on open, is trapped while open, and returns to the trigger on dismissal (but follows the destination when you pick something). Choosing a day opens that day's card as well as scrolling to it.

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
