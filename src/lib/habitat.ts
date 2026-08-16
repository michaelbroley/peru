/**
 * The footer's backdrops.
 *
 * Four pixel scenes, picked by the reader's own clock so the habitat matches
 * the hour they're looking at it: the coast in the morning, a green valley
 * through the middle of the day, the Andes at dusk, and the night sky after
 * dark. Whoever's reading late gets the one with the message in the stars.
 *
 * Lossless WebP at full resolution, about 6 KB each — see
 * scripts/pack-habitat.mjs for why lossy is the wrong tool here.
 */
export interface Backdrop {
  id: string;
  src: string;
  /** Local hour this scene takes over at; runs until the next one starts. */
  from: number;
}

/** In clock order. The last entry wraps around midnight. */
export const HABITAT_BACKDROPS: Backdrop[] = [
  { id: 'backdrop3', src: '/habitat/backdrop3.webp', from: 5 },
  { id: 'backdrop2', src: '/habitat/backdrop2.webp', from: 11 },
  { id: 'backdrop1', src: '/habitat/backdrop1.webp', from: 17 },
  { id: 'backdrop4', src: '/habitat/backdrop4.webp', from: 21 },
];

/** Which scene belongs to a given local hour. */
export function backdropForHour(hour: number): Backdrop {
  let chosen = HABITAT_BACKDROPS.at(-1)!;
  for (const backdrop of HABITAT_BACKDROPS) {
    if (hour >= backdrop.from) chosen = backdrop;
  }
  // Before the first entry's hour we're still in last night's scene.
  if (hour < HABITAT_BACKDROPS[0]!.from) chosen = HABITAT_BACKDROPS.at(-1)!;
  return chosen;
}
