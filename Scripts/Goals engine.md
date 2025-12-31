Got it — **Deliverable #2: Goals engine + goal progress charts**.

You’ll implement **goal funding buckets** (virtual “sinking funds”) driven by **monthly surplus**, allocated by **priority**, with **inflation-adjusted targets** (targets are “today’s dollars” → converted to nominal over time). Output feeds the UI with **zero math in UI**.

---

# 0) What you’re building in this deliverable

### Engine behavior (deterministic)

* Each goal has:

  * `targetAmountReal` (today dollars)
  * `targetDate`
  * `priority` (1 highest)
* Engine converts target to **nominal each month** using the inflation index.
* Engine maintains per-goal **goalFundBalance**.
* Each month, if there is **surplus cashflow**, it allocates goal funding:

  1. Sort active goals by `priority`, then earliest `targetDate`
  2. For each goal, compute remaining needed and remaining months
  3. Allocate the **recommended monthly amount** (needed / monthsRemaining), capped by surplus
* Engine emits:

  * `series.goalProgress[goalId].funded[]`
  * `series.goalProgress[goalId].targetNominal[]`
* Warnings:

  * At the goal target month: `GOAL_SHORTFALL` if funded < targetNominal

### UI outcome

* `/goals` page shows **per-goal chart**: funded vs targetNominal
* Optional table: funded today, target today, shortfall, status
* No UI-side calculations beyond formatting

---

# 1) Engine changes

## 1.1 Add internal goals module

**`packages/engine/src/internal/goals.ts`**

```ts
import type { GoalDTO, ISODate, SeriesPoint, Warning } from "../types";
import { isoMonthStart, toMonthStartUTC } from "./dates";
import type { InflationIndex } from "./growth";

export interface GoalState {
  balance: Record<string, number>; // goalId -> funded nominal $
}

export interface GoalAllocationResult {
  allocatedTotal: number;
  allocatedByGoal: Record<string, number>;
}

function monthDiffInclusive(current: Date, target: Date): number {
  const m =
    (target.getUTCFullYear() - current.getUTCFullYear()) * 12 +
    (target.getUTCMonth() - current.getUTCMonth());
  return Math.max(1, m + 1);
}

export function targetNominalForMonth(goal: GoalDTO, monthIso: ISODate, inflation: InflationIndex): number {
  const idx = inflation[monthIso] ?? 1;
  return goal.targetAmountReal * idx;
}

export function initGoalState(goals: GoalDTO[]): GoalState {
  return { balance: Object.fromEntries(goals.map((g) => [g.id, 0])) };
}

/**
 * Allocate surplus into goal funds using a simple deterministic plan:
 * - Only allocate for months <= target month
 * - Priority first, then earlier target date
 * - Recommended monthly = remainingNeeded / remainingMonths (inclusive)
 */
export function allocateGoalsForMonth(args: {
  month: Date;
  monthIso: ISODate;
  goals: GoalDTO[];
  inflation: InflationIndex;
  goalState: GoalState;
  surplus: number; // positive amount available to allocate
}): GoalAllocationResult {
  const { month, monthIso, goals, inflation, goalState } = args;

  let remaining = Math.max(0, surplus);
  const allocatedByGoal: Record<string, number> = {};

  const activeGoals = goals
    .filter((g) => {
      const targetMonth = toMonthStartUTC(g.targetDate);
      return month <= targetMonth;
    })
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.targetDate.localeCompare(b.targetDate);
    });

  for (const g of activeGoals) {
    if (remaining <= 0) break;

    const targetMonthIso = isoMonthStart(toMonthStartUTC(g.targetDate));
    const targetThisMonth = targetNominalForMonth(g, monthIso, inflation);

    const funded = goalState.balance[g.id] ?? 0;
    const needed = Math.max(0, targetThisMonth - funded);
    if (needed <= 0) continue;

    const monthsRemaining = monthDiffInclusive(month, toMonthStartUTC(g.targetDate));
    const recommended = needed / monthsRemaining;

    const alloc = Math.min(remaining, recommended);
    if (alloc <= 0) continue;

    goalState.balance[g.id] = funded + alloc;
    allocatedByGoal[g.id] = (allocatedByGoal[g.id] ?? 0) + alloc;
    remaining -= alloc;
  }

  return {
    allocatedTotal: surplus - remaining,
    allocatedByGoal,
  };
}

export function buildGoalProgressSeries(args: {
  goals: GoalDTO[];
  months: ISODate[];
  inflation: InflationIndex;
  goalBalancesByMonth: Record<string, number[]>; // goalId -> balance aligned with months
}): Record<string, { funded: SeriesPoint[]; targetNominal: SeriesPoint[] }> {
  const { goals, months, inflation, goalBalancesByMonth } = args;
  const out: Record<string, { funded: SeriesPoint[]; targetNominal: SeriesPoint[] }> = {};

  for (const g of goals) {
    const balArr = goalBalancesByMonth[g.id] ?? months.map(() => 0);
    out[g.id] = {
      funded: months.map((t, i) => ({ t, v: balArr[i] ?? 0 })),
      targetNominal: months.map((t) => ({ t, v: targetNominalForMonth(g, t, inflation) })),
    };
  }

  return out;
}

export function goalShortfallWarnings(args: {
  goals: GoalDTO[];
  inflation: InflationIndex;
  goalState: GoalState;
  finalMonthIsoByMonth: Record<string, string>; // not needed now; kept for extensibility
}): Warning[] {
  const warnings: Warning[] = [];
  for (const g of args.goals) {
    const targetMonthIso = isoMonthStart(toMonthStartUTC(g.targetDate));
    const targetNominal = targetNominalForMonth(g, targetMonthIso, args.inflation);
    const funded = args.goalState.balance[g.id] ?? 0;
    const shortfall = targetNominal - funded;

    if (shortfall > 1) {
      warnings.push({
        code: "GOAL_SHORTFALL",
        severity: "warn",
        message: `Goal "${g.name}" shortfall at target date: ${shortfall.toFixed(0)} (nominal)`,
        at: targetMonthIso,
      });
    }
  }
  return warnings;
}
```

---

## 1.2 Update projection to include goal allocation + goal progress series

Edit **`packages/engine/src/internal/projection.ts`**. Replace the core loop section with the changes below (you’re adding goal state + goal buckets tracking).

### A) Add imports at top

```ts
import { initGoalState, allocateGoalsForMonth, buildGoalProgressSeries } from "./goals";
```

### B) Right after account initialization, add goal state

```ts
  // Goals: virtual sinking-funds (nominal $)
  const goalState = initGoalState(input.goals);
  const goalBalancesByMonth: Record<string, number[]> = Object.fromEntries(input.goals.map((g) => [g.id, []]));
```

### C) In your monthly loop, after you compute `monthlyRowsPreTax.push(...)` currently,

you should move to a **two-pass** approach (because taxes are allocated annually).
We’ll keep your existing two-pass structure, but now goals are funded in the *final pass* using the final `netCashflow` (post-tax).

So:

1. keep `monthlyRowsPreTax` as-is (no goals allocation yet)
2. after taxes are allocated, do a second loop that:

   * applies taxes
   * allocates goals from positive surplus
   * records goal balances

Replace the “Apply monthly taxes and build final rows + chart series” section with this:

```ts
  // Apply monthly taxes, allocate goals, and build final rows + chart series
  const monthIsos = monthlyRowsPreTax.map((r) => r.t);

  const monthlyFinal: MonthlyBreakdownRow[] = monthlyRowsPreTax.map((r, idx) => {
    const taxes = taxOut.monthlyTaxes[r.t] ?? 0;

    // "surplus" we can allocate to goals/cash buckets
    const surplus = r.netCashflow - taxes;

    // Allocate goals only from positive surplus (never force borrowing in MVP)
    if (surplus > 0 && input.goals.length > 0) {
      allocateGoalsForMonth({
        month: toMonthStartUTC(r.t),
        monthIso: r.t,
        goals: input.goals,
        inflation,
        goalState,
        surplus,
      });
    }

    // Track goal balances by month (for series)
    for (const g of input.goals) {
      goalBalancesByMonth[g.id].push(goalState.balance[g.id] ?? 0);
    }

    const netCashflow = surplus; // keep as "available surplus after taxes" (not zeroed by allocations)

    const netWorth = r.assetsEnd - r.liabilitiesEnd; // goal funds are virtual; optional to add into assets later

    series.incomeTotal.push({ t: r.t, v: r.income });
    series.expenseTotal.push({ t: r.t, v: r.expenses });
    series.taxesTotal.push({ t: r.t, v: taxes });
    series.cashflowNet.push({ t: r.t, v: netCashflow });
    series.assetsTotal.push({ t: r.t, v: r.assetsEnd });
    series.liabilitiesTotal.push({ t: r.t, v: r.liabilitiesEnd });
    series.netWorth.push({ t: r.t, v: netWorth });

    return { ...r, taxes, netCashflow };
  });

  // Build goal progress series (funded vs targetNominal)
  series.goalProgress = buildGoalProgressSeries({
    goals: input.goals,
    months: monthIsos,
    inflation,
    goalBalancesByMonth,
  });
```

> Note: In v0.3 we’ll optionally treat goal funds as part of assets (a “cash earmark”), but for now it’s a separate progress envelope. Keeps the model simple and deterministic.

---

## 1.3 Add goal shortfall warnings at target month

In **`packages/engine/src/internal/warnings.ts`**, add a helper to merge goal warnings.
Simplest: after building monthly warnings, append goal warnings inside `runProjectionInternal`.

In **`packages/engine/src/internal/projection.ts`**, add import:

```ts
import { goalShortfallWarnings } from "./goals";
```

Then near the end (before return), replace warnings assembly with:

```ts
  const warnings = buildWarnings(monthlyFinal, taxOut.warnings).concat(
    goalShortfallWarnings({ goals: input.goals, inflation, goalState, finalMonthIsoByMonth: {} })
  );
```

---

## 1.4 Engine test for goal funding + inflation target

Add **`packages/engine/src/__tests__/goals.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { runProjection } from "../contract";

describe("goals", () => {
  it("allocates to priority goals and emits goalProgress series", () => {
    const res = runProjection({
      scenarioId: "s1",
      household: {
        currency: "USD",
        anchorDate: "2026-01-01T00:00:00.000Z",
        startDate: "2026-01-01T00:00:00.000Z",
        endDate: "2026-07-01T00:00:00.000Z",
      },
      assumptions: {
        inflationRatePct: 6,
        taxableInterestYieldPct: 1.5,
        taxableDividendYieldPct: 1.8,
        realizedStGainPct: 0,
        realizedLtGainPct: 0,
      },
      taxProfile: { stateCode: "VA", filingStatus: "MFJ", taxYear: 2026, includePayrollTaxes: false, advancedOverridesEnabled: false },
      taxRules: { federal: null, state: null },
      incomes: [{ id: "i1", name: "Salary", amount: 10000, frequency: "MONTHLY", startDate: "2026-01-01T00:00:00.000Z", growthRule: "NONE" }],
      expenses: [{ id: "e1", category: "Housing", amount: 3000, frequency: "MONTHLY", startDate: "2026-01-01T00:00:00.000Z", growthRule: "NONE", isEssential: true }],
      accounts: [{ id: "a1", name: "Taxable", type: "TAXABLE", expectedReturnPct: 0, holdings: [] }],
      contributions: [{ accountId: "a1", amountMonthly: 2000, startDate: "2026-01-01T00:00:00.000Z" }],
      loans: [],
      goals: [
        { id: "g1", type: "COLLEGE", name: "College", targetAmountReal: 12000, targetDate: "2026-06-01T00:00:00.000Z", priority: 1 },
        { id: "g2", type: "HOME_PURCHASE", name: "Home", targetAmountReal: 6000, targetDate: "2026-06-01T00:00:00.000Z", priority: 2 },
      ],
    } as any);

    expect(res.series.goalProgress.g1).toBeTruthy();
    expect(res.series.goalProgress.g2).toBeTruthy();

    const g1FundedLast = res.series.goalProgress.g1.funded.at(-1)!.v;
    const g2FundedLast = res.series.goalProgress.g2.funded.at(-1)!.v;

    // Priority 1 should get at least as much as priority 2 under equal horizon
    expect(g1FundedLast).toBeGreaterThanOrEqual(g2FundedLast);

    // Target nominal should rise with inflation across months
    const t0 = res.series.goalProgress.g1.targetNominal[0].v;
    const tLast = res.series.goalProgress.g1.targetNominal.at(-1)!.v;
    expect(tLast).toBeGreaterThan(t0);
  });
});
```

Run:

```bash
pnpm --filter @finatlas/engine test
```

---

# 2) Web UI: `/goals` page (charts + table)

## 2.1 Goals page

**`apps/web/app/(app)/goals/page.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Line } from "@ant-design/charts";
import { ChartCard } from "@/components/charts/ChartCard";
import { getActiveScenarioIdClient } from "@/components/layout/ScenarioSelector";

type GoalSeries = {
  funded: { t: string; v: number }[];
  targetNominal: { t: string; v: number }[];
};

export default function GoalsPage() {
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<any | null>(null);

  async function load() {
    const scenarioId = getActiveScenarioIdClient();
    if (!scenarioId) return;
    setBusy(true);
    const res = await fetch("/api/engine/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenarioId, forceRecompute: false }),
    });
    const j = await res.json();
    setResults(j.results);
    setBusy(false);
  }

  useEffect(() => {
    load();
  }, []);

  const goalProgress = results?.series?.goalProgress ?? {};
  const goalIds = Object.keys(goalProgress);

  const cards = useMemo(() => {
    return goalIds.map((goalId) => {
      const gs: GoalSeries = goalProgress[goalId];
      const funded = gs.funded.map((p) => ({ date: p.t.slice(0, 10), value: p.v, series: "Funded" }));
      const target = gs.targetNominal.map((p) => ({ date: p.t.slice(0, 10), value: p.v, series: "Target (nominal)" }));
      const data = [...funded, ...target];

      const fundedNow = gs.funded.at(-1)?.v ?? 0;
      const targetNow = gs.targetNominal.at(-1)?.v ?? 0;
      const shortfall = Math.max(0, targetNow - fundedNow);

      return { goalId, data, fundedNow, targetNow, shortfall };
    });
  }, [goalIds, goalProgress]);

  if (busy && !results) {
    return <div className="text-sm text-zinc-400">Loading…</div>;
  }

  if (!goalIds.length) {
    return (
      <div className="rounded-2xl border border-zinc-900 bg-zinc-950/50 p-6 text-sm text-zinc-300">
        No goals found for this scenario.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="text-lg font-semibold">Goals</div>
        <button
          onClick={() => load()}
          className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm hover:bg-zinc-900"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {cards.map((c) => (
          <ChartCard
            key={c.goalId}
            title={`Goal ${c.goalId}`}
            right={
              <div className="text-xs text-zinc-400">
                Funded {fmt(c.fundedNow)} • Target {fmt(c.targetNow)} • Shortfall {fmt(c.shortfall)}
              </div>
            }
          >
            <Line
              data={c.data}
              xField="date"
              yField="value"
              seriesField="series"
              smooth
              autoFit
              height={280}
              interactions={[{ type: "brush-x" }]}
              onReady={(plot) => {
                plot.on("element:click", (evt: any) => {
                  const d = evt?.data?.data;
                  if (!d) return;
                  window.dispatchEvent(
                    new CustomEvent("finatlas:explain", {
                      detail: { title: `Goal ${c.goalId} — ${d.date}`, body: d },
                    })
                  );
                });
              }}
            />
          </ChartCard>
        ))}
      </div>

      <ChartCard title="Goal status (current month)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-zinc-400">
              <tr className="border-b border-zinc-900">
                <th className="py-2 text-left">Goal</th>
                <th className="py-2 text-right">Funded</th>
                <th className="py-2 text-right">Target (nominal)</th>
                <th className="py-2 text-right">Shortfall</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((c) => (
                <tr key={c.goalId} className="border-b border-zinc-900/60">
                  <td className="py-2">{c.goalId}</td>
                  <td className="py-2 text-right">{fmt(c.fundedNow)}</td>
                  <td className="py-2 text-right">{fmt(c.targetNow)}</td>
                  <td className="py-2 text-right">{fmt(c.shortfall)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}

function fmt(n: number) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
}
```

> This intentionally labels goals by `goalId` because the engine output doesn’t include names yet. In the next increment, we’ll pass `goals[]` metadata alongside results (or return a `goalIndex` map).

---

# 3) Add navigation to Goals (if not already)

In your sidebar (AppShell), ensure:

```tsx
<a className="block hover:text-white" href="/goals">Goals</a>
```

---

# 4) Acceptance checklist

### Engine

* [ ] `series.goalProgress` exists and contains goal IDs
* [ ] For each goal: `funded.length === months` and `targetNominal.length === months`
* [ ] `targetNominal` increases over time with inflation
* [ ] `GOAL_SHORTFALL` warning appears when funded < target at the goal month

### UI

* [ ] `/goals` displays at least one chart (Funded vs Target)
* [ ] Clicking a line point opens Explain drawer
* [ ] No UI computations for targets (only uses engine output)

---

