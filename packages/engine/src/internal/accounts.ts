/**
 * Investment account balance tracking and contribution processing.
 */
import type { InvestmentAccountDTO, ContributionRuleDTO } from "../types";
import { round, annualToMonthlyRate, compoundGrowth } from "./math";
import { applyGrowth } from "./growth";
import { isDateInPeriod, getMonthKeyFromDate } from "./schedules";

/**
 * Represents the current state of an investment account.
 */
export interface AccountState {
  accountId: string;
  balance: number;
  contributions: number; // Cumulative contributions this period
  returns: number; // Cumulative returns this period
}

/**
 * Initialize account states from account definitions.
 *
 * @param accounts - Account definitions with holdings
 * @returns Array of initialized account states
 */
export function initializeAccountStates(accounts: InvestmentAccountDTO[]): AccountState[] {
  return accounts.map((account) => {
    // Calculate initial balance from holdings
    const initialBalance = account.holdings.reduce((sum, holding) => {
      const price = holding.lastPrice ?? holding.avgPrice;
      return sum + holding.shares * price;
    }, 0);

    return {
      accountId: account.id,
      balance: round(initialBalance, 2),
      contributions: 0,
      returns: 0,
    };
  });
}

/**
 * Process monthly contributions to accounts.
 * Modifies account states in place.
 *
 * @param accounts - Array of account states to update
 * @param contributions - Contribution rules to apply
 * @param date - Current date (ISO format)
 * @param inflationIndex - Inflation index for escalation calculations
 */
export function processMonthlyContributions(
  accounts: AccountState[],
  contributions: ContributionRuleDTO[],
  date: string,
  inflationIndex: Map<string, number>
): void {
  for (const rule of contributions) {
    // Check if contribution is active for this date
    if (!isDateInPeriod(date, rule.startDate, rule.endDate)) {
      continue;
    }

    // Find the account
    const account = accounts.find((a) => a.accountId === rule.accountId);
    if (!account) {
      continue;
    }

    // Calculate contribution amount with optional escalation
    let amount = rule.amountMonthly;

    if (rule.escalationPct !== undefined && rule.escalationPct > 0) {
      // Apply escalation based on time since start
      amount = applyGrowth(
        rule.amountMonthly,
        "CUSTOM_PERCENT",
        rule.escalationPct / 100,
        inflationIndex,
        date
      );
    }

    // Add contribution to account
    account.balance = round(account.balance + amount, 2);
    account.contributions = round(account.contributions + amount, 2);
  }
}

/**
 * Apply monthly investment returns to accounts.
 * Modifies account states in place.
 *
 * @param accounts - Array of account states to update
 * @param accountDefs - Account definitions with expected returns
 */
export function applyMonthlyReturns(
  accounts: AccountState[],
  accountDefs: InvestmentAccountDTO[]
): void {
  for (const state of accounts) {
    // Find the account definition
    const def = accountDefs.find((a) => a.id === state.accountId);
    if (!def) {
      continue;
    }

    // Calculate monthly return
    const annualRate = def.expectedReturnPct / 100;
    const monthlyRate = annualToMonthlyRate(annualRate);

    // Apply return to current balance
    const monthlyReturn = round(state.balance * monthlyRate, 2);
    state.balance = round(state.balance + monthlyReturn, 2);
    state.returns = round(state.returns + monthlyReturn, 2);
  }
}

/**
 * Get the current balance of a specific account.
 *
 * @param accounts - Array of account states
 * @param accountId - ID of account to find
 * @returns Account balance, or 0 if not found
 */
export function getAccountBalance(accounts: AccountState[], accountId: string): number {
  const account = accounts.find((a) => a.accountId === accountId);
  return account ? account.balance : 0;
}

/**
 * Get the total balance across all accounts.
 *
 * @param accounts - Array of account states
 * @returns Sum of all account balances
 */
export function getTotalAccountBalance(accounts: AccountState[]): number {
  return round(
    accounts.reduce((sum, account) => sum + account.balance, 0),
    2
  );
}

/**
 * Get total contributions across all accounts for the period.
 *
 * @param accounts - Array of account states
 * @returns Sum of all contributions
 */
export function getTotalContributions(accounts: AccountState[]): number {
  return round(
    accounts.reduce((sum, account) => sum + account.contributions, 0),
    2
  );
}

/**
 * Get total returns across all accounts for the period.
 *
 * @param accounts - Array of account states
 * @returns Sum of all returns
 */
export function getTotalReturns(accounts: AccountState[]): number {
  return round(
    accounts.reduce((sum, account) => sum + account.returns, 0),
    2
  );
}

/**
 * Reset period-specific counters (contributions and returns) for a new period.
 * Keeps balances intact.
 *
 * @param accounts - Array of account states to reset
 */
export function resetPeriodCounters(accounts: AccountState[]): void {
  for (const account of accounts) {
    account.contributions = 0;
    account.returns = 0;
  }
}

/**
 * Create a snapshot of current account balances.
 *
 * @param accounts - Array of account states
 * @returns Record mapping account IDs to balances
 */
export function snapshotAccountBalances(accounts: AccountState[]): Record<string, number> {
  const snapshot: Record<string, number> = {};
  for (const account of accounts) {
    snapshot[account.accountId] = account.balance;
  }
  return snapshot;
}

/**
 * Calculate account value by type (for tax purposes).
 *
 * @param accounts - Array of account states
 * @param accountDefs - Account definitions
 * @param accountType - Type of account to sum
 * @returns Total balance for accounts of that type
 */
export function getBalanceByType(
  accounts: AccountState[],
  accountDefs: InvestmentAccountDTO[],
  accountType: "TAXABLE" | "TRADITIONAL" | "ROTH"
): number {
  return round(
    accounts.reduce((sum, state) => {
      const def = accountDefs.find((a) => a.id === state.accountId);
      if (def && def.type === accountType) {
        return sum + state.balance;
      }
      return sum;
    }, 0),
    2
  );
}
