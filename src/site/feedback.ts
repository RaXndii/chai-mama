import type { Locale } from '@/content/types';
import { emailOk } from './checkout';

/**
 * Share your experience (DECISIONS CM-023), apart from its looks: what is asked, what must be there, the photo
 * made small enough to send, and where it goes.
 */
export type Tried = 'heritage' | 'lovely' | 'both' | 'other';

export interface Feedback {
  /** The review's own id (it comes back with it once published). */
  id?: string;
  name: string;
  email?: string;
  location?: string;
  tried: Tried;
  /** 1 … 10. */
  rating: number;
  thoughts?: string;
  /** May the photo be shown in the reviews (CM-024)? */
  photoConsent?: boolean;
  lang: Locale;
}

export type FeedbackError = 'name' | 'email' | 'tried' | 'rating';

/** The first thing missing or wrong, in the order the form asks; null when it can go. */
export function checkFeedback(f: {
  name: string;
  email: string;
  tried: Tried | null;
  rating: number;
}): FeedbackError | null {
  if (f.name.trim().length < 2) return 'name';
  if (f.email.trim() && !emailOk(f.email)) return 'email';
  if (!f.tried) return 'tried';
  if (!(f.rating >= 1 && f.rating <= 10)) return 'rating';
  return null;
}

/** The longest side of a photo as it is sent: plenty for a look at a cup of tea, small enough for a phone's data. */
export const PHOTO_MAX = 1600;

/** A photo from the phone or computer, as a JPEG no larger than PHOTO_MAX on its longest side. */
export async function shrinkPhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('not an image');
  const bitmap = await createImageBitmap(file);
  const k = Math.min(1, PHOTO_MAX / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * k));
  const h = Math.max(1, Math.round(bitmap.height * k));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('no photo'))), 'image/jpeg', 0.85),
  );
}

/** The form's parts as sent: every answer given (nothing for what was left empty), and the photo as a file. */
export function feedbackForm(f: Feedback, photo?: Blob | null): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(f)) {
    if (v === undefined || v === '') continue;
    form.append(k, String(v));
  }
  form.append('sentAt', new Date().toISOString());
  if (photo) form.append('photo', photo, 'photo.jpg');
  return form;
}

/**
 * Send it. It goes to the shop's feedback address when the site is built with one (VITE_FEEDBACK_ENDPOINT: a
 * URL that takes a form, the photo as a file); without one nothing leaves the page, and the visitor is told so.
 */
export async function sendFeedback(f: Feedback, photo?: Blob | null): Promise<'sent' | 'unsent'> {
  const url = import.meta.env.VITE_FEEDBACK_ENDPOINT as string | undefined;
  if (!url) return 'unsent';
  const res = await fetch(url, { method: 'POST', body: feedbackForm(f, photo) });
  if (!res.ok) throw new Error(String(res.status));
  return 'sent';
}
