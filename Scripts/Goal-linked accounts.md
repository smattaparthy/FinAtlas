Awesome — here’s the **next steps execution plan** to implement **goal-linked accounts** cleanly, in the right order, with minimal thrash.

---

## Step 1 — Database migration (Prisma)

1. Add `GoalFundingMode` enum + `GoalFundingRule` model to `prisma/schema.prisma` (as in the deliverable).
2. Run migration:

```bash
pnpm --filter @finatlas/web prisma migrate dev -n goal_funding_rules
pnpm --filter @finatlas/web prisma generate
```

**Sanity check:** open SQLite and confirm the new table exists.

---

## Step 2 — Update seed to create rules + rerun seed

1. Update your seed script to insert 3 rules for baseline scenario (College→Taxable SURPLUS_AUTO, Home→Cash FIXED_MONTHLY, Retirement→Roth SURPLUS_AUTO).
2. Rerun:

```bash
pnpm --filter @finatlas/web prisma db seed
```

> If your seed uses “delete all then create”, great. If not, you may want to `deleteMany` on `goalFundingRule` first to keep it idempotent.

---

## Step 3 — Engine types update (DTO + result fields)

In `packages/engine/src/types.ts`:

1. Add:

* `GoalFundingMode`
* `GoalFundingRuleDTO`
* `ScenarioInputDTO.goalFundingRules: GoalFundingRuleDTO[]`

2. Add optional monthly breakdown fields:

* `goalFundingTotal?`
* `goalFundingByGoal?`
* `goalFundingByAccount?`

Then run:

```bash
pnpm --filter @finatlas/engine typecheck
```

---

## Step 4 — Web adapter: include goalFundingRules in ScenarioInputDTO

In `apps/web/lib/engine/buildScenarioInput.ts`:

1. Add Prisma include: `goalFundingRules: true`
2. Map them into `goalFundingRules: []`

Run a quick build check:

```bash
pnpm --filter @finatlas/web typecheck
```

---

## Step 5 — Engine implementation: goal-linked funding affects accounts

1. Add `packages/engine/src/internal/goals_linked.ts` (from deliverable).
2. Update `packages/engine/src/internal/projection.ts`:

**Crucial structural change:** shift to a clean 2-pass:

* **Pass A:** compute monthly totals (income/expenses/loans/base contributions) → `monthlyRowsPreTax`
* Tax allocate monthly
* **Pass B:** for each month:

  * compute surplus (post-tax)
  * allocate goal funding rules to accounts
  * apply base+goal contributions into account balances
  * apply monthly returns
  * write goal balances for series
  * write explain fields into monthly rows

Run tests:

```bash
pnpm --filter @finatlas/engine test
```

---

## Step 6 — API: CRUD goal funding rules

1. Add `packages/schemas/src/goalFunding.ts` with Zod schema.
2. Export it from `packages/schemas/src/index.ts`.
3. Add API route:

* `GET /api/goals/funding-rules?scenarioId=...&goalId=...`
* `POST /api/goals/funding-rules` (replace-all rules)

Run:

```bash
pnpm -r typecheck
```

---

## Step 7 — UI: funding settings page + link it from Goals

1. Add page:

* `apps/web/app/(app)/goals/[goalId]/funding/page.tsx`

2. Add link from `/goals` cards:

```tsx
<a className="text-xs text-zinc-300 underline" href={`/goals/${goalId}/funding`}>Funding settings</a>
```

3. On Save, immediately **force recompute** so the user sees change instantly:

```ts
await fetch("/api/engine/run", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ scenarioId, forceRecompute: true }),
});
```

---

## Step 8 — Verify the behavior (manual test script)

1. Start app:

```bash
docker compose up --build
```

2. Login demo.
3. Go to **Goals**:

* You should see funded vs target charts.

4. Click “Funding settings” for College goal:

* Set linked account to “Taxable”
* Set to SURPLUS_AUTO
* Save

5. Go back Dashboard → Recompute:

* Net worth curve should change slightly (goal funding adds contributions into specific accounts; returns apply).

6. Open Explain drawer by clicking a chart point:

* Confirm monthly row shows:

  * `goalFundingTotal`
  * `goalFundingByGoal`
  * `goalFundingByAccount`

---

# Step 9 — Bulletproofing rules (do these now, while it’s fresh)

### Server-side validation upgrades (fast)

In the funding rules POST API:

* Ensure at least **one rule per goal** (already)
* Ensure **priorityOrder is unique per goal**
* Ensure rule `startDate <= goal.targetDate` (if not, warn or reject)

### Engine invariants (tiny tests, huge confidence)

Add 2 tests:

1. “Goal funding only increases linked accounts”
2. “With stopWhenFunded=true, funding stops after funded >= target”

---

# Optional (but strongly recommended) Step 10 — Make Goals page show real goal names

Right now UI labels “Goal {goalId}”. Make it pretty:

* Add an API `GET /api/goals?scenarioId=...` returning goal metadata
* Or include `goalsIndex` in engine output (but I’d keep engine pure and UI fetch metadata)

---

