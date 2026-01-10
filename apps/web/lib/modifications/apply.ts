import type {
  Modification,
  IncomeModification,
  ExpenseModification,
  AssetPurchaseModification,
  LoanModification,
  InvestmentModification,
} from "./types";

// Scenario data structure for in-memory modifications
export interface ScenarioData {
  incomes: any[];
  expenses: any[];
  accounts: any[];
  loans: any[];
  goals: any[];
}

export function applyModifications(
  baselineData: ScenarioData,
  modifications: Modification[]
): ScenarioData {
  let data = structuredClone(baselineData);

  for (const mod of modifications) {
    data = applySingleModification(data, mod);
  }

  return data;
}

function applySingleModification(
  data: ScenarioData,
  mod: Modification
): ScenarioData {
  switch (mod.type) {
    case "INCOME_CHANGE":
      return applyIncomeChange(data, mod as IncomeModification);
    case "INCOME_ADD":
      return applyIncomeAdd(data, mod as IncomeModification);
    case "INCOME_REMOVE":
      return applyIncomeRemove(data, mod as IncomeModification);
    case "EXPENSE_CHANGE":
      return applyExpenseChange(data, mod as ExpenseModification);
    case "EXPENSE_ADD":
      return applyExpenseAdd(data, mod as ExpenseModification);
    case "EXPENSE_REMOVE":
      return applyExpenseRemove(data, mod as ExpenseModification);
    case "ASSET_PURCHASE":
      return applyAssetPurchase(data, mod as AssetPurchaseModification);
    case "LOAN_ADD":
      return applyLoanAdd(data, mod as LoanModification);
    case "LOAN_PAYOFF":
      return applyLoanPayoff(data, mod as LoanModification);
    case "INVESTMENT_CHANGE":
      return applyInvestmentChange(data, mod as InvestmentModification);
    case "INVESTMENT_ADD":
      return applyInvestmentAdd(data, mod as InvestmentModification);
    case "INVESTMENT_REMOVE":
      return applyInvestmentRemove(data, mod as InvestmentModification);
    default:
      return data;
  }
}

// Income modifications
function applyIncomeChange(
  data: ScenarioData,
  mod: IncomeModification
): ScenarioData {
  const incomes = data.incomes.map((income) => {
    const matches = mod.targetIncomeId
      ? income.id === mod.targetIncomeId
      : income.name.toLowerCase().includes(mod.targetIncomeName?.toLowerCase() ?? "");

    if (!matches) return income;

    return {
      ...income,
      amount: mod.changes.amountDelta
        ? income.amount + mod.changes.amountDelta
        : mod.changes.amount ?? income.amount,
      frequency: mod.changes.frequency ?? income.frequency,
      startDate: mod.changes.startDate ?? income.startDate,
      endDate: mod.changes.endDate ?? income.endDate,
    };
  });

  return { ...data, incomes };
}

function applyIncomeAdd(
  data: ScenarioData,
  mod: IncomeModification
): ScenarioData {
  const newIncome = {
    id: `temp-income-${Date.now()}`,
    name: mod.changes.name ?? "New Income",
    amount: mod.changes.amount ?? 0,
    frequency: mod.changes.frequency ?? "ANNUAL",
    startDate: mod.changes.startDate ?? new Date().toISOString(),
    endDate: mod.changes.endDate,
    growthRule: "NONE",
    isTaxable: true,
  };

  return { ...data, incomes: [...data.incomes, newIncome] };
}

function applyIncomeRemove(
  data: ScenarioData,
  mod: IncomeModification
): ScenarioData {
  const incomes = data.incomes.filter((income) => {
    if (mod.targetIncomeId) {
      return income.id !== mod.targetIncomeId;
    }
    return !income.name.toLowerCase().includes(mod.targetIncomeName?.toLowerCase() ?? "");
  });

  return { ...data, incomes };
}

// Expense modifications
function applyExpenseChange(
  data: ScenarioData,
  mod: ExpenseModification
): ScenarioData {
  const expenses = data.expenses.map((expense) => {
    const matches = mod.targetExpenseId
      ? expense.id === mod.targetExpenseId
      : expense.name.toLowerCase().includes(mod.targetExpenseName?.toLowerCase() ?? "");

    if (!matches) return expense;

    return {
      ...expense,
      amount: mod.changes.amountDelta
        ? expense.amount + mod.changes.amountDelta
        : mod.changes.amount ?? expense.amount,
      frequency: mod.changes.frequency ?? expense.frequency,
      category: mod.changes.category ?? expense.category,
      startDate: mod.changes.startDate ?? expense.startDate,
      endDate: mod.changes.endDate ?? expense.endDate,
    };
  });

  return { ...data, expenses };
}

function applyExpenseAdd(
  data: ScenarioData,
  mod: ExpenseModification
): ScenarioData {
  const newExpense = {
    id: `temp-expense-${Date.now()}`,
    name: mod.changes.name ?? "New Expense",
    amount: mod.changes.amount ?? 0,
    frequency: mod.changes.frequency ?? "MONTHLY",
    startDate: mod.changes.startDate ?? new Date().toISOString(),
    endDate: mod.changes.endDate,
    growthRule: "INFLATION",
    category: mod.changes.category,
    isDiscretionary: false,
  };

  return { ...data, expenses: [...data.expenses, newExpense] };
}

function applyExpenseRemove(
  data: ScenarioData,
  mod: ExpenseModification
): ScenarioData {
  const expenses = data.expenses.filter((expense) => {
    if (mod.targetExpenseId) {
      return expense.id !== mod.targetExpenseId;
    }
    return !expense.name.toLowerCase().includes(mod.targetExpenseName?.toLowerCase() ?? "");
  });

  return { ...data, expenses };
}

// Asset purchase
function applyAssetPurchase(
  data: ScenarioData,
  mod: AssetPurchaseModification
): ScenarioData {
  // 1. Reduce account balance by down payment
  const accounts = data.accounts.map((account, index) => {
    if (index === 0 && (account.type === "CHECKING" || account.type === "SAVINGS" || account.type === "BROKERAGE")) {
      return { ...account, balance: account.balance - mod.downPayment };
    }
    return account;
  });

  // 2. Add new loan if financed
  const loans = mod.loan
    ? [
        ...data.loans,
        {
          id: `temp-loan-${Date.now()}`,
          name: `${mod.assetType} Loan`,
          type: mod.assetType === "HOUSE" ? "MORTGAGE" : mod.assetType === "CAR" ? "AUTO" : "OTHER",
          principal: mod.loan.amount,
          currentBalance: mod.loan.amount,
          interestRate: mod.loan.interestRate,
          termYears: mod.loan.termYears,
          startDate: mod.loan.startDate,
        },
      ]
    : data.loans;

  // 3. Add related expenses (property tax, insurance, etc.)
  const expenses = mod.relatedExpenses
    ? [
        ...data.expenses,
        ...mod.relatedExpenses.map((exp, i) => ({
          id: `temp-expense-${Date.now()}-${i}`,
          name: exp.name,
          amount: exp.amount,
          frequency: exp.frequency,
          startDate: mod.loan?.startDate ?? new Date().toISOString(),
          growthRule: "INFLATION",
          isDiscretionary: false,
        })),
      ]
    : data.expenses;

  return { ...data, accounts, loans, expenses };
}

// Loan modifications
function applyLoanAdd(data: ScenarioData, mod: LoanModification): ScenarioData {
  if (!mod.loan) return data;

  const newLoan = {
    id: `temp-loan-${Date.now()}`,
    ...mod.loan,
    type: "OTHER",
    currentBalance: mod.loan.principal,
    termYears: mod.loan.termYears,
  };

  return { ...data, loans: [...data.loans, newLoan] };
}

function applyLoanPayoff(
  data: ScenarioData,
  mod: LoanModification
): ScenarioData {
  const loans = data.loans.filter((loan) => loan.id !== mod.targetLoanId);
  return { ...data, loans };
}

// Investment modifications
function applyInvestmentChange(
  data: ScenarioData,
  mod: InvestmentModification
): ScenarioData {
  const accounts = data.accounts.map((account) => {
    const matches = mod.targetInvestmentId
      ? account.id === mod.targetInvestmentId
      : account.name.toLowerCase().includes(mod.targetInvestmentName?.toLowerCase() ?? "");

    if (!matches) return account;

    return {
      ...account,
      growthRate: mod.changes.expectedReturn ?? account.growthRate,
    };
  });

  return { ...data, accounts };
}

function applyInvestmentAdd(
  data: ScenarioData,
  mod: InvestmentModification
): ScenarioData {
  const newAccount = {
    id: `temp-account-${Date.now()}`,
    name: mod.changes.name ?? "New Investment",
    type: "BROKERAGE",
    balance: 0,
    growthRule: "FIXED",
    growthRate: mod.changes.expectedReturn ?? 0.07,
  };

  return { ...data, accounts: [...data.accounts, newAccount] };
}

function applyInvestmentRemove(
  data: ScenarioData,
  mod: InvestmentModification
): ScenarioData {
  const accounts = data.accounts.filter((account) => {
    if (mod.targetInvestmentId) {
      return account.id !== mod.targetInvestmentId;
    }
    return !account.name.toLowerCase().includes(mod.targetInvestmentName?.toLowerCase() ?? "");
  });

  return { ...data, accounts };
}
