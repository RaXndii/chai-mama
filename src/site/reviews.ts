import type { Tried } from './feedback';

/**
 * The reviews shown in the folder by the share card (DECISIONS CM-024). Two sources, and nothing made up:
 * the shop's published reviews, when the site is built with an address for them (VITE_REVIEWS_URL: a JSON list),
 * and the ones shared from this device, kept on it — marked as the visitor's own, and as not sent when they
 * were not (until the shop has a feedback address, nothing is).
 */
export interface Review {
  id: string;
  name: string;
  location?: string;
  tried: Tried;
  /** 1 … 10. */
  rating: number;
  note?: string;
  /** A picture: a URL, or (for the visitor's own) a small image kept on this device. */
  photo?: string;
  /** ISO date. */
  at: string;
  /** Shared from this device. */
  mine?: boolean;
  /** Reached the shop (only for the visitor's own). */
  sent?: boolean;
}

const KEY = 'chai-mama:reviews';
const TRIED: readonly Tried[] = ['heritage', 'lovely', 'both', 'other'];

/** One review as it came from the feed, or null when it is not one. */
export function readReview(x: unknown): Review | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const text = (v: unknown, max: number) =>
    typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined;
  const name = text(o.name, 60);
  const rating = Number(o.rating);
  const tried = TRIED.includes(o.tried as Tried) ? (o.tried as Tried) : 'other';
  if (!name || !(rating >= 1 && rating <= 10)) return null;
  const photo = text(o.photo, 2_000_000);
  return {
    id: text(o.id, 80) ?? `${name}-${String(o.at ?? '')}`,
    name,
    location: text(o.location, 60),
    tried,
    rating: Math.round(rating),
    note: text(o.note ?? o.thoughts, 600),
    photo: photo && /^(https:|data:image\/)/.test(photo) ? photo : undefined,
    at: text(o.at ?? o.sentAt, 40) ?? new Date(0).toISOString(),
  };
}

/** The shop's published reviews (none until it has an address for them). */
export async function loadReviews(): Promise<Review[]> {
  const url = import.meta.env.VITE_REVIEWS_URL as string | undefined;
  if (!url) return [];
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data: unknown = await res.json();
    const rows = Array.isArray(data) ? data : [];
    return rows.map(readReview).filter((r): r is Review => r !== null);
  } catch {
    return [];
  }
}

/** The reviews shared from this device. */
export function myReviews(): Review[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const rows: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(rows)) return [];
    const out: Review[] = [];
    for (const r of rows) {
      const one = readReview(r);
      if (one) out.push({ ...one, mine: true, sent: (r as { sent?: unknown }).sent === true });
    }
    return out;
  } catch {
    return [];
  }
}

/** Keep (or, with `remove`, forget) one of the visitor's own. Quietly does nothing where storage is off. */
export function keepMine(review: Review, remove = false): void {
  try {
    const rest = myReviews().filter((r) => r.id !== review.id);
    const next = remove ? rest : [...rest, { ...review, mine: true }];
    window.localStorage.setItem(KEY, JSON.stringify(next.slice(-20)));
  } catch {
    /* storage is off or full: it is shown for this visit only */
  }
}

/** Everything to show, newest last (the front of the folder's stack), each review once. */
export function mergeReviews(feed: Review[], mine: Review[]): Review[] {
  const byId = new Map<string, Review>();
  for (const r of feed) byId.set(r.id, r);
  // The visitor's own, once published, comes back in the feed: shown once, as theirs.
  for (const r of mine) byId.set(r.id, byId.has(r.id) ? { ...byId.get(r.id)!, mine: true, sent: true } : r);
  return [...byId.values()].sort((a, b) => a.at.localeCompare(b.at));
}

/** The average rating, to one decimal (null when there are none). */
export function averageRating(reviews: Review[]): number | null {
  if (!reviews.length) return null;
  return Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;
}

/** A small copy of a photo to keep with the visitor's own review on this device (about 40 kB). */
export async function smallPhoto(photo: Blob, side = 560): Promise<string> {
  const bitmap = await createImageBitmap(photo);
  const k = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * k));
  canvas.height = Math.max(1, Math.round(bitmap.height * k));
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.78);
}

/** A new id for a review. */
export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
