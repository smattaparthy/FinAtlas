/**
 * Monte Carlo simulation engine.
 * Runs multiple projections with randomized investment returns
 * to produce probabilistic outcome distributions.
 */
import type { ScenarioInputDTO } from "../types";
import { prepareInput } from "./normalize";
import { runProjection } from "./projection";
import { createRNG, normalRandom } from "./random";
import { round } from "./math";

/** Configuration for Monte Carlo simulation */
export interface MonteCarloConfig {
  /** Number of simulation runs (default 500, clamped 50-2000) */
  simulations: number;
  /** Annual return standard deviation as percentage (default 15) */
  volatilityPct: number;
  /** Random seed for reproducibility (default 42) */
  seed?: number;
}

/** Percentile bands for a single time point */
export interface PercentileBands {
  t: string;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

/** Complete Monte Carlo result */
export interface MonteCarloResultDTO {
  /** Net worth percentile bands over time */
  bands: PercentileBands[];
  /** Percentage of simulations where final net worth > 0 */
  successRate: number;
  /** Percentage of simulations meeting each goal */
  goalSuccessRates: Record<string, number>;
  /** Number of simulations actually run */
  simulations: number;
  /** Median final net worth */
  medianFinalNetWorth: number;
  /** 10th percentile final net worth (worst-case) */
  p10FinalNetWorth: number;
  /** 90th percentile final net worth (best-case) */
  p90FinalNetWorth: number;
}

/**
 * Run Monte Carlo simulation.
 *
 * For each simulation, randomizes each account's expectedReturnPct using a
 * normal distribution centered on the account's configured return with the
 * specified volatility as standard deviation. Then runs the full projection
 * and collects net worth at each month.
 *
 * @param input - Scenario input (will be normalized internally)
 * @param config - Monte Carlo configuration
 * @returns Percentile bands, success rates, and summary statistics
 */
export function runMonteCarlo(
  input: ScenarioInputDTO,
  config: MonteCarloConfig
): MonteCarloResultDTO {
  const simCount = Math.min(Math.max(config.simulations || 500, 50), 2000);
  const volatility = Math.min(Math.max(config.volatilityPct || 15, 1), 50);
  const seed = config.seed ?? 42;
  const rng = createRNG(seed);

  const normalizedInput = prepareInput(input);

  // Run one baseline projection to get month count and dates
  const { months: baseMonths } = runProjection(normalizedInput);
  const monthCount = baseMonths.length;
  const dates = baseMonths.map((m) => m.date);

  // Storage for net worth values: [monthIndex][simIndex]
  const allNetWorths: number[][] = Array.from({ length: monthCount }, () => []);
  const allFinalNetWorths: number[] = [];

  // Goal success tracking
  const goalSuccessCounts: Record<string, number> = {};
  for (const goal of normalizedInput.goals) {
    goalSuccessCounts[goal.id] = 0;
  }

  for (let sim = 0; sim < simCount; sim++) {
    // Clone input with randomized account returns
    const simInput: ScenarioInputDTO = {
      ...normalizedInput,
      accounts: normalizedInput.accounts.map((account) => {
        const randomReturn = normalRandom(account.expectedReturnPct, volatility, rng);
        return {
          ...account,
          expectedReturnPct: randomReturn,
        };
      }),
    };

    const { months } = runProjection(simInput);

    for (let m = 0; m < months.length; m++) {
      allNetWorths[m].push(months[m].netWorth);
    }

    const finalNW = months[months.length - 1].netWorth;
    allFinalNetWorths.push(finalNW);

    // Check each goal
    for (const goal of normalizedInput.goals) {
      if (finalNW >= goal.targetAmountReal) {
        goalSuccessCounts[goal.id]++;
      }
    }
  }

  // Compute percentile bands for each month
  const bands: PercentileBands[] = dates.map((t, i) => {
    const sorted = [...allNetWorths[i]].sort((a, b) => a - b);
    return {
      t,
      p10: percentile(sorted, 0.1),
      p25: percentile(sorted, 0.25),
      p50: percentile(sorted, 0.5),
      p75: percentile(sorted, 0.75),
      p90: percentile(sorted, 0.9),
    };
  });

  const sortedFinal = [...allFinalNetWorths].sort((a, b) => a - b);
  const successCount = allFinalNetWorths.filter((nw) => nw > 0).length;

  const goalSuccessRates: Record<string, number> = {};
  for (const goal of normalizedInput.goals) {
    goalSuccessRates[goal.id] = round((goalSuccessCounts[goal.id] / simCount) * 100, 1);
  }

  return {
    bands,
    successRate: round((successCount / simCount) * 100, 1),
    goalSuccessRates,
    simulations: simCount,
    medianFinalNetWorth: percentile(sortedFinal, 0.5),
    p10FinalNetWorth: percentile(sortedFinal, 0.1),
    p90FinalNetWorth: percentile(sortedFinal, 0.9),
  };
}

/**
 * Compute percentile from a sorted array using linear interpolation.
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = p * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return round(sorted[lower], 2);
  const weight = idx - lower;
  return round(sorted[lower] * (1 - weight) + sorted[upper] * weight, 2);
}
