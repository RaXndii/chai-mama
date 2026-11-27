import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkFeedback, feedbackForm, sendFeedback, type Feedback } from './feedback';

const base: Feedback = { name: 'Rahand', tried: 'heritage', rating: 9, lang: 'en' };

describe('share your experience (CM-023)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('asks for a name, which tea, and a rating; the email only when given, and then a real one', () => {
    const ok = { name: 'Rahand', email: '', tried: 'lovely' as const, rating: 7 };
    expect(checkFeedback(ok)).toBeNull();
    expect(checkFeedback({ ...ok, name: ' ' })).toBe('name');
    expect(checkFeedback({ ...ok, email: 'rahand@' })).toBe('email');
    expect(checkFeedback({ ...ok, email: 'rahand@example.com' })).toBeNull();
    expect(checkFeedback({ ...ok, tried: null })).toBe('tried');
    expect(checkFeedback({ ...ok, rating: 0 })).toBe('rating');
    expect(checkFeedback({ ...ok, rating: 10 })).toBeNull();
  });

  it('sends every answer given, nothing for what was left empty, and the photo as a file', () => {
    const photo = new Blob(['x'], { type: 'image/jpeg' });
    const form = feedbackForm({ ...base, email: undefined, location: 'Erbil', thoughts: 'Lovely' }, photo);
    expect(form.get('name')).toBe('Rahand');
    expect(form.get('rating')).toBe('9');
    expect(form.get('location')).toBe('Erbil');
    expect(form.has('email')).toBe(false);
    expect(form.get('photo')).toBeInstanceOf(Blob);
    expect(feedbackForm(base).has('photo')).toBe(false);
  });

  it('goes to the feedback address when there is one, and says plainly when there is not', async () => {
    await expect(sendFeedback(base)).resolves.toBe('unsent');
    vi.stubEnv('VITE_FEEDBACK_ENDPOINT', 'https://feedback.example/chai');
    const fetch = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    await expect(sendFeedback(base)).resolves.toBe('sent');
    expect(fetch).toHaveBeenCalledWith(
      'https://feedback.example/chai',
      expect.objectContaining({ method: 'POST' }),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 500 })),
    );
    await expect(sendFeedback(base)).rejects.toThrow();
  });
});
