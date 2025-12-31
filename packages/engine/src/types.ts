// Date types
export type ISODate = string;

// Enums
export type FilingStatus = "SINGLE" | "MFJ" | "HOH";
export type AccountType = "TAXABLE" | "TRADITIONAL" | "ROTH";
export type Frequency = "MONTHLY" | "BIWEEKLY" | "WEEKLY" | "ANNUAL" | "ONE_TIME";
export type GrowthRule = "NONE" | "TRACK_INFLATION" | "CUSTOM_PERCENT";
export type LoanType = "AUTO" | "STUDENT" | "PERSONAL" | "OTHER";
export type GoalType = "COLLEGE" | "HOME_PURCHASE" | "RETIREMENT";

// Data Transfer Objects
export interface HouseholdDTO {
  currency: "USD";
  anchorDate: ISODate;
  startDate: ISODate;
  endDate: ISODate;
}

export interface ScenarioAssumptionsDTO {
  inflationRatePct: number;
  taxableInterestYieldPct: number;
  taxableDividendYieldPct: number;
  realizedStGainPct: number;
  realizedLtGainPct: number;
}

export interface IncomeDTO {
  id: string;
  memberName?: string;
  name: string;
  amount: number;
  frequency: Frequency;
  startDate: ISODate;
  endDate?: ISODate;
  growthRule: GrowthRule;
  growthPct?: number;
}

export interface ExpenseDTO {
  id: string;
  category: string;
  name?: string;
  amount: number;
  frequency: Frequency;
  startDate: ISODate;
  endDate?: ISODate;
  growthRule: GrowthRule;
  growthPct?: number;
  isEssential: boolean;
}

export interface HoldingDTO {
  ticker: string;
  shares: number;
  avgPrice: number;
  lastPrice?: number;
  asOfDate?: ISODate;
}

export interface InvestmentAccountDTO {
  id: string;
  name: string;
  type: AccountType;
  expectedReturnPct: number;
  holdings: HoldingDTO[];
}

export interface ContributionRuleDTO {
  accountId: string;
  amountMonthly: number;
  startDate: ISODate;
  endDate?: ISODate;
  escalationPct?: number;
}

export interface LoanDTO {
  id: string;
  type: LoanType;
  name: string;
  principal: number;
  aprPct: number;
  termMonths: number;
  startDate: ISODate;
  paymentOverrideMonthly?: number;
  extraPaymentMonthly?: number;
}

export interface GoalDTO {
  id: string;
  type: GoalType;
  name: string;
  targetAmountReal: number;
  targetDate: ISODate;
  priority: 1 | 2 | 3;
}

// Tax types (simplified for MVP)
export interface TaxProfileDTO {
  stateCode: string;
  filingStatus: FilingStatus;
  taxYear: number;
  includePayrollTaxes: boolean;
  advancedOverridesEnabled: boolean;
}

export interface TaxRulesDTO {
  federal: unknown | null;
  state: unknown | null;
}

// Main input DTO
export interface ScenarioInputDTO {
  scenarioId: string;
  household: HouseholdDTO;
  assumptions: ScenarioAssumptionsDTO;
  taxProfile: TaxProfileDTO;
  taxRules: TaxRulesDTO;
  incomes: IncomeDTO[];
  expenses: ExpenseDTO[];
  accounts: InvestmentAccountDTO[];
  contributions: ContributionRuleDTO[];
  loans: LoanDTO[];
  goals: GoalDTO[];
}

// Output types
export interface SeriesPoint {
  t: ISODate;
  v: number;
}

export interface ProjectionSeries {
  netWorth: SeriesPoint[];
  assetsTotal: SeriesPoint[];
  liabilitiesTotal: SeriesPoint[];
  incomeTotal: SeriesPoint[];
  expenseTotal: SeriesPoint[];
  taxesTotal: SeriesPoint[];
  cashflowNet: SeriesPoint[];
  accountBalances: Record<string, SeriesPoint[]>;
  goalProgress: Record<string, { funded: SeriesPoint[]; targetNominal: SeriesPoint[] }>;
}

export interface MonthlyBreakdownRow {
  t: ISODate;
  income: number;
  expenses: number;
  taxes: number;
  loanPayments: number;
  contributions: number;
  investmentReturns: number;
  netCashflow: number;
  assetsEnd: number;
  liabilitiesEnd: number;
}

export interface AnnualSummaryRow {
  year: number;
  income: number;
  expenses: number;
  taxes: number;
  netSavings: number;
  endNetWorth: number;
}

export interface Warning {
  code: "DEFICIT_MONTH" | "GOAL_SHORTFALL" | "HIGH_TAX_DRAG" | "TAX_RULES_MISSING";
  severity: "info" | "warn" | "error";
  message: string;
  at?: ISODate;
}

export interface ProjectionResultDTO {
  engineVersion: string;
  inputHash: string;
  series: ProjectionSeries;
  monthly: MonthlyBreakdownRow[];
  annual: AnnualSummaryRow[];
  taxAnnual: unknown[];
  warnings: Warning[];
}
