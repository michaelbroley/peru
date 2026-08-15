/**
 * Temperature strings in the content are human-written ("~20°", "−1°",
 * "~0 to −1°"). The range bar needs numbers, so parse leniently and fail
 * soft — a bar that can't be placed just isn't drawn.
 */

/** Trip-wide scale for the range bars, in °C. Covers Puno nights to Cusco noon. */
export const SCALE_MIN = -5;
export const SCALE_MAX = 25;

export function parseTemp(value: string): number | null {
  // U+2212 minus sign and en dash both appear in the source; normalise to '-'.
  const normalised = value.replace(/[−–]/g, '-');
  const match = normalised.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

/** Position on the shared scale, 0–100%. */
export function tempPercent(celsius: number): number {
  const clamped = Math.min(SCALE_MAX, Math.max(SCALE_MIN, celsius));
  return ((clamped - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100;
}

/** Left offset and width for a low→high span, or null if unparseable. */
export function tempRange(high: string, low: string): { left: number; width: number } | null {
  const hi = parseTemp(high);
  const lo = parseTemp(low);
  if (hi === null || lo === null) return null;
  const left = tempPercent(Math.min(hi, lo));
  const right = tempPercent(Math.max(hi, lo));
  return { left, width: Math.max(right - left, 2) };
}
