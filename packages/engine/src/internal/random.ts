/**
 * Seeded pseudo-random number generation for Monte Carlo simulations.
 * Uses deterministic algorithms for reproducibility.
 */

/**
 * Create a seeded pseudo-random number generator using Mulberry32 algorithm.
 * Same seed always produces the same sequence.
 *
 * @param seed - Integer seed value
 * @returns Function that returns next random number in [0, 1)
 */
export function createRNG(seed: number): () => number {
  let state = seed | 0;
  return (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a normally distributed random number using Box-Muller transform.
 *
 * @param mean - Mean of the distribution
 * @param stdDev - Standard deviation
 * @param rng - Random number generator returning values in [0, 1)
 * @returns Normally distributed random number
 */
export function normalRandom(mean: number, stdDev: number, rng: () => number): number {
  let u1 = rng();
  // Avoid log(0)
  while (u1 === 0) u1 = rng();
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + stdDev * z;
}
