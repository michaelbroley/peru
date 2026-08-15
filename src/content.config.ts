import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { file, glob } from 'astro/loaders';

/**
 * Every string in these collections is transcribed from Peru_Trip_Content.md.
 * Nothing here is invented — if the markdown didn't say it, it isn't here.
 * `pick: true` is the ★ marker from the source.
 */

/** A single entry in the Little Black Book, and in a day's list of picks. */
const place = z.object({
  name: z.string(),
  area: z.string().optional(),
  note: z.string(),
  address: z.string().optional(),
  phone: z.string().optional(),
  /** ★ in the source markdown. */
  pick: z.boolean().default(false),
  /** Which traveller's interest this serves — drives the "lens" filter. */
  lens: z.enum(['food', 'art', 'skate']).default('food'),
  /** Set where the source says to double-check something before relying on it. */
  verify: z.string().optional(),
  /** Sub-heading within a day's picks, where the source splits them up. */
  group: z.string().optional(),
});

const weather = z.object({
  high: z.string(),
  low: z.string(),
  icon: z.enum(['fog', 'sun', 'cloud-sun', 'rain', 'frost']),
  note: z.string(),
});

const days = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/days' }),
  schema: z.object({
    /** Sort key, 1–11. */
    order: z.number().int(),
    /** Anchor id — matches the Quick Links TOC in the source markdown. */
    slug: z.string(),
    date: z.string(),
    dayNumber: z.string(),
    month: z.string(),
    weekday: z.string(),
    /** "Tour Day 4" etc., where the source gives one. */
    tourDay: z.string().optional(),
    title: z.string(),
    /** ★ on the day title in the source. */
    pick: z.boolean().default(false),
    overnight: z.string().optional(),
    /** Present on the first day of each leg — renders the region divider bar. */
    regionStart: z.object({ title: z.string(), meta: z.string() }).optional(),
    weather,
    glance: z.string(),
    logistics: z.array(z.string()).default([]),
    /** Ordered stops: ["Cusco", "Sacred Valley", "(train)", "Aguas Calientes"]. */
    journey: z.array(z.string()).default([]),
    /** id of a `maps` entry to show inside this day. */
    map: z.string().optional(),
    reservations: z
      .array(
        z.object({
          name: z.string(),
          time: z.string(),
          address: z.string().optional(),
          phone: z.string().optional(),
          note: z.string(),
        }),
      )
      .default([]),
    /** Heading the source uses for the day's suggestions ("Ease into it", …). */
    picksLabel: z.string().optional(),
    picks: z.array(place).default([]),
    /** The "Note:" lines in the source. */
    notes: z.array(z.string()).default([]),
    /** Little Black Book categories surfaced inside this day. */
    lbb: z.array(z.string()).default([]),
  }),
});

const places = defineCollection({
  loader: file('./src/content/places.json'),
  schema: place.extend({
    /** Category id — matches the Recommendations anchors in the TOC. */
    category: z.string(),
    /** Source order. The loader keys entries by id, so this preserves the
        order the markdown lists them in. */
    order: z.number().int(),
  }),
});

const categories = defineCollection({
  loader: file('./src/content/categories.json'),
  schema: z.object({
    order: z.number().int(),
    /** Anchor id from the TOC. */
    slug: z.string(),
    /** "Lima — Ceviche & seafood" */
    title: z.string(),
    /** The parenthetical aside in the source heading, where there is one. */
    aside: z.string().optional(),
    region: z.string(),
  }),
});

const trip = defineCollection({
  loader: file('./src/content/trip.json'),
  schema: z.object({
    travellers: z.string(),
    onTheGround: z.string(),
    tour: z.string(),
    intro: z.string(),
    stats: z.array(z.object({ value: z.string(), label: z.string() })),
    flights: z.array(z.object({ label: z.string(), text: z.string() })),
    snapshot: z.array(
      z.object({
        label: z.string(),
        text: z.string(),
        address: z.string().optional(),
        addressLabel: z.string().optional(),
      }),
    ),
    altitude: z.object({
      text: z.string(),
      profile: z.array(z.object({ day: z.string(), metres: z.number(), tone: z.enum(['low', 'mid', 'high']) })),
      axis: z.array(z.string()),
    }),
    reservations: z.array(
      z.object({
        name: z.string(),
        time: z.string(),
        address: z.string().optional(),
        phone: z.string().optional(),
        note: z.string(),
      }),
    ),
    farewell: z.object({ title: z.string(), text: z.string() }),
  }),
});

const weatherRows = defineCollection({
  loader: file('./src/content/weather.json'),
  schema: z.object({
    order: z.number().int(),
    stop: z.string(),
    elevation: z.string(),
    high: z.string(),
    low: z.string(),
    rain: z.string(),
    story: z.string(),
    icon: z.enum(['fog', 'sun', 'cloud-sun', 'rain', 'frost']),
    /** Accent on the card's top rule. */
    tone: z.enum(['pink', 'gold', 'ink']),
  }),
});

const packing = defineCollection({
  loader: file('./src/content/packing.json'),
  schema: z.object({
    order: z.number().int(),
    title: z.string(),
    aside: z.string().optional(),
    accent: z.enum(['ink', 'pink']).default('ink'),
    items: z.array(z.string()),
  }),
});

/**
 * Map views. Coordinates come from the design comp's own map page — they are
 * not derived from the addresses, so a pin and its address are two independent
 * records of the same place. Treat the address as authoritative if they ever
 * disagree.
 */
const maps = defineCollection({
  loader: file('./src/content/maps.json'),
  schema: z.object({
    order: z.number().int(),
    caption: z.string(),
    height: z.number().int(),
    /** Permanent name labels — only readable on the wide route map. */
    showLabels: z.boolean().default(false),
    points: z.array(
      z.object({
        name: z.string(),
        lat: z.number(),
        lng: z.number(),
        note: z.string(),
        /** ★ — draws the gold pin. */
        pick: z.boolean().default(false),
        labelDir: z.enum(['left', 'right', 'top', 'bottom']).optional(),
      }),
    ),
    /** Drawn as the dashed route line, in travel order. */
    route: z.array(z.tuple([z.number(), z.number()])).optional(),
  }),
});

const checklist = defineCollection({
  loader: file('./src/content/checklist.json'),
  schema: z.object({
    order: z.number().int(),
    label: z.string(),
  }),
});

export const collections = { days, places, categories, trip, weatherRows, packing, checklist, maps };
