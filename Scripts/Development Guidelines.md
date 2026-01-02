Below is the **implementation-grade scaffold** for FinAtlas: Monorepo layout, Docker, Prisma (SQLite), seed data (demo accounts + realistic sample household), Zod schemas + TS types, Next.js App Router map, UI component spec, engine contract, and engineering standards.

Everything is designed for: **local-only**, **containerized on macOS**, **deterministic finance math**, **modern responsive UI**, and **auditable explanations**.

---

# 1) Monorepo folder structure

### Folder tree (proposed)

```txt
finatlas/
  apps/
    web/
      app/
        (auth)/
          login/
            page.tsx
          layout.tsx
        (app)/
          layout.tsx
          page.tsx                    # Dashboard
          charts/
            page.tsx                  # Charts Index
          incomes/
            page.tsx
            new/
              page.tsx
            [id]/
              page.tsx
          expenses/
            page.tsx
            new/
              page.tsx
            [id]/
              page.tsx
          investments/
            page.tsx                  # Accounts list
            accounts/
              [accountId]/
                page.tsx              # Holdings + contributions
            holdings/
              import/
                page.tsx              # CSV import wizard
          liabilities/
            page.tsx
            new/
              page.tsx
            [id]/
              page.tsx
          taxes/
            page.tsx                  # Taxes & assumptions
            rules/
              page.tsx                # rule versions + update
          goals/
            page.tsx
            new/
              page.tsx
            [id]/
              page.tsx
          scenarios/
            page.tsx
            [scenarioId]/
              page.tsx                # scenario detail + compare
          settings/
            page.tsx
        api/
          auth/
            login/
              route.ts
            logout/
              route.ts
            me/
              route.ts
          engine/
            run/
              route.ts                # run projection for scenario
          imports/
            holdings/
              route.ts                # commit import
          tax/
            rules/
              update/
                route.ts              # tax rules update pipeline trigger
      components/
        layout/
        charts/
        data/
        forms/
        ui/                           # shadcn (generated)
      lib/
        auth/
        db/
        crypto/
        engine/
        validation/
      styles/
      public/
      next.config.mjs
      package.json
      tsconfig.json
      tailwind.config.ts
      postcss.config.mjs

  packages/
    engine/
      src/
        index.ts
        contract.ts
        types.ts
        version.ts
      package.json
      tsconfig.json
    schemas/
      src/
        index.ts
        enums.ts
        base.ts
        auth.ts
        household.ts
        incomes.ts
        expenses.ts
        investments.ts
        liabilities.ts
        taxes.ts
        goals.ts
        scenarios.ts
        imports.ts
        engine.ts
      package.json
      tsconfig.json
    ui/
      src/
        index.ts
        components/
          app-shell/
          charts/
          explain/
          forms/
          data-table/
      package.json
      tsconfig.json

  prisma/
    schema.prisma
    migrations/
    seed.ts

  data/                               # optional for non-docker local runs
    .gitkeep

  docker/
    web.Dockerfile
    entrypoint.sh

  .env.example
  docker-compose.yml
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
  eslint.config.mjs
  prettier.config.cjs
  README.md
```

### Root `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "prisma"
```

### Root `package.json` (scripts tuned for vibe coding)

```json
{
  "name": "finatlas",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "scripts": {
    "dev": "pnpm -r dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",

    "db:generate": "pnpm --filter @finatlas/web prisma:generate",
    "db:migrate": "pnpm --filter @finatlas/web prisma:migrate",
    "db:seed": "pnpm --filter @finatlas/web prisma:seed",

    "web:dev": "pnpm --filter @finatlas/web dev",
    "web:build": "pnpm --filter @finatlas/web build",
    "web:start": "pnpm --filter @finatlas/web start"
  },
  "devDependencies": {
    "prettier": "^3.3.3",
    "eslint": "^9.10.0",
    "typescript": "^5.6.3"
  }
}
```

---

# 2) Docker Compose + Dockerfiles (Next.js + SQLite volume on macOS)

## 2.1 `.env.example`

```bash
# --- App ---
NODE_ENV=development
APP_ORIGIN=http://localhost:3000

# --- Database ---
# In Docker, we store SQLite under /data
DATABASE_URL=file:/data/finatlas.db

# --- Auth ---
AUTH_JWT_SECRET=change-me-to-a-long-random-string
AUTH_COOKIE_NAME=finatlas_session

# --- Paths ---
DATA_DIR=/data

# --- Anthropic (stored encrypted in DB; this env is optional) ---
# ANTHROPIC_API_KEY=
```

## 2.2 `docker-compose.yml` (dev-friendly, persistent data)

```yaml
services:
  web:
    build:
      context: .
      dockerfile: docker/web.Dockerfile
      target: dev
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      DATABASE_URL: ${DATABASE_URL}
      AUTH_JWT_SECRET: ${AUTH_JWT_SECRET}
      AUTH_COOKIE_NAME: ${AUTH_COOKIE_NAME}
      DATA_DIR: ${DATA_DIR}
      APP_ORIGIN: ${APP_ORIGIN}
    volumes:
      # Source code for hot reload
      - .:/workspace:cached
      # Persist DB + import files + exports
      - finatlas_data:/data
      # Speed up node_modules inside container
      - finatlas_node_modules:/workspace/node_modules
    working_dir: /workspace
    command: ["/bin/bash", "/workspace/docker/entrypoint.sh"]

volumes:
  finatlas_data:
  finatlas_node_modules:
```

## 2.3 `docker/web.Dockerfile` (multi-stage: dev + prod)

```dockerfile
# syntax=docker/dockerfile:1.7
FROM node:20-bookworm-slim AS base
WORKDIR /workspace
ENV NEXT_TELEMETRY_DISABLED=1

# Install deps required by prisma engines
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Enable pnpm via corepack
RUN corepack enable

# ----- deps stage -----
FROM base AS deps
COPY package.json pnpm-workspace.yaml tsconfig.base.json eslint.config.mjs prettier.config.cjs ./
COPY apps/web/package.json apps/web/package.json
COPY packages/engine/package.json packages/engine/package.json
COPY packages/schemas/package.json packages/schemas/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY prisma/schema.prisma prisma/schema.prisma

RUN pnpm install --frozen-lockfile || pnpm install

# ----- dev stage -----
FROM deps AS dev
COPY . .
EXPOSE 3000
CMD ["pnpm", "--filter", "@finatlas/web", "dev", "--hostname", "0.0.0.0", "--port", "3000"]

# ----- build stage -----
FROM deps AS builder
COPY . .
RUN pnpm --filter @finatlas/web prisma:generate
RUN pnpm --filter @finatlas/web build

# ----- prod stage -----
FROM base AS runner
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=builder /workspace/apps/web/.next ./apps/web/.next
COPY --from=builder /workspace/apps/web/public ./apps/web/public
COPY --from=builder /workspace/apps/web/package.json ./apps/web/package.json
COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/prisma ./prisma
COPY --from=builder /workspace/packages ./packages
COPY docker/entrypoint.sh docker/entrypoint.sh
RUN chmod +x docker/entrypoint.sh
EXPOSE 3000
CMD ["/bin/bash", "/workspace/docker/entrypoint.sh"]
```

## 2.4 `docker/entrypoint.sh` (auto-migrate + seed on first run)

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "== FinAtlas entrypoint =="

# Ensure data dir exists
mkdir -p "${DATA_DIR:-/data}"

# Prisma generate
echo "== Prisma generate =="
pnpm --filter @finatlas/web prisma:generate

# Migrate DB (deploy migrations). If no migrations exist yet, this is safe but does nothing.
echo "== Prisma migrate deploy =="
pnpm --filter @finatlas/web prisma:migrate || true

# Seed only if DB is empty (simple heuristic: file exists but no users table rows)
echo "== Prisma seed (idempotent) =="
pnpm --filter @finatlas/web prisma:seed || true

echo "== Starting web app =="
pnpm --filter @finatlas/web dev --hostname 0.0.0.0 --port 3000
```

> **Note:** Once you create initial migrations, `prisma migrate deploy` becomes the stable non-interactive option. For early prototyping, you can also run `prisma migrate dev` locally outside Docker.

---

# 3) Prisma schema for SQLite (full coverage)

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

enum UserRole {
  ADMIN
  USER
}

enum MemberRole {
  SPOUSE
  CHILD
  OTHER
}

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

enum AccountType {
  TAXABLE
  TRADITIONAL
  ROTH
}

enum LoanType {
  AUTO
  STUDENT
  PERSONAL
  OTHER
}

enum GoalType {
  COLLEGE
  HOME_PURCHASE
  RETIREMENT
}

enum FilingStatus {
  SINGLE
  MFJ
  HOH
}

enum TaxJurisdiction {
  FEDERAL
  STATE
}

enum ImportStatus {
  PENDING
  VALIDATED
  COMMITTED
  FAILED
}

model User {
  id             String      @id @default(cuid())
  email          String      @unique
  displayName    String?
  passwordHash   String      // Argon2id hash
  role           UserRole    @default(USER)
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  households     Household[]
  secrets        UserSecret[]
}

model UserSecret {
  id         String   @id @default(cuid())
  userId     String
  kind       String   // e.g. "ANTHROPIC_API_KEY"
  ciphertext String   // base64
  nonce      String   // base64
  salt       String   // base64 (for KDF)
  kdfParams  Json     // Argon2 params, etc
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, kind])
}

model Household {
  id            String    @id @default(cuid())
  ownerUserId   String
  name          String
  currency      String    @default("USD")
  anchorDate    DateTime  // "today" anchor stored for determinism
  startDate     DateTime
  endDate       DateTime
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  owner         User      @relation(fields: [ownerUserId], references: [id], onDelete: Cascade)
  members       HouseholdMember[]
  scenarios     Scenario[]
  imports       ImportBatch[]
}

model HouseholdMember {
  id           String     @id @default(cuid())
  householdId  String
  name         String
  role         MemberRole
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  household    Household  @relation(fields: [householdId], references: [id], onDelete: Cascade)
  incomes      IncomeStream[]

  @@index([householdId])
}

model Scenario {
  id            String     @id @default(cuid())
  householdId   String
  name          String
  isBaseline    Boolean    @default(false)
  description   String?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  household     Household  @relation(fields: [householdId], references: [id], onDelete: Cascade)

  assumptions   ScenarioAssumptions?
  taxProfile    TaxProfile?
  incomes       IncomeStream[]
  expenses      Expense[]
  accounts      InvestmentAccount[]
  contributions ContributionRule[]
  loans         Loan[]
  goals         Goal[]

  overrides     ScenarioOverride[]
  engineCache   EngineResultCache?

  @@index([householdId])
}

model ScenarioOverride {
  id          String   @id @default(cuid())
  scenarioId  String
  patch       Json     // JSON Patch-like structure or your own override schema
  createdAt   DateTime @default(now())

  scenario    Scenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)

  @@index([scenarioId])
}

model ScenarioAssumptions {
  id                     String   @id @default(cuid())
  scenarioId              String   @unique
  inflationRatePct        Float    // e.g. 3.0 means 3%
  taxableInterestYieldPct Float    // annual % of taxable balance
  taxableDividendYieldPct Float
  realizedStGainPct       Float    // annual % of taxable balance (can be negative)
  realizedLtGainPct       Float
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  scenario               Scenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)
}

model IncomeStream {
  id            String      @id @default(cuid())
  scenarioId    String
  memberId      String?
  name          String
  amount        Float
  frequency     Frequency
  startDate     DateTime
  endDate       DateTime?
  growthRule    GrowthRule  @default(NONE)
  growthPct     Float?      // used when growthRule=CUSTOM_PERCENT
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  scenario      Scenario    @relation(fields: [scenarioId], references: [id], onDelete: Cascade)
  member        HouseholdMember? @relation(fields: [memberId], references: [id], onDelete: SetNull)

  @@index([scenarioId])
  @@index([memberId])
}

model Expense {
  id            String      @id @default(cuid())
  scenarioId    String
  category      String
  name          String?
  amount        Float
  frequency     Frequency
  startDate     DateTime
  endDate       DateTime?
  growthRule    GrowthRule  @default(NONE)
  growthPct     Float?
  isEssential   Boolean     @default(true)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  scenario      Scenario    @relation(fields: [scenarioId], references: [id], onDelete: Cascade)

  @@index([scenarioId])
}

model InvestmentAccount {
  id                 String      @id @default(cuid())
  scenarioId          String
  name               String
  type               AccountType
  expectedReturnPct  Float       // annual expected return
  createdAt          DateTime    @default(now())
  updatedAt          DateTime    @updatedAt

  scenario           Scenario    @relation(fields: [scenarioId], references: [id], onDelete: Cascade)
  holdings           Holding[]
  contributions      ContributionRule[]

  @@index([scenarioId])
}

model Holding {
  id           String   @id @default(cuid())
  accountId    String
  ticker       String
  shares       Float
  avgPrice     Float
  lastPrice    Float?
  asOfDate     DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  account      InvestmentAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)

  @@unique([accountId, ticker])
  @@index([accountId])
}

model ContributionRule {
  id            String     @id @default(cuid())
  scenarioId     String
  accountId      String
  amountMonthly  Float
  startDate      DateTime
  endDate        DateTime?
  escalationPct  Float?    // annual escalation
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  scenario       Scenario  @relation(fields: [scenarioId], references: [id], onDelete: Cascade)
  account        InvestmentAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)

  @@index([scenarioId])
  @@index([accountId])
}

model Loan {
  id            String    @id @default(cuid())
  scenarioId     String
  type          LoanType
  name          String
  principal     Float
  aprPct        Float
  termMonths    Int
  startDate     DateTime
  paymentOverrideMonthly Float?
  extraPaymentMonthly    Float?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  scenario      Scenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)

  @@index([scenarioId])
}

model Goal {
  id            String   @id @default(cuid())
  scenarioId     String
  type          GoalType
  name          String
  targetAmountReal Float  // today's dollars
  targetDate    DateTime
  priority      Int      @default(2) // 1 high, 2 normal, 3 low
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  scenario      Scenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)

  @@index([scenarioId])
}

model TaxProfile {
  id                 String        @id @default(cuid())
  scenarioId          String        @unique
  stateCode           String        // e.g. "VA"
  filingStatus        FilingStatus
  taxYear             Int
  includePayrollTaxes Boolean       @default(true)
  advancedOverridesEnabled Boolean  @default(false)
  payrollOverrides    Json?         // only used when advancedOverridesEnabled=true
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  scenario            Scenario      @relation(fields: [scenarioId], references: [id], onDelete: Cascade)
}

model TaxRule {
  id              String         @id @default(cuid())
  jurisdiction    TaxJurisdiction
  stateCode       String?        // required when jurisdiction=STATE
  taxYear         Int
  rulesJson       Json
  sources         Json           // array of source URLs + metadata
  fetchedAt       DateTime
  validation      Json           // {status, checks, warnings}
  createdAt       DateTime       @default(now())

  @@unique([jurisdiction, stateCode, taxYear])
  @@index([taxYear])
}

model ImportBatch {
  id            String       @id @default(cuid())
  householdId    String
  scenarioId     String?     // imports typically apply to a scenario
  status        ImportStatus @default(PENDING)
  originalFileName String
  contentHash   String
  columnMapping Json?        // mapping from CSV headers -> canonical fields
  asOfDate      DateTime?
  rowsParsed    Int          @default(0)
  rowsImported  Int          @default(0)
  error         String?
  createdAt     DateTime     @default(now())

  household     Household    @relation(fields: [householdId], references: [id], onDelete: Cascade)
  scenario      Scenario?    @relation(fields: [scenarioId], references: [id], onDelete: SetNull)
  snapshots     ImportHoldingSnapshot[]

  @@index([householdId])
  @@index([scenarioId])
}

model ImportHoldingSnapshot {
  id           String   @id @default(cuid())
  importBatchId String
  accountName  String
  accountType  AccountType
  ticker       String
  shares       Float
  avgPrice     Float
  lastPrice    Float?
  asOfDate     DateTime?
  createdAt    DateTime @default(now())

  importBatch  ImportBatch @relation(fields: [importBatchId], references: [id], onDelete: Cascade)

  @@index([importBatchId])
}

model EngineResultCache {
  id           String   @id @default(cuid())
  scenarioId   String   @unique
  engineVersion String
  inputHash    String
  resultsJson  Json
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  scenario     Scenario  @relation(fields: [scenarioId], references: [id], onDelete: Cascade)

  @@index([engineVersion])
  @@index([inputHash])
}
```

---

# 4) Seed script (demo accounts + sample household + baseline + 2 scenarios)

## 4.1 `apps/web/package.json` (Prisma scripts)

```json
{
  "name": "@finatlas/web",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "eslint .",
    "typecheck": "tsc -p tsconfig.json --noEmit",

    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate deploy",
    "prisma:seed": "prisma db seed"
  },
  "prisma": {
    "seed": "ts-node --transpile-only ../../prisma/seed.ts"
  }
}
```

## 4.2 `prisma/seed.ts` (idempotent seed)

```ts
/* eslint-disable no-console */
import { PrismaClient, AccountType, FilingStatus, Frequency, GrowthRule, LoanType, GoalType, MemberRole } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function upsertUser(email: string, password: string, role: "ADMIN" | "USER") {
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  return prisma.user.upsert({
    where: { email },
    update: { role, passwordHash },
    create: { email, role, passwordHash, displayName: email.split("@")[0] },
  });
}

async function main() {
  console.log("Seeding users...");
  const demo = await upsertUser("demo@local", "Demo1234!", "USER");
  const admin = await upsertUser("admin@local", "Admin1234!", "ADMIN");

  console.log("Seeding household...");
  const anchor = new Date("2026-01-01T00:00:00.000Z"); // anchor stored for determinism
  const start = new Date("2026-01-01T00:00:00.000Z");
  const end = new Date("2056-01-01T00:00:00.000Z");

  // Idempotent household: one per demo user
  const household = await prisma.household.upsert({
    where: { id: `seed_household_${demo.id}` },
    update: {},
    create: {
      id: `seed_household_${demo.id}`,
      ownerUserId: demo.id,
      name: "Sample Household (FinAtlas Demo)",
      currency: "USD",
      anchorDate: anchor,
      startDate: start,
      endDate: end,
    },
  });

  console.log("Seeding members...");
  const [spouse1, spouse2, child1, child2] = await Promise.all([
    prisma.householdMember.upsert({
      where: { id: `seed_member_spouse1_${household.id}` },
      update: {},
      create: { id: `seed_member_spouse1_${household.id}`, householdId: household.id, name: "Sharanya", role: MemberRole.SPOUSE },
    }),
    prisma.householdMember.upsert({
      where: { id: `seed_member_spouse2_${household.id}` },
      update: {},
      create: { id: `seed_member_spouse2_${household.id}`, householdId: household.id, name: "Partner", role: MemberRole.SPOUSE },
    }),
    prisma.householdMember.upsert({
      where: { id: `seed_member_child1_${household.id}` },
      update: {},
      create: { id: `seed_member_child1_${household.id}`, householdId: household.id, name: "Kid A", role: MemberRole.CHILD },
    }),
    prisma.householdMember.upsert({
      where: { id: `seed_member_child2_${household.id}` },
      update: {},
      create: { id: `seed_member_child2_${household.id}`, householdId: household.id, name: "Kid B", role: MemberRole.CHILD },
    }),
  ]);

  console.log("Seeding scenarios...");
  const baseline = await prisma.scenario.upsert({
    where: { id: `seed_scn_baseline_${household.id}` },
    update: { name: "Baseline", isBaseline: true },
    create: { id: `seed_scn_baseline_${household.id}`, householdId: household.id, name: "Baseline", isBaseline: true },
  });

  const aggressive = await prisma.scenario.upsert({
    where: { id: `seed_scn_aggressive_${household.id}` },
    update: { name: "Aggressive Growth" },
    create: { id: `seed_scn_aggressive_${household.id}`, householdId: household.id, name: "Aggressive Growth", description: "Higher contributions + higher return assumptions." },
  });

  const conservative = await prisma.scenario.upsert({
    where: { id: `seed_scn_conservative_${household.id}` },
    update: { name: "Conservative" },
    create: { id: `seed_scn_conservative_${household.id}`, householdId: household.id, name: "Conservative", description: "Lower returns + extra savings buffer." },
  });

  async function seedScenarioCore(scnId: string, opts: { inflation: number; intY: number; divY: number; st: number; lt: number; state: string; filing: FilingStatus; year: number; }) {
    await prisma.scenarioAssumptions.upsert({
      where: { scenarioId: scnId },
      update: {
        inflationRatePct: opts.inflation,
        taxableInterestYieldPct: opts.intY,
        taxableDividendYieldPct: opts.divY,
        realizedStGainPct: opts.st,
        realizedLtGainPct: opts.lt,
      },
      create: {
        scenarioId: scnId,
        inflationRatePct: opts.inflation,
        taxableInterestYieldPct: opts.intY,
        taxableDividendYieldPct: opts.divY,
        realizedStGainPct: opts.st,
        realizedLtGainPct: opts.lt,
      },
    });

    await prisma.taxProfile.upsert({
      where: { scenarioId: scnId },
      update: {
        stateCode: opts.state,
        filingStatus: opts.filing,
        taxYear: opts.year,
        includePayrollTaxes: true,
        advancedOverridesEnabled: false,
      },
      create: {
        scenarioId: scnId,
        stateCode: opts.state,
        filingStatus: opts.filing,
        taxYear: opts.year,
        includePayrollTaxes: true,
        advancedOverridesEnabled: false,
      },
    });
  }

  console.log("Seeding assumptions + tax profiles...");
  await seedScenarioCore(baseline.id, { inflation: 3.0, intY: 1.5, divY: 1.8, st: 2.0, lt: 4.0, state: "VA", filing: FilingStatus.MFJ, year: 2026 });
  await seedScenarioCore(aggressive.id, { inflation: 3.0, intY: 1.2, divY: 1.6, st: 3.0, lt: 6.0, state: "VA", filing: FilingStatus.MFJ, year: 2026 });
  await seedScenarioCore(conservative.id, { inflation: 3.0, intY: 1.8, divY: 2.0, st: 0.5, lt: 2.5, state: "VA", filing: FilingStatus.MFJ, year: 2026 });

  async function seedStreams(scnId: string, scale = 1) {
    // Income: two salaries + kid side income
    await prisma.incomeStream.createMany({
      data: [
        {
          scenarioId: scnId,
          memberId: spouse1.id,
          name: "Salary - Sharanya",
          amount: 13500 * scale,
          frequency: Frequency.MONTHLY,
          startDate: start,
          growthRule: GrowthRule.CUSTOM_PERCENT,
          growthPct: 3.0,
        },
        {
          scenarioId: scnId,
          memberId: spouse2.id,
          name: "Salary - Partner",
          amount: 9500 * scale,
          frequency: Frequency.MONTHLY,
          startDate: start,
          growthRule: GrowthRule.CUSTOM_PERCENT,
          growthPct: 3.0,
        },
        {
          scenarioId: scnId,
          memberId: child1.id,
          name: "Kid A - Side income",
          amount: 150 * scale,
          frequency: Frequency.MONTHLY,
          startDate: start,
          growthRule: GrowthRule.TRACK_INFLATION,
        },
      ],
      skipDuplicates: true,
    });

    // Expenses including mortgage as expense-only
    await prisma.expense.createMany({
      data: [
        { scenarioId: scnId, category: "Housing", name: "Mortgage Payment", amount: 4200, frequency: Frequency.MONTHLY, startDate: start, growthRule: GrowthRule.NONE, isEssential: true },
        { scenarioId: scnId, category: "Housing", name: "Utilities", amount: 450, frequency: Frequency.MONTHLY, startDate: start, growthRule: GrowthRule.TRACK_INFLATION, isEssential: true },
        { scenarioId: scnId, category: "Food", name: "Groceries", amount: 1200, frequency: Frequency.MONTHLY, startDate: start, growthRule: GrowthRule.TRACK_INFLATION, isEssential: true },
        { scenarioId: scnId, category: "Transportation", name: "Auto / Fuel / Transit", amount: 650, frequency: Frequency.MONTHLY, startDate: start, growthRule: GrowthRule.TRACK_INFLATION, isEssential: true },
        { scenarioId: scnId, category: "Kids", name: "Activities", amount: 600, frequency: Frequency.MONTHLY, startDate: start, growthRule: GrowthRule.TRACK_INFLATION, isEssential: false },
        { scenarioId: scnId, category: "Insurance", name: "Health Insurance", amount: 800, frequency: Frequency.MONTHLY, startDate: start, growthRule: GrowthRule.TRACK_INFLATION, isEssential: true },
        { scenarioId: scnId, category: "Insurance", name: "Auto Insurance", amount: 160, frequency: Frequency.MONTHLY, startDate: start, growthRule: GrowthRule.TRACK_INFLATION, isEssential: true },
        { scenarioId: scnId, category: "Subscriptions", name: "Streaming + SaaS", amount: 90, frequency: Frequency.MONTHLY, startDate: start, growthRule: GrowthRule.NONE, isEssential: false },
      ],
      skipDuplicates: true,
    });
  }

  async function seedAccounts(scnId: string, returnBumpPct: number) {
    const acctTaxable = await prisma.investmentAccount.upsert({
      where: { id: `seed_acct_taxable_${scnId}` },
      update: { expectedReturnPct: 7.0 + returnBumpPct },
      create: { id: `seed_acct_taxable_${scnId}`, scenarioId: scnId, name: "Brokerage (Taxable)", type: AccountType.TAXABLE, expectedReturnPct: 7.0 + returnBumpPct },
    });

    const acct401k = await prisma.investmentAccount.upsert({
      where: { id: `seed_acct_401k_${scnId}` },
      update: { expectedReturnPct: 7.5 + returnBumpPct },
      create: { id: `seed_acct_401k_${scnId}`, scenarioId: scnId, name: "401(k) Traditional", type: AccountType.TRADITIONAL, expectedReturnPct: 7.5 + returnBumpPct },
    });

    const acctRoth = await prisma.investmentAccount.upsert({
      where: { id: `seed_acct_roth_${scnId}` },
      update: { expectedReturnPct: 7.0 + returnBumpPct },
      create: { id: `seed_acct_roth_${scnId}`, scenarioId: scnId, name: "Roth IRA", type: AccountType.ROTH, expectedReturnPct: 7.0 + returnBumpPct },
    });

    // Holdings
    await prisma.holding.createMany({
      data: [
        { accountId: acctTaxable.id, ticker: "VTI", shares: 110, avgPrice: 210, lastPrice: 245, asOfDate: anchor },
        { accountId: acctTaxable.id, ticker: "VXUS", shares: 80, avgPrice: 55, lastPrice: 62, asOfDate: anchor },
        { accountId: acct401k.id, ticker: "FXAIX", shares: 300, avgPrice: 120, lastPrice: 165, asOfDate: anchor },
        { accountId: acctRoth.id, ticker: "SCHD", shares: 120, avgPrice: 70, lastPrice: 82, asOfDate: anchor },
      ],
      skipDuplicates: true,
    });

    // Contributions (monthly)
    await prisma.contributionRule.createMany({
      data: [
        { scenarioId: scnId, accountId: acctTaxable.id, amountMonthly: 900 + (returnBumpPct > 0 ? 300 : 0), startDate: start, escalationPct: 2.0 },
        { scenarioId: scnId, accountId: acct401k.id, amountMonthly: 1200 + (returnBumpPct > 0 ? 400 : 0), startDate: start, escalationPct: 2.0 },
        { scenarioId: scnId, accountId: acctRoth.id, amountMonthly: 550 + (returnBumpPct > 0 ? 150 : 0), startDate: start, escalationPct: 2.0 },
      ],
      skipDuplicates: true,
    });
  }

  async function seedLoansAndGoals(scnId: string) {
    await prisma.loan.createMany({
      data: [
        { scenarioId: scnId, type: LoanType.AUTO, name: "Auto Loan", principal: 22000, aprPct: 6.4, termMonths: 60, startDate: new Date("2025-10-01T00:00:00.000Z"), extraPaymentMonthly: 50 },
        { scenarioId: scnId, type: LoanType.PERSONAL, name: "Personal Loan", principal: 8000, aprPct: 10.5, termMonths: 36, startDate: new Date("2025-07-01T00:00:00.000Z") },
      ],
      skipDuplicates: true,
    });

    await prisma.goal.createMany({
      data: [
        { scenarioId: scnId, type: GoalType.COLLEGE, name: "College Fund (Kid A)", targetAmountReal: 120000, targetDate: new Date("2038-09-01T00:00:00.000Z"), priority: 1 },
        { scenarioId: scnId, type: GoalType.HOME_PURCHASE, name: "Home Upgrade / Renovation", targetAmountReal: 90000, targetDate: new Date("2030-06-01T00:00:00.000Z"), priority: 2 },
        { scenarioId: scnId, type: GoalType.RETIREMENT, name: "Retirement Target", targetAmountReal: 2500000, targetDate: new Date("2050-01-01T00:00:00.000Z"), priority: 1 },
      ],
      skipDuplicates: true,
    });
  }

  console.log("Seeding baseline data...");
  await seedStreams(baseline.id, 1);
  await seedAccounts(baseline.id, 0);
  await seedLoansAndGoals(baseline.id);

  console.log("Seeding aggressive data...");
  await seedStreams(aggressive.id, 1);
  await seedAccounts(aggressive.id, 1.0); // +1% return bump
  await seedLoansAndGoals(aggressive.id);

  console.log("Seeding conservative data...");
  await seedStreams(conservative.id, 1);
  await seedAccounts(conservative.id, -1.0); // -1% return bump
  await seedLoansAndGoals(conservative.id);

  console.log("Seed complete.");
  console.log("Demo login: demo@local / Demo1234!");
  console.log("Admin login: admin@local / Admin1234!");
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

> This seed is “mostly idempotent.” For early vibe coding, it’s enough. Later, you can harden it by deleting scenario-owned data before re-inserting.

---

# 5) TypeScript types + Zod schemas (core forms + API boundaries)

Create these in `packages/schemas/src/*` and export from `index.ts`.

## 5.1 `packages/schemas/src/enums.ts`

```ts
import { z } from "zod";

export const FilingStatusEnum = z.enum(["SINGLE", "MFJ", "HOH"]);
export type FilingStatus = z.infer<typeof FilingStatusEnum>;

export const AccountTypeEnum = z.enum(["TAXABLE", "TRADITIONAL", "ROTH"]);
export type AccountType = z.infer<typeof AccountTypeEnum>;

export const FrequencyEnum = z.enum(["MONTHLY", "BIWEEKLY", "WEEKLY", "ANNUAL", "ONE_TIME"]);
export type Frequency = z.infer<typeof FrequencyEnum>;

export const GrowthRuleEnum = z.enum(["NONE", "TRACK_INFLATION", "CUSTOM_PERCENT"]);
export type GrowthRule = z.infer<typeof GrowthRuleEnum>;

export const LoanTypeEnum = z.enum(["AUTO", "STUDENT", "PERSONAL", "OTHER"]);
export type LoanType = z.infer<typeof LoanTypeEnum>;

export const GoalTypeEnum = z.enum(["COLLEGE", "HOME_PURCHASE", "RETIREMENT"]);
export type GoalType = z.infer<typeof GoalTypeEnum>;

export const StateCodeEnum = z.string().min(2).max(2); // "VA", etc (validate list later)
```

## 5.2 `packages/schemas/src/base.ts`

```ts
import { z } from "zod";

export const Money = z.number().finite(); // store as float MVP; later use decimal cents
export const Percent = z.number().finite(); // store as 3.0 = 3%

export const ISODateString = z.string().datetime();
export const Cuid = z.string().min(10);
```

## 5.3 Auth schemas `packages/schemas/src/auth.ts`

```ts
import { z } from "zod";

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const LoginResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    role: z.enum(["ADMIN", "USER"])
  })
});
```

## 5.4 Household + scenario schemas `packages/schemas/src/household.ts`

```ts
import { z } from "zod";
import { ISODateString } from "./base";

export const HouseholdCreateSchema = z.object({
  name: z.string().min(2).max(80),
  anchorDate: ISODateString,
  startDate: ISODateString,
  endDate: ISODateString
});

export const HouseholdMemberSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(60),
  role: z.enum(["SPOUSE", "CHILD", "OTHER"])
});

export const ScenarioCreateSchema = z.object({
  householdId: z.string(),
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  cloneFromScenarioId: z.string().optional()
});
```

## 5.5 Incomes `packages/schemas/src/incomes.ts`

```ts
import { z } from "zod";
import { Money, ISODateString, Percent } from "./base";
import { FrequencyEnum, GrowthRuleEnum } from "./enums";

export const IncomeUpsertSchema = z.object({
  id: z.string().optional(),
  scenarioId: z.string(),
  memberId: z.string().nullable().optional(),
  name: z.string().min(2).max(80),
  amount: Money,
  frequency: FrequencyEnum,
  startDate: ISODateString,
  endDate: ISODateString.nullable().optional(),
  growthRule: GrowthRuleEnum,
  growthPct: Percent.nullable().optional()
}).superRefine((v, ctx) => {
  if (v.growthRule === "CUSTOM_PERCENT" && (v.growthPct === null || v.growthPct === undefined)) {
    ctx.addIssue({ code: "custom", path: ["growthPct"], message: "growthPct required when growthRule=CUSTOM_PERCENT" });
  }
});
```

## 5.6 Expenses `packages/schemas/src/expenses.ts`

```ts
import { z } from "zod";
import { Money, ISODateString, Percent } from "./base";
import { FrequencyEnum, GrowthRuleEnum } from "./enums";

export const ExpenseUpsertSchema = z.object({
  id: z.string().optional(),
  scenarioId: z.string(),
  category: z.string().min(2).max(40),
  name: z.string().max(80).optional(),
  amount: Money,
  frequency: FrequencyEnum,
  startDate: ISODateString,
  endDate: ISODateString.nullable().optional(),
  growthRule: GrowthRuleEnum,
  growthPct: Percent.nullable().optional(),
  isEssential: z.boolean().default(true)
});
```

## 5.7 Investments `packages/schemas/src/investments.ts`

```ts
import { z } from "zod";
import { Money, ISODateString, Percent } from "./base";
import { AccountTypeEnum } from "./enums";

export const InvestmentAccountUpsertSchema = z.object({
  id: z.string().optional(),
  scenarioId: z.string(),
  name: z.string().min(2).max(60),
  type: AccountTypeEnum,
  expectedReturnPct: Percent
});

export const HoldingUpsertSchema = z.object({
  id: z.string().optional(),
  accountId: z.string(),
  ticker: z.string().min(1).max(12),
  shares: z.number().nonnegative(),
  avgPrice: Money,
  lastPrice: Money.nullable().optional(),
  asOfDate: ISODateString.nullable().optional()
});

export const ContributionRuleUpsertSchema = z.object({
  id: z.string().optional(),
  scenarioId: z.string(),
  accountId: z.string(),
  amountMonthly: Money,
  startDate: ISODateString,
  endDate: ISODateString.nullable().optional(),
  escalationPct: Percent.nullable().optional()
});
```

## 5.8 Liabilities `packages/schemas/src/liabilities.ts`

```ts
import { z } from "zod";
import { Money, ISODateString, Percent } from "./base";
import { LoanTypeEnum } from "./enums";

export const LoanUpsertSchema = z.object({
  id: z.string().optional(),
  scenarioId: z.string(),
  type: LoanTypeEnum,
  name: z.string().min(2).max(60),
  principal: Money,
  aprPct: Percent,
  termMonths: z.number().int().positive().max(480),
  startDate: ISODateString,
  paymentOverrideMonthly: Money.nullable().optional(),
  extraPaymentMonthly: Money.nullable().optional()
});
```

## 5.9 Taxes + assumptions `packages/schemas/src/taxes.ts`

```ts
import { z } from "zod";
import { Percent } from "./base";
import { FilingStatusEnum, StateCodeEnum } from "./enums";

export const TaxProfileUpsertSchema = z.object({
  scenarioId: z.string(),
  stateCode: StateCodeEnum,
  filingStatus: FilingStatusEnum,
  taxYear: z.number().int().min(2018).max(2100),
  includePayrollTaxes: z.boolean().default(true),
  advancedOverridesEnabled: z.boolean().default(false),
  payrollOverrides: z.any().nullable().optional()
});

export const ScenarioAssumptionsUpsertSchema = z.object({
  scenarioId: z.string(),
  inflationRatePct: Percent,
  taxableInterestYieldPct: Percent,
  taxableDividendYieldPct: Percent,
  realizedStGainPct: Percent, // can be negative
  realizedLtGainPct: Percent  // can be negative
});
```

## 5.10 Goals `packages/schemas/src/goals.ts`

```ts
import { z } from "zod";
import { Money, ISODateString } from "./base";
import { GoalTypeEnum } from "./enums";

export const GoalUpsertSchema = z.object({
  id: z.string().optional(),
  scenarioId: z.string(),
  type: GoalTypeEnum,
  name: z.string().min(2).max(80),
  targetAmountReal: Money,
  targetDate: ISODateString,
  priority: z.number().int().min(1).max(3).default(2)
});
```

## 5.11 Imports `packages/schemas/src/imports.ts`

```ts
import { z } from "zod";
import { AccountTypeEnum } from "./enums";

export const HoldingsCsvCanonicalSchema = z.object({
  account_name: z.string().min(1),
  account_type: AccountTypeEnum,
  ticker: z.string().min(1),
  shares: z.number().nonnegative(),
  avg_price: z.number().nonnegative(),
  last_price: z.number().nonnegative().optional(),
  as_of_date: z.string().datetime().optional()
});

export const ImportMappingSchema = z.object({
  account_name: z.string(),
  account_type: z.string(),
  ticker: z.string(),
  shares: z.string(),
  avg_price: z.string(),
  last_price: z.string().optional(),
  as_of_date: z.string().optional()
});

export const ImportCommitRequestSchema = z.object({
  householdId: z.string(),
  scenarioId: z.string(),
  originalFileName: z.string(),
  contentHash: z.string(),
  mapping: ImportMappingSchema,
  mode: z.enum(["MERGE_BY_ACCOUNT_TICKER", "REPLACE_ACCOUNT_HOLDINGS"])
});
```

## 5.12 Engine API boundary `packages/schemas/src/engine.ts`

```ts
import { z } from "zod";

export const EngineRunRequestSchema = z.object({
  scenarioId: z.string(),
  asOfDate: z.string().datetime().optional(),
  forceRecompute: z.boolean().optional()
});

export const EngineRunResponseSchema = z.object({
  scenarioId: z.string(),
  engineVersion: z.string(),
  inputHash: z.string(),
  results: z.any() // engine contract types live in @finatlas/engine; UI treats as opaque + typed via TS
});
```

## 5.13 `packages/schemas/src/index.ts`

```ts
export * from "./enums";
export * from "./base";
export * from "./auth";
export * from "./household";
export * from "./incomes";
export * from "./expenses";
export * from "./investments";
export * from "./liabilities";
export * from "./taxes";
export * from "./goals";
export * from "./imports";
export * from "./engine";
```

---

# 6) Next.js App Router page map + route structure

## 6.1 Routing layout strategy

* `app/(auth)` for unauthenticated pages (login)
* `app/(app)` for authenticated shell + all modules
* `app/(app)/layout.tsx` renders:

  * Sidebar + Topbar + Command Palette + Explain Drawer container

## 6.2 Route map (summary)

| Route                               | Purpose                                  |
| ----------------------------------- | ---------------------------------------- |
| `/login`                            | Demo/user login                          |
| `/`                                 | Dashboard                                |
| `/charts`                           | Charts Index (interactive chart gallery) |
| `/incomes`                          | Income streams                           |
| `/expenses`                         | Expenses                                 |
| `/investments`                      | Accounts overview                        |
| `/investments/accounts/[accountId]` | Holdings + contributions                 |
| `/investments/holdings/import`      | CSV import wizard                        |
| `/liabilities`                      | Non-mortgage loans                       |
| `/taxes`                            | Tax profile + assumptions                |
| `/taxes/rules`                      | Tax rule versions + updater              |
| `/goals`                            | Goals                                    |
| `/scenarios`                        | Scenarios list                           |
| `/scenarios/[scenarioId]`           | Scenario detail + compare                |
| `/settings`                         | App settings (theme, export, data mgmt)  |

## 6.3 API routes

* `POST /api/auth/login` → sets session cookie
* `POST /api/auth/logout`
* `GET /api/auth/me`
* `POST /api/engine/run` → runs projection for scenario (cached)
* `POST /api/imports/holdings` → commit import
* `POST /api/tax/rules/update` → trigger rule update pipeline (anthropic-assisted parsing, deterministic validation)

---

# 7) UI component spec (shadcn/ui + Tailwind, Netflix/HubSpot style)

## 7.1 Shell components (apps/web/components/layout)

**`<AppShell />`**

* Composition:

  * `<SidebarNav />` (collapsible)
  * `<Topbar />` (search/command, scenario selector, profile)
  * `<MainContent />`
  * `<ExplainDrawer />` (right side, slide-over on mobile)
  * `<CommandPalette />` (⌘K)
* Responsive:

  * Desktop: sidebar + content + optional explain drawer
  * Mobile: hamburger sidebar + bottom sheet explain drawer

**`<SidebarNav />`**

* Sections:

  * Overview (Dashboard, Charts)
  * Planning (Incomes, Expenses, Goals)
  * Wealth (Investments, Liabilities)
  * Tax (Taxes & Assumptions, Tax Rules)
  * Scenarios, Import, Settings
* UX: active route highlight, icons, compact mode

**`<Topbar />`**

* Left: breadcrumb + scenario selector dropdown
* Center: quick search (opens CommandPalette)
* Right: “Recompute” button + warnings indicator + user menu

## 7.2 Chart system (apps/web/components/charts)

**`<ChartCard />`**

* header: title + toggles (real/nominal, scenario)
* body: chart
* footer: mini legend + “Explain” link
* Must support responsive container sizing

**`<ChartsIndex />`**

* grid of ChartCards, each with:

  * filters
  * interactive legend toggles
  * brush/zoom where applicable
* Includes “chart index list” (left rail on desktop)

## 7.3 Explainability UI (apps/web/components/explain)

**`<ExplainDrawer />`**

* Opens on:

  * chart point click (month)
  * “Explain month” action in tables
* Tabs:

  * Breakdown (income/expense/tax/contrib/returns)
  * Taxes (federal/state/payroll + ST/LT netting + carryforward)
  * Accounts (balances + contributions + returns)
  * Loans (payment breakdown)
  * Goals (funding status vs target)
* Must render from engine outputs only (no UI-side math)

## 7.4 Forms + tables

**`<EntityTable />`**

* Sorting, filtering, inline actions
* Row action: edit, duplicate, delete

**`<EntityFormSheet />`**

* Right-side sheet for create/edit
* Uses Zod schemas for validation
* Consistent field layout, help text, and defaults

---

# 8) Engine package contract (pure deterministic TS)

Create `packages/engine/src/types.ts` and `packages/engine/src/contract.ts`.

## 8.1 `packages/engine/src/version.ts`

```ts
export const ENGINE_VERSION = "0.1.0";
```

## 8.2 `packages/engine/src/types.ts` (DTOs + output contract)

```ts
export type ISODate = string; // yyyy-mm-dd or full datetime; normalize in adapter

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

export interface TaxProfileDTO {
  stateCode: string;          // "VA"
  filingStatus: FilingStatus;
  taxYear: number;
  includePayrollTaxes: boolean;
  advancedOverridesEnabled: boolean;
  payrollOverrides?: PayrollOverridesDTO;
}

export interface PayrollOverridesDTO {
  ssRate?: number;
  ssWageBase?: number;
  medicareRate?: number;
  addlMedicareRate?: number;
  addlMedicareThreshold?: number;
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
  targetAmountReal: number; // today dollars
  targetDate: ISODate;
  priority: 1 | 2 | 3;
}

export interface TaxRulesDTO {
  // Stored and validated elsewhere; engine consumes normalized rules
  federal: any;
  state: any;
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
  t: ISODate;        // month
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
  accountBalances: Record<string, SeriesPoint[]>; // accountId -> series
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

  // Optional “explain” detail IDs
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
  standardDeductionUsed: number;
}

export interface Warning {
  code:
    | "DEFICIT_MONTH"
    | "GOAL_SHORTFALL"
    | "HIGH_TAX_DRAG"
    | "CONCENTRATION_RISK"
    | "INVALID_TAX_RULES";
  severity: "info" | "warn" | "error";
  message: string;
  at?: ISODate;
}

export interface ProjectionResultDTO {
  engineVersion: string;
  inputHash: string; // hash of normalized input DTO
  series: ProjectionSeries;
  monthly: MonthlyBreakdownRow[];
  annual: AnnualSummaryRow[];
  taxAnnual: TaxBreakdownAnnual[];
  warnings: Warning[];
}
```

## 8.3 `packages/engine/src/contract.ts` (function signatures only)

```ts
import { ScenarioInputDTO, ProjectionResultDTO } from "./types";

export interface EngineOptions {
  /**
   * If true, engine will emit extra explain references and intermediate values.
   * Useful for debug + explain drawer.
   */
  explainMode?: boolean;

  /**
   * When true, engine throws on invalid inputs instead of producing warnings.
   */
  strict?: boolean;
}

/**
 * Normalize input (sort arrays, coerce dates, remove irrelevant fields),
 * then compute a stable hash used for caching.
 */
export function computeInputHash(input: ScenarioInputDTO): string {
  throw new Error("Not implemented");
}

/**
 * The main deterministic projection runner.
 * MUST NOT call network.
 * MUST NOT read system time (use household.anchorDate).
 */
export function runProjection(input: ScenarioInputDTO, options?: EngineOptions): ProjectionResultDTO {
  throw new Error("Not implemented");
}
```

## 8.4 `packages/engine/src/index.ts`

```ts
export * from "./types";
export * from "./contract";
export * from "./version";
```

---

# 9) Coding standards (linting, formatting, testing, determinism, “no math in UI”)

## 9.1 ESLint + Prettier (root)

**`prettier.config.cjs`**

```js
module.exports = {
  semi: true,
  singleQuote: false,
  printWidth: 100,
  trailingComma: "all"
};
```

**`eslint.config.mjs`** (ESLint v9 flat config)

```js
import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.node, ...globals.browser }
    },
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }]
    }
  }
];
```

## 9.2 TypeScript project structure

* `tsconfig.base.json` at root, extended by each package/app.
* Each package is **buildable** and has explicit exports.
* `@finatlas/engine` must not import from web/UI.

**Root `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@finatlas/engine": ["packages/engine/src"],
      "@finatlas/schemas": ["packages/schemas/src"],
      "@finatlas/ui": ["packages/ui/src"]
    }
  }
}
```

## 9.3 Testing

* Engine: **Vitest** (fast, deterministic)

  * Golden tests: scenario input → stable output snapshot
  * Unit tests: compounding, inflation index, loan amortization, tax netting/carryforward
* Web: minimal smoke tests later (Playwright optional)

## 9.4 Determinism rules (hard requirements)

* Engine uses `household.anchorDate` and scenario dates only.
* No `Date.now()` / `new Date()` inside engine except in adapters/tests.
* No floating “today” in UI; UI shows household anchor.

## 9.5 “No math in UI” enforcement

Practical enforcement tactics:

1. **Architectural boundary**

   * UI consumes `ProjectionResultDTO` from engine.
   * UI can format, filter, and select series—but not compute finance.
2. **ESLint rule via import restrictions (recommended)**

   * Put any helper math under `packages/engine/src/*`
   * In `apps/web`, forbid importing from `packages/engine/src/internal/*` (only `runProjection`, types)
3. **Code review rule**

   * Any appearance of compounding, amortization, tax netting in `apps/web` is rejected.

A simple start: keep all math inside engine and make UI use only:

* `@finatlas/engine` types
* engine outputs and “explain” tables.

---

## One last practical note (so you can vibe-code fast)

For the **tax rule updater**, keep MVP extremely sane:

* Ship initial federal + VA rules JSON in repo as “starter rules”
* UI allows “Update rules” (anthropic-assisted parsing) but it’s optional for MVP completeness
* Engine always runs even if rules are stale, but shows a warning banner:

  * “Tax rules may be outdated; last fetched: …”

-
