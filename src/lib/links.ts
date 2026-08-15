/**
 * Link helpers. Everything the guide points at is a real, tappable anchor —
 * on a phone with patchy signal, a maps deep-link that works offline-ish
 * (it opens the native app) beats an embedded map every time.
 */

/** Google Maps search deep-link. Opens the native app on iOS/Android. */
export function gmapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** `tel:` link. Most numbers in this guide are Lima landlines, so this is the default. */
export function telUrl(phone: string): string {
  return `tel:${phone.replace(/[^+0-9]/g, '')}`;
}

/**
 * WhatsApp link. wa.me wants digits only — no `+`, spaces or punctuation.
 * Kept for any mobile numbers added later; Peru's country code is 51.
 */
export function waUrl(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}`;
}

/** Builds the maps query for a place: name + address reads better than address alone. */
export function placeQuery(name: string, address?: string): string {
  return address ? (address.startsWith(name) ? address : `${name} ${address}`) : name;
}
