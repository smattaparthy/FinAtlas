Here’s the **next deliverable**: a **thin vertical slice** that boots end-to-end in Docker and gives you a real “app spine”:

✅ Demo login → ✅ protected app shell → ✅ scenario selector → ✅ “Recompute” → ✅ `/api/engine/run` → ✅ cached results → ✅ Dashboard charts → ✅ click a point → ✅ Explain drawer shows monthly breakdown

This is deliberately **minimal but real**. You’ll expand each module after this spine is stable.

---

# A) What you will implement in this slice

### Slice outcomes

1. **Auth works locally** (JWT cookie; demo accounts from seed)
2. **Protected App Router layout** (redirect to `/login` if not authed)
3. **Scenario selection** in the top bar
4. **Engine run API** returns deterministic results (stubbed math, no taxes yet)
5. **Engine caching** uses `EngineResultCache`
6. **Dashboard** renders charts and a monthly breakdown table
7. **Explain drawer** opens on chart point click

---

# B) Dependencies (add once)

Run inside repo (host or container shell):

```bash
pnpm --filter @finatlas/web add jose argon2 zod
pnpm --filter @finatlas/web add @ant-design/charts
pnpm --filter @finatlas/web add clsx tailwind-merge
```

If you don’t already have shadcn installed in `apps/web`, you’ll need it later. For this slice, you can use simple components or add shadcn Sheet/Button/Card.

---

# C) Files to add (copy/paste)

## C1) Prisma client singleton

**`apps/web/lib/db/prisma.ts`**

```ts
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

---

## C2) JWT session helpers

**`apps/web/lib/auth/jwt.ts`**

```ts
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
    if (!id || typeof email !== "string" || (role !== "ADMIN" && role !== "USER")) return null;
    return { id, email, role };
  } catch {
    return null;
  }
}
```

**`apps/web/lib/auth/session.ts`**

```ts
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

---

## C3) Password verify + login logic

**`apps/web/lib/auth/password.ts`**

```ts
import * as argon2 from "argon2";

export async function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password);
}
```

---

## C4) Auth API routes

### `POST /api/auth/login`

**`apps/web/app/api/auth/login/route.ts`**

```ts
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
    secure: false, // local only
    path: "/",
  });
  return res;
}
```

### `POST /api/auth/logout`

**`apps/web/app/api/auth/logout/route.ts`**

```ts
import { NextResponse } from "next/server";
import { sessionCookieName } from "@/lib/auth/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookieName(), "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
```

### `GET /api/auth/me`

**`apps/web/app/api/auth/me/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 200 });
  return NextResponse.json({ user }, { status: 200 });
}
```

---

## C5) Middleware to protect app routes

**`apps/web/middleware.ts`**

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = process.env.AUTH_COOKIE_NAME || "finatlas_session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) return NextResponse.next();

  // Protect everything else under app
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

---

## C6) Login page (client)

**`apps/web/app/(auth)/login/page.tsx`**

```tsx
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
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400">Password</label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error ? <div className="text-sm text-red-400">{error}</div> : null}

          <button
            disabled={busy}
            className="w-full rounded-xl bg-zinc-50 text-zinc-950 py-2 font-medium disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
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

---

# D) Minimal scenario list API + selection UI

## D1) Scenarios API

**`apps/web/app/api/scenarios/route.ts`**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const household = await prisma.household.findFirst({
    where: { ownerUserId: user.id },
    select: { id: true },
  });

  if (!household) return NextResponse.json({ scenarios: [] });

  const scenarios = await prisma.scenario.findMany({
    where: { householdId: household.id },
    orderBy: [{ isBaseline: "desc" }, { createdAt: "asc" }],
    select: { id: true, name: true, isBaseline: true },
  });

  return NextResponse.json({ householdId: household.id, scenarios });
}
```

## D2) Scenario selector component

**`apps/web/components/layout/ScenarioSelector.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";

type Scn = { id: string; name: string; isBaseline: boolean };

const LS_KEY = "finatlas.activeScenarioId";

export function ScenarioSelector(props: { onChange?: (scenarioId: string) => void }) {
  const [scenarios, setScenarios] = useState<Scn[]>([]);
  const [scenarioId, setScenarioId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/scenarios");
      const j = await res.json();
      const scns: Scn[] = j.scenarios || [];
      setScenarios(scns);

      const saved = localStorage.getItem(LS_KEY);
      const baseline = scns.find((s) => s.isBaseline)?.id;
      const next = (saved && scns.some((s) => s.id === saved) ? saved : baseline) || scns[0]?.id || "";
      setScenarioId(next);
      if (next) props.onChange?.(next);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSelect(id: string) {
    setScenarioId(id);
    localStorage.setItem(LS_KEY, id);
    props.onChange?.(id);
  }

  return (
    <select
      className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
      value={scenarioId}
      onChange={(e) => onSelect(e.target.value)}
    >
      {scenarios.map((s) => (
        <option key={s.id} value={s.id}>
          {s.isBaseline ? "Baseline — " : ""}
          {s.name}
        </option>
      ))}
    </select>
  );
}

export function getActiveScenarioIdClient(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LS_KEY);
}
```

---

# E) Engine “stub” (deterministic) + Engine Run API + caching

You’ll wire a full engine later. For the spine, we do:

* take scenario data from DB
* compute very simple monthly projection:

  * income – expenses – loan payment estimate
  * contributions
  * grow account balances at expectedReturnPct monthly
* produce chart series + breakdown rows

## E1) Engine stub in web layer (for now)

**`apps/web/lib/engine/stub.ts`**

```ts
import { ENGINE_VERSION } from "@finatlas/engine";
import type { ProjectionResultDTO, SeriesPoint } from "@finatlas/engine";

function ym(d: Date) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}-01T00:00:00.000Z`;
}

function monthAdd(date: Date, n: number) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + n, 1));
  return d;
}

function monthlyRateFromAnnualPct(pct: number) {
  const r = pct / 100;
  return Math.pow(1 + r, 1 / 12) - 1;
}

export type StubInput = {
  scenarioId: string;
  startDate: Date;
  endDate: Date;
  incomesMonthly: number;
  expensesMonthly: number;
  loanPaymentMonthly: number;
  accounts: { id: string; expectedReturnPct: number; startValue: number; contribMonthly: number }[];
};

export function runStubProjection(input: StubInput): ProjectionResultDTO {
  const months: Date[] = [];
  for (let d = new Date(input.startDate); d < input.endDate; d = monthAdd(d, 1)) months.push(d);

  const accountBalances: Record<string, number> = {};
  input.accounts.forEach((a) => (accountBalances[a.id] = a.startValue));

  const series: {
    netWorth: SeriesPoint[];
    incomeTotal: SeriesPoint[];
    expenseTotal: SeriesPoint[];
    taxesTotal: SeriesPoint[];
    cashflowNet: SeriesPoint[];
    assetsTotal: SeriesPoint[];
    liabilitiesTotal: SeriesPoint[];
    accountBalances: Record<string, SeriesPoint[]>;
    goalProgress: Record<string, any>;
  } = {
    netWorth: [],
    incomeTotal: [],
    expenseTotal: [],
    taxesTotal: [],
    cashflowNet: [],
    assetsTotal: [],
    liabilitiesTotal: [],
    accountBalances: Object.fromEntries(input.accounts.map((a) => [a.id, []])),
    goalProgress: {},
  };

  const monthlyRows: any[] = [];

  for (const d of months) {
    const t = ym(d);

    // extremely simple: totals constant; taxes = 0 in stub
    const income = input.incomesMonthly;
    const expenses = input.expensesMonthly;
    const loanPayments = input.loanPaymentMonthly;
    const taxes = 0;

    // contributions: sum account contrib
    const contributions = input.accounts.reduce((sum, a) => sum + a.contribMonthly, 0);

    // net cashflow after everything (including contributions)
    const netCashflow = income - expenses - loanPayments - taxes - contributions;

    // apply contributions + returns
    let investmentReturns = 0;
    for (const a of input.accounts) {
      const r = monthlyRateFromAnnualPct(a.expectedReturnPct);
      accountBalances[a.id] += a.contribMonthly;
      const before = accountBalances[a.id];
      accountBalances[a.id] = before * (1 + r);
      investmentReturns += accountBalances[a.id] - before;
      series.accountBalances[a.id].push({ t, v: accountBalances[a.id] });
    }

    const assetsEnd = Object.values(accountBalances).reduce((s, v) => s + v, 0);
    const liabilitiesEnd = 0; // stub
    const netWorth = assetsEnd - liabilitiesEnd;

    series.incomeTotal.push({ t, v: income });
    series.expenseTotal.push({ t, v: expenses + loanPayments });
    series.taxesTotal.push({ t, v: taxes });
    series.cashflowNet.push({ t, v: netCashflow });
    series.assetsTotal.push({ t, v: assetsEnd });
    series.liabilitiesTotal.push({ t, v: liabilitiesEnd });
    series.netWorth.push({ t, v: netWorth });

    monthlyRows.push({
      t,
      income,
      expenses: expenses + loanPayments,
      taxes,
      loanPayments,
      contributions,
      investmentReturns,
      netCashflow,
      assetsEnd,
      liabilitiesEnd,
    });
  }

  // Annual summary from monthly
  const annualMap = new Map<number, any>();
  for (const row of monthlyRows) {
    const y = new Date(row.t).getUTCFullYear();
    const agg = annualMap.get(y) || { year: y, income: 0, expenses: 0, taxes: 0, netSavings: 0, endNetWorth: 0 };
    agg.income += row.income;
    agg.expenses += row.expenses;
    agg.taxes += row.taxes;
    agg.netSavings += row.netCashflow;
    agg.endNetWorth = row.assetsEnd - row.liabilitiesEnd;
    annualMap.set(y, agg);
  }

  return {
    engineVersion: ENGINE_VERSION,
    inputHash: "stub", // replaced by API with real hash
    series: {
      netWorth: series.netWorth,
      assetsTotal: series.assetsTotal,
      liabilitiesTotal: series.liabilitiesTotal,
      incomeTotal: series.incomeTotal,
      expenseTotal: series.expenseTotal,
      taxesTotal: series.taxesTotal,
      cashflowNet: series.cashflowNet,
      accountBalances: series.accountBalances,
      goalProgress: {},
    },
    monthly: monthlyRows,
    annual: Array.from(annualMap.values()).sort((a, b) => a.year - b.year),
    taxAnnual: [],
    warnings: [],
  };
}
```

## E2) Input hash helper (stable JSON hash)

**`apps/web/lib/engine/hash.ts`**

```ts
import crypto from "crypto";

export function sha256(obj: unknown) {
  const json = JSON.stringify(obj, Object.keys(obj as any).sort());
  return crypto.createHash("sha256").update(json).digest("hex");
}
```

## E3) Build stub input from DB

**`apps/web/lib/engine/buildInput.ts`**

```ts
import { prisma } from "@/lib/db/prisma";

export async function buildStubInput(scenarioId: string) {
  const scenario = await prisma.scenario.findUnique({
    where: { id: scenarioId },
    include: {
      household: true,
      incomes: true,
      expenses: true,
      loans: true,
      accounts: { include: { holdings: true, contributions: true } },
      contributions: true,
    },
  });
  if (!scenario) throw new Error("Scenario not found");

  const startDate = scenario.household.startDate;
  const endDate = scenario.household.endDate;

  // Normalize to simple monthly totals (seed uses monthly already)
  const incomesMonthly = scenario.incomes.reduce((s, i) => s + i.amount, 0);
  const expensesMonthly = scenario.expenses.reduce((s, e) => s + e.amount, 0);

  // Loan payment estimate: if override present, use it; otherwise naive amort estimate
  const loanPaymentMonthly = scenario.loans.reduce((sum, l) => {
    if (l.paymentOverrideMonthly) return sum + l.paymentOverrideMonthly;
    const r = (l.aprPct / 100) / 12;
    const n = l.termMonths;
    if (r === 0) return sum + l.principal / n;
    const pmt = (l.principal * r) / (1 - Math.pow(1 + r, -n));
    return sum + pmt + (l.extraPaymentMonthly ?? 0);
  }, 0);

  const accounts = scenario.accounts.map((a) => {
    const startValue = a.holdings.reduce((s, h) => {
      const price = h.lastPrice ?? h.avgPrice;
      return s + h.shares * price;
    }, 0);

    const contribMonthly = a.contributions.reduce((s, c) => s + c.amountMonthly, 0);

    return {
      id: a.id,
      expectedReturnPct: a.expectedReturnPct,
      startValue,
      contribMonthly,
    };
  });

  return { scenarioId, startDate, endDate, incomesMonthly, expensesMonthly, loanPaymentMonthly, accounts };
}
```

## E4) Engine run API (cache + force recompute)

**`apps/web/app/api/engine/run/route.ts`**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { buildStubInput } from "@/lib/engine/buildInput";
import { runStubProjection } from "@/lib/engine/stub";
import { sha256 } from "@/lib/engine/hash";
import { ENGINE_VERSION } from "@finatlas/engine";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const scenarioId = body?.scenarioId?.toString();
  const forceRecompute = Boolean(body?.forceRecompute);

  if (!scenarioId) return NextResponse.json({ error: "Missing scenarioId" }, { status: 400 });

  // Ensure scenario belongs to user's household
  const scenario = await prisma.scenario.findUnique({
    where: { id: scenarioId },
    include: { household: true },
  });
  if (!scenario) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  if (scenario.household.ownerUserId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const stubInput = await buildStubInput(scenarioId);

  const inputHash = sha256({
    engineVersion: ENGINE_VERSION,
    scenarioId,
    // key determinants for stub:
    startDate: stubInput.startDate.toISOString(),
    endDate: stubInput.endDate.toISOString(),
    incomesMonthly: stubInput.incomesMonthly,
    expensesMonthly: stubInput.expensesMonthly,
    loanPaymentMonthly: stubInput.loanPaymentMonthly,
    accounts: stubInput.accounts,
  });

  if (!forceRecompute) {
    const cached = await prisma.engineResultCache.findUnique({ where: { scenarioId } });
    if (cached && cached.engineVersion === ENGINE_VERSION && cached.inputHash === inputHash) {
      return NextResponse.json({
        scenarioId,
        engineVersion: cached.engineVersion,
        inputHash: cached.inputHash,
        results: cached.resultsJson,
        cached: true,
      });
    }
  }

  const results = runStubProjection(stubInput);
  results.inputHash = inputHash;

  await prisma.engineResultCache.upsert({
    where: { scenarioId },
    update: { engineVersion: ENGINE_VERSION, inputHash, resultsJson: results },
    create: { scenarioId, engineVersion: ENGINE_VERSION, inputHash, resultsJson: results },
  });

  return NextResponse.json({ scenarioId, engineVersion: ENGINE_VERSION, inputHash, results, cached: false });
}
```

---

# F) App shell + Dashboard + Explain drawer

## F1) App layout (protected by middleware already)

**`apps/web/app/(app)/layout.tsx`**

```tsx
import "@/styles/globals.css";
import { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
```

## F2) App shell component

**`apps/web/components/layout/AppShell.tsx`**

```tsx
"use client";

import { ReactNode, useState } from "react";
import { ScenarioSelector } from "./ScenarioSelector";
import { ExplainDrawer } from "../layout/ExplainDrawer";

export function AppShell({ children }: { children: ReactNode }) {
  const [scenarioId, setScenarioId] = useState<string>("");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="flex">
        <aside className="hidden md:flex w-64 flex-col border-r border-zinc-900 p-4">
          <div className="text-lg font-semibold">FinAtlas</div>
          <nav className="mt-6 space-y-2 text-sm text-zinc-300">
            <a className="block hover:text-white" href="/">Dashboard</a>
            <a className="block hover:text-white" href="/charts">Charts</a>
            <a className="block hover:text-white" href="/incomes">Incomes</a>
            <a className="block hover:text-white" href="/expenses">Expenses</a>
            <a className="block hover:text-white" href="/investments">Investments</a>
            <a className="block hover:text-white" href="/liabilities">Liabilities</a>
            <a className="block hover:text-white" href="/taxes">Taxes</a>
            <a className="block hover:text-white" href="/goals">Goals</a>
            <a className="block hover:text-white" href="/scenarios">Scenarios</a>
            <a className="block hover:text-white" href="/investments/holdings/import">Import</a>
            <a className="block hover:text-white" href="/settings">Settings</a>
          </nav>
        </aside>

        <main className="flex-1 min-w-0">
          <header className="sticky top-0 z-30 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="font-medium">Dashboard</div>
              <div className="ml-auto flex items-center gap-3">
                <ScenarioSelector onChange={setScenarioId} />
                <LogoutButton />
              </div>
            </div>
          </header>

          <div className="p-4 md:p-6">{children}</div>
        </main>

        <ExplainDrawer />
      </div>
    </div>
  );
}

function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }
  return (
    <button
      onClick={logout}
      className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm hover:bg-zinc-900"
    >
      Logout
    </button>
  );
}
```

## F3) Explain drawer (minimal global drawer)

We’ll keep this super simple: global state via `window` event (fastest spine). Later, replace with Context/Zustand.

**`apps/web/components/layout/ExplainDrawer.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";

type ExplainPayload = {
  title: string;
  body: Record<string, any>;
};

export function ExplainDrawer() {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<ExplainPayload | null>(null);

  useEffect(() => {
    function handler(e: any) {
      setPayload(e.detail);
      setOpen(true);
    }
    window.addEventListener("finatlas:explain", handler as any);
    return () => window.removeEventListener("finatlas:explain", handler as any);
  }, []);

  return (
    <div
      className={`hidden lg:block w-[360px] border-l border-zinc-900 bg-zinc-950/60 ${
        open ? "" : "opacity-60"
      }`}
    >
      <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
        <div className="text-sm font-medium">Explain</div>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-zinc-400 hover:text-zinc-200"
        >
          Close
        </button>
      </div>

      <div className="p-4">
        {!payload ? (
          <div className="text-sm text-zinc-400">
            Click a chart point to inspect the month.
          </div>
        ) : (
          <>
            <div className="text-sm font-semibold">{payload.title}</div>
            <pre className="mt-3 text-xs text-zinc-300 whitespace-pre-wrap">
              {JSON.stringify(payload.body, null, 2)}
            </pre>
          </>
        )}
      </div>
    </div>
  );
}
```

---

# G) Dashboard page (charts + recompute)

## G1) Chart card component

**`apps/web/components/charts/ChartCard.tsx`**

```tsx
"use client";

import { ReactNode } from "react";

export function ChartCard(props: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-900 bg-zinc-950/50 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium">{props.title}</div>
        {props.right}
      </div>
      <div className="mt-3">{props.children}</div>
    </div>
  );
}
```

## G2) Dashboard page

**`apps/web/app/(app)/page.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Line } from "@ant-design/charts";
import { ChartCard } from "@/components/charts/ChartCard";
import { getActiveScenarioIdClient } from "@/components/layout/ScenarioSelector";

type EngineResponse = {
  scenarioId: string;
  engineVersion: string;
  inputHash: string;
  cached: boolean;
  results: any;
};

export default function DashboardPage() {
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [data, setData] = useState<EngineResponse | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const id = getActiveScenarioIdClient();
    setScenarioId(id);
  }, []);

  async function recompute(forceRecompute = false) {
    const id = getActiveScenarioIdClient();
    if (!id) return;
    setBusy(true);

    const res = await fetch("/api/engine/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenarioId: id, forceRecompute }),
    });

    const j = await res.json();
    setData(j);
    setBusy(false);
  }

  useEffect(() => {
    if (scenarioId) recompute(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId]);

  const netWorthSeries = useMemo(() => {
    const s = data?.results?.series?.netWorth ?? [];
    return s.map((p: any) => ({ date: p.t.slice(0, 10), value: p.v }));
  }, [data]);

  const cashflowSeries = useMemo(() => {
    const s = data?.results?.series?.cashflowNet ?? [];
    return s.map((p: any) => ({ date: p.t.slice(0, 10), value: p.v }));
  }, [data]);

  const monthly = useMemo(() => data?.results?.monthly?.slice(0, 24) ?? [], [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => recompute(true)}
          disabled={busy}
          className="rounded-xl bg-zinc-50 text-zinc-950 px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {busy ? "Recomputing…" : "Recompute"}
        </button>
        <div className="text-xs text-zinc-400">
          {data ? (
            <>
              Engine <span className="text-zinc-200">{data.engineVersion}</span> •{" "}
              {data.cached ? "cached" : "fresh"} • hash{" "}
              <span className="text-zinc-200">{data.inputHash.slice(0, 10)}…</span>
            </>
          ) : (
            "—"
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Net Worth (stub)">
          <Line
            data={netWorthSeries}
            xField="date"
            yField="value"
            smooth
            autoFit
            height={280}
            interactions={[{ type: "brush-x" }]}
            tooltip={{
              customContent: (title, items) => {
                const v = items?.[0]?.value;
                return `<div style="padding:8px">
                  <div><b>${title}</b></div>
                  <div>Net worth: ${Number(v).toLocaleString()}</div>
                </div>`;
              },
            }}
            onReady={(plot) => {
              plot.on("element:click", (evt: any) => {
                const datum = evt?.data?.data;
                if (!datum) return;

                const monthRow = data?.results?.monthly?.find((r: any) => r.t.slice(0, 10) === datum.date);
                window.dispatchEvent(
                  new CustomEvent("finatlas:explain", {
                    detail: {
                      title: `Month ${datum.date}`,
                      body: monthRow ?? { date: datum.date, value: datum.value },
                    },
                  }),
                );
              });
            }}
          />
        </ChartCard>

        <ChartCard title="Net Cashflow (stub)">
          <Line
            data={cashflowSeries}
            xField="date"
            yField="value"
            smooth
            autoFit
            height={280}
            interactions={[{ type: "brush-x" }]}
          />
        </ChartCard>
      </div>

      <ChartCard title="Monthly breakdown (first 24 months)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-zinc-400">
              <tr className="border-b border-zinc-900">
                <th className="py-2 text-left">Month</th>
                <th className="py-2 text-right">Income</th>
                <th className="py-2 text-right">Expenses</th>
                <th className="py-2 text-right">Contrib</th>
                <th className="py-2 text-right">Returns</th>
                <th className="py-2 text-right">Net CF</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((r: any) => (
                <tr key={r.t} className="border-b border-zinc-900/60">
                  <td className="py-2">{r.t.slice(0, 10)}</td>
                  <td className="py-2 text-right">{fmt(r.income)}</td>
                  <td className="py-2 text-right">{fmt(r.expenses)}</td>
                  <td className="py-2 text-right">{fmt(r.contributions)}</td>
                  <td className="py-2 text-right">{fmt(r.investmentReturns)}</td>
                  <td className="py-2 text-right">{fmt(r.netCashflow)}</td>
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

---

# H) Minimal styles

Add a basic global style:

**`apps/web/styles/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body {
  height: 100%;
}
```

---

# I) Quick run instructions (Docker)

1. Make sure `.env` exists:

```bash
cp .env.example .env
# set AUTH_JWT_SECRET to a long random value
```

2. Start:

```bash
docker compose up --build
```

3. Open:

* `http://localhost:3000/login`
* login with `demo@local / Demo1234!`

---

# J) What this unlocks next (the immediate follow-on deliverable)

Once this spine is running, the next “deliverable” should be **replacing the stub engine with the real engine adapter**, in this order:

1. `buildScenarioInputDTO()` (DB → `ScenarioInputDTO` in `@finatlas/engine`)
2. Real `computeInputHash()` + stable normalization
3. Engine implementation phases:

   * inflation index
   * contributions + returns
   * loan amortization
   * federal+state+payroll taxes + ST/LT netting + carryforward
4. Explain drawer becomes structured tabs instead of JSON dump

