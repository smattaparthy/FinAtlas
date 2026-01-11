import { FrequencySchema } from "@finatlas/schemas";
import type { z } from "zod";

type Frequency = z.infer<typeof FrequencySchema>;

// Base modification interface
export interface BaseModification {
  id: string;
  type: ModificationType;
  description: string;
  appliedAt: string;
}

export type ModificationType =
  | "INCOME_CHANGE"
  | "INCOME_ADD"
  | "INCOME_REMOVE"
  | "EXPENSE_CHANGE"
  | "EXPENSE_ADD"
  | "EXPENSE_REMOVE"
  | "INVESTMENT_CHANGE"
  | "INVESTMENT_ADD"
  | "INVESTMENT_REMOVE"
  | "LOAN_ADD"
  | "LOAN_PAYOFF"
  | "ACCOUNT_CHANGE"
  | "ASSET_PURCHASE";

// Income modifications
export interface IncomeModification extends BaseModification {
  type: "INCOME_CHANGE" | "INCOME_ADD" | "INCOME_REMOVE";
  targetIncomeId?: string;
  targetIncomeName?: string;
  changes: {
    name?: string;
    amount?: number;
    amountDelta?: number;
    amountMultiplier?: number;
    frequency?: Frequency;
    startDate?: string;
    endDate?: string;
  };
}

// Expense modifications
export interface ExpenseModification extends BaseModification {
  type: "EXPENSE_CHANGE" | "EXPENSE_ADD" | "EXPENSE_REMOVE";
  targetExpenseId?: string;
  targetExpenseName?: string;
  changes: {
    name?: string;
    amount?: number;
    amountDelta?: number;
    amountMultiplier?: number;
    frequency?: Frequency;
    category?: string;
    startDate?: string;
    endDate?: string;
  };
}

// Asset purchase modifications
export interface AssetPurchaseModification extends BaseModification {
  type: "ASSET_PURCHASE";
  assetType: "HOUSE" | "CAR" | "OTHER";
  purchasePrice: number;
  downPayment: number;
  downPaymentPercent?: number;
  loan?: {
    amount: number;
    interestRate: number;
    termYears: number;
    startDate: string;
  };
  relatedExpenses?: {
    name: string;
    amount: number;
    frequency: Frequency;
  }[];
}

// Loan modifications
export interface LoanModification extends BaseModification {
  type: "LOAN_ADD" | "LOAN_PAYOFF";
  targetLoanId?: string;
  loan?: {
    name: string;
    principal: number;
    interestRate: number;
    termYears: number;
    startDate: string;
  };
}

// Investment modifications
export interface InvestmentModification extends BaseModification {
  type: "INVESTMENT_CHANGE" | "INVESTMENT_ADD" | "INVESTMENT_REMOVE";
  targetInvestmentId?: string;
  targetInvestmentName?: string;
  changes: {
    name?: string;
    contributionAmount?: number;
    contributionDelta?: number;
    frequency?: Frequency;
    expectedReturn?: number;
  };
}

// Union type
export type Modification =
  | IncomeModification
  | ExpenseModification
  | AssetPurchaseModification
  | LoanModification
  | InvestmentModification;
