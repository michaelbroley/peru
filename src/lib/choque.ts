/**
 * El choque — what happens when the llama and the penguin walk into each other.
 *
 * The only sprite with two characters in one cell: 80 × 40 logical, composed
 * llama-left and penguin-right, ten frames from closing to dust to the pair of
 * them picking themselves up on opposite sides. Mirroring the whole cell gives
 * penguin-left, llama-right; the swap and the exits both survive the flip, so
 * one strip covers either approach.
 *
 * The numbers below are read off the art rather than chosen: they're what makes
 * the cut into and out of the composite land without either character jumping.
 */
export const CHOQUE_SHEET = '/llama/choque-4x.webp';

/** Drawn at 2×, like everything else: an 80 × 40 cell is 160 × 80 on screen. */
export const CHOQUE_WIDTH = 160;
export const CHOQUE_HEIGHT = 80;
export const CHOQUE_FRAMES = 10;
export const CHOQUE_FPS = 10;

/**
 * Centre-to-centre distance between the two characters in frame 0 — and so the
 * gap to cut at. Trigger any closer and they'd snap apart to meet the art;
 * any further and they'd snap together.
 */
export const CHOQUE_ENTRY_GAP = 120;

/** The same measurement on frame 9, where they've swapped and are walking off. */
export const CHOQUE_EXIT_GAP = 120;

/**
 * How long the referee stands down afterwards.
 *
 * A band this size with two characters pacing it end to end means they meet
 * constantly — at six seconds they spent the whole time crashing, which reads
 * as a bug rather than a joke. Forty-five puts it on the same footing as the
 * llama's own fourteen-to-thirty-eight-second cadence: something you catch,
 * not something you watch.
 */
export const CHOQUE_COOLDOWN = 45000;

/**
 * The fastest the two of them can genuinely close on each other, in px/s, with
 * a wide margin: a running llama is 42 and a sliding penguin is 130.
 *
 * Anything quicker isn't walking, it's teleporting — a resize, the llama being
 * switched back on, the penguin being put down after a crash — and none of
 * those are a collision. Measuring the rate rather than the raw distance is
 * what tells the two apart.
 */
export const CHOQUE_MAX_CLOSING = 400;
