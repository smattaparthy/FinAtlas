/**
 * Shared constants for the FinAtlas application.
 * Centralizes financial assumptions and multipliers to avoid duplication.
 */

/** Maps frequency strings to annual multipliers */
export const FREQUENCY_MULTIPLIERS: Record<string, number> = {
  ANNUAL: 1,
  MONTHLY: 12,
  BIWEEKLY: 26,
  WEEKLY: 52,
  ONE_TIME: 0,
};

/** Default scenario assumptions */
export const DEFAULT_ASSUMPTIONS = {
  projectionYears: 30,
  inflationRate: 0.025,
  defaultGrowthRate: 0.07,
  retirementWithdrawalRate: 0.04,
} as const;

/** Default estimated tax rate for projections */
export const DEFAULT_TAX_RATE = 0.25;

/** Default investment growth rate for simplified projections */
export const DEFAULT_PROJECTION_GROWTH_RATE = 0.07;

/** Projection years for dashboard/shared view charts */
export const DEFAULT_CHART_PROJECTION_YEARS = 10;
