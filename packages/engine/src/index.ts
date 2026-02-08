export * from "./types";
export * from "./version";
export * from "./contract";
export {
  calculateFederalIncomeTax,
  calculateFICA,
  calculateStateTax,
  calculateAnnualTaxes,
  calculateMonthlyTaxes,
  getMarginalRate,
  getStandardDeduction,
  estimateTaxSavings,
  CONTRIBUTION_LIMITS_2024,
} from "./internal/taxes";
export { runMonteCarlo } from "./internal/montecarlo";
export type {
  MonteCarloConfig,
  MonteCarloResultDTO,
  PercentileBands,
} from "./internal/montecarlo";
