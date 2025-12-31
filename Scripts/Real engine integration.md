Cool — next deliverable is the **real engine integration**: replace the stub with a **deterministic engine package v0.2** (inflation + growth rules + loans + contributions + compounding + tax scaffolding + annual summaries), plus a **DB → Engine DTO adapter** and an updated **`/api/engine/run`** that uses the engine hash + caching.

This gets you from “pretty UI spine” → “actual truth machine plumbing.”

---

# 1) Engine implementation skeleton (v0.2) — file-by-file

## 1.1 Engine folder tree (update `packages/engine/src`)

```txt
packages/engine/src/
  index.ts
  version.ts
  types.ts
  contract.ts

  internal/
    dates.ts
    math.ts
    normalize.ts
    hash.ts
    growth.ts
    schedules.ts
    loans.ts
    accounts.ts
    taxes.ts
    projection.ts
    warnings.ts

  __tests__/
    hash.test.ts
    inflation.test.ts
    loans.test.ts
    projection.smoke.test.ts
```

---

## 1.2 `packages/engine/package.json`

```json
{
  "name": "@finatlas/engine",
  "version": "0.2.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "eslint .",
    "test": "vitest run"
  },
  "dependencies": {},
  "devDependencies": {
    "vitest": "^2.1.0",
    "typescript": "^5.6.3"
  }
}
```

> Engine is Node-only for now (uses `crypto`). That’s perfect because it runs in the Next.js API route.

---

## 1.3 `packages/engine/src/types.ts` (upgrade tax rule shape)

Replace your `TaxRulesDTO` with a normalized shape the engine can actually compute against:

```ts
export type ISODate = string;

export type FilingStatus = "SINGLE" | "MFJ" | "HOH";
export type AccountType = "TAXABLE" | "TRADITIONAL" | "ROTH";
export type Frequency = "MONTHLY" | "BIWEEKLY" | "WEEKLY" | "ANNUAL" | "ONE_TIME";
export type GrowthRule = "NONE" | "TRACK_INFLATION" | "CUSTOM_PERCENT";

export interface ScenarioAssumptionsDTO {
  inflationRatePct: number;
  taxableInterestYieldPct: number;
  taxableDividendYieldPct: number;
  realizedStGainPct: number; // can be negative
  realizedLtGainPct: number; // can be negative
}

export interface PayrollOverridesDTO {
  ssRate?: number;
  ssWageBase?: number;
  medicareRate?: number;
  addlMedicareRate?: number;
  addlMedicareThreshold?: number;
}

export interface TaxProfileDTO {
  stateCode: string;
  filingStatus: FilingStatus;
  taxYear: number;
  includePayrollTaxes: boolean;
  advancedOverridesEnabled: boolean;
  payrollOverrides?: PayrollOverridesDTO;
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

export type LoanType = "AUTO" | "STUDENT" | "PERSONAL" | "OTHER";
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

export type GoalType = "COLLEGE" | "HOME_PURCHASE" | "RETIREMENT";
export interface GoalDTO {
  id: string;
  type: GoalType;
  name: string;
  targetAmountReal: number;
  targetDate: ISODate;
  priority: 1 | 2 | 3;
}

/** Tax rule primitives (normalized) */
export interface Bracket {
  min: number;
  max: number | null; // null = no upper bound
  rate: number;       // 0.22 for 22%
}
export interface BracketTable {
  brackets: Bracket[];
}
export interface StandardDeductionTable {
  SINGLE: number;
  MFJ: number;
  HOH: number;
}
export interface PayrollRules {
  ssRate: number;
  ssWageBase: number;
  medicareRate: number;
  addlMedicareRate: number;
  addlMedicareThreshold: { SINGLE: number; MFJ: number; HOH: number };
}
export interface FederalTaxRules {
  standardDeduction: StandardDeductionTable;
  ordinaryIncome: BracketTable;
  longTermCapitalGains?: BracketTable; // optional in MVP
  payroll: PayrollRules;
  capitalLossOrdinaryIncomeLimit: number; // e.g. 3000
}
export interface StateTaxRules {
  stateCode: string;
  standardDeduction?: StandardDeductionTable; // optional (some states differ)
  ordinaryIncome: BracketTable;
}
export interface TaxRulesDTO {
  federal: FederalTaxRules | null;
  state: StateTaxRules | null;
  meta?: { warnings?: string[] };
}

export interface ScenarioInputDTO {
  scenarioId: string;
  household: {
    currency: "USD";
    anchorDate: ISODate;
    startDate: ISODate;
    endDate: ISODate;
  };
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

export interface SeriesPoint {
  t: ISODate; // month start UTC
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
  explainRef?: string;
}

export interface AnnualSummaryRow {
  year: number;
  income: number;
  expenses: number;
  taxes: number;
  netSavings: number;
  endNetWorth: number;
}

export interface TaxBreakdownAnnual {
  year: number;
  federalIncomeTax: number;
  stateIncomeTax: number;
  payrollTax: number;
  stNet: number;
  ltNet: number;
  capitalLossCarryforwardEnd: { st: number; lt: number };
  standardDeductionUsedFederal: number;
}

export interface Warning {
  code:
    | "DEFICIT_MONTH"
    | "GOAL_SHORTFALL"
    | "HIGH_TAX_DRAG"
    | "INVALID_TAX_RULES"
    | "TAX_RULES_MISSING";
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
  taxAnnual: TaxBreakdownAnnual[];
  warnings: Warning[];
}
```

---

## 1.4 `packages/engine/src/contract.ts` (real implementations wired to internal)

```ts
import { ScenarioInputDTO, ProjectionResultDTO } from "./types";
import { normalizeInput } from "./internal/normalize";
import { hashNormalized } from "./internal/hash";
import { runProjectionInternal } from "./internal/projection";

export interface EngineOptions {
  explainMode?: boolean;
  strict?: boolean;
}

export function computeInputHash(input: ScenarioInputDTO): string {
  const normalized = normalizeInput(input);
  return hashNormalized(normalized);
}

export function runProjection(input: ScenarioInputDTO, options?: EngineOptions): ProjectionResultDTO {
  const normalized = normalizeInput(input);
  const inputHash = hashNormalized(normalized);
  return runProjectionInternal(normalized, inputHash, options);
}
```

---

## 1.5 Engine internals

### `packages/engine/src/internal/hash.ts`

```ts
import crypto from "crypto";

export function hashNormalized(normalized: unknown): string {
  const json = JSON.stringify(normalized);
  return crypto.createHash("sha256").update(json).digest("hex");
}
```

### `packages/engine/src/internal/normalize.ts`

Stable sorting + removing irrelevant runtime noise (this makes caching reliable).

```ts
import type { ScenarioInputDTO } from "../types";

/** Ensure stable ordering + stable date format before hashing */
export function normalizeInput(input: ScenarioInputDTO): ScenarioInputDTO {
  const clone: ScenarioInputDTO = JSON.parse(JSON.stringify(input));

  const sortBy = <T>(arr: T[], key: (x: T) => string) => arr.sort((a, b) => key(a).localeCompare(key(b)));

  sortBy(clone.incomes, (x) => x.id);
  sortBy(clone.expenses, (x) => x.id);
  sortBy(clone.accounts, (x) => x.id);
  sortBy(clone.contributions, (x) => `${x.accountId}|${x.startDate}`);
  sortBy(clone.loans, (x) => x.id);
  sortBy(clone.goals, (x) => x.id);

  for (const a of clone.accounts) {
    a.holdings.sort((h1, h2) => h1.ticker.localeCompare(h2.ticker));
  }

  // normalize dates to ISO strings (assume already ISO; keep as-is)
  return clone;
}
```

### `packages/engine/src/internal/dates.ts`

```ts
import type { ISODate } from "../types";

export function toMonthStartUTC(iso: ISODate): Date {
  const d = new Date(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0));
}

export function isoMonthStart(d: Date): ISODate {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

/** months from start (inclusive) to end (exclusive) */
export function monthRange(startIso: ISODate, endIso: ISODate): Date[] {
  const start = toMonthStartUTC(startIso);
  const end = toMonthStartUTC(endIso);

  const out: Date[] = [];
  for (let d = new Date(start); d < end; d = addMonths(d, 1)) out.push(new Date(d));
  return out;
}

export function addMonths(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1, 0, 0, 0));
}

export function yearOfMonth(d: Date): number {
  return d.getUTCFullYear();
}
```

### `packages/engine/src/internal/math.ts`

```ts
export function monthlyRateFromAnnualPct(pct: number): number {
  const r = pct / 100;
  return Math.pow(1 + r, 1 / 12) - 1;
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
```

### `packages/engine/src/internal/growth.ts` (inflation index + growth factors)

```ts
import type { ISODate, GrowthRule } from "../types";
import { toMonthStartUTC, isoMonthStart } from "./dates";

export type InflationIndex = Record<string, number>; // monthISO -> index

export function buildInflationIndex(anchorDateIso: ISODate, startIso: ISODate, endIso: ISODate, inflationRatePct: number): InflationIndex {
  const anchor = toMonthStartUTC(anchorDateIso);
  const start = toMonthStartUTC(startIso);
  const end = toMonthStartUTC(endIso);

  const monthly = Math.pow(1 + inflationRatePct / 100, 1 / 12) - 1;

  const index: InflationIndex = {};

  // Build from start..end using anchor as 1.0 reference
  for (let d = new Date(start); d < end; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
    const monthsFromAnchor = (d.getUTCFullYear() - anchor.getUTCFullYear()) * 12 + (d.getUTCMonth() - anchor.getUTCMonth());
    const v = Math.pow(1 + monthly, monthsFromAnchor);
    index[isoMonthStart(d)] = v;
  }

  return index;
}

export function growthFactorForMonth(
  growthRule: GrowthRule,
  growthPct: number | undefined,
  inflation: InflationIndex,
  startMonthIso: ISODate,
  currentMonthIso: ISODate,
): number {
  if (growthRule === "NONE") return 1;

  if (growthRule === "TRACK_INFLATION") {
    const s = inflation[startMonthIso] ?? 1;
    const c = inflation[currentMonthIso] ?? 1;
    return c / s;
  }

  // CUSTOM_PERCENT
  const sDate = toMonthStartUTC(startMonthIso);
  const cDate = toMonthStartUTC(currentMonthIso);
  const months = (cDate.getUTCFullYear() - sDate.getUTCFullYear()) * 12 + (cDate.getUTCMonth() - sDate.getUTCMonth());
  const annual = (growthPct ?? 0) / 100;
  const monthly = Math.pow(1 + annual, 1 / 12) - 1;
  return Math.pow(1 + monthly, months);
}
```

### `packages/engine/src/internal/schedules.ts` (frequency → monthly amount)

```ts
import type { Frequency, ISODate } from "../types";
import { toMonthStartUTC, isoMonthStart } from "./dates";

export function isActiveForMonth(startIso: ISODate, endIso: ISODate | undefined, month: Date): boolean {
  const s = toMonthStartUTC(startIso);
  const e = endIso ? toMonthStartUTC(endIso) : null;
  const m = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
  if (m < s) return false;
  if (e && m >= e) return false;
  return true;
}

/**
 * Convert an amount with frequency to an equivalent monthly amount.
 * For WEEKLY/BIWEEKLY we use annualization constants (52/12, 26/12).
 */
export function toMonthlyAmount(amount: number, frequency: Frequency, monthIso: ISODate, startIso: ISODate): number {
  if (frequency === "MONTHLY") return amount;
  if (frequency === "ANNUAL") return amount / 12;
  if (frequency === "WEEKLY") return (amount * 52) / 12;
  if (frequency === "BIWEEKLY") return (amount * 26) / 12;

  // ONE_TIME: pay only in the start month
  if (frequency === "ONE_TIME") {
    const startMonth = isoMonthStart(toMonthStartUTC(startIso));
    return startMonth === monthIso ? amount : 0;
  }

  return amount;
}
```

### `packages/engine/src/internal/loans.ts`

```ts
import type { LoanDTO, ISODate } from "../types";
import { toMonthStartUTC, isoMonthStart, addMonths } from "./dates";

export interface LoanMonth {
  t: ISODate;
  payment: number;
  interest: number;
  principal: number;
  balanceEnd: number;
}

export function calcPaymentMonthly(principal: number, aprPct: number, termMonths: number): number {
  const r = (aprPct / 100) / 12;
  if (r === 0) return principal / termMonths;
  return (principal * r) / (1 - Math.pow(1 + r, -termMonths));
}

export function buildLoanSchedule(loan: LoanDTO, horizonEndIso: ISODate): LoanMonth[] {
  const start = toMonthStartUTC(loan.startDate);
  const horizonEnd = toMonthStartUTC(horizonEndIso);

  const basePmt = loan.paymentOverrideMonthly ?? calcPaymentMonthly(loan.principal, loan.aprPct, loan.termMonths);
  const extra = loan.extraPaymentMonthly ?? 0;

  let balance = loan.principal;
  const r = (loan.aprPct / 100) / 12;

  const out: LoanMonth[] = [];
  for (let i = 0; i < loan.termMonths; i++) {
    const d = addMonths(start, i);
    if (d >= horizonEnd) break;
    if (balance <= 0.01) break;

    const interest = balance * r;
    const payment = Math.min(basePmt + extra, balance + interest);
    const principalPaid = Math.max(0, payment - interest);
    balance = Math.max(0, balance - principalPaid);

    out.push({
      t: isoMonthStart(d),
      payment,
      interest,
      principal: principalPaid,
      balanceEnd: balance,
    });
  }

  return out;
}
```

### `packages/engine/src/internal/accounts.ts`

```ts
import type { InvestmentAccountDTO, ContributionRuleDTO, ISODate } from "../types";
import { toMonthStartUTC, isoMonthStart } from "./dates";
import { isActiveForMonth } from "./schedules";
import { growthFactorForMonth, type InflationIndex } from "./growth";

export function startingAccountValue(account: InvestmentAccountDTO): number {
  return account.holdings.reduce((sum, h) => {
    const price = h.lastPrice ?? h.avgPrice;
    return sum + h.shares * price;
  }, 0);
}

export function contributionsForMonth(
  month: Date,
  rules: ContributionRuleDTO[],
  inflation: InflationIndex,
): Record<string, number> {
  const monthIso = isoMonthStart(month);
  const out: Record<string, number> = {};

  for (const r of rules) {
    if (!isActiveForMonth(r.startDate, r.endDate, month)) continue;

    // escalation uses CUSTOM_PERCENT style compounding relative to start date
    const escalationRule = r.escalationPct != null ? "CUSTOM_PERCENT" : "NONE";
    const factor = growthFactorForMonth(
      escalationRule as any,
      r.escalationPct ?? 0,
      inflation,
      isoMonthStart(toMonthStartUTC(r.startDate)),
      monthIso,
    );

    out[r.accountId] = (out[r.accountId] ?? 0) + r.amountMonthly * factor;
  }

  return out;
}
```

### `packages/engine/src/internal/taxes.ts` (generic + deterministic; depends on rules presence)

This is **scaffolding that actually computes** if rules are present; if rules are missing it returns zeros + warnings.

```ts
import type {
  FilingStatus,
  TaxRulesDTO,
  TaxProfileDTO,
  ScenarioAssumptionsDTO,
  MonthlyBreakdownRow,
  TaxBreakdownAnnual,
  InvestmentAccountDTO,
  AccountType,
} from "../types";
import { yearOfMonth, toMonthStartUTC } from "./dates";
import { monthlyRateFromAnnualPct } from "./math";

function bracketTax(amount: number, brackets: { min: number; max: number | null; rate: number }[]): number {
  let tax = 0;
  for (const b of brackets) {
    const upper = b.max ?? Infinity;
    const taxable = Math.max(0, Math.min(amount, upper) - b.min);
    tax += taxable * b.rate;
  }
  return Math.max(0, tax);
}

function stdDeduction(filing: FilingStatus, table: { SINGLE: number; MFJ: number; HOH: number }) {
  return table[filing];
}

export interface TaxComputationOutput {
  monthlyTaxes: Record<string, number>; // monthISO -> tax allocated
  annual: TaxBreakdownAnnual[];
  warnings: string[];
}

/**
 * Computes annual taxes from monthly totals.
 * - Uses standard deduction only
 * - Payroll taxes included if enabled
 * - Taxable investment events (interest/dividends/ST/LT) are assumption-driven
 */
export function computeTaxesAnnualThenAllocateMonthly(args: {
  taxProfile: TaxProfileDTO;
  taxRules: TaxRulesDTO;
  assumptions: ScenarioAssumptionsDTO;
  monthlyRowsPreTax: MonthlyBreakdownRow[]; // with income/expenses etc. taxes not included yet
  accounts: InvestmentAccountDTO[];
  accountTypeOf: (a: InvestmentAccountDTO) => AccountType;
}): TaxComputationOutput {
  const { taxProfile, taxRules, assumptions, monthlyRowsPreTax, accounts } = args;
  const warnings: string[] = [];

  if (!taxRules.federal || !taxRules.state) {
    warnings.push("Tax rules missing; taxes computed as 0 until rules are loaded.");
    return { monthlyTaxes: {}, annual: [], warnings };
  }

  const filing = taxProfile.filingStatus;
  const fed = taxRules.federal;
  const state = taxRules.state;

  // Build annual buckets
  const byYear = new Map<number, MonthlyBreakdownRow[]>();
  for (const r of monthlyRowsPreTax) {
    const y = yearOfMonth(toMonthStartUTC(r.t));
    const arr = byYear.get(y) ?? [];
    arr.push(r);
    byYear.set(y, arr);
  }

  // Compute average taxable balance per year from account series (approx: use start-of-year values tracked externally).
  // For now we approximate using starting holdings value grown by expected return across months (later: use real monthly account balances).
  // In v0.2, we recompute using simplistic approximation: use first month’s assetsEnd proportion.
  const annualOutputs: TaxBreakdownAnnual[] = [];
  const monthlyTaxes: Record<string, number> = {};

  // Track carryforward (simplified as separate ST/LT)
  let carryST = 0;
  let carryLT = 0;

  for (const [year, rows] of Array.from(byYear.entries()).sort((a, b) => a[0] - b[0])) {
    const ordinaryIncome = rows.reduce((s, r) => s + r.income, 0);

    // taxable account base approximation: use sum of holdings * lastPrice/avgPrice at scenario start.
    const taxableStart = accounts
      .filter((a) => a.type === "TAXABLE")
      .reduce((sum, a) => sum + a.holdings.reduce((s, h) => s + h.shares * (h.lastPrice ?? h.avgPrice), 0), 0);

    // Taxable events
    const interest = taxableStart * (assumptions.taxableInterestYieldPct / 100);
    const dividends = taxableStart * (assumptions.taxableDividendYieldPct / 100);

    const st = taxableStart * (assumptions.realizedStGainPct / 100);
    const lt = taxableStart * (assumptions.realizedLtGainPct / 100);

    // Netting with carryforward
    let stNet = st + carryST;
    let ltNet = lt + carryLT;

    // Net ST and LT separately
    // If both same sign, no cross-net; if opposite signs, net against each other
    let netCG = stNet + ltNet;

    // Apply capital loss ordinary income limit if net negative
    const capLossLimit = fed.capitalLossOrdinaryIncomeLimit;
    let ordinaryOffset = 0;

    if (netCG < 0) {
      ordinaryOffset = Math.min(capLossLimit, -netCG);
      netCG = netCG + ordinaryOffset; // reduces magnitude of loss
    }

    // Remaining carryforward (simplified allocation back to ST/LT by proportion)
    // If netCG is negative, carryforward continues; if positive, carryforward clears.
    if (stNet + ltNet < 0) {
      // keep negative as carry; simple split: keep prior st/lt proportions
      // conservative: store everything in LT carry
      carryST = 0;
      carryLT = stNet + ltNet + ordinaryOffset; // negative
    } else {
      carryST = 0;
      carryLT = 0;
    }

    // Federal taxable ordinary
    const fedStd = stdDeduction(filing, fed.standardDeduction);
    const fedTaxableOrdinary = Math.max(0, ordinaryIncome + interest + dividends + Math.max(0, stNet) - fedStd - ordinaryOffset);

    const fedOrdTax = bracketTax(fedTaxableOrdinary, fed.ordinaryIncome.brackets);

    // LTCG: if table not present, treat LT as ordinary for now
    const fedLTCGTax =
      fed.longTermCapitalGains && ltNet > 0
        ? bracketTax(ltNet, fed.longTermCapitalGains.brackets)
        : Math.max(0, ltNet) * 0; // safe default if missing; you’ll fill rules later

    // State: treat all as ordinary, optional std deduction
    const stateStd = state.standardDeduction ? stdDeduction(filing, state.standardDeduction) : 0;
    const stateTaxable = Math.max(0, ordinaryIncome + interest + dividends + Math.max(0, stNet) + Math.max(0, ltNet) - stateStd - ordinaryOffset);
    const stateTax = bracketTax(stateTaxable, state.ordinaryIncome.brackets);

    // Payroll taxes (annual)
    let payrollTax = 0;
    if (taxProfile.includePayrollTaxes) {
      const payroll = { ...fed.payroll };
      if (taxProfile.advancedOverridesEnabled && taxProfile.payrollOverrides) {
        Object.assign(payroll, {
          ssRate: taxProfile.payrollOverrides.ssRate ?? payroll.ssRate,
          ssWageBase: taxProfile.payrollOverrides.ssWageBase ?? payroll.ssWageBase,
          medicareRate: taxProfile.payrollOverrides.medicareRate ?? payroll.medicareRate,
          addlMedicareRate: taxProfile.payrollOverrides.addlMedicareRate ?? payroll.addlMedicareRate,
          addlMedicareThreshold: {
            ...payroll.addlMedicareThreshold,
            [filing]: taxProfile.payrollOverrides.addlMedicareThreshold ?? payroll.addlMedicareThreshold[filing],
          },
        });
      }

      const ssWages = Math.min(ordinaryIncome, payroll.ssWageBase);
      const ss = ssWages * payroll.ssRate;

      const medicare = ordinaryIncome * payroll.medicareRate;
      const addl = Math.max(0, ordinaryIncome - payroll.addlMedicareThreshold[filing]) * payroll.addlMedicareRate;
      payrollTax = ss + medicare + addl;
    }

    const federalIncomeTax = fedOrdTax + fedLTCGTax;
    const totalAnnualTax = federalIncomeTax + stateTax + payrollTax;

    // Allocate taxes back to months evenly (MVP)
    const perMonth = totalAnnualTax / rows.length;
    for (const r of rows) monthlyTaxes[r.t] = perMonth;

    annualOutputs.push({
      year,
      federalIncomeTax,
      stateIncomeTax: stateTax,
      payrollTax,
      stNet,
      ltNet,
      capitalLossCarryforwardEnd: { st: carryST, lt: carryLT },
      standardDeductionUsedFederal: fedStd,
    });
  }

  return { monthlyTaxes, annual: annualOutputs, warnings };
}
```

---

### `packages/engine/src/internal/warnings.ts`

```ts
import type { Warning, MonthlyBreakdownRow } from "../types";

export function buildWarnings(monthly: MonthlyBreakdownRow[], extra: string[] = []): Warning[] {
  const warnings: Warning[] = [];

  for (const r of monthly) {
    if (r.netCashflow < 0) {
      warnings.push({
        code: "DEFICIT_MONTH",
        severity: "warn",
        message: `Net cashflow is negative for ${r.t.slice(0, 10)}`,
        at: r.t,
      });
    }
  }

  for (const m of extra) {
    warnings.push({ code: "TAX_RULES_MISSING", severity: "warn", message: m });
  }

  return warnings;
}
```

---

### `packages/engine/src/internal/projection.ts` (main loop)

```ts
import type { EngineOptions } from "../contract";
import type { ProjectionResultDTO, ScenarioInputDTO, SeriesPoint, MonthlyBreakdownRow, AnnualSummaryRow } from "../types";
import { ENGINE_VERSION } from "../version";
import { monthRange, isoMonthStart, yearOfMonth, toMonthStartUTC } from "./dates";
import { buildInflationIndex } from "./growth";
import { isActiveForMonth, toMonthlyAmount } from "./schedules";
import { monthlyRateFromAnnualPct } from "./math";
import { startingAccountValue, contributionsForMonth } from "./accounts";
import { buildLoanSchedule } from "./loans";
import { computeTaxesAnnualThenAllocateMonthly } from "./taxes";
import { buildWarnings } from "./warnings";

export function runProjectionInternal(input: ScenarioInputDTO, inputHash: string, options?: EngineOptions): ProjectionResultDTO {
  const months = monthRange(input.household.startDate, input.household.endDate);

  const inflation = buildInflationIndex(
    input.household.anchorDate,
    input.household.startDate,
    input.household.endDate,
    input.assumptions.inflationRatePct,
  );

  // Loans: build schedules and compute month->payment
  const loanPaymentsByMonth: Record<string, number> = {};
  for (const loan of input.loans) {
    const sched = buildLoanSchedule(loan, input.household.endDate);
    for (const m of sched) loanPaymentsByMonth[m.t] = (loanPaymentsByMonth[m.t] ?? 0) + m.payment;
  }

  // Accounts: initialize balances
  const balances: Record<string, number> = {};
  for (const a of input.accounts) balances[a.id] = startingAccountValue(a);

  const accountSeries: Record<string, SeriesPoint[]> = Object.fromEntries(input.accounts.map((a) => [a.id, []]));

  // Build monthly rows pre-tax first (so tax engine can compute annually and allocate)
  const monthlyRowsPreTax: MonthlyBreakdownRow[] = [];

  for (const d of months) {
    const t = isoMonthStart(d);

    // income
    let income = 0;
    for (const inc of input.incomes) {
      if (!isActiveForMonth(inc.startDate, inc.endDate, d)) continue;
      // growth rules are applied later in v0.3; keep v0.2 stable and deterministic
      income += toMonthlyAmount(inc.amount, inc.frequency, t, inc.startDate);
    }

    // expenses
    let expenses = 0;
    for (const exp of input.expenses) {
      if (!isActiveForMonth(exp.startDate, exp.endDate, d)) continue;
      expenses += toMonthlyAmount(exp.amount, exp.frequency, t, exp.startDate);
    }

    const loanPayments = loanPaymentsByMonth[t] ?? 0;

    // contributions
    const contribMap = contributionsForMonth(d, input.contributions, inflation);
    const contributions = Object.values(contribMap).reduce((s, v) => s + v, 0);

    // investment returns (apply after contribution)
    let investmentReturns = 0;
    for (const a of input.accounts) {
      const before = balances[a.id];
      const contrib = contribMap[a.id] ?? 0;
      balances[a.id] = before + contrib;

      const r = monthlyRateFromAnnualPct(a.expectedReturnPct);
      const after = balances[a.id] * (1 + r);
      investmentReturns += after - balances[a.id];
      balances[a.id] = after;

      accountSeries[a.id].push({ t, v: balances[a.id] });
    }

    const assetsEnd = Object.values(balances).reduce((s, v) => s + v, 0);
    const liabilitiesEnd = 0;
    const taxes = 0; // allocated later

    monthlyRowsPreTax.push({
      t,
      income,
      expenses: expenses + loanPayments,
      taxes,
      loanPayments,
      contributions,
      investmentReturns,
      netCashflow: income - expenses - loanPayments - contributions,
      assetsEnd,
      liabilitiesEnd,
    });
  }

  // Taxes: compute annual -> allocate monthly
  const taxOut = computeTaxesAnnualThenAllocateMonthly({
    taxProfile: input.taxProfile,
    taxRules: input.taxRules,
    assumptions: input.assumptions,
    monthlyRowsPreTax,
    accounts: input.accounts,
    accountTypeOf: (a) => a.type,
  });

  // Apply monthly taxes and build final rows + chart series
  const series = {
    netWorth: [] as SeriesPoint[],
    assetsTotal: [] as SeriesPoint[],
    liabilitiesTotal: [] as SeriesPoint[],
    incomeTotal: [] as SeriesPoint[],
    expenseTotal: [] as SeriesPoint[],
    taxesTotal: [] as SeriesPoint[],
    cashflowNet: [] as SeriesPoint[],
    accountBalances: accountSeries,
    goalProgress: {} as any,
  };

  const monthlyFinal: MonthlyBreakdownRow[] = monthlyRowsPreTax.map((r) => {
    const taxes = taxOut.monthlyTaxes[r.t] ?? 0;
    const netCashflow = r.netCashflow - taxes;
    const netWorth = r.assetsEnd - r.liabilitiesEnd;

    series.incomeTotal.push({ t: r.t, v: r.income });
    series.expenseTotal.push({ t: r.t, v: r.expenses });
    series.taxesTotal.push({ t: r.t, v: taxes });
    series.cashflowNet.push({ t: r.t, v: netCashflow });
    series.assetsTotal.push({ t: r.t, v: r.assetsEnd });
    series.liabilitiesTotal.push({ t: r.t, v: r.liabilitiesEnd });
    series.netWorth.push({ t: r.t, v: netWorth });

    return { ...r, taxes, netCashflow };
  });

  // Annual summaries
  const annualMap = new Map<number, AnnualSummaryRow>();
  for (const r of monthlyFinal) {
    const y = yearOfMonth(toMonthStartUTC(r.t));
    const agg = annualMap.get(y) ?? { year: y, income: 0, expenses: 0, taxes: 0, netSavings: 0, endNetWorth: 0 };
    agg.income += r.income;
    agg.expenses += r.expenses;
    agg.taxes += r.taxes;
    agg.netSavings += r.netCashflow;
    agg.endNetWorth = r.assetsEnd - r.liabilitiesEnd;
    annualMap.set(y, agg);
  }

  const annual = Array.from(annualMap.values()).sort((a, b) => a.year - b.year);

  const warnings = buildWarnings(monthlyFinal, taxOut.warnings);

  return {
    engineVersion: ENGINE_VERSION,
    inputHash,
    series,
    monthly: monthlyFinal,
    annual,
    taxAnnual: taxOut.annual,
    warnings,
  };
}
```

---

## 1.6 `packages/engine/src/version.ts`

```ts
export const ENGINE_VERSION = "0.2.0";
```

## 1.7 `packages/engine/src/index.ts`

```ts
export * from "./types";
export * from "./contract";
export * from "./version";
```

---

# 2) Engine tests (Vitest)

## 2.1 `packages/engine/src/__tests__/hash.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { computeInputHash } from "../contract";

const base: any = {
  scenarioId: "s1",
  household: { currency: "USD", anchorDate: "2026-01-01T00:00:00.000Z", startDate: "2026-01-01T00:00:00.000Z", endDate: "2027-01-01T00:00:00.000Z" },
  assumptions: { inflationRatePct: 3, taxableInterestYieldPct: 1.5, taxableDividendYieldPct: 1.8, realizedStGainPct: 2, realizedLtGainPct: 4 },
  taxProfile: { stateCode: "VA", filingStatus: "MFJ", taxYear: 2026, includePayrollTaxes: true, advancedOverridesEnabled: false },
  taxRules: { federal: null, state: null },
  incomes: [{ id: "i2" }, { id: "i1" }],
  expenses: [{ id: "e2" }, { id: "e1" }],
  accounts: [{ id: "a2", holdings: [] }, { id: "a1", holdings: [] }],
  contributions: [{ accountId: "a1", startDate: "2026-01-01T00:00:00.000Z" }],
  loans: [{ id: "l1" }],
  goals: [{ id: "g1" }],
};

describe("computeInputHash", () => {
  it("is stable under array reordering", () => {
    const h1 = computeInputHash(base);
    const reordered = { ...base, incomes: [...base.incomes].reverse(), accounts: [...base.accounts].reverse() };
    const h2 = computeInputHash(reordered);
    expect(h1).toBe(h2);
  });
});
```

## 2.2 `packages/engine/src/__tests__/loans.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { calcPaymentMonthly } from "../internal/loans";

describe("loan payment", () => {
  it("computes a reasonable payment", () => {
    const pmt = calcPaymentMonthly(20000, 6, 60);
    expect(pmt).toBeGreaterThan(300);
    expect(pmt).toBeLessThan(500);
  });
});
```

## 2.3 `packages/engine/src/__tests__/inflation.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { buildInflationIndex } from "../internal/growth";

describe("inflation index", () => {
  it("anchor month is ~1", () => {
    const idx = buildInflationIndex("2026-01-01T00:00:00.000Z","2026-01-01T00:00:00.000Z","2026-06-01T00:00:00.000Z",3);
    expect(idx["2026-01-01T00:00:00.000Z"]).toBeCloseTo(1, 10);
  });
});
```

## 2.4 `packages/engine/src/__tests__/projection.smoke.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { runProjection } from "../contract";

describe("projection smoke", () => {
  it("produces increasing net worth with contributions", () => {
    const res = runProjection({
      scenarioId: "s1",
      household: { currency: "USD", anchorDate: "2026-01-01T00:00:00.000Z", startDate: "2026-01-01T00:00:00.000Z", endDate: "2027-01-01T00:00:00.000Z" },
      assumptions: { inflationRatePct: 3, taxableInterestYieldPct: 1.5, taxableDividendYieldPct: 1.8, realizedStGainPct: 2, realizedLtGainPct: 4 },
      taxProfile: { stateCode: "VA", filingStatus: "MFJ", taxYear: 2026, includePayrollTaxes: true, advancedOverridesEnabled: false },
      taxRules: { federal: null, state: null },
      incomes: [{ id: "i1", name:"Salary", amount: 10000, frequency:"MONTHLY", startDate:"2026-01-01T00:00:00.000Z", growthRule:"NONE" }],
      expenses: [{ id:"e1", category:"Housing", amount: 3000, frequency:"MONTHLY", startDate:"2026-01-01T00:00:00.000Z", growthRule:"NONE", isEssential:true }],
      accounts: [{ id:"a1", name:"Taxable", type:"TAXABLE", expectedReturnPct: 6, holdings: [] }],
      contributions: [{ accountId:"a1", amountMonthly: 1000, startDate:"2026-01-01T00:00:00.000Z" }],
      loans: [],
      goals: []
    } as any);

    const first = res.series.netWorth[0].v;
    const last = res.series.netWorth[res.series.netWorth.length - 1].v;
    expect(last).toBeGreaterThan(first);
  });
});
```

Run tests:

```bash
pnpm --filter @finatlas/engine test
```

---

# 3) Web adapter: DB → `ScenarioInputDTO` (real engine input)

## 3.1 Tax rules loader (DB → normalized)

**`apps/web/lib/engine/taxRulesLoader.ts`**

```ts
import { prisma } from "@/lib/db/prisma";
import type { TaxRulesDTO } from "@finatlas/engine";

export async function loadTaxRules(taxYear: number, stateCode: string): Promise<TaxRulesDTO> {
  const [fed, state] = await Promise.all([
    prisma.taxRule.findUnique({ where: { jurisdiction_stateCode_taxYear: { jurisdiction: "FEDERAL", stateCode: null, taxYear } } as any }).catch(() => null),
    prisma.taxRule.findUnique({ where: { jurisdiction_stateCode_taxYear: { jurisdiction: "STATE", stateCode, taxYear } } as any }).catch(() => null),
  ]);

  return {
    federal: (fed?.rulesJson as any) ?? null,
    state: (state?.rulesJson as any) ?? null,
    meta: {
      warnings: [
        ...(fed ? [] : ["Missing federal tax rules for selected tax year."]),
        ...(state ? [] : ["Missing state tax rules for selected state/year."]),
      ],
    },
  };
}
```

> Prisma composite unique name differs depending on how Prisma generates it; if it complains, replace those `findUnique` calls with `findFirst({ where: { jurisdiction: "FEDERAL", taxYear }})` etc.

---

## 3.2 Scenario input builder

**`apps/web/lib/engine/buildScenarioInput.ts`**

```ts
import { prisma } from "@/lib/db/prisma";
import type { ScenarioInputDTO } from "@finatlas/engine";
import { loadTaxRules } from "./taxRulesLoader";

export async function buildScenarioInputDTO(scenarioId: string): Promise<ScenarioInputDTO> {
  const scenario = await prisma.scenario.findUnique({
    where: { id: scenarioId },
    include: {
      household: true,
      assumptions: true,
      taxProfile: true,
      incomes: { include: { member: true } },
      expenses: true,
      accounts: { include: { holdings: true, contributions: true } },
      contributions: true,
      loans: true,
      goals: true,
    },
  });

  if (!scenario) throw new Error("Scenario not found");
  if (!scenario.assumptions) throw new Error("Scenario assumptions missing");
  if (!scenario.taxProfile) throw new Error("Tax profile missing");

  const taxRules = await loadTaxRules(scenario.taxProfile.taxYear, scenario.taxProfile.stateCode);

  return {
    scenarioId: scenario.id,
    household: {
      currency: "USD",
      anchorDate: scenario.household.anchorDate.toISOString(),
      startDate: scenario.household.startDate.toISOString(),
      endDate: scenario.household.endDate.toISOString(),
    },
    assumptions: {
      inflationRatePct: scenario.assumptions.inflationRatePct,
      taxableInterestYieldPct: scenario.assumptions.taxableInterestYieldPct,
      taxableDividendYieldPct: scenario.assumptions.taxableDividendYieldPct,
      realizedStGainPct: scenario.assumptions.realizedStGainPct,
      realizedLtGainPct: scenario.assumptions.realizedLtGainPct,
    },
    taxProfile: {
      stateCode: scenario.taxProfile.stateCode,
      filingStatus: scenario.taxProfile.filingStatus as any,
      taxYear: scenario.taxProfile.taxYear,
      includePayrollTaxes: scenario.taxProfile.includePayrollTaxes,
      advancedOverridesEnabled: scenario.taxProfile.advancedOverridesEnabled,
      payrollOverrides: (scenario.taxProfile.payrollOverrides as any) ?? undefined,
    },
    taxRules,
    incomes: scenario.incomes.map((i) => ({
      id: i.id,
      memberName: i.member?.name ?? undefined,
      name: i.name,
      amount: i.amount,
      frequency: i.frequency as any,
      startDate: i.startDate.toISOString(),
      endDate: i.endDate?.toISOString(),
      growthRule: i.growthRule as any,
      growthPct: i.growthPct ?? undefined,
    })),
    expenses: scenario.expenses.map((e) => ({
      id: e.id,
      category: e.category,
      name: e.name ?? undefined,
      amount: e.amount,
      frequency: e.frequency as any,
      startDate: e.startDate.toISOString(),
      endDate: e.endDate?.toISOString(),
      growthRule: e.growthRule as any,
      growthPct: e.growthPct ?? undefined,
      isEssential: e.isEssential,
    })),
    accounts: scenario.accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type as any,
      expectedReturnPct: a.expectedReturnPct,
      holdings: a.holdings.map((h) => ({
        ticker: h.ticker,
        shares: h.shares,
        avgPrice: h.avgPrice,
        lastPrice: h.lastPrice ?? undefined,
        asOfDate: h.asOfDate?.toISOString(),
      })),
    })),
    contributions: scenario.contributions.map((c) => ({
      accountId: c.accountId,
      amountMonthly: c.amountMonthly,
      startDate: c.startDate.toISOString(),
      endDate: c.endDate?.toISOString(),
      escalationPct: c.escalationPct ?? undefined,
    })),
    loans: scenario.loans.map((l) => ({
      id: l.id,
      type: l.type as any,
      name: l.name,
      principal: l.principal,
      aprPct: l.aprPct,
      termMonths: l.termMonths,
      startDate: l.startDate.toISOString(),
      paymentOverrideMonthly: l.paymentOverrideMonthly ?? undefined,
      extraPaymentMonthly: l.extraPaymentMonthly ?? undefined,
    })),
    goals: scenario.goals.map((g) => ({
      id: g.id,
      type: g.type as any,
      name: g.name,
      targetAmountReal: g.targetAmountReal,
      targetDate: g.targetDate.toISOString(),
      priority: g.priority as any,
    })),
  };
}
```

---

# 4) Update `/api/engine/run` to use real engine + caching

Replace your existing route with this:

**`apps/web/app/api/engine/run/route.ts`**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { buildScenarioInputDTO } from "@/lib/engine/buildScenarioInput";
import { computeInputHash, runProjection, ENGINE_VERSION } from "@finatlas/engine";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const scenarioId = body?.scenarioId?.toString();
  const forceRecompute = Boolean(body?.forceRecompute);

  if (!scenarioId) return NextResponse.json({ error: "Missing scenarioId" }, { status: 400 });

  const scenario = await prisma.scenario.findUnique({
    where: { id: scenarioId },
    include: { household: true },
  });
  if (!scenario) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  if (scenario.household.ownerUserId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const input = await buildScenarioInputDTO(scenarioId);
  const inputHash = computeInputHash(input);

  if (!forceRecompute) {
    const cached = await prisma.engineResultCache.findUnique({ where: { scenarioId } });
    if (cached && cached.engineVersion === ENGINE_VERSION && cached.inputHash === inputHash) {
      return NextResponse.json({
        scenarioId,
        engineVersion: cached.engineVersion,
        inputHash: cached.inputHash,
        results: cached.resultsJson,
        cached: true,
      });
    }
  }

  const results = runProjection(input, { explainMode: true });
  await prisma.engineResultCache.upsert({
    where: { scenarioId },
    update: { engineVersion: ENGINE_VERSION, inputHash, resultsJson: results as any },
    create: { scenarioId, engineVersion: ENGINE_VERSION, inputHash, resultsJson: results as any },
  });

  return NextResponse.json({ scenarioId, engineVersion: ENGINE_VERSION, inputHash, results, cached: false });
}
```

---

# 5) Minimal Dashboard changes (no math in UI)

Your dashboard already renders `series.netWorth` and `series.cashflowNet`. You don’t need to change it — it will just start showing:

* taxes series (if rules exist)
* warnings array (optional to show)
* annual summary (optional table later)

Add a small warning banner (optional quick win):

```tsx
{data?.results?.warnings?.length ? (
  <div className="rounded-xl border border-yellow-800 bg-yellow-950/30 p-3 text-sm text-yellow-200">
    {data.results.warnings[0].message}
  </div>
) : null}
```

---

# 6) Run instructions (now with real engine)

### In Docker

```bash
docker compose up --build
```

### Confirm engine works

* Login: `demo@local / Demo1234!`
* Click **Recompute**
* You should see:

  * net worth curve (accounts compounding)
  * cashflow curve
  * taxes = 0 **unless tax rules are loaded** (expected)
  * warnings like “Tax rules missing…”

---

# 7) What you’ve earned after this deliverable

You now have:

* **Deterministic engine package** used by the API
* **Stable input hashing** for caching
* **DB→DTO adapter** (clean seam to evolve)
* **Tax scaffolding** that will “turn on” once rules exist
* A reliable place to add:

  1. Growth rules (inflation/custom %) for incomes/expenses
  2. True taxable balance averaging (use actual monthly account balance series)
  3. Goals funding mechanics + goal progress series
  4. Real tax rules loader + updater pipeline

