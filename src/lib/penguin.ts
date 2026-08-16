/**
 * Pancho, the penguin who lives in the footer.
 *
 * Humboldt penguins are the ones you'd actually see off Lima — the little
 * black book already sends you to Islas Palomino for them.
 *
 * Same geometry as the llama: 40 × 40 logical frames exported at 4×, drawn at
 * 2×, ground line on y 38 so the two stand on the same floor. Row order is
 * scripts/pack-penguin.mjs's; keep the two in step.
 */
export interface PenguinAnimation {
  id: string;
  row: number;
  frames: number;
  fps: number;
}

export const PENGUIN_SHEET = '/llama/pancho-4x.webp';
export const PENGUIN_CELL = 80;
export const PENGUIN_SHEET_COLUMNS = 8;
export const PENGUIN_SHEET_ROWS = 3;

export const PENGUIN_ANIMATIONS: Record<string, PenguinAnimation> = {
  walk: { id: 'walk', row: 0, frames: 6, fps: 8 },
  /**
   * The waddle again, slowed right down and going nowhere. The idle export
   * turned out to be byte-identical to the walk one, and a waddle with no
   * travel reads as shifting his weight, so it earns its place rather than
   * being a stand-in.
   */
  idle: { id: 'idle', row: 0, frames: 6, fps: 3 },
  slide: { id: 'slide', row: 1, frames: 6, fps: 10 },
  eat: { id: 'eat', row: 2, frames: 8, fps: 8 },
};

/**
 * px per second. A belly slide should clearly outrun the waddle — and both
 * have to cross a band over a thousand pixels wide in the time someone
 * actually spends looking at a footer. A convincing 26 px/s waddle took him
 * forty seconds to walk on stage, which is nobody's idea of a cameo.
 */
export const PENGUIN_WADDLE_SPEED = 40;
export const PENGUIN_SLIDE_SPEED = 130;
