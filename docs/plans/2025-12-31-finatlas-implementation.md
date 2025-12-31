# FinAtlas Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local-only, privacy-first household financial planning app with deterministic calculations, scenario comparison, and professional-grade UI.

**Architecture:** Monorepo with Next.js App Router frontend, separate TypeScript engine package for all financial calculations, SQLite persistence via Prisma, Docker Compose deployment. All calculations are deterministic (no LLM computing finances). UI displays engine output - "no math in UI" rule.

**Tech Stack:** Next.js 14+ (App Router), TypeScript (strict), Prisma + SQLite, shadcn/ui + Tailwind CSS, Ant Design Charts, Jose (JWT), Argon2 (passwords), Docker Compose, Vitest (testing)

---

## Execution Strategy: Parallel Sub-Agents

This plan is designed for **maximum parallelization**. Within each phase, independent workstreams can be executed by parallel sub-agents:

| Phase | Parallel Workstreams | Dependencies |
|-------|---------------------|--------------|
| 0 - Bootstrap | 3 parallel: Monorepo + Docker + Prisma | None |
| 1 - Data Entry | 6 parallel: Each CRUD module | Phase 0 complete |
| 2 - Engine v1 | 4 parallel: Core modules, then integration | Phase 0 complete |
| 3 - Taxes | 2 parallel: Tax rules + Tax engine | Phase 2 complete |
| 4 - Import | 1 sequential: Wizard flow | Phase 1 accounts |
| 5 - Polish | 5 parallel: Each polish item | Phases 1-4 |

---

# Phase 0: Bootstrap (Foundation)

**Exit Criteria:** App boots locally via containers; demo login works; sample dashboard loads from seeded data.

---

## Task 0.1: Initialize Monorepo Structure

**Files:**
- Create: `package.json` (root)
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.json` (root)
- Create: `.gitignore`
- Create: `.env.example`

**Step 1: Initialize git repository**

```bash
cd /Users/adommeti/source/finatlas_claude
git init
```

**Step 2: Create root package.json**

```json
{
  "name": "finatlas",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint",
    "db:migrate": "pnpm --filter @finatlas/web prisma migrate dev",
    "db:seed": "pnpm --filter @finatlas/web prisma db seed",
    "db:studio": "pnpm --filter @finatlas/web prisma studio"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.6.3"
  },
  "packageManager": "pnpm@9.0.0"
}
```

**Step 3: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Step 4: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "typecheck": {},
    "lint": {}
  }
}
```

**Step 5: Create root tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  }
}
```

**Step 6: Create .env.example**

```bash
# Auth
AUTH_JWT_SECRET=your-secret-key-min-32-chars-here
AUTH_COOKIE_NAME=finatlas_session

# Database (SQLite - file path relative to apps/web)
DATABASE_URL="file:./prisma/dev.db"

# Optional: Anthropic API (for tax rule parsing only)
ANTHROPIC_API_KEY=
```

**Step 7: Create .gitignore**

```
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
.next/
dist/
out/

# Database
*.db
*.db-journal

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Test coverage
coverage/

# Turbo
.turbo/
```

**Step 8: Commit**

```bash
git add -A
git commit -m "chore: initialize monorepo structure with pnpm + turbo"
```

---

## Task 0.2: Create Engine Package Structure

**Files:**
- Create: `packages/engine/package.json`
- Create: `packages/engine/tsconfig.json`
- Create: `packages/engine/src/index.ts`
- Create: `packages/engine/src/version.ts`
- Create: `packages/engine/src/types.ts`

**Step 1: Create engine package.json**

```json
{
  "name": "@finatlas/engine",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^2.1.0",
    "typescript": "^5.6.3"
  }
}
```

**Step 2: Create engine tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create version.ts**

```typescript
export const ENGINE_VERSION = "0.1.0";
```

**Step 4: Create types.ts (core type definitions)**

```typescript
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
```

**Step 5: Create index.ts (exports)**

```typescript
export * from "./types";
export * from "./version";
```

**Step 6: Commit**

```bash
git add packages/engine/
git commit -m "chore: create engine package with core type definitions"
```

---

## Task 0.3: Create Schemas Package

**Files:**
- Create: `packages/schemas/package.json`
- Create: `packages/schemas/tsconfig.json`
- Create: `packages/schemas/src/index.ts`
- Create: `packages/schemas/src/household.ts`

**Step 1: Create schemas package.json**

```json
{
  "name": "@finatlas/schemas",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.6.3"
  }
}
```

**Step 2: Create schemas tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create household.ts (validation schemas)**

```typescript
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
```

**Step 4: Create index.ts**

```typescript
export * from "./household";
```

**Step 5: Commit**

```bash
git add packages/schemas/
git commit -m "chore: create schemas package with Zod validation"
```

---

## Task 0.4: Create Next.js Web App

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.js`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/styles/globals.css`

**Step 1: Create web app package.json**

```json
{
  "name": "@finatlas/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@prisma/client": "^5.20.0",
    "jose": "^5.9.0",
    "argon2": "^0.41.0",
    "zod": "^3.23.0",
    "@ant-design/charts": "^2.2.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0",
    "@finatlas/engine": "workspace:*",
    "@finatlas/schemas": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.3",
    "prisma": "^5.20.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 3: Create next.config.js**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@finatlas/engine", "@finatlas/schemas"],
  experimental: {
    serverComponentsExternalPackages: ["argon2"],
  },
};

module.exports = nextConfig;
```

**Step 4: Create tailwind.config.ts**

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        zinc: {
          950: "#09090b",
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

**Step 5: Create postcss.config.mjs**

```javascript
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
```

**Step 6: Create globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html,
body {
  height: 100%;
}

body {
  background-color: #09090b;
  color: #fafafa;
}
```

**Step 7: Create root layout.tsx**

```tsx
import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "FinAtlas",
  description: "Local-only financial planning",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

**Step 8: Commit**

```bash
git add apps/web/
git commit -m "chore: create Next.js web app with Tailwind"
```

---

## Task 0.5: Setup Prisma Schema

**Files:**
- Create: `apps/web/prisma/schema.prisma`

**Step 1: Create comprehensive Prisma schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// ============== AUTH ==============

enum UserRole {
  ADMIN
  USER
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  role         UserRole @default(USER)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  households Household[]
}

// ============== HOUSEHOLD ==============

model Household {
  id          String   @id @default(cuid())
  name        String
  ownerUserId String
  anchorDate  DateTime @default(now())
  startDate   DateTime
  endDate     DateTime
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  owner     User               @relation(fields: [ownerUserId], references: [id], onDelete: Cascade)
  members   HouseholdMember[]
  scenarios Scenario[]

  @@index([ownerUserId])
}

model HouseholdMember {
  id          String   @id @default(cuid())
  householdId String
  name        String
  roleTag     String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  household Household @relation(fields: [householdId], references: [id], onDelete: Cascade)
  incomes   Income[]

  @@index([householdId])
}

// ============== SCENARIO ==============

model Scenario {
  id          String   @id @default(cuid())
  householdId String
  name        String
  isBaseline  Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  household     Household          @relation(fields: [householdId], references: [id], onDelete: Cascade)
  assumptions   ScenarioAssumption?
  taxProfile    TaxProfile?
  incomes       Income[]
  expenses      Expense[]
  accounts      Account[]
  contributions Contribution[]
  loans         Loan[]
  goals         Goal[]
  cache         EngineResultCache?

  @@index([householdId])
}

model ScenarioAssumption {
  id                      String   @id @default(cuid())
  scenarioId              String   @unique
  inflationRatePct        Float    @default(3.0)
  taxableInterestYieldPct Float    @default(1.5)
  taxableDividendYieldPct Float    @default(1.8)
  realizedStGainPct       Float    @default(2.0)
  realizedLtGainPct       Float    @default(4.0)
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  scenario Scenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)
}

// ============== TAX ==============

enum FilingStatus {
  SINGLE
  MFJ
  HOH
}

model TaxProfile {
  id                      String       @id @default(cuid())
  scenarioId              String       @unique
  stateCode               String
  filingStatus            FilingStatus
  taxYear                 Int
  includePayrollTaxes     Boolean      @default(true)
  advancedOverridesEnabled Boolean     @default(false)
  payrollOverrides        Json?
  createdAt               DateTime     @default(now())
  updatedAt               DateTime     @updatedAt

  scenario Scenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)
}

enum TaxJurisdiction {
  FEDERAL
  STATE
}

model TaxRule {
  id           String          @id @default(cuid())
  jurisdiction TaxJurisdiction
  stateCode    String?
  taxYear      Int
  rulesJson    Json
  meta         Json?
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  @@unique([jurisdiction, stateCode, taxYear])
}

// ============== INCOME ==============

enum Frequency {
  MONTHLY
  BIWEEKLY
  WEEKLY
  ANNUAL
  ONE_TIME
}

enum GrowthRule {
  NONE
  TRACK_INFLATION
  CUSTOM_PERCENT
}

model Income {
  id         String     @id @default(cuid())
  scenarioId String
  memberId   String?
  name       String
  amount     Float
  frequency  Frequency
  startDate  DateTime
  endDate    DateTime?
  growthRule GrowthRule @default(NONE)
  growthPct  Float?
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  scenario Scenario         @relation(fields: [scenarioId], references: [id], onDelete: Cascade)
  member   HouseholdMember? @relation(fields: [memberId], references: [id], onDelete: SetNull)

  @@index([scenarioId])
}

// ============== EXPENSE ==============

model Expense {
  id          String     @id @default(cuid())
  scenarioId  String
  category    String
  name        String?
  amount      Float
  frequency   Frequency
  startDate   DateTime
  endDate     DateTime?
  growthRule  GrowthRule @default(NONE)
  growthPct   Float?
  isEssential Boolean    @default(false)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  scenario Scenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)

  @@index([scenarioId])
}

// ============== INVESTMENT ==============

enum AccountType {
  TAXABLE
  TRADITIONAL
  ROTH
}

model Account {
  id                String      @id @default(cuid())
  scenarioId        String
  name              String
  type              AccountType
  expectedReturnPct Float       @default(7.0)
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  scenario      Scenario       @relation(fields: [scenarioId], references: [id], onDelete: Cascade)
  holdings      Holding[]
  contributions Contribution[]

  @@index([scenarioId])
}

model Holding {
  id        String    @id @default(cuid())
  accountId String
  ticker    String
  shares    Float
  avgPrice  Float
  lastPrice Float?
  asOfDate  DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  account Account @relation(fields: [accountId], references: [id], onDelete: Cascade)

  @@index([accountId])
}

model Contribution {
  id            String    @id @default(cuid())
  scenarioId    String
  accountId     String
  amountMonthly Float
  startDate     DateTime
  endDate       DateTime?
  escalationPct Float?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  scenario Scenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)
  account  Account  @relation(fields: [accountId], references: [id], onDelete: Cascade)

  @@index([scenarioId])
  @@index([accountId])
}

// ============== LOAN ==============

enum LoanType {
  AUTO
  STUDENT
  PERSONAL
  OTHER
}

model Loan {
  id                     String   @id @default(cuid())
  scenarioId             String
  type                   LoanType
  name                   String
  principal              Float
  aprPct                 Float
  termMonths             Int
  startDate              DateTime
  paymentOverrideMonthly Float?
  extraPaymentMonthly    Float?
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  scenario Scenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)

  @@index([scenarioId])
}

// ============== GOAL ==============

enum GoalType {
  COLLEGE
  HOME_PURCHASE
  RETIREMENT
}

model Goal {
  id               String   @id @default(cuid())
  scenarioId       String
  type             GoalType
  name             String
  targetAmountReal Float
  targetDate       DateTime
  priority         Int      @default(1)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  scenario Scenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)

  @@index([scenarioId])
}

// ============== IMPORT ==============

model ImportLog {
  id           String   @id @default(cuid())
  householdId  String
  fileName     String
  rowsImported Int
  status       String
  errorDetails Json?
  createdAt    DateTime @default(now())
}

// ============== ENGINE CACHE ==============

model EngineResultCache {
  id            String   @id @default(cuid())
  scenarioId    String   @unique
  engineVersion String
  inputHash     String
  resultsJson   Json
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  scenario Scenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)
}
```

**Step 2: Commit**

```bash
git add apps/web/prisma/
git commit -m "feat: add comprehensive Prisma schema for all modules"
```

---

## Task 0.6: Create Docker Compose Setup

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`

**Step 1: Create Dockerfile**

```dockerfile
FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Install dependencies for argon2
RUN apk add --no-cache python3 make g++ libc6-compat

WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/
COPY packages/engine/package.json ./packages/engine/
COPY packages/schemas/package.json ./packages/schemas/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Generate Prisma client
RUN pnpm --filter @finatlas/web prisma generate

# Build
RUN pnpm --filter @finatlas/web build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

ENV NODE_ENV=production

# Copy built app
COPY --from=base /app/apps/web/.next/standalone ./
COPY --from=base /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=base /app/apps/web/public ./apps/web/public
COPY --from=base /app/apps/web/prisma ./apps/web/prisma

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
```

**Step 2: Create docker-compose.yml**

```yaml
version: "3.9"

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:/app/data/finatlas.db
      - AUTH_JWT_SECRET=${AUTH_JWT_SECRET}
      - AUTH_COOKIE_NAME=finatlas_session
      - NODE_ENV=production
    volumes:
      - finatlas-data:/app/data
    restart: unless-stopped

volumes:
  finatlas-data:
```

**Step 3: Update next.config.js for standalone output**

Add to next.config.js:

```javascript
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@finatlas/engine", "@finatlas/schemas"],
  experimental: {
    serverComponentsExternalPackages: ["argon2"],
  },
};
```

**Step 4: Commit**

```bash
git add Dockerfile docker-compose.yml apps/web/next.config.js
git commit -m "feat: add Docker Compose setup for local deployment"
```

---

## Task 0.7: Create Auth System

**Files:**
- Create: `apps/web/lib/db/prisma.ts`
- Create: `apps/web/lib/auth/jwt.ts`
- Create: `apps/web/lib/auth/password.ts`
- Create: `apps/web/lib/auth/session.ts`
- Create: `apps/web/app/api/auth/login/route.ts`
- Create: `apps/web/app/api/auth/logout/route.ts`
- Create: `apps/web/app/api/auth/me/route.ts`
- Create: `apps/web/middleware.ts`

**Step 1: Create Prisma singleton**

```typescript
// apps/web/lib/db/prisma.ts
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
```

**Step 2: Create JWT helpers**

```typescript
// apps/web/lib/auth/jwt.ts
import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();

export type SessionUser = { id: string; email: string; role: "ADMIN" | "USER" };

function secretKey() {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) throw new Error("Missing AUTH_JWT_SECRET");
  return encoder.encode(secret);
}

export async function signSession(user: SessionUser) {
  return new SignJWT({ sub: user.id, email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const id = payload.sub;
    const email = payload.email;
    const role = payload.role;
    if (!id || typeof email !== "string" || (role !== "ADMIN" && role !== "USER"))
      return null;
    return { id, email, role };
  } catch {
    return null;
  }
}
```

**Step 3: Create password helpers**

```typescript
// apps/web/lib/auth/password.ts
import * as argon2 from "argon2";

export async function hashPassword(password: string) {
  return argon2.hash(password);
}

export async function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password);
}
```

**Step 4: Create session helpers**

```typescript
// apps/web/lib/auth/session.ts
import { cookies } from "next/headers";
import { verifySession, type SessionUser } from "./jwt";

export function sessionCookieName() {
  return process.env.AUTH_COOKIE_NAME || "finatlas_session";
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookie = await cookies();
  const token = cookie.get(sessionCookieName())?.value;
  if (!token) return null;
  return verifySession(token);
}
```

**Step 5: Create login API route**

```typescript
// apps/web/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { signSession } from "@/lib/auth/jwt";
import { verifyPassword } from "@/lib/auth/password";
import { sessionCookieName } from "@/lib/auth/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = body?.email?.toString()?.toLowerCase();
  const password = body?.password?.toString();

  if (!email || !password) {
    return NextResponse.json({ error: "Missing email/password" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const token = await signSession({ id: user.id, email: user.email, role: user.role });

  const res = NextResponse.json({ user: { id: user.id, email: user.email, role: user.role } });
  res.cookies.set(sessionCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
  });
  return res;
}
```

**Step 6: Create logout API route**

```typescript
// apps/web/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { sessionCookieName } from "@/lib/auth/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookieName(), "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
```

**Step 7: Create me API route**

```typescript
// apps/web/app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 200 });
  return NextResponse.json({ user }, { status: 200 });
}
```

**Step 8: Create middleware**

```typescript
// apps/web/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = process.env.AUTH_COOKIE_NAME || "finatlas_session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Protect everything else
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

**Step 9: Commit**

```bash
git add apps/web/lib/ apps/web/app/api/auth/ apps/web/middleware.ts
git commit -m "feat: implement JWT-based local authentication system"
```

---

## Task 0.8: Create Login Page

**Files:**
- Create: `apps/web/app/(auth)/login/page.tsx`
- Create: `apps/web/app/(auth)/layout.tsx`

**Step 1: Create auth layout**

```tsx
// apps/web/app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

**Step 2: Create login page**

```tsx
// apps/web/app/(auth)/login/page.tsx
"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("demo@local");
  const [password, setPassword] = useState("Demo1234!");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setBusy(false);

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Login failed");
      return;
    }

    window.location.href = "/";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 shadow-xl">
        <h1 className="text-xl font-semibold">FinAtlas</h1>
        <p className="text-sm text-zinc-400 mt-1">Local-only financial planning</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <div>
            <label className="text-xs text-zinc-400">Email</label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400">Password</label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error ? <div className="text-sm text-red-400">{error}</div> : null}

          <button
            disabled={busy}
            className="w-full rounded-xl bg-zinc-50 text-zinc-950 py-2 font-medium disabled:opacity-60 hover:bg-zinc-200 transition-colors"
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>

          <div className="text-xs text-zinc-500">
            Demo: <span className="text-zinc-300">demo@local / Demo1234!</span>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/app/\(auth\)/
git commit -m "feat: add login page with demo credentials"
```

---

## Task 0.9: Create Database Seed Script

**Files:**
- Create: `apps/web/prisma/seed.ts`
- Update: `apps/web/package.json` (add seed script)

**Step 1: Create seed script**

```typescript
// apps/web/prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create demo user
  const passwordHash = await argon2.hash("Demo1234!");
  const user = await prisma.user.upsert({
    where: { email: "demo@local" },
    update: {},
    create: {
      email: "demo@local",
      passwordHash,
      role: "USER",
    },
  });
  console.log("Created user:", user.email);

  // Create household
  const now = new Date();
  const startDate = new Date(now.getFullYear(), 0, 1); // Jan 1 this year
  const endDate = new Date(now.getFullYear() + 10, 0, 1); // Jan 1, 10 years from now

  const household = await prisma.household.upsert({
    where: { id: "demo-household" },
    update: {},
    create: {
      id: "demo-household",
      name: "Demo Household",
      ownerUserId: user.id,
      anchorDate: startDate,
      startDate,
      endDate,
    },
  });
  console.log("Created household:", household.name);

  // Create household members
  const member1 = await prisma.householdMember.upsert({
    where: { id: "member-1" },
    update: {},
    create: {
      id: "member-1",
      householdId: household.id,
      name: "Primary Earner",
      roleTag: "spouse",
    },
  });

  const member2 = await prisma.householdMember.upsert({
    where: { id: "member-2" },
    update: {},
    create: {
      id: "member-2",
      householdId: household.id,
      name: "Partner",
      roleTag: "spouse",
    },
  });
  console.log("Created household members");

  // Create baseline scenario
  const scenario = await prisma.scenario.upsert({
    where: { id: "baseline-scenario" },
    update: {},
    create: {
      id: "baseline-scenario",
      householdId: household.id,
      name: "Baseline",
      isBaseline: true,
    },
  });
  console.log("Created scenario:", scenario.name);

  // Create scenario assumptions
  await prisma.scenarioAssumption.upsert({
    where: { scenarioId: scenario.id },
    update: {},
    create: {
      scenarioId: scenario.id,
      inflationRatePct: 3.0,
      taxableInterestYieldPct: 1.5,
      taxableDividendYieldPct: 1.8,
      realizedStGainPct: 2.0,
      realizedLtGainPct: 4.0,
    },
  });

  // Create tax profile
  await prisma.taxProfile.upsert({
    where: { scenarioId: scenario.id },
    update: {},
    create: {
      scenarioId: scenario.id,
      stateCode: "CA",
      filingStatus: "MFJ",
      taxYear: now.getFullYear(),
      includePayrollTaxes: true,
      advancedOverridesEnabled: false,
    },
  });
  console.log("Created tax profile");

  // Create incomes
  await prisma.income.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "income-1",
        scenarioId: scenario.id,
        memberId: member1.id,
        name: "Primary Salary",
        amount: 12000,
        frequency: "MONTHLY",
        startDate,
        growthRule: "TRACK_INFLATION",
      },
      {
        id: "income-2",
        scenarioId: scenario.id,
        memberId: member2.id,
        name: "Partner Salary",
        amount: 8000,
        frequency: "MONTHLY",
        startDate,
        growthRule: "TRACK_INFLATION",
      },
    ],
  });
  console.log("Created incomes");

  // Create expenses
  await prisma.expense.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "expense-1",
        scenarioId: scenario.id,
        category: "Housing",
        name: "Mortgage Payment",
        amount: 3500,
        frequency: "MONTHLY",
        startDate,
        growthRule: "NONE",
        isEssential: true,
      },
      {
        id: "expense-2",
        scenarioId: scenario.id,
        category: "Utilities",
        name: "Utilities & Bills",
        amount: 400,
        frequency: "MONTHLY",
        startDate,
        growthRule: "TRACK_INFLATION",
        isEssential: true,
      },
      {
        id: "expense-3",
        scenarioId: scenario.id,
        category: "Food",
        name: "Groceries",
        amount: 800,
        frequency: "MONTHLY",
        startDate,
        growthRule: "TRACK_INFLATION",
        isEssential: true,
      },
      {
        id: "expense-4",
        scenarioId: scenario.id,
        category: "Transportation",
        name: "Car & Transport",
        amount: 600,
        frequency: "MONTHLY",
        startDate,
        growthRule: "TRACK_INFLATION",
        isEssential: false,
      },
      {
        id: "expense-5",
        scenarioId: scenario.id,
        category: "Discretionary",
        name: "Entertainment & Dining",
        amount: 500,
        frequency: "MONTHLY",
        startDate,
        growthRule: "TRACK_INFLATION",
        isEssential: false,
      },
    ],
  });
  console.log("Created expenses");

  // Create investment accounts
  const acctTaxable = await prisma.account.upsert({
    where: { id: "account-taxable" },
    update: {},
    create: {
      id: "account-taxable",
      scenarioId: scenario.id,
      name: "Taxable Brokerage",
      type: "TAXABLE",
      expectedReturnPct: 7.0,
    },
  });

  const acct401k = await prisma.account.upsert({
    where: { id: "account-401k" },
    update: {},
    create: {
      id: "account-401k",
      scenarioId: scenario.id,
      name: "401(k)",
      type: "TRADITIONAL",
      expectedReturnPct: 7.0,
    },
  });

  const acctRoth = await prisma.account.upsert({
    where: { id: "account-roth" },
    update: {},
    create: {
      id: "account-roth",
      scenarioId: scenario.id,
      name: "Roth IRA",
      type: "ROTH",
      expectedReturnPct: 7.0,
    },
  });
  console.log("Created investment accounts");

  // Create holdings
  await prisma.holding.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "holding-1",
        accountId: acctTaxable.id,
        ticker: "VTI",
        shares: 100,
        avgPrice: 220,
        lastPrice: 250,
      },
      {
        id: "holding-2",
        accountId: acctTaxable.id,
        ticker: "VXUS",
        shares: 50,
        avgPrice: 55,
        lastPrice: 60,
      },
      {
        id: "holding-3",
        accountId: acct401k.id,
        ticker: "VFIAX",
        shares: 200,
        avgPrice: 400,
        lastPrice: 450,
      },
      {
        id: "holding-4",
        accountId: acctRoth.id,
        ticker: "VTI",
        shares: 50,
        avgPrice: 200,
        lastPrice: 250,
      },
    ],
  });
  console.log("Created holdings");

  // Create contributions
  await prisma.contribution.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "contrib-1",
        scenarioId: scenario.id,
        accountId: acctTaxable.id,
        amountMonthly: 1000,
        startDate,
        escalationPct: 3,
      },
      {
        id: "contrib-2",
        scenarioId: scenario.id,
        accountId: acct401k.id,
        amountMonthly: 1500,
        startDate,
        escalationPct: 3,
      },
      {
        id: "contrib-3",
        scenarioId: scenario.id,
        accountId: acctRoth.id,
        amountMonthly: 500,
        startDate,
      },
    ],
  });
  console.log("Created contributions");

  // Create loans
  await prisma.loan.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "loan-1",
        scenarioId: scenario.id,
        type: "AUTO",
        name: "Car Loan",
        principal: 25000,
        aprPct: 5.5,
        termMonths: 60,
        startDate,
      },
    ],
  });
  console.log("Created loans");

  // Create goals
  await prisma.goal.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "goal-college",
        scenarioId: scenario.id,
        type: "COLLEGE",
        name: "College Fund",
        targetAmountReal: 150000,
        targetDate: new Date(now.getFullYear() + 10, 8, 1),
        priority: 1,
      },
      {
        id: "goal-home",
        scenarioId: scenario.id,
        type: "HOME_PURCHASE",
        name: "Home Down Payment",
        targetAmountReal: 100000,
        targetDate: new Date(now.getFullYear() + 5, 0, 1),
        priority: 2,
      },
      {
        id: "goal-retirement",
        scenarioId: scenario.id,
        type: "RETIREMENT",
        name: "Retirement",
        targetAmountReal: 2000000,
        targetDate: new Date(now.getFullYear() + 25, 0, 1),
        priority: 3,
      },
    ],
  });
  console.log("Created goals");

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Step 2: Update package.json for seed**

Add to apps/web/package.json:

```json
{
  "prisma": {
    "seed": "npx ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

**Step 3: Commit**

```bash
git add apps/web/prisma/seed.ts apps/web/package.json
git commit -m "feat: add comprehensive database seed with demo data"
```

---

## Task 0.10: Install Dependencies and Initialize Database

**Step 1: Install all dependencies**

```bash
cd /Users/adommeti/source/finatlas_claude
pnpm install
```

**Step 2: Create .env file**

```bash
cp .env.example apps/web/.env
# Edit to add AUTH_JWT_SECRET
echo "AUTH_JWT_SECRET=$(openssl rand -base64 32)" >> apps/web/.env
```

**Step 3: Run migrations**

```bash
pnpm --filter @finatlas/web prisma migrate dev --name init
```

**Step 4: Seed database**

```bash
pnpm --filter @finatlas/web prisma db seed
```

**Step 5: Verify setup**

```bash
pnpm --filter @finatlas/web dev
# Open http://localhost:3000/login
# Login with demo@local / Demo1234!
```

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: complete Phase 0 bootstrap setup"
```

---

# Phase 1: Data Entry Modules (CRUD Screens)

**Exit Criteria:** User can input all data without the engine; data persists.

**Parallel Workstreams:** Each CRUD module can be developed independently by a sub-agent.

---

## Workstream 1A: App Shell + Dashboard Layout

### Task 1.1: Create App Shell Components

**Files:**
- Create: `apps/web/components/layout/AppShell.tsx`
- Create: `apps/web/components/layout/Sidebar.tsx`
- Create: `apps/web/components/layout/ScenarioSelector.tsx`
- Create: `apps/web/components/layout/ExplainDrawer.tsx`
- Create: `apps/web/app/(app)/layout.tsx`
- Create: `apps/web/app/(app)/page.tsx`

(Detailed implementation in Vertical Slice documentation)

---

## Workstream 1B: Income CRUD

### Task 1.2: Create Income API Routes

**Files:**
- Create: `apps/web/app/api/incomes/route.ts`
- Create: `apps/web/app/api/incomes/[id]/route.ts`

### Task 1.3: Create Income List Page

**Files:**
- Create: `apps/web/app/(app)/incomes/page.tsx`

### Task 1.4: Create Income Form Component

**Files:**
- Create: `apps/web/components/forms/IncomeForm.tsx`

---

## Workstream 1C: Expense CRUD

### Task 1.5-1.7: Expense API, List, Form

(Parallel to Income CRUD)

---

## Workstream 1D: Investment Accounts CRUD

### Task 1.8-1.11: Account API, List, Form, Holdings management

---

## Workstream 1E: Loans CRUD

### Task 1.12-1.14: Loan API, List, Form

---

## Workstream 1F: Goals CRUD

### Task 1.15-1.17: Goal API, List, Form

---

# Phase 2: Engine v1 (No Taxes Yet)

**Exit Criteria:** Baseline scenario projections render with charts and explain drawer.

**Parallel Workstreams:** Core engine modules can be built independently.

---

## Workstream 2A: Engine Core Utilities

### Task 2.1: Date Utilities

**Files:**
- Create: `packages/engine/src/internal/dates.ts`

### Task 2.2: Math Utilities

**Files:**
- Create: `packages/engine/src/internal/math.ts`

### Task 2.3: Growth/Inflation Index

**Files:**
- Create: `packages/engine/src/internal/growth.ts`

---

## Workstream 2B: Schedule Processing

### Task 2.4: Frequency Normalization

**Files:**
- Create: `packages/engine/src/internal/schedules.ts`

### Task 2.5: Loan Amortization

**Files:**
- Create: `packages/engine/src/internal/loans.ts`

---

## Workstream 2C: Account Processing

### Task 2.6: Account Balance Tracking

**Files:**
- Create: `packages/engine/src/internal/accounts.ts`

---

## Workstream 2D: Projection Integration

### Task 2.7: Main Projection Loop

**Files:**
- Create: `packages/engine/src/internal/projection.ts`
- Create: `packages/engine/src/internal/normalize.ts`
- Create: `packages/engine/src/internal/hash.ts`
- Create: `packages/engine/src/contract.ts`

### Task 2.8: Engine API Integration

**Files:**
- Create: `apps/web/lib/engine/buildScenarioInput.ts`
- Create: `apps/web/app/api/engine/run/route.ts`

---

# Phase 3: Taxes + Inflation Integration

**Exit Criteria:** Taxes appear in cashflow; tax breakdown explains totals.

---

## Task 3.1: Tax Engine Core

**Files:**
- Create: `packages/engine/src/internal/taxes.ts`

## Task 3.2: Tax Rules Data Structure

**Files:**
- Create: `apps/web/lib/engine/taxRulesLoader.ts`
- Create: `apps/web/prisma/seed-tax-rules.ts`

## Task 3.3: Tax Profile UI

**Files:**
- Create: `apps/web/app/(app)/taxes/page.tsx`

---

# Phase 4: CSV Import

**Exit Criteria:** User imports a holdings CSV successfully; charts update.

---

## Task 4.1: Import API

**Files:**
- Create: `apps/web/app/api/import/holdings/route.ts`

## Task 4.2: Import Wizard UI

**Files:**
- Create: `apps/web/app/(app)/investments/holdings/import/page.tsx`

---

# Phase 5: Polish + Professional UX

**Exit Criteria:** App looks and feels "real," not a prototype.

---

## Workstream 5A: Chart Index Page

### Task 5.1: Charts Page

**Files:**
- Create: `apps/web/app/(app)/charts/page.tsx`

---

## Workstream 5B: Command Palette

### Task 5.2: Cmd-K Command Palette

**Files:**
- Create: `apps/web/components/CommandPalette.tsx`

---

## Workstream 5C: Loading/Error States

### Task 5.3: Empty States & Loading Skeletons

---

## Workstream 5D: CSV Export

### Task 5.4: Projection Export

---

## Workstream 5E: Responsive Refinements

### Task 5.5: Mobile Navigation

---

# Advanced Features (Post-MVP)

## Goals Engine Integration

**Files (from Goals engine.md):**
- Create: `packages/engine/src/internal/goals.ts`
- Update: `packages/engine/src/internal/projection.ts`
- Create: `apps/web/app/(app)/goals/page.tsx` (charts)

## Goal-Linked Accounts

**Files (from Goal-linked accounts.md):**
- Update: `prisma/schema.prisma` (GoalFundingRule model)
- Create: `packages/engine/src/internal/goals_linked.ts`
- Create: `apps/web/app/api/goals/funding-rules/route.ts`
- Create: `apps/web/app/(app)/goals/[goalId]/funding/page.tsx`

## Earmarks Implementation

**Files (from Earmarks in Investments.md):**
- Update: `packages/engine/src/types.ts` (earmark series)
- Update: `packages/engine/src/internal/projection.ts`
- Create: `apps/web/app/(app)/investments/earmarks/page.tsx`

---

# Execution Checklist Summary

| Phase | Tasks | Parallel? | Est. Effort |
|-------|-------|-----------|-------------|
| 0 | 10 | Yes (3 streams) | Foundation |
| 1 | 17 | Yes (6 streams) | CRUD modules |
| 2 | 8 | Yes (4 streams) | Engine core |
| 3 | 3 | Partial | Tax engine |
| 4 | 2 | Sequential | Import wizard |
| 5 | 5 | Yes (5 streams) | Polish |
| Advanced | 8+ | Sequential | Post-MVP |

---

# Testing Strategy

## Engine Tests (Vitest)

```bash
pnpm --filter @finatlas/engine test
```

- Unit tests for each internal module
- Golden tests for known scenarios
- Regression tests for edge cases

## API Tests

- Request validation tests
- Authorization tests
- Integration tests

## UI Tests

- Smoke tests for key flows
- Component tests for forms
- E2E tests for import wizard

---

# Deployment Validation

```bash
# Local development
pnpm dev

# Docker validation
docker compose up --build

# Production checklist
- [ ] Demo login works
- [ ] Sample dashboard loads
- [ ] Scenario projections compute
- [ ] Charts render correctly
- [ ] Explain drawer shows breakdowns
```
