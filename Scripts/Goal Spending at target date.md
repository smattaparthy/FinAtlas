Great — here’s the **copy/paste-ready deliverable** to implement **Goal Spending at target date** with this policy:

**At the goal’s target month:**

1. Spend from **linked accounts in rule priority order**
2. If still short, fallback to **any TAXABLE account** (highest balance first, deterministic tiebreak)
3. If still short, leave a **goal shortfall warning** (no deficit borrowing in MVP)

All computations in engine. UI only displays results.

---

# 1) Schema + DTO: add `spendAtTarget` per goal

## 1.1 Prisma schema update

In `prisma/schema.prisma`, add to `Goal`:

```prisma
model Goal {
  id String @id @default(cuid())
  // ...
  spendAtTarget Boolean @default(false)
}
```

Migration:

```bash
pnpm --filter @finatlas/web prisma migrate dev -n goal_spend_at_target
pnpm --filter @finatlas/web prisma generate
```

## 1.2 Seed: enable for demo goals

In seed script when creating goals:

* set `spendAtTarget: true` for College + Home Purchase (retirement usually false)

---

## 1.3 Engine DTO update

In `packages/engine/src/types.ts`, extend `GoalDTO`:

```ts
export interface GoalDTO {
  id: string;
  type: GoalType;
  name: string;
  targetAmountReal: number;
  targetDate: ISODate;
  priority: 1 | 2 | 3;

  spendAtTarget?: boolean; // NEW
}
```

Update `apps/web/lib/engine/buildScenarioInput.ts` to include:

```ts
spendAtTarget: g.spendAtTarget ?? false,
```

---

# 2) Engine: Spending mechanics

## 2.1 Goal fund state must track earmarks by goal+account (already from earmarks deliverable)

We assume you already have:

* `goalFundState.fundedByGoalAccount[goalId][accountId] = earmarked`

If not, do that first (earmarks deliverable).

---

## 2.2 New module: `goal_spending.ts`

Create **`packages/engine/src/internal/goal_spending.ts`**:

```ts
import type { GoalDTO, GoalFundingRuleDTO, InvestmentAccountDTO, ISODate, Warning } from "../types";
import { isoMonthStart, toMonthStartUTC } from "./dates";
import type { InflationIndex } from "./growth";

export interface SpendResult {
  spentTotal: number;
  spentByAccount: Record<string, number>;
  spentByGoal: Record<string, number>;
  warnings: Warning[];
}

function targetNominalAtDue(goal: GoalDTO, inflation: InflationIndex): number {
  const dueIso = isoMonthStart(toMonthStartUTC(goal.targetDate));
  const idx = inflation[dueIso] ?? 1;
  return goal.targetAmountReal * idx;
}

/**
 * Deterministic spender:
 * - Spend only in the goal's target month
 * - Primary: linked accounts in priorityOrder
 * - Fallback: any TAXABLE account by descending balance, then id asc
 * - Does NOT create negative balances
 */
export function spendGoalsAtMonth(args: {
  monthIso: ISODate;
  monthDate: Date;
  goals: GoalDTO[];
  fundingRules: GoalFundingRuleDTO[];
  accounts: InvestmentAccountDTO[];
  inflation: InflationIndex;

  // mutable state from projection
  balances: Record<string, number>;

  // earmarks (goalId -> accountId -> earmarked)
  fundedByGoalAccount: Record<string, Record<string, number>>;
}): SpendResult {
  const { monthIso, monthDate, goals, fundingRules, accounts, inflation, balances, fundedByGoalAccount } = args;

  const warnings: Warning[] = [];
  const spentByAccount: Record<string, number> = {};
  const spentByGoal: Record<string, number> = {};

  // Select goals that hit target month and are configured to spend
  const dueGoals = goals
    .filter((g) => (g.spendAtTarget ?? false))
    .filter((g) => isoMonthStart(toMonthStartUTC(g.targetDate)) === monthIso)
    .sort((a, b) => {
      // deterministic order: priority, then id
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.id.localeCompare(b.id);
    });

  if (!dueGoals.length) return { spentTotal: 0, spentByAccount, spentByGoal, warnings };

  // Precompute fallback taxable accounts list
  const taxableAccounts = accounts
    .filter((a) => a.type === "TAXABLE")
    .map((a) => a.id)
    .sort((aId, bId) => {
      const da = balances[aId] ?? 0;
      const db = balances[bId] ?? 0;
      if (db !== da) return db - da; // descending balance
      return aId.localeCompare(bId);
    });

  // Rules grouped per goal and ordered
  const rulesByGoal: Record<string, GoalFundingRuleDTO[]> = {};
  for (const r of fundingRules) (rulesByGoal[r.goalId] ||= []).push(r);
  for (const gid of Object.keys(rulesByGoal)) {
    rulesByGoal[gid].sort((a, b) => {
      if (a.priorityOrder !== b.priorityOrder) return a.priorityOrder - b.priorityOrder;
      return a.accountId.localeCompare(b.accountId);
    });
  }

  let spentTotal = 0;

  for (const g of dueGoals) {
    const target = targetNominalAtDue(g, inflation);

    // Determine how much is currently earmarked for this goal (across all accounts)
    const earmarks = fundedByGoalAccount[g.id] ?? {};
    const earmarkedTotal = Object.values(earmarks).reduce((s, v) => s + v, 0);

    // We attempt to spend up to min(target, earmarkedTotal + fallback capacity)
    let remainingToSpend = target;

    // 1) Spend from linked accounts first (priority order)
    const linked = rulesByGoal[g.id] ?? [];
    for (const r of linked) {
      if (remainingToSpend <= 0) break;
      const acctId = r.accountId;

      const earmarkedHere = fundedByGoalAccount[g.id]?.[acctId] ?? 0;
      if (earmarkedHere <= 0.01) continue;

      const availableBal = balances[acctId] ?? 0;
      if (availableBal <= 0.01) continue;

      // Spend is limited by:
      // - remaining goal need
      // - earmarked amount in this account
      // - actual account balance
      const spend = Math.min(remainingToSpend, earmarkedHere, availableBal);
      if (spend <= 0) continue;

      balances[acctId] = availableBal - spend;
      fundedByGoalAccount[g.id][acctId] = earmarkedHere - spend;

      spentByAccount[acctId] = (spentByAccount[acctId] ?? 0) + spend;
      spentByGoal[g.id] = (spentByGoal[g.id] ?? 0) + spend;

      remainingToSpend -= spend;
      spentTotal += spend;
    }

    // 2) Fallback to any taxable account if still short
    if (remainingToSpend > 0.01) {
      for (const acctId of taxableAccounts) {
        if (remainingToSpend <= 0.01) break;

        const bal = balances[acctId] ?? 0;
        if (bal <= 0.01) continue;

        const spend = Math.min(remainingToSpend, bal);
        if (spend <= 0) continue;

        balances[acctId] = bal - spend;

        // Note: fallback spending is NOT earmarked; it represents pulling funds from general taxable balance.
        spentByAccount[acctId] = (spentByAccount[acctId] ?? 0) + spend;
        spentByGoal[g.id] = (spentByGoal[g.id] ?? 0) + spend;

        remainingToSpend -= spend;
        spentTotal += spend;
      }
    }

    // 3) If still short, warn
    if (remainingToSpend > 1) {
      warnings.push({
        code: "GOAL_SHORTFALL",
        severity: "warn",
        message: `Goal "${g.name}" spending shortfall at target date: ${remainingToSpend.toFixed(0)} (nominal).`,
        at: monthIso,
      });
    }

    // Optional: after spending, you may want to zero any tiny earmark dust for this goal at due month
    // (keeps tables clean)
  }

  return { spentTotal, spentByAccount, spentByGoal, warnings };
}
```

---

# 3) Projection integration: spend at target month

In **`packages/engine/src/internal/projection.ts`**:

## 3.1 Add import

```ts
import { spendGoalsAtMonth } from "./goal_spending";
```

## 3.2 Call spending AFTER returns (recommended)

Reason: spending typically happens “end of month” or “at due date”; simplest is after returns so the dip shows clearly.

In Pass B month loop (where you do contributions → returns → series pushes), after returns and after you compute earmarks/available series, insert:

```ts
// Spend goals at target month (linked accounts first, taxable fallback)
const spendOut = spendGoalsAtMonth({
  monthIso: t,
  monthDate: d,
  goals: input.goals,
  fundingRules: input.goalFundingRules,
  accounts: input.accounts,
  inflation,
  balances,
  fundedByGoalAccount: goalFundState.fundedByGoalAccount,
});

// If spending occurred, recompute earmarks/available for the month end snapshot points.
// (We want the month’s plotted points to reflect post-spend state.)
if (spendOut.spentTotal > 0) {
  const earmarkedMap2 = computeEarmarkedByAccount(goalFundState);
  for (const a of input.accounts) {
    const bal = balances[a.id] ?? 0;
    const earmarked = earmarkedMap2[a.id]?.earmarked ?? 0;
    const available = Math.max(0, bal - earmarked);

    // overwrite last pushed point for this month (safe deterministic)
    series.accountBalances[a.id][series.accountBalances[a.id].length - 1] = { t, v: bal };
    series.accountEarmarked[a.id][series.accountEarmarked[a.id].length - 1] = { t, v: earmarked };
    series.accountAvailable[a.id][series.accountAvailable[a.id].length - 1] = { t, v: available };
  }

  // Update assets/netWorth points too (overwrite last)
  const assetsEnd2 = Object.values(balances).reduce((s, v) => s + v, 0);
  const liabEnd2 = 0;

  series.assetsTotal[series.assetsTotal.length - 1] = { t, v: assetsEnd2 };
  series.netWorth[series.netWorth.length - 1] = { t, v: assetsEnd2 - liabEnd2 };
}
```

## 3.3 Attach spending info to monthly breakdown (Explain drawer)

When you build `MonthlyBreakdownRow`, add:

```ts
// add to row
goalSpendingTotal: spendOut.spentTotal,
goalSpendingByGoal: spendOut.spentByGoal,
goalSpendingByAccount: spendOut.spentByAccount,
```

So update `MonthlyBreakdownRow` type in `types.ts`:

```ts
goalSpendingTotal?: number;
goalSpendingByGoal?: Record<string, number>;
goalSpendingByAccount?: Record<string, number>;
```

## 3.4 Merge warnings

When building warnings, append `spendOut.warnings` (accumulate per month).
Simplest: maintain an array `spendWarnings: Warning[] = []` outside the loop and push each month’s `spendOut.warnings`. Then:

```ts
const warnings = buildWarnings(monthlyFinal, taxOut.warnings).concat(spendWarnings);
```

---

# 4) Update earmarks snapshot after spending

Your `earmarksEnd` snapshot currently uses final balances and `fundedByGoalAccount`. That will now reflect post-spend, automatically — just ensure snapshot is computed after loop end.

---

# 5) Web/UI: show spending dip + explain

No new UI math.

Optional nice touch in Explain drawer: display `goalSpendingByGoal` and `goalSpendingByAccount` when present.

---

# 6) Tests (must-have)

## 6.1 Spending reduces balances on target month

Add **`packages/engine/src/__tests__/goal_spending.test.ts`**:

```ts
import { describe, it, expect } from "vitest";
import { runProjection } from "../contract";

describe("goal spending at target date", () => {
  it("spends from linked accounts first and falls back to taxable", () => {
    const res = runProjection({
      scenarioId: "s1",
      household: { currency: "USD", anchorDate: "2026-01-01T00:00:00.000Z", startDate: "2026-01-01T00:00:00.000Z", endDate: "2026-05-01T00:00:00.000Z" },
      assumptions: { inflationRatePct: 0, taxableInterestYieldPct: 0, taxableDividendYieldPct: 0, realizedStGainPct: 0, realizedLtGainPct: 0 },
      taxProfile: { stateCode: "VA", filingStatus: "MFJ", taxYear: 2026, includePayrollTaxes: false, advancedOverridesEnabled: false },
      taxRules: { federal: null, state: null },
      incomes: [{ id:"i1", name:"Salary", amount: 10000, frequency:"MONTHLY", startDate:"2026-01-01T00:00:00.000Z", growthRule:"NONE" }],
      expenses: [{ id:"e1", category:"Housing", amount: 2000, frequency:"MONTHLY", startDate:"2026-01-01T00:00:00.000Z", growthRule:"NONE", isEssential:true }],
      accounts: [
        { id:"a_linked", name:"Linked", type:"TAXABLE", expectedReturnPct: 0, holdings: [] },
        { id:"a_fallback", name:"Fallback", type:"TAXABLE", expectedReturnPct: 0, holdings: [] },
      ],
      contributions: [
        { accountId:"a_linked", amountMonthly: 1000, startDate:"2026-01-01T00:00:00.000Z" },
        { accountId:"a_fallback", amountMonthly: 500, startDate:"2026-01-01T00:00:00.000Z" },
      ],
      loans: [],
      goals: [
        { id:"g1", type:"HOME_PURCHASE", name:"Home", targetAmountReal: 7000, targetDate:"2026-04-01T00:00:00.000Z", priority:1, spendAtTarget:true },
      ],
      goalFundingRules: [
        { id:"r1", goalId:"g1", accountId:"a_linked", mode:"SURPLUS_AUTO", priorityOrder:1, startDate:"2026-01-01T00:00:00.000Z", stopWhenFunded:true },
      ],
    } as any);

    const monthIdx = res.series.accountBalances["a_linked"].findIndex((p) => p.t.startsWith("2026-04-01"));
    expect(monthIdx).toBeGreaterThanOrEqual(0);

    // Spending should show as a dip in April vs March if goal is spendAtTarget
    const linkedMar = res.series.accountBalances["a_linked"][monthIdx - 1].v;
    const linkedApr = res.series.accountBalances["a_linked"][monthIdx].v;
    expect(linkedApr).toBeLessThan(linkedMar);

    // Spending info exists in monthly breakdown
    const row = res.monthly.find((r) => r.t.startsWith("2026-04-01"))!;
    expect(row.goalSpendingTotal || 0).toBeGreaterThan(0);
  });
});
```

Run:

```bash
pnpm --filter @finatlas/engine test
```

---

# 7) Behavioral rules (write these in your docs / README)

**MVP spending rules**

* Spend is applied **only at the goal’s target month**
* Spend order:

  1. linked accounts in rule order
  2. any taxable accounts (largest balance first)
* No negative balances
* If short: warning + partial spend

---

# 8) Quick manual demo path (what you should see)

1. Turn on `spendAtTarget` for College/Home goals in seed.
2. Ensure linked rules exist.
3. Run Dashboard chart: net worth should show a visible dip at target month.
4. Investments → Earmarks: earmarked drops when spending happens.
5. Explain drawer on that month shows `goalSpendingByGoal` and `goalSpendingByAccount`.

---

