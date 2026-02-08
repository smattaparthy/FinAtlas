# FinAtlas Feature Roadmap

Features documented for future implementation sessions.

---

## Monte Carlo Simulation ✅

### Overview
Probabilistic projections using randomized investment returns to show the range of possible financial outcomes with confidence bands.

### Components Built
- **Engine**: `packages/engine/src/internal/random.ts` — Seeded PRNG (Mulberry32) + Box-Muller normal distribution for reproducibility
- **Engine**: `packages/engine/src/internal/montecarlo.ts` — Monte Carlo runner that clones accounts with randomized `expectedReturnPct` per simulation, computes percentile bands (P10/P25/P50/P75/P90), success rates, and goal success rates
- **Shared Helper**: `apps/web/lib/engine/buildEngineInput.ts` — Extracted shared engine input builder used by both `/api/projections` and `/api/projections/monte-carlo`
- **API**: `GET /api/projections/monte-carlo?scenarioId=X&simulations=500&volatility=15` — Returns `MonteCarloResultDTO` with bands, success rate, goal success rates, and final net worth percentiles
- **Chart**: `MonteCarloChart.tsx` — SVG confidence band chart with P10-P90 outer band, P25-P75 inner band, and P50 median line, wrapped in `ChartTooltip`
- **Page**: `/monte-carlo` — Configuration panel (simulations 100-2000, volatility 5-30%), summary cards (success rate, median/best/worst net worth), chart, and goal success rate bars

### Technical Details
- Simulations clamped to 50-2000, volatility to 1-50%
- Each simulation randomizes `expectedReturnPct` per account using `N(mean=currentRate, σ=volatilityPct)`
- Success rate = % of simulations with final net worth > 0
- Percentile computation uses sorted arrays with linear interpolation

---

## Budget vs Actual Tracking ✅

### Overview
Monthly budget tracking that compares planned expenses (from scenario expenses) against actual spending entered by the user, with visual comparison and variance analysis.

### Components Built
- **Database**: `ActualExpense` model in Prisma schema with unique constraint on `[scenarioId, category, month]`
- **API**: `GET /api/budget?scenarioId=X&month=YYYY-MM` — Returns planned expenses (normalized to monthly via frequency multipliers) merged with actuals, grouped by category
- **API**: `POST /api/budget` — Bulk upsert actuals using `$transaction` with composite unique key
- **Chart**: `BudgetComparisonChart.tsx` — Horizontal grouped bar chart (planned=gray, actual=green/red)
- **Page**: `/budget` — Month navigation, summary cards (total planned/actual, variance, over-budget count), comparison chart, editable category table with inline actual amount inputs and save

### Technical Details
- Frequency multipliers: MONTHLY=1, BIWEEKLY=26/12, WEEKLY=52/12, ANNUAL=1/12, ONE_TIME=0
- Only recurring expenses shown in budget view (ONE_TIME filtered out)
- Actuals with amount=0 are deleted on save

---

## Debt Payoff Strategies ✅

### Overview
Client-side Avalanche vs Snowball debt payoff strategy comparison with interactive extra payment input and visual comparison.

### Components Built
- **Library**: `apps/web/lib/debt/payoffStrategies.ts` — Pure computation engine with `compareStrategies(loans, extraMonthly)` returning both strategy results and savings delta
- **Chart**: `DebtPayoffChart.tsx` — Two-line SVG chart comparing total remaining balance over time (emerald=avalanche, amber=snowball), with `ChartTooltip`
- **Page**: `/debt-payoff` — Extra payment input, 3-column comparison summary (avalanche stats, snowball stats, savings), debt balance chart, tab-toggled payoff order list and loan breakdown table

### Technical Details
- Avalanche: targets highest interest rate loan first
- Snowball: targets lowest balance loan first
- Extra payments cascade: when a loan is paid off, its minimum payment becomes additional extra for the next target
- All computation via `useMemo` — no API calls needed, re-computes on loans or extraMonthly change
- EmptyState shown when no active loans, linking to `/loans/new`
- 50-year (600 month) safety limit on payoff loop

---

## Milestone Timeline & Life Event Modeling ✅

### Overview
Visual timeline showing projected milestones (retirement, mortgage payoff, goal completion) overlaid on the projection chart. Life event templates that auto-create income/expense changes.

### Key Components
- **Timeline Overlay**: Horizontal timeline component that renders milestone markers on top of the existing NetWorthChart or a dedicated timeline view. Each marker shows the event name, projected date, and financial impact.
- **Life Event Templates**: Pre-built templates for common life events (having a baby, buying a house, career change, marriage, etc.). Each template bundles a set of income/expense/loan modifications that are applied to the scenario.
- **Data Model**: New `LifeEvent` Prisma model with fields: `id`, `scenarioId`, `type` (enum), `name`, `targetDate`, `modifications` (JSON blob describing income/expense/loan changes), `isActive`.
- **UI**: Timeline component below the projection chart, event creation modal with template selector and customization form.

### Implementation Notes
- Integrate with existing `ProjectionChart` by adding optional milestone markers as SVG elements
- Life event modifications should create actual Income/Expense/Loan records tagged with the event ID for easy bulk editing/removal
- Consider undo: removing a life event should remove all associated financial records

---

## Smart What-If Templates ✅

### Overview
Pre-built scenario templates that apply guided modifications without requiring the AI assistant. Users can instantly preview before/after impacts.

### Templates to Build
| Template | Modifications |
|----------|---------------|
| Buy a House | Add mortgage loan, property tax expense, homeowner insurance, remove rent expense, add down payment deduction |
| Have a Baby | Add childcare expense, medical expenses, adjust tax filing, reduced savings |
| Retire Early | Remove employment income at target date, add Social Security at 62/67, adjust expense profile |
| Max 401(k) | Add contribution rule at IRS max ($23,500 for 2025), adjust take-home pay |
| Career Change | Modify income amount/timing, add education expense if applicable |
| Pay Off Debt | Apply extra payments to highest-rate loans, cascade to next loan |

### Key Components
- **Template Selector**: Card-based UI showing available templates with brief descriptions and estimated impact preview
- **Guided Form**: Multi-step form for each template collecting the necessary parameters (e.g., home price, down payment percentage for "Buy a House")
- **Before/After Preview**: Side-by-side mini chart showing current projection vs. projection with template applied
- **Apply/Discard**: User can apply the template to create a new scenario or discard

### Implementation Notes
- Templates are pure frontend logic that generate the appropriate API calls to create/modify financial records
- Each template creates a new scenario (cloned from current) with the modifications applied
- Preview uses the existing `/api/projections` endpoint with a temporary in-memory scenario

---

## Export & Shareable Reports ✅

### Overview
PDF export of the financial plan including dashboard metrics, charts, projections, and insights. Shareable links for financial advisor meetings.

### Key Components
- **PDF Generator**: Server-side PDF generation using a library like `@react-pdf/renderer` or `puppeteer` for high-fidelity chart rendering
- **Report Sections** (user-selectable):
  - Executive summary (health score, key metrics)
  - Income & expense breakdown
  - Investment portfolio overview
  - Net worth projection chart
  - Goal progress tracking
  - Scenario comparison (if multiple scenarios)
  - AI-generated insights
- **Print Layout**: CSS `@media print` styles for browser-based printing as alternative to PDF
- **Share Tokens**: Generate time-limited, read-only share URLs. New `ShareToken` Prisma model with fields: `id`, `scenarioId`, `expiresAt`, `accessCount`, `maxAccesses`
- **Shared View**: Public route `/shared/[token]` that renders a read-only dashboard with no editing capabilities

### Implementation Notes
- Chart rendering in PDF requires either SVG-to-PDF conversion or server-side browser rendering
- Share tokens should have configurable expiration (default: 7 days) and optional access limits
- Consider watermarking shared reports with "Generated by FinAtlas" branding
- Shared views must not expose any PII beyond what's in the financial data itself

---

## Net Worth History & Snapshots ✅

### Overview
Track actual net worth over time vs projected values. Users can take manual snapshots that record current total assets (from accounts) and total liabilities (from loans), then view them overlaid on the projection chart.

### Components Built
- **Database**: `NetWorthSnapshot` model in Prisma schema with unique constraint on `[scenarioId, snapshotDate]`
- **API**: `GET /api/net-worth-snapshots?scenarioId=X` — List snapshots ordered by date desc
- **API**: `POST /api/net-worth-snapshots` — Compute current totals from accounts + loans, upsert snapshot for today's date
- **API**: `DELETE /api/net-worth-snapshots/[id]` — Remove a snapshot (auth + ownership check)
- **Chart**: `NetWorthHistoryChart.tsx` — Two overlaid series: emerald projected line with gradient fill + sky-400 dashed line connecting snapshot dots
- **Page**: `/net-worth-history` — Take Snapshot button, summary cards (current NW, total snapshots, trend), chart, snapshot table with delete

### Technical Details
- Snapshots auto-compute totalAssets from `SUM(account.balance)` and totalLiabilities from `SUM(loan.currentBalance)`
- Projected line from `/api/projections` overlaid with actual snapshot dots
- Unique constraint on `[scenarioId, snapshotDate]` allows upsert for same-day updates

---

## FIRE / Retirement Readiness Calculator ✅

### Overview
Financial Independence calculator that computes FI number, years to FI, savings rate, and Coast FIRE number. Month-by-month simulation with interactive parameter adjustment.

### Components Built
- **Library**: `apps/web/lib/fire/fireCalculations.ts` — Pure computation with `calculateFire(inputs): FireResult` returning FI number, coast FIRE, savings rate, yearsToFI, and monthly projection series
- **Chart**: `FireProjectionChart.tsx` — Emerald NW line + amber FI number dashed line with diamond marker at crossover point
- **Page**: `/fire-calculator` — Fetches dashboard API for income/expenses/netWorth, slider inputs (return rate, withdrawal rate, inflation), 4 summary cards, full-width progress bar, Coast FIRE explanation card

### Technical Details
- FI Number = retirementAnnualExpenses / withdrawalRate (default 4%)
- Coast FIRE = FI Number / (1 + expectedReturn)^yearsToFI
- Month-by-month simulation: grow balance at expectedReturn/12, add monthlySavings, inflate FI target
- All computation via `useMemo` — no dedicated API calls, re-computes on slider changes
- Defaults: retirementExpenses = annualExpenses × 0.8, return 7%, withdrawal 4%, inflation 2.5%

---

## Refinance Calculator ✅

### Overview
Loan refinancing break-even analysis comparing current loan terms against new refinanced terms. Shows monthly savings, total interest saved, and break-even period.

### Components Built
- **Library**: `apps/web/lib/refinance/refinanceCalculations.ts` — Pure computation with `calculateRefinance(current, newTerms): RefinanceComparison` including PMT formula, amortization schedules, and break-even calculation
- **Chart**: `RefinanceComparisonChart.tsx` — Amber current loan line + emerald refinanced loan line showing remaining balance over time
- **Page**: `/refinance` — Loan selector dropdown, current terms display (read-only), new terms input panel (rate, term, closing costs, points), 3-column comparison cards, chart, detailed comparison table

### Technical Details
- PMT formula: `P * [r(1+r)^n] / [(1+r)^n - 1]` for monthly payment calculation
- Break-even = (closingCosts + pointsCost) / monthlySavings
- closingCostTotal = closingCosts + (points/100 × currentBalance)
- Amortization schedule generates monthly balance/principal/interest for both scenarios
- Auto-populates newRate = selectedLoan.interestRate - 1, newTerm = remaining months
- Empty state links to `/loans/new` when no loans exist
