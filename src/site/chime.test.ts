import { afterEach, describe, expect, it, vi } from 'vitest';

describe('the sound of an order (CM-020)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('stays quiet, without an error, where a browser cannot make sound', async () => {
    vi.stubGlobal('AudioContext', undefined);
    const { primeChime, playChime, playClink } = await import('./chime');
    expect(() => primeChime()).not.toThrow();
    expect(playChime({ land: 0.5, wink: 1.2 })).toBe(false);
    expect(() => playClink()).not.toThrow();
  });

  it('plays the pop, the chord and the clink at their moments', async () => {
    const starts: number[] = [];
    const node = () => ({
      connect: (n: unknown) => n,
      disconnect: () => {},
      gain: { value: 1, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      frequency: { value: 0, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      delayTime: { value: 0 },
      type: '',
      start: (t: number) => starts.push(t),
      stop: () => {},
    });
    class FakeContext {
      state = 'running';
      currentTime = 10;
      sampleRate = 48000;
      destination = node();
      createOscillator = node;
      createGain = node;
      createDelay = node;
      createBiquadFilter = node;
      createBufferSource = node;
      createBuffer = () => ({});
      resume = () => Promise.resolve();
    }
    vi.stubGlobal('AudioContext', FakeContext);
    const { playChime } = await import('./chime');
    expect(playChime({ land: 0.5, wink: 1.2 })).toBe(true);
    const at = starts.map((t) => +(t - 10.02).toFixed(3));
    // The pop as the pack lands; four bells of four tones each after it; the clink (two bells) at the wink.
    expect(at[0]).toBe(0.5);
    expect(at.filter((t) => t > 0.5 && t < 1)).toHaveLength(16);
    expect(at.filter((t) => t >= 1.2)).toHaveLength(8);
  });
});
