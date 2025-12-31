Alright — here are the **next steps to implement Earmarks end-to-end** (engine → API → UI), in the exact order that avoids pain.

---

## Step 1 — Update engine types (compile-first)

1. Edit `packages/engine/src/types.ts`:

* Add `series.accountEarmarked` + `series.accountAvailable`
* Add `ResultIndexDTO` and `ProjectionResultDTO.index`
* Add `ProjectionResultDTO.earmarksEnd`

2. Run:

```bash
pnpm --filter @finatlas/engine typecheck
```

If this fails, fix types *before* touching logic.

---

## Step 2 — Update goal funding state to track earmarks per goal+account

1. Edit `packages/engine/src/internal/goals_linked.ts`:

* Change `GoalFundState` to include `fundedByGoalAccount`
* Update allocator to track `fundedAddedByGoalAccount`
* Update state so contributions accumulate into `fundedByGoalAccount[goalId][accountId]`

2. Run:

```bash
pnpm --filter @finatlas/engine typecheck
```

---

## Step 3 — Add earmark computation into projection

1. In `packages/engine/src/internal/projection.ts`:

* Initialize `series.accountEarmarked` and `series.accountAvailable`
* Add helper `computeEarmarkedByAccount(goalFundState)`
* In Pass B, after balances are updated for the month:

  * compute earmarked
  * push earmarked + available points per account
* After final month, compute `earmarksEnd` snapshot
* Add `index` map in result (accounts + goals)

2. Run:

```bash
pnpm --filter @finatlas/engine test
```

---

## Step 4 — Add earmarks invariant test (prevents subtle bugs)

1. Add `packages/engine/src/__tests__/earmarks.test.ts` (from the deliverable)
2. Run:

```bash
pnpm --filter @finatlas/engine test
```

This should catch “earmark > balance” regressions early.

---

## Step 5 — API: nothing new required (reuses `/api/engine/run`)

Because earmarks live inside `results` from `/api/engine/run`, you don’t need a new endpoint. Just confirm:

* `/api/engine/run` returns `results.index` and `results.earmarksEnd`
* Cache still works (hash + engine version)

Quick manual check:

```bash
curl -s -X POST http://localhost:3000/api/engine/run \
  -H 'content-type: application/json' \
  -d '{"scenarioId":"<yourScenarioId>","forceRecompute":true}' | jq '.results.earmarksEnd'
```

---

## Step 6 — UI: add Investments → Earmarks page

1. Add route file:

* `apps/web/app/(app)/investments/earmarks/page.tsx` (from deliverable)

2. Add sidebar link:

```tsx
<a className="block hover:text-white" href="/investments/earmarks">Earmarks</a>
```

3. Run:

```bash
pnpm --filter @finatlas/web typecheck
pnpm --filter @finatlas/web dev
```

---

## Step 7 — Manual validation checklist (5 minutes)

1. Login demo
2. Go **Goals → Funding settings**

   * Ensure at least one goal is linked to an account (SURPLUS_AUTO or FIXED_MONTHLY)
3. Go **Investments → Earmarks**

   * Verify each account shows 3 lines: Balance, Earmarked, Available
   * Verify end snapshot table shows earmarked-by-goal rows for linked accounts
4. Change a funding rule and save

   * Force recompute
   * Earmarks should move accordingly

---

## Step 8 — “No math in UI” audit (quick)

Make sure UI never calculates:

* earmarked
* available
* goal allocations
* goal targets

It should only display `results.series.*` and `results.earmarksEnd`.

---

# What I recommend as the *next* deliverable (after this is working)

**Implement “Goal spending at target date” (optional per goal)**
This makes plans feel realistic: tuition/down payment happens, balances drop, earmarks are released. It’s the first “story beat” users will trust.

When you’re ready, tell me whether goal spending should:

* pull from linked accounts only (in priority order), or
* allow fallback to any taxable account if linked accounts are short.
