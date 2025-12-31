Below is an **extremely detailed PRD** you can follow like a build recipe while vibe coding. It’s written to be “deterministic-first” (math you can audit) and “modern UI-first” (Netflix/HubSpot-level polish), while staying **local-only** and **container-hosted on a MacBook**.

---

# Product Requirements Document (PRD)

## Project: Local-Only Household Investment & Financial Planning App

**Working name:** FinAtlas (rename anytime)
**Platform:** Local web app served from containers (`docker compose`) on macOS
**Core promise:** Private, local, auditable projections for income/expenses/investments/taxes/goals, with scenarios and interactive charts.

---

## 1) Vision and Outcomes

### 1.1 Vision

A professional-grade planning app that answers:

* “What does our net worth and cashflow look like in 5/10/20 years?”
* “What happens if we change contributions, returns, expenses, or goals?”
* “How much do taxes and inflation drag our plan?”
* “Are we on track for retirement / college / home purchase?”

### 1.2 Non-negotiables

* **Local-only data** (no cloud accounts, no remote storage)
* **Deterministic calculations** (LLM cannot compute your money)
* **Explainability** (every chart point is traceable)
* **Responsive, modern UI** (desktop-first, works on tablet/phone)
* **Interactive charts + chart index** (filterable, hover, isolate series, zoom/brush)

### 1.3 Success metrics (MVP)

* User can set up a household in <10 minutes and see a meaningful dashboard.
* Scenario comparisons are clear (baseline vs scenario deltas).
* Taxes + inflation can be toggled and are visibly impactful and explainable.
* CSV import gets holdings into accounts with clean validation and preview.

---

## 2) Target Users

1. **Household Planner**: wants a clean dashboard and confidence.
2. **Scenario Tinkerer**: wants “what-if” simulations and comparisons.
3. **Tax-aware Optimizer**: wants tax drag + account type modeling.

---

## 3) Scope

### 3.1 MVP Includes

**A) Household, Assumptions, Scenarios**

* Household members
* Planning horizon (monthly timeline) + annual summaries
* Global assumptions (inflation, yields, realized gain/loss assumptions)
* Scenario manager: baseline + clones + overrides

**B) Income Module**

* Multiple streams per household member (incl kids as streams under household)
* Start/end dates, frequency, and growth rules (track inflation or custom %)

**C) Expenses Module**

* Categories (extensible)
* Start/end dates, frequency, growth rules (track inflation or custom %)
* Mortgage handled as an **expense** (clean MVP)

**D) Investments Module**

* Accounts: **Taxable / Traditional / Roth**
* Holdings per account (from CSV or manual entry)
* Contributions per account / per asset class rule (MVP: per account is enough)
* Returns: expected annual return per account (or per asset class later)

**E) Liabilities Module (Non-mortgage only)**

* Auto/student/personal loans
* Amortization schedule
* Payments affect monthly cashflow

**F) Taxes Module (US-only)**

* Federal + **single selected state**
* Filing status dropdown only: **Single / MFJ / HOH**
* Standard deduction only
* Payroll taxes included (SS, Medicare, Additional Medicare)
* Taxable accounts pay annual taxes on:

  * interest (assumption-driven)
  * dividends (assumption-driven)
  * **realized ST/LT gains/losses** (assumption-driven + carryforward)

**G) Goals Module**

* College / home purchase / retirement goals
* Entered in **today’s dollars**
* App converts to nominal using inflation index
* Progress tracking and “on track” indicators

**H) Import Module (CSV)**

* Fidelity/Vanguard-like holdings import
* Required columns:

  * `account_name`, `account_type`, `ticker`, `shares`, `avg_price`
* Optional:

  * `last_price`, `as_of_date`
* Validate → Preview → Commit with dedupe rules

**I) Dashboard + Reports**

* Dashboard cards + interactive charts + “chart index”
* Annual summary table (by year)
* Export: CSV projections (MVP). PDF can be V1 if needed.

---

### 3.2 Explicit MVP Non-Goals

* Filing taxes (no 1040 generation)
* Bank/broker live integrations (Plaid)
* Rental income module (future)
* Itemized deductions (future)
* Full transaction imports (future)
* Wash-sale rules / lot-level capital gains (future)

---

## 4) Key Product Behaviors (User Journeys)

### 4.1 First-run experience

1. Login with demo or create local user
2. Create household
3. Pick:

   * start date, end date
   * inflation rate (default)
   * state + filing status + tax year
4. Optionally paste Anthropic API key (used only for tax-rule update assistant + import mapping helper)
5. Add (or keep seeded sample):

   * incomes
   * expenses (including mortgage as expense)
   * accounts + holdings (manual or CSV)
   * non-mortgage loans
   * goals
6. Land on Dashboard with:

   * net worth line
   * cashflow chart
   * tax drag chart
   * allocation view
   * goal progress

### 4.2 Ongoing usage

* Clone scenario → tweak assumptions / contributions / expenses → compare
* Inspect “Explain” panel for any month/year
* Import updated holdings CSV quarterly

---

## 5) Functional Requirements (Detailed)

### 5.1 Household & Assumptions

**FR-H1: Household**

* Create/edit household
* Members list (names + role tags)
* Currency fixed USD (MVP)

**FR-H2: Global assumptions**

* Inflation rate (annual)
* Real/nominal toggle available globally on dashboard
* Taxable yields:

  * interest_yield_pct
  * dividend_yield_pct
* Realized gain/loss assumptions for taxable accounts:

  * realized_st_gain_pct (can be negative)
  * realized_lt_gain_pct (can be negative)
* Optional “advanced” toggles per scenario:

  * override payroll thresholds/rates (UI guarded)

**Acceptance**

* Changing assumptions recomputes projections deterministically.
* Per-scenario override does not mutate baseline.

---

### 5.2 Income

**Fields**

* owner (household member)
* name (Salary, Side Hustle…)
* amount + frequency (monthly/biweekly/annual)
* start_date, end_date
* growth_rule:

  * none (flat nominal)
  * track inflation
  * custom % annually

**Acceptance**

* Monthly projection includes only active streams.
* Biweekly/annual normalized to monthly for engine consistency.

---

### 5.3 Expenses

**Fields**

* category (extensible)
* amount + frequency
* start_date, end_date
* growth_rule (same as income)

**Mortgage**

* Modeled as a normal expense category (e.g., “Mortgage Payment”)

**Acceptance**

* Expense totals appear in cashflow chart and explain tables.

---

### 5.4 Investments (Accounts + Holdings)

**Account fields**

* account_name
* account_type: taxable | traditional | roth
* expected_return_rate (annual %)
* recurring_contribution (monthly) + optional escalation

**Holding fields**

* ticker
* shares
* avg_price
* optional last_price (for “current value” display)

**Derived values**

* cost_basis = shares * avg_price
* current_value (if last_price) = shares * last_price
  Otherwise, use either:

  * manual account current value (optional) OR
  * cost basis as proxy (clearly labeled)

**Acceptance**

* Account balances grow by contributions + return assumptions.
* Tax drag applies only to taxable accounts (per tax settings).

---

### 5.5 Liabilities (Non-mortgage loans)

**Loan fields**

* name (Auto Loan)
* principal
* APR
* term months
* start date
* payment is derived (or allow user-specified payment override)
* optional extra payment

**Acceptance**

* Engine produces amortization schedule.
* Payments flow into monthly expenses/cashflow.

---

### 5.6 Taxes (US-only)

**Inputs**

* state (single)
* filing status: Single/MFJ/HOH
* tax year
* standard deduction (rule-driven by year + filing status)
* payroll taxes enabled (default true)
* advanced override toggle:

  * SS wage base, SS rate
  * Medicare rate
  * Additional Medicare threshold/rate
  * bracket overrides (optional but risky; keep gated)

**Tax rule source**

* Local JSON tables per year/state + validation metadata.
* “Update tax rules” action uses:

  * authoritative source fetch (by code, not LLM)
  * Anthropic *only* to transform/parse to JSON
  * validations before saving

**Taxable account annual taxable events**

* interest income = taxable_balance * interest_yield_pct
* dividend income = taxable_balance * dividend_yield_pct
* realized ST/LT gains/losses:

  * st = taxable_balance * realized_st_gain_pct
  * lt = taxable_balance * realized_lt_gain_pct
* apply carryforward rules (simplified but deterministic)
* allocate annual tax back to months (pro-rata) for monthly cashflow chart

**Acceptance**

* Tax breakdown table shows federal/state/payroll components.
* Shows ST/LT netting and carryforward state.

---

### 5.7 Goals

**Goal fields**

* type: college | home_purchase | retirement
* target_amount_real (today’s dollars)
* target_date
* priority
* funding strategy (MVP):

  * “Use surplus cashflow after expenses/taxes” (default)
  * optionally reserve a fixed monthly amount to goals bucket

**Engine behavior**

* Convert target into nominal at target date using inflation index.
* Track “funded value” and shortfall.

**Acceptance**

* Dashboard shows progress and estimated on-track status.

---

### 5.8 Scenarios

**Scenario behavior**

* Baseline created automatically
* Clone scenario
* Overrides can be applied to:

  * assumptions
  * incomes/expenses
  * account return rates and contributions
  * loans
  * goals

**Comparison UI**

* Baseline vs scenario:

  * end net worth delta
  * worst deficit month
  * tax paid delta
  * goal success delta

---

### 5.9 Import (CSV)

**CSV schema (MVP canonical)**
Required headers:

* `account_name`
* `account_type` (Taxable / Traditional / Roth)
* `ticker`
* `shares`
* `avg_price`

Optional:

* `last_price`
* `as_of_date`

**Workflow**

1. Upload
2. Auto-map columns + validate
3. Preview grouped by account
4. Dedupe strategy selection:

   * merge by (account_name, ticker)
   * replace existing holdings for account
5. Commit
6. Create import log record (audit)

**Acceptance**

* Validation errors are precise and actionable.
* Preview shows computed totals.

---

## 6) Calculation Engine (Deterministic “Truth Machine”)

### 6.1 Timeline

* Monthly ticks from start_date → end_date
* Outputs:

  * monthly rows
  * annual summaries derived from monthly rows

### 6.2 Monthly ordering (fixed)

For each month:

1. Inflate indices (nominal/real conversion helpers)
2. Compute incomes for month
3. Compute expenses for month (incl loan payments)
4. Compute taxes allocation for month (from annual estimate or rolling estimate)
5. Compute net cashflow
6. Apply contributions (accounts)
7. Apply returns (accounts)
8. Update carryforwards/annual trackers when crossing year boundary
9. Update goals funded state

### 6.3 Output contract (engine → UI)

For a scenario, engine returns:

* `series` for charts:

  * netWorth, assetsTotal, liabilitiesTotal
  * cashflowNet, incomeTotal, expenseTotal, taxesTotal
  * accountBalances[] (by account)
  * goalProgress[] (by goal)
* `breakdowns`:

  * monthly breakdown table
  * annual summary table
  * tax breakdown (annual + month allocation)
  * loan amortization tables
* `warnings`:

  * deficit months
  * high tax drag
  * goal shortfalls

### 6.4 Explainability requirement

Every chart tooltip links to:

* month row breakdown
* if taxes included: tax breakdown line items
* if goal impacted: goal funding allocation

---

## 7) UI/UX Requirements (Netflix/HubSpot modern)

### 7.1 Design system

* shadcn/ui + Tailwind
* Tokens:

  * spacing scale
  * typography scale
  * semantic colors for states (success/warn/error), but keep charts neutral
* Components:

  * sidebar + topbar + command palette (⌘K)
  * cards, tabs, data tables, inline edit forms
  * toasts + banners for warnings
  * “Explain” drawer panel

### 7.2 Layout

* Desktop: left sidebar + content canvas + right “Explain” drawer
* Mobile: bottom nav or hamburger; charts stack vertically

### 7.3 Chart Index (required)

A dedicated “Charts” view that lists:

* Net Worth
* Cashflow
* Tax Drag
* Allocation
* Account Balances
* Goal Progress
  Each chart entry includes:
* filters (scenario, date range, nominal/real)
* legend toggles + isolate series
* interaction: hover tooltip, click to lock, zoom/brush

### 7.4 Accessibility & responsiveness

* Keyboard navigation
* High contrast mode optional
* Charts must reflow and remain usable on narrow widths

---

## 8) Technical Architecture

### 8.1 Deployment mode

* Local containers on MacBook using Docker Compose
* Data persisted in Docker volume

### 8.2 Tech stack (recommended for MVP)

**App**

* Next.js (App Router) + TypeScript
* API routes or lightweight internal service layer

**DB**

* SQLite local file
* Prisma ORM + migrations

**Charts**

* Ant Design Charts (responsive + interactive)

**Engine**

* Separate package/module in repo: `packages/engine`
* Pure deterministic TypeScript library
* No network calls; no date/time randomness without seeded config

**Auth**

* Local auth in SQLite
* Password hashing: Argon2id
* Demo account seeding

**Anthropic**

* User-provided API key stored encrypted in DB (password-derived key)
* Used only for:

  * tax rule parsing assistance
  * CSV column mapping suggestions (optional)
* Never for computing user finances

---

## 9) Data Model (High-level)

Tables (SQLite):

* users
* households
* household_members
* scenarios
* scenario_overrides (or override json per scenario)
* income_streams
* expenses
* investment_accounts
* holdings
* contribution_rules
* loans
* goals
* tax_profiles
* tax_rules (versioned json blobs + metadata)
* imports (logs + file metadata)
* engine_results_cache (optional; keyed by scenario hash)

---

## 10) Security & Privacy Standards

* Local-only data; no telemetry by default
* Secrets:

  * Anthropic key encrypted at rest
* Export functions warn user data is sensitive
* No silent sending of portfolio data to any LLM endpoint
* “Network access” indicator on screens that use Anthropic (explicit user action)

---

## 11) Performance Standards

* Horizon: up to 30 years monthly (~360 rows) must recompute quickly
* Recompute target: <300ms typical scenario
* Strategy:

  * memoize annual tax computations
  * cache engine results by scenario hash
  * debounce UI edits before recompute

---

## 12) Engineering Standards (vibe-coding friendly but professional)

### 12.1 Repo structure (recommended)

* `apps/web` (Next.js)
* `packages/engine` (projection + taxes)
* `packages/ui` (shared components)
* `packages/schemas` (Zod schemas + types)
* `prisma/` (schema + migrations + seed)

### 12.2 Code quality

* TypeScript strict mode
* ESLint + Prettier
* Zod validation for all forms + API boundaries
* “No math in UI components” rule: UI displays, engine computes

### 12.3 Testing

* Engine:

  * unit tests for compounding, inflation, loan amortization, tax netting
  * golden tests: known scenario → stable outputs
* API:

  * request validation tests
* UI:

  * smoke tests for key flows (import, scenario clone, dashboard render)

### 12.4 Determinism guarantees

* All calculations seeded with explicit start date + rules
* No hidden “current date” dependencies; “today” is a chosen anchor stored in household
* Version the engine; store engine version in results

---

## 13) Delivery Plan (Step-by-step build order)

### Phase 0 — Bootstrap

1. Create repo + monorepo layout
2. Next.js app with shadcn/ui + Tailwind
3. Docker Compose local run + volume for db
4. Prisma + SQLite + migrations
5. Seed demo accounts + sample household

**Exit criteria:** App boots locally via containers; demo login works; sample dashboard loads from seeded data.

### Phase 1 — Data entry modules

* CRUD screens:

  * incomes
  * expenses
  * accounts + holdings (manual)
  * loans
  * goals
  * taxes profile + assumptions
* Scenario clone + overrides (store override JSON)

**Exit criteria:** User can input all data without the engine; data persists.

### Phase 2 — Engine v1 (no taxes yet)

* Monthly projection: incomes, expenses, contributions, returns
* Net worth/cashflow/account charts
* Explain table (monthly breakdown)

**Exit criteria:** Baseline scenario projections render with charts and explain drawer.

### Phase 3 — Taxes + inflation integration

* Inflation index + nominal/real toggle everywhere
* Federal + chosen state tables (shipped default + updater)
* Payroll taxes + advanced overrides
* ST/LT gains/loss assumptions + carryforward
* Tax breakdown UI

**Exit criteria:** Taxes appear in cashflow; tax breakdown explains totals.

### Phase 4 — CSV import

* Import wizard + mapping + validation + preview + commit
* Import logs + rollback (optional)
* Holdings view updated

**Exit criteria:** User imports a holdings CSV successfully; charts update.

### Phase 5 — Polish + professional UX

* Chart index page
* Cmd-K command palette
* Responsive refinements
* Empty states, loading states, error boundaries
* Export CSV of projections

**Exit criteria:** App looks and feels “real,” not a prototype.
