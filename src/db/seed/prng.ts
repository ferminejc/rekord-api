/**
 * Deterministic PRNG (mulberry32) — the seed script must produce the same dataset on every
 * run, so nothing here may use Math.random() or wall-clock time.
 */
export type Random = () => number;

export function createSeededRandom(seed: number): Random {
  let state = seed >>> 0;

  return function random(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInt(random: Random, min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

export function pick<T>(random: Random, items: readonly T[]): T {
  const index = randomInt(random, 0, items.length - 1);
  const item = items[index];
  if (item === undefined) {
    throw new Error('pick() called with an empty array');
  }
  return item;
}

export function shuffle<T>(random: Random, items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(random, 0, i);
    const a = copy[i] as T;
    const b = copy[j] as T;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}

export function chance(random: Random, probability: number): boolean {
  return random() < probability;
}
