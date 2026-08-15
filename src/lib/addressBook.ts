import { getCollection, getEntry } from 'astro:content';
import { placeQuery } from './links';

/**
 * Every name→address pair anywhere in the content, so a map pin can link to
 * the same Google Maps search as that place's address elsewhere in the guide.
 * Addresses live in three places — the Little Black Book, a day's reservations
 * and picks, and the trip snapshot — and pins are named independently of all
 * three, so the lookup tolerates a shorter or longer name than the record.
 */
export type AddressBook = Map<string, string>;

let cached: AddressBook | null = null;

export async function getAddressBook(): Promise<AddressBook> {
  if (cached) return cached;

  const book: AddressBook = new Map();
  const add = (name: string, address?: string) => {
    if (!address) return;
    const key = name.toLowerCase();
    if (!book.has(key)) book.set(key, placeQuery(name, address));
  };

  for (const place of await getCollection('places')) {
    add(place.data.name, place.data.address);
  }

  for (const day of await getCollection('days')) {
    for (const reservation of day.data.reservations) add(reservation.name, reservation.address);
    for (const pick of day.data.picks) add(pick.name, pick.address);
  }

  const trip = await getEntry('trip', 'snapshot');
  if (trip) {
    for (const reservation of trip.data.reservations) add(reservation.name, reservation.address);
    for (const row of trip.data.snapshot) {
      // "Hotel El Señorial, Calle José Gonzáles 567, …" — the venue name is the
      // part before the first comma.
      if (row.address) add(row.address.split(',')[0]!.trim(), row.address);
    }
  }

  cached = book;
  return book;
}

/** Exact match first, then either name being a prefix of the other. */
export function lookupAddress(book: AddressBook, name: string): string | undefined {
  const key = name.toLowerCase();
  const exact = book.get(key);
  if (exact) return exact;

  for (const [candidate, query] of book) {
    if (candidate.startsWith(`${key} `) || key.startsWith(`${candidate} `)) return query;
  }
  return undefined;
}
