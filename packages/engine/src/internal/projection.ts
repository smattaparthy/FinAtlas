/**
 * Main projection loop - the heart of the financial planning engine.
 * Simulates financial outcomes month by month over the projection period.
 */
import type {
  ScenarioInputDTO,
  IncomeDTO,
  ExpenseDTO,
  Warning,
} from "../types";
import { round, sum } from "./math";
import {
  parseISO,
  addMonths,
  getMonthKey,
  startOfMonth,
  isAfter,
  formatISO,
} from "./dates";
import { buildInflationIndex, applyGrowth } from "./growth";
import { normalizeToMonthly, isDateInPeriod, generateMonthRange } from "./schedules";
import {
  generateAmortizationSchedule,
  getMonthlyPaymentAtDate,
  getLoanBalanceAtDate,
  type AmortizationRow,
} from "./loans";
import {
  initializeAccountStates,
  processMonthlyContributions,
  applyMonthlyReturns,
  snapshotAccountBalances,
  getTotalAccountBalance,
  getTotalContributions,
  getTotalReturns,
  resetPeriodCounters,
  type AccountState,
} from "./accounts";
import { calculateMonthlyTaxes as calculateTaxesWithBrackets } from "./taxes";

/**
 * State for a single month in the projection.
 */
export interface MonthState {
  date: string; // YYYY-MM-DD format (first of month)
  income: number;
  expenses: number;
  taxes: number;
  loanPayments: number;
  contributions: number;
  investmentReturns: number;
  netCashflow: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  accountBalances: Record<string, number>;
}

/**
 * Internal state maintained during projection.
 */
interface ProjectionState {
  accounts: AccountState[];
  loanSchedules: Map<string, AmortizationRow[]>;
  inflationIndex: Map<string, number>;
  warnings: Warning[];
}

/**
 * Calculate monthly income from all sources.
 */
function calculateMonthlyIncome(
  incomes: IncomeDTO[],
  date: string,
  inflationIndex: Map<string, number>
): number {
  let total = 0;

  for (const income of incomes) {
    // Check if income is active for this month
    if (!isDateInPeriod(date, income.startDate, income.endDate)) {
      continue;
    }

    // Normalize to monthly amount
    const baseMonthly = normalizeToMonthly(income.amount, income.frequency);

    // Apply growth
    const adjusted = applyGrowth(
      baseMonthly,
      income.growthRule,
      income.growthPct !== undefined ? income.growthPct / 100 : undefined,
      inflationIndex,
      date
    );

    total += adjusted;
  }

  return round(total, 2);
}

/**
 * Calculate monthly expenses from all sources.
 */
function calculateMonthlyExpenses(
  expenses: ExpenseDTO[],
  date: string,
  inflationIndex: Map<string, number>
): number {
  let total = 0;

  for (const expense of expenses) {
    // Check if expense is active for this month
    if (!isDateInPeriod(date, expense.startDate, expense.endDate)) {
      continue;
    }

    // Normalize to monthly amount
    const baseMonthly = normalizeToMonthly(expense.amount, expense.frequency);

    // Apply growth
    const adjusted = applyGrowth(
      baseMonthly,
      expense.growthRule,
      expense.growthPct !== undefined ? expense.growthPct / 100 : undefined,
      inflationIndex,
      date
    );

    total += adjusted;
  }

  return round(total, 2);
}

/**
 * Calculate total loan payments for a month.
 */
function calculateMonthlyLoanPayments(
  loanSchedules: Map<string, AmortizationRow[]>,
  date: string
): number {
  let total = 0;

  for (const [, schedule] of loanSchedules) {
    total += getMonthlyPaymentAtDate(schedule, date);
  }

  return round(total, 2);
}

/**
 * Calculate total loan balances (liabilities).
 */
function calculateTotalLiabilities(
  loanSchedules: Map<string, AmortizationRow[]>,
  date: string
): number {
  let total = 0;

  for (const [, schedule] of loanSchedules) {
    total += getLoanBalanceAtDate(schedule, date);
  }

  return round(total, 2);
}

/**
 * Calculate monthly taxes using bracket-based calculation.
 * Uses 2024 federal brackets with inflation adjustment for future years.
 */
function calculateMonthlyTaxes(
  income: number,
  input: ScenarioInputDTO,
  inflationIndex: Map<string, number>,
  date: string
): number {
  // Use the new bracket-based tax calculation
  const baseTaxes = calculateTaxesWithBrackets(income, input.taxProfile);

  // Apply inflation adjustment to tax brackets for future projections
  // The tax code typically indexes brackets for inflation
  const inflationFactor = inflationIndex.get(date.slice(0, 7)) ?? 1;

  // If we're in a future year, effective taxes may be slightly lower
  // due to bracket creep working in taxpayer's favor
  if (inflationFactor > 1) {
    // Adjust taxes down slightly to account for indexed brackets
    // This is a simplification - real brackets update annually
    const adjustmentFactor = 1 / Math.sqrt(inflationFactor);
    return round(baseTaxes * adjustmentFactor, 2);
  }

  return baseTaxes;
}

/**
 * Initialize loan amortization schedules.
 */
function initializeLoanSchedules(
  input: ScenarioInputDTO
): Map<string, AmortizationRow[]> {
  const schedules = new Map<string, AmortizationRow[]>();

  for (const loan of input.loans) {
    const schedule = generateAmortizationSchedule(
      loan,
      input.household.startDate,
      input.household.endDate
    );
    schedules.set(loan.id, schedule);
  }

  return schedules;
}

/**
 * Run the main projection loop.
 *
 * @param input - Normalized scenario input
 * @returns Array of monthly states and warnings
 */
export function runProjection(input: ScenarioInputDTO): {
  months: MonthState[];
  warnings: Warning[];
} {
  const warnings: Warning[] = [];

  // Build inflation index for the projection period
  const inflationIndex = buildInflationIndex(
    input.household.startDate,
    input.household.endDate,
    input.assumptions.inflationRatePct / 100
  );

  // Initialize loan schedules
  const loanSchedules = initializeLoanSchedules(input);

  // Initialize account states
  const accounts = initializeAccountStates(input.accounts);

  // Generate month range
  const monthRange = generateMonthRange(
    input.household.startDate,
    input.household.endDate
  );

  // Check for missing tax rules
  if (!input.taxRules.federal && !input.taxRules.state) {
    warnings.push({
      code: "TAX_RULES_MISSING",
      severity: "info",
      message: "Using simplified tax approximation. For accurate results, configure tax rules.",
    });
  }

  // Run projection for each month
  const months: MonthState[] = [];

  for (const monthKey of monthRange) {
    // Reset period counters for this month
    resetPeriodCounters(accounts);

    // Current date is first of month
    const date = monthKey + "-01";

    // Calculate income
    const income = calculateMonthlyIncome(input.incomes, date, inflationIndex);

    // Calculate expenses
    const expenses = calculateMonthlyExpenses(input.expenses, date, inflationIndex);

    // Calculate taxes
    const taxes = calculateMonthlyTaxes(income, input, inflationIndex, date);

    // Calculate loan payments
    const loanPayments = calculateMonthlyLoanPayments(loanSchedules, date);

    // Process contributions (modifies accounts in place)
    processMonthlyContributions(accounts, input.contributions, date, inflationIndex);
    const contributions = getTotalContributions(accounts);

    // Apply investment returns (modifies accounts in place)
    applyMonthlyReturns(accounts, input.accounts);
    const investmentReturns = getTotalReturns(accounts);

    // Calculate net cashflow
    const netCashflow = round(
      income - expenses - taxes - loanPayments - contributions + investmentReturns,
      2
    );

    // Calculate totals
    const totalAssets = getTotalAccountBalance(accounts);
    const totalLiabilities = calculateTotalLiabilities(loanSchedules, date);
    const netWorth = round(totalAssets - totalLiabilities, 2);

    // Check for deficit month
    if (netCashflow < 0) {
      warnings.push({
        code: "DEFICIT_MONTH",
        severity: "warn",
        message: `Projected deficit of $${Math.abs(netCashflow).toFixed(2)} in ${monthKey}`,
        at: date,
      });
    }

    // Snapshot account balances
    const accountBalances = snapshotAccountBalances(accounts);

    months.push({
      date,
      income,
      expenses,
      taxes,
      loanPayments,
      contributions,
      investmentReturns,
      netCashflow,
      totalAssets,
      totalLiabilities,
      netWorth,
      accountBalances,
    });
  }

  // Check goal progress at end of projection
  const lastMonth = months[months.length - 1];
  if (lastMonth) {
    for (const goal of input.goals) {
      // Simple goal check - compare net worth to target
      // In full implementation, would link goals to specific accounts
      const targetNominal = applyGrowth(
        goal.targetAmountReal,
        "TRACK_INFLATION",
        undefined,
        inflationIndex,
        lastMonth.date
      );

      if (lastMonth.netWorth < targetNominal) {
        const shortfall = round(targetNominal - lastMonth.netWorth, 2);
        warnings.push({
          code: "GOAL_SHORTFALL",
          severity: goal.priority === 1 ? "error" : "warn",
          message: `Goal "${goal.name}" may fall short by $${shortfall.toFixed(2)}`,
          at: goal.targetDate,
        });
      }
    }
  }

  return { months, warnings };
}

/**
 * Generate annual summary from monthly data.
 */
export function generateAnnualSummary(months: MonthState[]): {
  year: number;
  income: number;
  expenses: number;
  taxes: number;
  netSavings: number;
  endNetWorth: number;
}[] {
  const yearMap = new Map<
    number,
    {
      income: number;
      expenses: number;
      taxes: number;
      netSavings: number;
      endNetWorth: number;
    }
  >();

  for (const month of months) {
    const year = parseInt(month.date.slice(0, 4), 10);
    const current = yearMap.get(year) ?? {
      income: 0,
      expenses: 0,
      taxes: 0,
      netSavings: 0,
      endNetWorth: 0,
    };

    current.income += month.income;
    current.expenses += month.expenses;
    current.taxes += month.taxes;
    current.netSavings += month.netCashflow;
    current.endNetWorth = month.netWorth; // Last month of year

    yearMap.set(year, current);
  }

  return Array.from(yearMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, data]) => ({
      year,
      income: round(data.income, 2),
      expenses: round(data.expenses, 2),
      taxes: round(data.taxes, 2),
      netSavings: round(data.netSavings, 2),
      endNetWorth: round(data.endNetWorth, 2),
    }));
}
