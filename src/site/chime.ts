/**
 * The sound of an order going in (DECISIONS CM-020), made in the browser: no file to download. A soft pop as the
 * pack lands, a warm bell chord rising over it (G major, each note a struck bell: its tone and a little of the
 * bell's own overtone), a short shimmer of echo; and a clink of a tea glass as Mama winks.
 *
 * The browser only lets a page make sound after the visitor has done something, so `primeChime` runs in the tap
 * on Place order, before the order is sent; `playChime` then plays when it has gone. On an iPhone the ringer
 * switch silences it, as it does every web page.
 */
type Ctor = typeof AudioContext;

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (ctx) return ctx;
  const AC: Ctor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
  } catch {
    return null;
  }
  return ctx;
}

/** In the visitor's tap: wakes the sound up (an iPhone also wants a sound started in the tap itself). */
export function primeChime(): void {
  const c = audio();
  if (!c) return;
  if (c.state === 'suspended') void c.resume().catch(() => {});
  try {
    const silent = c.createBufferSource();
    silent.buffer = c.createBuffer(1, 1, c.sampleRate);
    silent.connect(c.destination);
    silent.start();
  } catch {
    /* nothing to wake */
  }
}

/** A struck bell: the note, and its overtone, fading over `ring` seconds. */
function bell(c: AudioContext, out: AudioNode, at: number, freq: number, level: number, ring = 1.4) {
  for (const [ratio, gain, type] of [
    [1, 1, 'sine'],
    [2, 0.22, 'sine'],
    [2.76, 0.12, 'sine'],
    [4.07, 0.05, 'triangle'],
  ] as const) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq * ratio, at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(level * gain, at + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, at + ring / ratio ** 0.35);
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + ring + 0.05);
  }
}

/** A round, soft pop: a tone falling fast. */
function pop(c: AudioContext, out: AudioNode, at: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(520, at);
  o.frequency.exponentialRampToValueAtTime(140, at + 0.09);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.55, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
  o.connect(g).connect(out);
  o.start(at);
  o.stop(at + 0.2);
}

/** Two glasses touching: high and bright, quickly gone. */
function clink(c: AudioContext, out: AudioNode, at: number) {
  bell(c, out, at, 2637, 0.16, 0.5);
  bell(c, out, at + 0.012, 3520, 0.09, 0.35);
}

/** The whole sound, at the page's moments: the pack landing (`land`) and the wink (`wink`), in seconds from now. */
export function playChime({ land, wink }: { land: number; wink: number }): boolean {
  const c = audio();
  if (!c || c.state === 'closed') return false;
  if (c.state === 'suspended') void c.resume().catch(() => {});
  const t = c.currentTime + 0.02;
  const master = c.createGain();
  master.gain.value = 0.42;
  // A little echo, for the shimmer of a shop bell.
  const echo = c.createDelay(1);
  echo.delayTime.value = 0.16;
  const back = c.createGain();
  back.gain.value = 0.28;
  const wet = c.createGain();
  wet.gain.value = 0.3;
  const soft = c.createBiquadFilter();
  soft.type = 'lowpass';
  soft.frequency.value = 5200;
  master.connect(soft).connect(c.destination);
  master.connect(echo);
  echo.connect(back).connect(echo);
  echo.connect(wet).connect(soft);

  pop(c, master, t + land);
  // G5, B5, D6 and G6, one after another: up, and done.
  [784, 988, 1175, 1568].forEach((f, i) =>
    bell(c, master, t + land + 0.04 + i * 0.075, f, i === 3 ? 0.3 : 0.24),
  );
  clink(c, master, t + wink);
  window.setTimeout(
    () => {
      for (const n of [master, echo, back, wet, soft]) n.disconnect();
    },
    (wink + 2) * 1000,
  );
  return true;
}

/** Just the clink (Mama winks again when tapped). */
export function playClink(): void {
  const c = audio();
  if (!c || c.state !== 'running') return;
  const g = c.createGain();
  g.gain.value = 0.4;
  g.connect(c.destination);
  clink(c, g, c.currentTime + 0.01);
}
