Alright — **Goal-linked accounts** is the grown-up move. Here’s the next deliverable: **schema + DTO + engine + API + UI** to let each goal be funded by **specific investment accounts** (one or many, ordered), with deterministic allocation.

---

# 1) Prisma: add GoalFundingRule (scenario-scoped)

Add to **`prisma/schema.prisma`**:

```prisma
enum GoalFundingMode {
  SURPLUS_AUTO      // allocate from post-tax monthly surplus
  FIXED_MONTHLY     // always contribute fixed amountMonthly
}

model GoalFundingRule {
  id              String          @id @default(cuid())

  scenarioId      String
  goalId          String
  accountId       String

  mode            GoalFundingMode
  amountMonthly   Decimal?        // required for FIXED_MONTHLY

  priorityOrder   Int             @default(1) // order of accounts for the same goal
  startDate       DateTime
  endDate         DateTime?
  stopWhenFunded  Boolean         @default(true)

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  scenario        Scenario        @relation(fields: [scenarioId], references: [id], onDelete: Cascade)
  goal            Goal            @relation(fields: [goalId], references: [id], onDelete: Cascade)
  account         Account         @relation(fields: [accountId], references: [id], onDelete: Cascade)

  @@index([scenarioId])
  @@index([goalId])
  @@index([accountId])
  @@unique([scenarioId, goalId, accountId, mode, priorityOrder])
}
```

Also ensure `Scenario` includes relation (if you want convenient includes):

```prisma
model Scenario {
  id String @id @default(cuid())
  // ...
  goalFundingRules GoalFundingRule[]
}
```

Migration:

```bash
pnpm --filter @finatlas/web prisma migrate dev -n goal_funding_rules
```

---

# 2) Seed: link the 3 demo goals to specific accounts

In your seed script (where you create goals + accounts), add examples:

* **College Fund** → Taxable Brokerage (SURPLUS_AUTO)
* **Home Purchase** → Cash / “Short-Term” account (FIXED_MONTHLY)
* **Retirement** → Roth IRA (SURPLUS_AUTO)

Example snippet to insert after creating `scenario`, `goals`, `accounts`:

```ts
await prisma.goalFundingRule.createMany({
  data: [
    {
      scenarioId: baselineScenario.id,
      goalId: goalCollege.id,
      accountId: acctTaxable.id,
      mode: "SURPLUS_AUTO",
      priorityOrder: 1,
      startDate: household.startDate,
      stopWhenFunded: true,
    },
    {
      scenarioId: baselineScenario.id,
      goalId: goalHome.id,
      accountId: acctCashLike.id,
      mode: "FIXED_MONTHLY",
      amountMonthly: new Prisma.Decimal(750),
      priorityOrder: 1,
      startDate: household.startDate,
      stopWhenFunded: true,
    },
    {
      scenarioId: baselineScenario.id,
      goalId: goalRetirement.id,
      accountId: acctRoth.id,
      mode: "SURPLUS_AUTO",
      priorityOrder: 1,
      startDate: household.startDate,
      stopWhenFunded: true,
    },
  ],
});
```

---

# 3) Engine DTO: add goalFundingRules

## 3.1 Update engine types

In **`packages/engine/src/types.ts`**, add:

```ts
export type GoalFundingMode = "SURPLUS_AUTO" | "FIXED_MONTHLY";

export interface GoalFundingRuleDTO {
  id: string;
  goalId: string;
  accountId: string;
  mode: GoalFundingMode;
  amountMonthly?: number;     // required for FIXED_MONTHLY
  priorityOrder: number;
  startDate: ISODate;
  endDate?: ISODate;
  stopWhenFunded: boolean;
}
```

Then add to `ScenarioInputDTO`:

```ts
export interface ScenarioInputDTO {
  // ...
  goalFundingRules: GoalFundingRuleDTO[];
}
```

## 3.2 Extend monthly breakdown to support explain (optional but useful)

Add to `MonthlyBreakdownRow`:

```ts
export interface MonthlyBreakdownRow {
  // ...
  goalFundingTotal?: number;
  goalFundingByGoal?: Record<string, number>;
  goalFundingByAccount?: Record<string, number>;
}
```

No UI math: UI can just display these in the Explain drawer.

---

# 4) Web adapter: include goalFundingRules in ScenarioInputDTO

Update **`apps/web/lib/engine/buildScenarioInput.ts`** include:

```ts
goalFundingRules: scenario.goalFundingRules.map((r) => ({
  id: r.id,
  goalId: r.goalId,
  accountId: r.accountId,
  mode: r.mode as any,
  amountMonthly: r.amountMonthly ? Number(r.amountMonthly) : undefined,
  priorityOrder: r.priorityOrder,
  startDate: r.startDate.toISOString(),
  endDate: r.endDate?.toISOString(),
  stopWhenFunded: r.stopWhenFunded,
})),
```

And ensure the Prisma include pulls them:

```ts
include: {
  // ...
  goalFundingRules: true,
}
```

---

# 5) Engine logic: “goal funds live inside selected accounts”

Key idea:

* Goals have a **virtual funded balance** (tracking progress).
* Funding is realized as **goal-specific contributions into the linked accounts**.
* That means account balances (and returns) actually reflect goal funding.

## 5.1 New engine module: linked goal allocation

Create **`packages/engine/src/internal/goals_linked.ts`**:

```ts
import type { GoalDTO, GoalFundingRuleDTO, ISODate } from "../types";
import { isoMonthStart, toMonthStartUTC } from "./dates";
import type { InflationIndex } from "./growth";
import { isActiveForMonth } from "./schedules";

export type GoalFundState = {
  fundedByGoal: Record<string, number>; // nominal funded amount per goal
};

export function initGoalFundState(goals: GoalDTO[]): GoalFundState {
  return { fundedByGoal: Object.fromEntries(goals.map((g) => [g.id, 0])) };
}

function monthsRemainingInclusive(now: Date, target: Date): number {
  const m = (target.getUTCFullYear() - now.getUTCFullYear()) * 12 + (target.getUTCMonth() - now.getUTCMonth());
  return Math.max(1, m + 1);
}

export function targetNominalAtDueDate(goal: GoalDTO, inflation: InflationIndex): number {
  const dueIso = isoMonthStart(toMonthStartUTC(goal.targetDate));
  const idx = inflation[dueIso] ?? 1;
  return goal.targetAmountReal * idx;
}

/**
 * Returns a contribution map: accountId -> amount contributed this month for goals,
 * and also updates funded state.
 */
export function allocateGoalFundingForMonth(args: {
  month: Date;
  monthIso: ISODate;
  goals: GoalDTO[];
  fundingRules: GoalFundingRuleDTO[];
  inflation: InflationIndex;
  goalFundState: GoalFundState;
  surplusAvailable: number; // post-tax, after base contributions
}): {
  goalContribByAccount: Record<string, number>;
  fundedAddedByGoal: Record<string, number>;
  usedSurplus: number;
} {
  const { month, monthIso, goals, fundingRules, inflation, goalFundState } = args;
  let surplus = Math.max(0, args.surplusAvailable);

  const rulesActiveThisMonth = fundingRules
    .filter((r) => isActiveForMonth(r.startDate, r.endDate, month))
    .slice()
    .sort((a, b) => {
      // stable deterministic order: goal priority then due date then rule priorityOrder then accountId
      if (a.goalId !== b.goalId) return a.goalId.localeCompare(b.goalId);
      if (a.priorityOrder !== b.priorityOrder) return a.priorityOrder - b.priorityOrder;
      return a.accountId.localeCompare(b.accountId);
    });

  // Group rules by goal (and preserve per-goal ordered accounts)
  const rulesByGoal: Record<string, GoalFundingRuleDTO[]> = {};
  for (const r of rulesActiveThisMonth) (rulesByGoal[r.goalId] ||= []).push(r);

  // Goal ordering: priority then target date then id
  const orderedGoals = goals
    .slice()
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.targetDate !== b.targetDate) return a.targetDate.localeCompare(b.targetDate);
      return a.id.localeCompare(b.id);
    })
    .filter((g) => month <= toMonthStartUTC(g.targetDate));

  const goalContribByAccount: Record<string, number> = {};
  const fundedAddedByGoal: Record<string, number> = {};

  for (const goal of orderedGoals) {
    const goalRules = rulesByGoal[goal.id] || [];
    if (!goalRules.length) continue;

    const dueTarget = targetNominalAtDueDate(goal, inflation);
    const funded = goalFundState.fundedByGoal[goal.id] ?? 0;

    if (funded >= dueTarget - 0.01) continue;

    const remainingNeeded = Math.max(0, dueTarget - funded);
    const monthsRem = monthsRemainingInclusive(month, toMonthStartUTC(goal.targetDate));
    const recommendedThisMonth = remainingNeeded / monthsRem;

    let fundedThisMonth = 0;

    // 1) Apply FIXED_MONTHLY first (doesn't consume surplus unless you want it to; MVP: it consumes surplus)
    for (const r of goalRules.filter((x) => x.mode === "FIXED_MONTHLY")) {
      const amt = Math.max(0, r.amountMonthly ?? 0);
      if (amt <= 0) continue;

      // cap to remaining needed
      const alloc = Math.min(amt, remainingNeeded - fundedThisMonth);
      if (alloc <= 0) break;

      // Treat fixed monthly as using surplus as well (keeps accounting simple)
      if (surplus <= 0) break;
      const use = Math.min(surplus, alloc);

      goalContribByAccount[r.accountId] = (goalContribByAccount[r.accountId] ?? 0) + use;
      fundedThisMonth += use;
      surplus -= use;
      if (fundedThisMonth >= remainingNeeded - 0.01) break;
    }

    // 2) SURPLUS_AUTO tops up to recommendedThisMonth
    const remainingToRecommended = Math.max(0, recommendedThisMonth - fundedThisMonth);
    if (remainingToRecommended > 0 && surplus > 0) {
      let remainingAuto = Math.min(remainingToRecommended, surplus);

      const autos = goalRules.filter((x) => x.mode === "SURPLUS_AUTO");
      for (const r of autos) {
        if (remainingAuto <= 0) break;
        const alloc = remainingAuto; // fill sequentially by priorityOrder
        goalContribByAccount[r.accountId] = (goalContribByAccount[r.accountId] ?? 0) + alloc;
        fundedThisMonth += alloc;
        surplus -= alloc;
        remainingAuto -= alloc;
      }
    }

    if (fundedThisMonth > 0) {
      goalFundState.fundedByGoal[goal.id] = funded + fundedThisMonth;
      fundedAddedByGoal[goal.id] = fundedThisMonth;
    }
  }

  const usedSurplus = args.surplusAvailable - surplus;
  return { goalContribByAccount, fundedAddedByGoal, usedSurplus };
}
```

### Important MVP rule (clear + deterministic)

* Fixed monthly uses surplus too (no negative cashflow funding).
  Later we can add “allow deficit funding” as an advanced toggle.

---

## 5.2 Projection changes: apply goal funding as additional contributions

In **`packages/engine/src/internal/projection.ts`**:

### A) Add imports

```ts
import { initGoalFundState, allocateGoalFundingForMonth, targetNominalAtDueDate } from "./goals_linked";
```

### B) Initialize goal fund tracking (after inflation)

```ts
  const goalFundState = initGoalFundState(input.goals);
  const goalBalancesByMonth: Record<string, number[]> = Object.fromEntries(input.goals.map((g) => [g.id, []]));
```

### C) Restructure passes (clean + correct)

**Pass 1:** compute income/expense/loan/baseContrib only (no portfolio mutation)

Change your current “pre-tax” loop so it **does not** mutate account balances. It should compute:

* `income`
* `expenses`
* `loanPayments`
* `baseContribByAccount` and `baseContribTotal`
* `netCashflowPreTax = income - expenses - loanPayments - baseContribTotal`

Store `baseContribByAccount` on row (you can keep it in a local array keyed by month).

Then after taxes allocate monthly taxes, do:

**Pass 2:** evolve accounts using:

* base contributions + goal funding contributions
* apply returns
* build final rows + series

Minimal patch approach (you can vibe-code this directly): in pass 2, before returns each month:

```ts
const baseContribMap = contributionsForMonth(d, input.contributions, inflation);
// surplus after taxes & base contributions
const surplusAvailable = income - expenses - loanPayments - taxes - sum(baseContribMap)

// allocate goals linked accounts from surplus
const goalAlloc = allocateGoalFundingForMonth({
  month: d,
  monthIso: t,
  goals: input.goals,
  fundingRules: input.goalFundingRules,
  inflation,
  goalFundState,
  surplusAvailable,
});

// total contrib map = base + goal
for each account:
  balances[a.id] += (baseContribMap[a.id] ?? 0) + (goalAlloc.goalContribByAccount[a.id] ?? 0)
apply returns
record goal balances by month: goalFundState.fundedByGoal[goalId]
```

### D) Goal progress series should be funded vs target-at-due-date (constant line)

Update series building:

```ts
series.goalProgress = Object.fromEntries(
  input.goals.map((g) => {
    const targetDue = targetNominalAtDueDate(g, inflation);
    return [
      g.id,
      {
        funded: monthIsos.map((t, i) => ({ t, v: goalBalancesByMonth[g.id][i] ?? 0 })),
        targetNominal: monthIsos.map((t) => ({ t, v: targetDue })), // constant over months
      },
    ];
  })
);
```

### E) Add explain-friendly fields to monthly row

When creating the final monthly row:

```ts
goalFundingTotal: goalAlloc.usedSurplus,
goalFundingByGoal: goalAlloc.fundedAddedByGoal,
goalFundingByAccount: goalAlloc.goalContribByAccount,
```

---

# 6) Web API: CRUD goal funding rules (scenario-safe)

## 6.1 Zod schema (packages/schemas)

Create **`packages/schemas/src/goalFunding.ts`**:

```ts
import { z } from "zod";

export const GoalFundingMode = z.enum(["SURPLUS_AUTO", "FIXED_MONTHLY"]);

export const GoalFundingRuleUpsertSchema = z.object({
  scenarioId: z.string().min(1),
  goalId: z.string().min(1),
  rules: z.array(
    z.object({
      id: z.string().optional(),
      accountId: z.string().min(1),
      mode: GoalFundingMode,
      amountMonthly: z.number().nonnegative().optional(),
      priorityOrder: z.number().int().min(1),
      startDate: z.string().min(10),
      endDate: z.string().min(10).optional(),
      stopWhenFunded: z.boolean().default(true),
    })
  ).min(1),
}).superRefine((val, ctx) => {
  for (const r of val.rules) {
    if (r.mode === "FIXED_MONTHLY" && (r.amountMonthly == null || r.amountMonthly <= 0)) {
      ctx.addIssue({ code: "custom", message: "FIXED_MONTHLY requires amountMonthly > 0" });
    }
  }
});

export type GoalFundingRuleUpsertInput = z.infer<typeof GoalFundingRuleUpsertSchema>;
```

Export it in **`packages/schemas/src/index.ts`**.

## 6.2 API route

**`apps/web/app/api/goals/funding-rules/route.ts`**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { GoalFundingRuleUpsertSchema } from "@finatlas/schemas";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = GoalFundingRuleUpsertSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { scenarioId, goalId, rules } = parsed.data;

  // ownership checks
  const scenario = await prisma.scenario.findUnique({
    where: { id: scenarioId },
    include: { household: true },
  });
  if (!scenario) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  if (scenario.household.ownerUserId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal || goal.scenarioId !== scenarioId) return NextResponse.json({ error: "Goal mismatch" }, { status: 400 });

  // validate accounts belong to scenario
  const accountIds = Array.from(new Set(rules.map((r) => r.accountId)));
  const accounts = await prisma.account.findMany({ where: { id: { in: accountIds }, scenarioId } });
  if (accounts.length !== accountIds.length) return NextResponse.json({ error: "One or more accounts invalid" }, { status: 400 });

  // Replace-all strategy (simple and deterministic)
  await prisma.goalFundingRule.deleteMany({ where: { scenarioId, goalId } });

  await prisma.goalFundingRule.createMany({
    data: rules.map((r) => ({
      scenarioId,
      goalId,
      accountId: r.accountId,
      mode: r.mode,
      amountMonthly: r.amountMonthly ?? null,
      priorityOrder: r.priorityOrder,
      startDate: new Date(r.startDate),
      endDate: r.endDate ? new Date(r.endDate) : null,
      stopWhenFunded: r.stopWhenFunded,
    })),
  });

  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const scenarioId = searchParams.get("scenarioId") || "";
  const goalId = searchParams.get("goalId") || "";

  const scenario = await prisma.scenario.findUnique({ where: { id: scenarioId }, include: { household: true } });
  if (!scenario) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  if (scenario.household.ownerUserId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rules = await prisma.goalFundingRule.findMany({
    where: { scenarioId, goalId },
    orderBy: [{ priorityOrder: "asc" }, { createdAt: "asc" }],
  });

  const accounts = await prisma.account.findMany({
    where: { scenarioId },
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    accounts,
    rules: rules.map((r) => ({
      id: r.id,
      accountId: r.accountId,
      mode: r.mode,
      amountMonthly: r.amountMonthly ? Number(r.amountMonthly) : undefined,
      priorityOrder: r.priorityOrder,
      startDate: r.startDate.toISOString(),
      endDate: r.endDate?.toISOString(),
      stopWhenFunded: r.stopWhenFunded,
    })),
  });
}
```

---

# 7) UI: Goal Funding configuration page

Add route: **`apps/web/app/(app)/goals/[goalId]/funding/page.tsx`**

This is intentionally “simple-but-professional”; swap inputs with shadcn components as you like.

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { getActiveScenarioIdClient } from "@/components/layout/ScenarioSelector";

type Account = { id: string; name: string; type: string };
type Rule = {
  id?: string;
  accountId: string;
  mode: "SURPLUS_AUTO" | "FIXED_MONTHLY";
  amountMonthly?: number;
  priorityOrder: number;
  startDate: string;
  endDate?: string;
  stopWhenFunded: boolean;
};

export default function GoalFundingPage({ params }: { params: { goalId: string } }) {
  const goalId = params.goalId;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [busy, setBusy] = useState(false);

  const scenarioId = useMemo(() => getActiveScenarioIdClient() || "", []);

  async function load() {
    if (!scenarioId) return;
    setBusy(true);
    const res = await fetch(`/api/goals/funding-rules?scenarioId=${scenarioId}&goalId=${goalId}`);
    const j = await res.json();
    setAccounts(j.accounts || []);
    setRules(
      (j.rules || []).length
        ? j.rules
        : [
            {
              accountId: "",
              mode: "SURPLUS_AUTO",
              priorityOrder: 1,
              startDate: new Date().toISOString(),
              stopWhenFunded: true,
            },
          ]
    );
    setBusy(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalId]);

  function updateRule(i: number, patch: Partial<Rule>) {
    setRules((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function addRule() {
    const nextOrder = (rules[rules.length - 1]?.priorityOrder ?? 0) + 1;
    setRules((prev) => [
      ...prev,
      { accountId: "", mode: "SURPLUS_AUTO", priorityOrder: nextOrder, startDate: new Date().toISOString(), stopWhenFunded: true },
    ]);
  }

  function removeRule(i: number) {
    setRules((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    if (!scenarioId) return;
    setBusy(true);
    const res = await fetch("/api/goals/funding-rules", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenarioId, goalId, rules }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert("Save failed: " + JSON.stringify(j.error || {}, null, 2));
      return;
    }
    alert("Saved!");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-lg font-semibold">Goal Funding</div>
        <a className="text-sm text-zinc-300 underline" href="/goals">Back to Goals</a>
        <button onClick={save} disabled={busy} className="ml-auto rounded-xl bg-zinc-50 text-zinc-950 px-4 py-2 text-sm font-medium disabled:opacity-60">
          {busy ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-900 bg-zinc-950/50 p-4">
        <div className="text-sm text-zinc-300">
          Rules are applied <b>in order</b>. Fixed monthly uses available surplus (MVP: no deficit funding).
        </div>

        <div className="mt-4 space-y-3">
          {rules.map((r, i) => (
            <div key={i} className="rounded-2xl border border-zinc-900 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-sm font-medium">Rule #{r.priorityOrder}</div>
                <button className="ml-auto text-xs text-zinc-400 hover:text-zinc-200" onClick={() => removeRule(i)}>
                  Remove
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-zinc-400">Account</div>
                  <select
                    className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                    value={r.accountId}
                    onChange={(e) => updateRule(i, { accountId: e.target.value })}
                  >
                    <option value="">Select account…</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-xs text-zinc-400">Mode</div>
                  <select
                    className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                    value={r.mode}
                    onChange={(e) => updateRule(i, { mode: e.target.value as any })}
                  >
                    <option value="SURPLUS_AUTO">Surplus Auto</option>
                    <option value="FIXED_MONTHLY">Fixed Monthly</option>
                  </select>
                </div>

                <div>
                  <div className="text-xs text-zinc-400">Amount Monthly (required for Fixed)</div>
                  <input
                    className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                    type="number"
                    value={r.amountMonthly ?? ""}
                    onChange={(e) => updateRule(i, { amountMonthly: e.target.value === "" ? undefined : Number(e.target.value) })}
                    placeholder="e.g. 500"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-sm text-zinc-300 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={r.stopWhenFunded}
                      onChange={(e) => updateRule(i, { stopWhenFunded: e.target.checked })}
                    />
                    Stop when funded
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={addRule} className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm hover:bg-zinc-900">
          Add rule
        </button>
      </div>
    </div>
  );
}
```

Add a link from Goals list UI to this page (e.g., on each goal card):

```tsx
<a className="text-xs text-zinc-300 underline" href={`/goals/${goalId}/funding`}>Funding settings</a>
```

---

# 8) Engine output → UI: show “funded vs target” and explain allocations

Your existing `/goals` charts will work unchanged if you keep:

* `goalProgress[goalId].funded`
* `goalProgress[goalId].targetNominal`

Now the Explain drawer can show allocation details (already added to monthly row). When clicking a point on the net worth chart, you’ll see fields like:

* `goalFundingTotal`
* `goalFundingByGoal`
* `goalFundingByAccount`

Zero math in UI. Purely display.

---

# 9) Acceptance checks (make it bulletproof)

### Data integrity

* [ ] Can’t save a rule that references an account from another scenario
* [ ] FIXED_MONTHLY requires `amountMonthly > 0`
* [ ] priorityOrder persists correct ordering
* [ ] Replace-all strategy ensures no “orphan old rules”

### Engine correctness

* [ ] Goal funding increases linked account balances and affects net worth curve
* [ ] Funding stops automatically when funded >= target (if `stopWhenFunded = true`)
* [ ] SURPLUS_AUTO never drives negative cashflow in MVP

### UX

* [ ] Funding page loads accounts + existing rules
* [ ] Save triggers recompute and charts reflect new behavior

---

## Next deliverable after this (recommended)

**“Goal buckets as earmarked cash inside accounts” + “Goal overlap rules”**

* Show “available balance” vs “earmarked for goals” per account
* Handle multiple goals linking to the same account without confusion
* Add a chart: *Account balance* vs *Earmarked total*

If you want that next, I’ll generate: engine bookkeeping, new output series, and an Investments subpage “Earmarks”.
