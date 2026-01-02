/**
 * Main engine API contract.
 * This is the primary entry point for the financial projection engine.
 */
import type {
  ScenarioInputDTO,
  ProjectionResultDTO,
  ProjectionSeries,
  SeriesPoint,
  MonthlyBreakdownRow,
  AnnualSummaryRow,
} from "./types";
import { ENGINE_VERSION } from "./version";
import { prepareInput } from "./internal/normalize";
import { hashInput } from "./internal/hash";
import { runProjection, generateAnnualSummary, type MonthState } from "./internal/projection";
import { buildInflationIndex, realToNominal } from "./internal/growth";
import { round } from "./internal/math";

/**
 * Convert monthly states to projection series format.
 */
function buildSeries(
  months: MonthState[],
  input: ScenarioInputDTO,
  inflationIndex: Map<string, number>
): ProjectionSeries {
  const netWorth: SeriesPoint[] = [];
  const assetsTotal: SeriesPoint[] = [];
  const liabilitiesTotal: SeriesPoint[] = [];
  const incomeTotal: SeriesPoint[] = [];
  const expenseTotal: SeriesPoint[] = [];
  const taxesTotal: SeriesPoint[] = [];
  const cashflowNet: SeriesPoint[] = [];
  const accountBalances: Record<string, SeriesPoint[]> = {};
  const goalProgress: Record<string, { funded: SeriesPoint[]; targetNominal: SeriesPoint[] }> = {};

  // Initialize account balance series
  for (const account of input.accounts) {
    accountBalances[account.id] = [];
  }

  // Initialize goal progress series
  for (const goal of input.goals) {
    goalProgress[goal.id] = {
      funded: [],
      targetNominal: [],
    };
  }

  // Build series from monthly data
  for (const month of months) {
    const t = month.date;

    netWorth.push({ t, v: month.netWorth });
    assetsTotal.push({ t, v: month.totalAssets });
    liabilitiesTotal.push({ t, v: month.totalLiabilities });
    incomeTotal.push({ t, v: month.income });
    expenseTotal.push({ t, v: month.expenses });
    taxesTotal.push({ t, v: month.taxes });
    cashflowNet.push({ t, v: month.netCashflow });

    // Account balances
    for (const accountId of Object.keys(month.accountBalances)) {
      if (accountBalances[accountId]) {
        accountBalances[accountId].push({
          t,
          v: month.accountBalances[accountId],
        });
      }
    }

    // Goal progress
    for (const goal of input.goals) {
      // Funded amount - for now, use net worth as proxy
      // In full implementation, would link to specific accounts
      goalProgress[goal.id].funded.push({
        t,
        v: month.netWorth,
      });

      // Target in nominal dollars
      const targetNominal = realToNominal(
        goal.targetAmountReal,
        inflationIndex,
        t
      );
      goalProgress[goal.id].targetNominal.push({
        t,
        v: targetNominal,
      });
    }
  }

  return {
    netWorth,
    assetsTotal,
    liabilitiesTotal,
    incomeTotal,
    expenseTotal,
    taxesTotal,
    cashflowNet,
    accountBalances,
    goalProgress,
  };
}

/**
 * Convert monthly states to breakdown row format.
 */
function buildMonthlyBreakdown(months: MonthState[]): MonthlyBreakdownRow[] {
  return months.map((month) => ({
    t: month.date,
    income: month.income,
    expenses: month.expenses,
    taxes: month.taxes,
    loanPayments: month.loanPayments,
    contributions: month.contributions,
    investmentReturns: month.investmentReturns,
    netCashflow: month.netCashflow,
    assetsEnd: month.totalAssets,
    liabilitiesEnd: month.totalLiabilities,
  }));
}

/**
 * Convert annual summary to output format.
 */
function buildAnnualSummary(months: MonthState[]): AnnualSummaryRow[] {
  return generateAnnualSummary(months);
}

/**
 * Run the financial projection engine.
 *
 * This is the main entry point for the engine. It takes a scenario input,
 * validates and normalizes it, runs the projection, and returns the results.
 *
 * @param input - Complete scenario input with all financial data
 * @returns Projection results including series, breakdowns, and warnings
 * @throws Error if input validation fails
 *
 * @example
 * ```typescript
 * import { runEngine } from "@finatlas/engine";
 *
 * const result = runEngine({
 *   scenarioId: "baseline",
 *   household: { ... },
 *   assumptions: { ... },
 *   // ... rest of input
 * });
 *
 * console.log(result.series.netWorth);
 * console.log(result.warnings);
 * ```
 */
export function runEngine(input: ScenarioInputDTO): ProjectionResultDTO {
  // Validate and normalize input
  const normalizedInput = prepareInput(input);

  // Generate input hash for caching
  const inputHash = hashInput(normalizedInput);

  // Build inflation index
  const inflationIndex = buildInflationIndex(
    normalizedInput.household.startDate,
    normalizedInput.household.endDate,
    normalizedInput.assumptions.inflationRatePct / 100
  );

  // Run the projection
  const { months, warnings } = runProjection(normalizedInput);

  // Build output structures
  const series = buildSeries(months, normalizedInput, inflationIndex);
  const monthly = buildMonthlyBreakdown(months);
  const annual = buildAnnualSummary(months);

  return {
    engineVersion: ENGINE_VERSION,
    inputHash,
    series,
    monthly,
    annual,
    taxAnnual: [], // Placeholder for detailed tax output
    warnings,
  };
}

/**
 * Validate input without running full projection.
 * Useful for early validation in UI.
 *
 * @param input - Input to validate
 * @returns true if valid, throws Error if invalid
 */
export function validateInput(input: ScenarioInputDTO): boolean {
  prepareInput(input); // Will throw if invalid
  return true;
}

/**
 * Get a hash of the input for caching purposes.
 *
 * @param input - Input to hash
 * @returns 64-character hex hash string
 */
export function getInputHash(input: ScenarioInputDTO): string {
  return hashInput(input);
}
