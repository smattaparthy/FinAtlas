Perfect — **Next deliverable #1: “Earmarks in Investments”**
Goal: show, per account, **Balance vs Earmarked-for-goals vs Available** (all computed by engine; **no math in UI**).

This builds on the goal-linked accounts feature you just chose.

---

# 1) Engine contract updates (types + outputs)

## 1.1 Update `ProjectionSeries` to include earmarks + available

Edit **`packages/engine/src/types.ts`**:

```ts
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

  // NEW
  accountEarmarked: Record<string, SeriesPoint[]>; // accountId -> earmarked (nominal $)
  accountAvailable: Record<string, SeriesPoint[]>; // accountId -> available (nominal $)
}
```

## 1.2 Add a deterministic “index” for UI labels

Still in **`types.ts`**, add:

```ts
export interface ResultIndexDTO {
  accounts: { id: string; name: string; type: AccountType }[];
  goals: { id: string; name: string; priority: number; targetDate: ISODate }[];
}
```

and extend `ProjectionResultDTO`:

```ts
export interface ProjectionResultDTO {
  engineVersion: string;
  inputHash: string;

  index: ResultIndexDTO; // NEW

  series: ProjectionSeries;
  monthly: MonthlyBreakdownRow[];
  annual: AnnualSummaryRow[];
  taxAnnual: TaxBreakdownAnnual[];
  warnings: Warning[];

  // NEW: snapshot for tables (final month)
  earmarksEnd: {
    byAccount: Record<
      string,
      { balance: number; earmarked: number; available: number; byGoal: Record<string, number> }
    >;
  };
}
```

---

# 2) Goal-linked funding state: track earmarks per goal *and* per account

## 2.1 Update `goals_linked.ts` state + allocation output

Edit **`packages/engine/src/internal/goals_linked.ts`**.

### Replace the state with per-goal-per-account tracking

```ts
export type GoalFundState = {
  fundedByGoal: Record<string, number>; // goalId -> funded nominal
  fundedByGoalAccount: Record<string, Record<string, number>>; // goalId -> accountId -> funded nominal
};

export function initGoalFundState(goals: GoalDTO[]): GoalFundState {
  return {
    fundedByGoal: Object.fromEntries(goals.map((g) => [g.id, 0])),
    fundedByGoalAccount: Object.fromEntries(goals.map((g) => [g.id, {}])),
  };
}
```

### In `allocateGoalFundingForMonth`, track funded added by goal+account

Change return type to include byGoalAccount:

```ts
return {
  goalContribByAccount,
  fundedAddedByGoal,
  fundedAddedByGoalAccount, // NEW
  usedSurplus,
};
```

Inside allocation, whenever you allocate `alloc` for `goal` to `accountId`, add:

```ts
fundedAddedByGoalAccount[goal.id] ||= {};
fundedAddedByGoalAccount[goal.id][r.accountId] = (fundedAddedByGoalAccount[goal.id][r.accountId] ?? 0) + alloc;
```

And when updating state after the goal is funded this month, also update state per account:

```ts
for (const [acctId, amt] of Object.entries(fundedAddedByGoalAccount[goal.id] || {})) {
  const prev = goalFundState.fundedByGoalAccount[goal.id][acctId] ?? 0;
  goalFundState.fundedByGoalAccount[goal.id][acctId] = prev + amt;
}
```

Also initialize at top of function:

```ts
const fundedAddedByGoalAccount: Record<string, Record<string, number>> = {};
```

---

# 3) Projection: compute earmarked + available series (engine-owned)

## 3.1 Initialize series containers

In **`packages/engine/src/internal/projection.ts`**, when you initialize `series`, add:

```ts
  const accountEarmarked: Record<string, SeriesPoint[]> = Object.fromEntries(input.accounts.map((a) => [a.id, []]));
  const accountAvailable: Record<string, SeriesPoint[]> = Object.fromEntries(input.accounts.map((a) => [a.id, []]));
```

and attach to `series`:

```ts
  const series = {
    netWorth: [],
    assetsTotal: [],
    liabilitiesTotal: [],
    incomeTotal: [],
    expenseTotal: [],
    taxesTotal: [],
    cashflowNet: [],
    accountBalances: accountSeries,
    goalProgress: {} as any,

    accountEarmarked,
    accountAvailable,
  };
```

## 3.2 Each month, after you update account balances, compute earmarks/available

After your month’s account balances are updated (post-contrib + post-returns), compute earmark totals per account:

```ts
function computeEarmarkedByAccount(goalFundState: any): Record<string, { earmarked: number; byGoal: Record<string, number> }> {
  const byAccount: Record<string, { earmarked: number; byGoal: Record<string, number> }> = {};

  for (const [goalId, acctMap] of Object.entries(goalFundState.fundedByGoalAccount as Record<string, Record<string, number>>)) {
    for (const [accountId, amt] of Object.entries(acctMap)) {
      byAccount[accountId] ||= { earmarked: 0, byGoal: {} };
      byAccount[accountId].earmarked += amt;
      byAccount[accountId].byGoal[goalId] = (byAccount[accountId].byGoal[goalId] ?? 0) + amt;
    }
  }

  return byAccount;
}
```

Then in the per-month loop (Pass B), do:

```ts
const earmarkedMap = computeEarmarkedByAccount(goalFundState);

for (const a of input.accounts) {
  const bal = balances[a.id] ?? 0;
  const earmarked = earmarkedMap[a.id]?.earmarked ?? 0;
  const available = Math.max(0, bal - earmarked);

  series.accountEarmarked[a.id].push({ t, v: earmarked });
  series.accountAvailable[a.id].push({ t, v: available });
}
```

## 3.3 Add snapshot `earmarksEnd` to result

After the monthly loop ends, compute final month snapshot:

```ts
const lastMonthIso = monthIsos[monthIsos.length - 1];
const earmarkedMapEnd = computeEarmarkedByAccount(goalFundState);

const earmarksEnd = {
  byAccount: Object.fromEntries(
    input.accounts.map((a) => {
      const balance = balances[a.id] ?? 0;
      const earmarked = earmarkedMapEnd[a.id]?.earmarked ?? 0;
      const available = Math.max(0, balance - earmarked);
      const byGoal = earmarkedMapEnd[a.id]?.byGoal ?? {};
      return [a.id, { balance, earmarked, available, byGoal }];
    })
  ),
};
```

Then return it:

```ts
return {
  engineVersion: ENGINE_VERSION,
  inputHash,
  index: {
    accounts: input.accounts.map((a) => ({ id: a.id, name: a.name, type: a.type })),
    goals: input.goals.map((g) => ({ id: g.id, name: g.name, priority: g.priority, targetDate: g.targetDate })),
  },
  series,
  monthly: monthlyFinal,
  annual,
  taxAnnual: taxOut.annual,
  warnings,
  earmarksEnd,
};
```

---

# 4) Monthly row explain payload additions (nice for drawer)

When you build the final monthly row, add:

```ts
goalFundingTotal: goalAlloc.usedSurplus,
goalFundingByGoal: goalAlloc.fundedAddedByGoal,
goalFundingByAccount: goalAlloc.goalContribByAccount,
```

(You already had these in the earlier deliverable; keep them.)

---

# 5) Engine test: earmarked never exceeds balance (basic invariant)

Add **`packages/engine/src/__tests__/earmarks.test.ts`**:

```ts
import { describe, it, expect } from "vitest";
import { runProjection } from "../contract";

describe("earmarks", () => {
  it("earmarked should not exceed account balance", () => {
    const res = runProjection({
      scenarioId: "s1",
      household: { currency: "USD", anchorDate: "2026-01-01T00:00:00.000Z", startDate: "2026-01-01T00:00:00.000Z", endDate: "2026-06-01T00:00:00.000Z" },
      assumptions: { inflationRatePct: 3, taxableInterestYieldPct: 0, taxableDividendYieldPct: 0, realizedStGainPct: 0, realizedLtGainPct: 0 },
      taxProfile: { stateCode: "VA", filingStatus: "MFJ", taxYear: 2026, includePayrollTaxes: false, advancedOverridesEnabled: false },
      taxRules: { federal: null, state: null },
      incomes: [{ id:"i1", name:"Salary", amount: 10000, frequency:"MONTHLY", startDate:"2026-01-01T00:00:00.000Z", growthRule:"NONE" }],
      expenses: [{ id:"e1", category:"Housing", amount: 2000, frequency:"MONTHLY", startDate:"2026-01-01T00:00:00.000Z", growthRule:"NONE", isEssential:true }],
      accounts: [
        { id:"a1", name:"Taxable", type:"TAXABLE", expectedReturnPct: 0, holdings: [] },
      ],
      contributions: [{ accountId:"a1", amountMonthly: 1000, startDate:"2026-01-01T00:00:00.000Z" }],
      loans: [],
      goals: [{ id:"g1", type:"HOME_PURCHASE", name:"Home", targetAmountReal: 10000, targetDate:"2026-05-01T00:00:00.000Z", priority:1 }],
      goalFundingRules: [
        { id:"r1", goalId:"g1", accountId:"a1", mode:"SURPLUS_AUTO", priorityOrder:1, startDate:"2026-01-01T00:00:00.000Z", stopWhenFunded:true }
      ],
    } as any);

    const bal = res.series.accountBalances["a1"];
    const earm = res.series.accountEarmarked["a1"];
    expect(bal.length).toBe(earm.length);

    for (let i = 0; i < bal.length; i++) {
      expect(earm[i].v).toBeLessThanOrEqual(bal[i].v + 1e-6);
    }
  });
});
```

Run:

```bash
pnpm --filter @finatlas/engine test
```

---

# 6) UI: Investments → Earmarks page (charts + table)

## 6.1 Add nav link

In AppShell sidebar (or Investments section):

```tsx
<a className="block hover:text-white" href="/investments/earmarks">Earmarks</a>
```

## 6.2 Page: `apps/web/app/(app)/investments/earmarks/page.tsx`

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Line } from "@ant-design/charts";
import { ChartCard } from "@/components/charts/ChartCard";
import { getActiveScenarioIdClient } from "@/components/layout/ScenarioSelector";

export default function EarmarksPage() {
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

  useEffect(() => { load(); }, []);

  const accounts = results?.index?.accounts ?? [];
  const goals = results?.index?.goals ?? [];
  const goalsById = useMemo(() => Object.fromEntries(goals.map((g: any) => [g.id, g])), [goals]);

  const snapshot = results?.earmarksEnd?.byAccount ?? {};
  const seriesBalances = results?.series?.accountBalances ?? {};
  const seriesEarm = results?.series?.accountEarmarked ?? {};
  const seriesAvail = results?.series?.accountAvailable ?? {};

  if (busy && !results) return <div className="text-sm text-zinc-400">Loading…</div>;
  if (!accounts.length) return <div className="text-sm text-zinc-400">No accounts found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="text-lg font-semibold">Earmarks</div>
        <button
          onClick={() => load()}
          className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm hover:bg-zinc-900"
        >
          Refresh
        </button>
      </div>

      <ChartCard title="Accounts: Balance vs Earmarked vs Available">
        <div className="space-y-6">
          {accounts.map((a: any) => {
            const bal = (seriesBalances[a.id] ?? []).map((p: any) => ({ date: p.t.slice(0, 10), value: p.v, series: "Balance" }));
            const earm = (seriesEarm[a.id] ?? []).map((p: any) => ({ date: p.t.slice(0, 10), value: p.v, series: "Earmarked" }));
            const avail = (seriesAvail[a.id] ?? []).map((p: any) => ({ date: p.t.slice(0, 10), value: p.v, series: "Available" }));
            const data = [...bal, ...earm, ...avail];

            return (
              <div key={a.id} className="rounded-2xl border border-zinc-900 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-medium">{a.name} <span className="text-xs text-zinc-400">({a.type})</span></div>
                  <div className="text-xs text-zinc-400">
                    End: Bal {fmt(snapshot[a.id]?.balance)} • Earm {fmt(snapshot[a.id]?.earmarked)} • Avail {fmt(snapshot[a.id]?.available)}
                  </div>
                </div>

                <div className="mt-3">
                  <Line
                    data={data}
                    xField="date"
                    yField="value"
                    seriesField="series"
                    smooth
                    autoFit
                    height={260}
                    interactions={[{ type: "brush-x" }]}
                    onReady={(plot) => {
                      plot.on("element:click", (evt: any) => {
                        const d = evt?.data?.data;
                        if (!d) return;
                        window.dispatchEvent(
                          new CustomEvent("finatlas:explain", {
                            detail: { title: `${a.name} — ${d.date}`, body: d },
                          })
                        );
                      });
                    }}
                  />
                </div>

                <div className="mt-4">
                  <div className="text-xs text-zinc-400 mb-2">Earmarked by goal (end snapshot)</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-zinc-500">
                        <tr className="border-b border-zinc-900">
                          <th className="py-2 text-left">Goal</th>
                          <th className="py-2 text-right">Earmarked</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(snapshot[a.id]?.byGoal ?? {}).length ? (
                          Object.entries(snapshot[a.id].byGoal).map(([goalId, amt]: any) => (
                            <tr key={goalId} className="border-b border-zinc-900/60">
                              <td className="py-2">{goalsById[goalId]?.name ?? goalId}</td>
                              <td className="py-2 text-right">{fmt(amt)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr className="border-b border-zinc-900/60">
                            <td className="py-2 text-zinc-500" colSpan={2}>No earmarks in this account.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </ChartCard>
    </div>
  );
}

function fmt(n: number) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
}
```

---

# 7) Acceptance checklist

### Engine

* [ ] `series.accountEarmarked[accountId]` exists for each account and has same length as balances
* [ ] `series.accountAvailable[accountId]` exists and is non-negative
* [ ] `earmarksEnd.byAccount[accountId]` contains `balance, earmarked, available, byGoal`
* [ ] Earmarked never exceeds balance (test passes)

### UI

* [ ] `/investments/earmarks` renders per-account chart and a by-goal earmark table
* [ ] Explain drawer opens on chart clicks (optional, but nice)

---

# Next “adult” upgrade after earmarks (recommended)

Now that you can see earmarks, the next step that makes this *feel real* is:

**“Spend goal at target date” (optional toggle per goal)**
At the goal’s target month, subtract the target amount from the linked accounts in priority order (simulating tuition/down payment), and reduce earmark accordingly. That gives you the dramatic (and accurate) net worth dip when goals happen.

Say “implement goal spending” if you want that next.
