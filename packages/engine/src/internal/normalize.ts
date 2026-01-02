/**
 * Input normalization utilities.
 * Ensures all input data is in a consistent format for processing.
 */
import type { ScenarioInputDTO, IncomeDTO, ExpenseDTO, LoanDTO, GoalDTO } from "../types";

/**
 * Normalize all input data to ensure consistency.
 * Creates a deep copy to avoid mutating the original.
 *
 * @param input - Raw scenario input
 * @returns Normalized input with consistent formatting
 */
export function normalizeInput(input: ScenarioInputDTO): ScenarioInputDTO {
  return {
    ...input,
    incomes: input.incomes.map(normalizeIncome),
    expenses: input.expenses.map(normalizeExpense),
    loans: input.loans.map(normalizeLoan),
    goals: input.goals.map(normalizeGoal),
    accounts: input.accounts.map((account) => ({
      ...account,
      holdings: account.holdings.map((holding) => ({
        ...holding,
        lastPrice: holding.lastPrice ?? holding.avgPrice,
      })),
    })),
    contributions: input.contributions.map((c) => ({
      ...c,
      escalationPct: c.escalationPct ?? 0,
    })),
    assumptions: {
      ...input.assumptions,
      // Ensure percentages are properly formatted
      inflationRatePct: input.assumptions.inflationRatePct ?? 0,
      taxableInterestYieldPct: input.assumptions.taxableInterestYieldPct ?? 0,
      taxableDividendYieldPct: input.assumptions.taxableDividendYieldPct ?? 0,
      realizedStGainPct: input.assumptions.realizedStGainPct ?? 0,
      realizedLtGainPct: input.assumptions.realizedLtGainPct ?? 0,
    },
  };
}

/**
 * Normalize an income entry.
 */
function normalizeIncome(income: IncomeDTO): IncomeDTO {
  return {
    ...income,
    growthRule: income.growthRule ?? "NONE",
    growthPct: income.growthPct ?? 0,
    memberName: income.memberName ?? "Primary",
  };
}

/**
 * Normalize an expense entry.
 */
function normalizeExpense(expense: ExpenseDTO): ExpenseDTO {
  return {
    ...expense,
    growthRule: expense.growthRule ?? "NONE",
    growthPct: expense.growthPct ?? 0,
    name: expense.name ?? expense.category,
    isEssential: expense.isEssential ?? false,
  };
}

/**
 * Normalize a loan entry.
 */
function normalizeLoan(loan: LoanDTO): LoanDTO {
  return {
    ...loan,
    extraPaymentMonthly: loan.extraPaymentMonthly ?? 0,
  };
}

/**
 * Normalize a goal entry.
 */
function normalizeGoal(goal: GoalDTO): GoalDTO {
  return {
    ...goal,
    priority: goal.priority ?? 2,
  };
}

/**
 * Validate that required fields are present and valid.
 * Throws an error if validation fails.
 *
 * @param input - Input to validate
 * @throws Error if validation fails
 */
export function validateInput(input: ScenarioInputDTO): void {
  // Validate dates
  if (!input.household.startDate) {
    throw new Error("Missing required field: household.startDate");
  }
  if (!input.household.endDate) {
    throw new Error("Missing required field: household.endDate");
  }

  // Validate date order
  if (input.household.startDate > input.household.endDate) {
    throw new Error("household.startDate must be before household.endDate");
  }

  // Validate scenario ID
  if (!input.scenarioId) {
    throw new Error("Missing required field: scenarioId");
  }

  // Validate income entries
  for (const income of input.incomes) {
    if (!income.id) {
      throw new Error("Income entry missing required field: id");
    }
    if (income.amount < 0) {
      throw new Error(`Income ${income.id} has negative amount`);
    }
    if (!income.startDate) {
      throw new Error(`Income ${income.id} missing required field: startDate`);
    }
  }

  // Validate expense entries
  for (const expense of input.expenses) {
    if (!expense.id) {
      throw new Error("Expense entry missing required field: id");
    }
    if (expense.amount < 0) {
      throw new Error(`Expense ${expense.id} has negative amount`);
    }
  }

  // Validate account entries
  for (const account of input.accounts) {
    if (!account.id) {
      throw new Error("Account entry missing required field: id");
    }
    if (account.expectedReturnPct < -100) {
      throw new Error(`Account ${account.id} has unrealistic expected return`);
    }
  }

  // Validate loan entries
  for (const loan of input.loans) {
    if (!loan.id) {
      throw new Error("Loan entry missing required field: id");
    }
    if (loan.principal < 0) {
      throw new Error(`Loan ${loan.id} has negative principal`);
    }
    if (loan.termMonths <= 0) {
      throw new Error(`Loan ${loan.id} has invalid term`);
    }
  }

  // Validate contribution rules
  for (const contribution of input.contributions) {
    if (!contribution.accountId) {
      throw new Error("Contribution rule missing required field: accountId");
    }
    // Ensure account exists
    const accountExists = input.accounts.some((a) => a.id === contribution.accountId);
    if (!accountExists) {
      throw new Error(`Contribution references non-existent account: ${contribution.accountId}`);
    }
  }

  // Validate goals
  for (const goal of input.goals) {
    if (!goal.id) {
      throw new Error("Goal entry missing required field: id");
    }
    if (goal.targetAmountReal < 0) {
      throw new Error(`Goal ${goal.id} has negative target amount`);
    }
  }
}

/**
 * Prepare input for processing - normalize and validate.
 *
 * @param input - Raw input
 * @returns Normalized and validated input
 * @throws Error if validation fails
 */
export function prepareInput(input: ScenarioInputDTO): ScenarioInputDTO {
  const normalized = normalizeInput(input);
  validateInput(normalized);
  return normalized;
}
