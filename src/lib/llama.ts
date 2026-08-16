/**
 * Chaska — the 16-bit llama who lives at the bottom of the guide.
 *
 * The sprite sheet ships eleven "day" animations numbered 1–11. Taking them in
 * that order would put the Nazca lines on a Cusco rest day and a parrot on the
 * flight home, so they're matched to what we're actually doing instead. Four
 * of them land exactly (Lady Bee, Maido, Machu Picchu, Titicaca); the rest are
 * chosen for the best fit, and the leftovers go where they jar least.
 */

/** One row of the packed sheet. Row order is the manifest's, not the day's. */
export interface LlamaAnimation {
  id: string;
  row: number;
  frames: number;
  fps: number;
  /**
   * Drawn facing the opposite way to travel. Only the moonwalk: she faces
   * right with the dust trailing off to her left, so she has to be mirrored
   * against her direction rather than with it. That inversion is the joke.
   */
  backwards?: boolean;
}

export const LLAMA_SHEET = '/llama/chaska-4x.webp';

/** Logical frame is 40×40 exported at 4×; we draw at 2×, so an 80px cell. */
export const LLAMA_CELL = 80;
export const LLAMA_SHEET_COLUMNS = 8;
export const LLAMA_SHEET_ROWS = 19;

export const LLAMA_ANIMATIONS: Record<string, LlamaAnimation> = {
  ladybee: { id: 'ladybee', row: 0, frames: 8, fps: 8 },
  maido: { id: 'maido', row: 1, frames: 8, fps: 7 },
  dress: { id: 'dress', row: 2, frames: 8, fps: 7 },
  eat: { id: 'eat', row: 3, frames: 8, fps: 6 },
  flag: { id: 'flag', row: 4, frames: 6, fps: 8 },
  ruins: { id: 'ruins', row: 5, frames: 6, fps: 5 },
  nazca: { id: 'nazca', row: 6, frames: 8, fps: 8 },
  rainbow: { id: 'rainbow', row: 7, frames: 8, fps: 6 },
  boat: { id: 'boat', row: 8, frames: 6, fps: 5 },
  amazon: { id: 'amazon', row: 9, frames: 8, fps: 7 },
  inti: { id: 'inti', row: 10, frames: 8, fps: 8 },
  wave: { id: 'wave', row: 11, frames: 6, fps: 8 },
  dance: { id: 'dance', row: 12, frames: 8, fps: 10 },
  idle: { id: 'idle', row: 13, frames: 8, fps: 4 },
  run: { id: 'run', row: 14, frames: 6, fps: 12 },
  trip: { id: 'trip', row: 15, frames: 8, fps: 10 },
  tap: { id: 'tap', row: 16, frames: 6, fps: 10 },
  // Appended to the sheet after the handoff, by scripts/pack-llama.mjs.
  moonwalk: { id: 'moonwalk', row: 17, frames: 8, fps: 10, backwards: true },
  sleep: { id: 'sleep', row: 18, frames: 6, fps: 3 },
};

/**
 * Which animation belongs to which day of the trip, by ISO date, with the
 * caption Chaska gets when she plays it.
 */
export const LLAMA_DAYS: Record<string, { anim: string; say: string }> = {
  // The sheet's own day 1 — and ours. Cocktail shaker, then a sip.
  '2026-09-16': { anim: 'ladybee', say: '¡Lady Bee!' },
  // Likewise exact: head down to the nigiri, chews, approves.
  '2026-09-17': { anim: 'maido', say: '¡Maido!' },
  // The tour begins and the group meets — she waves the flag.
  '2026-09-18': { anim: 'flag', say: '¡Vamos!' },
  // Up to 3,400 m. The chullo drops in and the poncho goes on.
  '2026-09-19': { anim: 'dress', say: '¡Cusco!' },
  // Down into the cloud forest at Aguas Calientes, where the guide's own
  // wildlife list has the birding. A parrot lands on her head.
  '2026-09-20': { anim: 'amazon', say: '¡Un loro!' },
  // Exact: the terraces, Huayna Picchu behind, mist drifting.
  '2026-09-21': { anim: 'ruins', say: '¡Machu Picchu!' },
  // The free day's big option is Palccoyo or Vinicunca — the rainbow ridge.
  '2026-09-22': { anim: 'rainbow', say: '¡Arcoíris!' },
  // Seven hours across the Altiplano; she draws a line across the desert.
  '2026-09-23': { anim: 'nazca', say: '¡Al Altiplano!' },
  // Exact: night on the lake in a totora boat, breath fogging.
  '2026-09-24': { anim: 'boat', say: '¡Titicaca!' },
  // The farewell dinner in Barranco. Ceviche, then a pisco sour.
  '2026-09-25': { anim: 'eat', say: '¡Salud!' },
  // Trip complete. Full regalia inside a turning sun disc.
  '2026-09-26': { anim: 'inti', say: '¡Hasta luego!' },
};
