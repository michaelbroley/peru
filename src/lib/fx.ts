/**
 * The soles/dollars rate, for whoever on the page wants it.
 *
 * Two components need the same number — the converter in section 09 and the
 * tip calculator in section 10 — and neither should be fetching it separately
 * or reaching into the other. This module owns it: one fetch, one cache, one
 * value, however many subscribers.
 *
 * Import order can't matter here, so this is a module rather than an event.
 * A component that subscribes after the rate has already arrived is told
 * immediately rather than waiting for a broadcast it missed.
 */

const CACHE_KEY = 'peru-fx-rate';
const ENDPOINT = 'https://open.er-api.com/v6/latest/CAD';

/** A week. Yesterday's real rate still beats a figure typed in months ago. */
const CACHE_TTL = 7 * 24 * 3600_000;

export interface Rate {
  /** Soles to one Canadian dollar. */
  penPerCad: number;
  /** When this rate was observed, or null for the figure baked into content. */
  at: number | null;
}

type Listener = (rate: Rate) => void;

let current: Rate | null = null;
let started = false;
const listeners = new Set<Listener>();

function publish(rate: Rate): void {
  current = rate;
  for (const listener of listeners) listener(rate);
}

function readCache(): Rate | null {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as { rate?: number; at?: number } | null;
    if (!raw || typeof raw.rate !== 'number' || typeof raw.at !== 'number') return null;
    if (Date.now() - raw.at > CACHE_TTL) return null;
    return { penPerCad: raw.rate, at: raw.at };
  } catch {
    return null;
  }
}

/**
 * A rate this far from the baked one is a broken response, not a currency
 * crisis — the sol has traded in a narrow band for twenty years. Taking a
 * wrong number is worse than keeping a stale one.
 */
function believable(rate: number, baked: number): boolean {
  return rate > baked / 3 && rate < baked * 3;
}

function start(baked: number): void {
  const cached = readCache();
  if (cached && believable(cached.penPerCad, baked)) publish(cached);

  if (navigator.onLine === false) return;

  fetch(ENDPOINT)
    .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
    .then((data: { rates?: Record<string, number> }) => {
      const rate = data.rates?.PEN;
      if (typeof rate !== 'number' || !believable(rate, baked)) return;
      const at = Date.now();
      publish({ penPerCad: rate, at });
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ rate, at }));
      } catch {
        /* storage full or blocked — the rate still showed */
      }
    })
    .catch(() => {
      /* no signal, or the service is down: the baked rate stays put */
    });
}

/**
 * Subscribe to the rate. `baked` is the figure from content — the first caller
 * seeds it, and it's what everything falls back to with no signal.
 *
 * The callback fires straight away with whatever is known, and again whenever
 * a better number arrives.
 */
export function onRate(baked: number, listener: Listener): void {
  listeners.add(listener);

  if (!started) {
    started = true;
    current = current ?? { penPerCad: baked, at: null };
    // Let the caller finish wiring up before anything can be published.
    listener(current);
    start(baked);
    return;
  }

  listener(current ?? { penPerCad: baked, at: null });
}
