import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  averageRating,
  keepMine,
  loadReviews,
  mergeReviews,
  myReviews,
  readReview,
  type Review,
} from './reviews';

const one = (id: string, at: string, extra: Partial<Review> = {}): Review => ({
  id,
  name: 'Sara',
  tried: 'heritage',
  rating: 9,
  at,
  ...extra,
});

describe('the reviews (CM-024)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('reads a review, and turns away what is not one', () => {
    expect(
      readReview({ name: ' Sara ', rating: '9', tried: 'lovely', thoughts: 'Lovely', at: '2026-11-20' }),
    ).toMatchObject({
      name: 'Sara',
      rating: 9,
      tried: 'lovely',
      note: 'Lovely',
    });
    expect(readReview({ name: 'Sara', rating: 11 })).toBeNull();
    expect(readReview({ rating: 8 })).toBeNull();
    expect(readReview('nope')).toBeNull();
    // A picture only from a safe address.
    expect(readReview({ name: 'A', rating: 5, photo: 'javascript:alert(1)' })?.photo).toBeUndefined();
    expect(readReview({ name: 'A', rating: 5, photo: 'https://x.example/p.jpg' })?.photo).toBe(
      'https://x.example/p.jpg',
    );
  });

  it('shows none from the shop until it has an address for them; then its list', async () => {
    await expect(loadReviews()).resolves.toEqual([]);
    vi.stubEnv('VITE_REVIEWS_URL', 'https://reviews.example/chai.json');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json([{ id: 'x', name: 'Lena', rating: 10, tried: 'both', at: '2026-11-24' }, { bad: 1 }]),
      ),
    );
    const rows = await loadReviews();
    expect(rows.map((r) => r.name)).toEqual(['Lena']);
  });

  it('keeps the visitor’s own on this device, and forgets one when asked', () => {
    keepMine(one('a', '2026-11-20', { sent: false }));
    keepMine(one('b', '2026-11-21', { sent: true }));
    expect(myReviews().map((r) => [r.id, r.mine, r.sent])).toEqual([
      ['a', true, false],
      ['b', true, true],
    ]);
    keepMine(one('a', '2026-11-20'), true);
    expect(myReviews().map((r) => r.id)).toEqual(['b']);
  });

  it('shows each review once, oldest first (the newest at the front of the folder), and their average', () => {
    const feed = [one('a', '2026-11-22', { rating: 8 }), one('b', '2026-11-20', { rating: 10 })];
    const mine = [one('a', '2026-11-22', { mine: true }), one('c', '2026-11-25', { mine: true, rating: 7 })];
    const all = mergeReviews(feed, mine);
    expect(all.map((r) => r.id)).toEqual(['b', 'a', 'c']);
    expect(all.find((r) => r.id === 'a')).toMatchObject({ mine: true, sent: true, rating: 8 });
    expect(averageRating(all)).toBe(8.3);
    expect(averageRating([])).toBeNull();
  });
});
