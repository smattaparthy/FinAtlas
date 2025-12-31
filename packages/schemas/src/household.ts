import { z } from "zod";

export const FilingStatusSchema = z.enum(["SINGLE", "MFJ", "HOH"]);
export const AccountTypeSchema = z.enum(["TAXABLE", "TRADITIONAL", "ROTH"]);
export const FrequencySchema = z.enum(["MONTHLY", "BIWEEKLY", "WEEKLY", "ANNUAL", "ONE_TIME"]);
export const GrowthRuleSchema = z.enum(["NONE", "TRACK_INFLATION", "CUSTOM_PERCENT"]);
export const LoanTypeSchema = z.enum(["AUTO", "STUDENT", "PERSONAL", "OTHER"]);
export const GoalTypeSchema = z.enum(["COLLEGE", "HOME_PURCHASE", "RETIREMENT"]);

export const IncomeCreateSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  frequency: FrequencySchema,
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  growthRule: GrowthRuleSchema,
  growthPct: z.number().optional(),
  memberId: z.string().optional(),
});

export const ExpenseCreateSchema = z.object({
  category: z.string().min(1),
  name: z.string().optional(),
  amount: z.number().positive(),
  frequency: FrequencySchema,
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  growthRule: GrowthRuleSchema,
  growthPct: z.number().optional(),
  isEssential: z.boolean().default(false),
});

export const AccountCreateSchema = z.object({
  name: z.string().min(1),
  type: AccountTypeSchema,
  expectedReturnPct: z.number(),
});

export const HoldingCreateSchema = z.object({
  ticker: z.string().min(1),
  shares: z.number().positive(),
  avgPrice: z.number().positive(),
  lastPrice: z.number().positive().optional(),
  asOfDate: z.string().datetime().optional(),
});

export const LoanCreateSchema = z.object({
  type: LoanTypeSchema,
  name: z.string().min(1),
  principal: z.number().positive(),
  aprPct: z.number().min(0),
  termMonths: z.number().int().positive(),
  startDate: z.string().datetime(),
  paymentOverrideMonthly: z.number().positive().optional(),
  extraPaymentMonthly: z.number().min(0).optional(),
});

export const GoalCreateSchema = z.object({
  type: GoalTypeSchema,
  name: z.string().min(1),
  targetAmountReal: z.number().positive(),
  targetDate: z.string().datetime(),
  priority: z.number().int().min(1).max(3),
});

export type IncomeCreate = z.infer<typeof IncomeCreateSchema>;
export type ExpenseCreate = z.infer<typeof ExpenseCreateSchema>;
export type AccountCreate = z.infer<typeof AccountCreateSchema>;
export type HoldingCreate = z.infer<typeof HoldingCreateSchema>;
export type LoanCreate = z.infer<typeof LoanCreateSchema>;
export type GoalCreate = z.infer<typeof GoalCreateSchema>;
