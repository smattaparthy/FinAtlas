# FinAtlas Technical Priorities

## P0 — Security / Data Integrity (Fix Now)

### 1. Expense Route Authorization Bypass
- **File**: `app/api/expenses/route.ts`, `incomes/route.ts`, `accounts/route.ts`, `loans/route.ts`
- **Issue**: Routes verify user owns the scenario but don't verify the scenario belongs to the user's household via `memberId`. Any authenticated user who guesses a scenarioId can read/write another user's data.
- **Fix**: Add `memberId` ownership check through household membership validation on all CRUD routes.

### 2. JWT Has No Revocation
- **File**: `lib/auth/session.ts`
- **Issue**: JWTs are valid until expiry. No way to invalidate sessions (logout doesn't actually revoke the token, just clears the cookie).
- **Fix**: Add a token blacklist (Redis or DB table) checked in middleware, or switch to opaque session tokens stored server-side.

### 3. Plaintext Fallback in API Key Decryption
- **File**: `app/api/anthropic-key/route.ts`
- **Issue**: `safeDecrypt()` returns the raw string on decryption failure — meaning if encryption breaks, it silently serves plaintext API keys.
- **Fix**: Remove plaintext fallback. If decryption fails, return an error, don't expose the raw value.

### 4. In-Memory Rate Limiting
- **File**: `lib/rate-limit.ts`
- **Issue**: Uses a `Map()` in memory. Resets on every deploy/restart. Doesn't work across multiple serverless instances.
- **Fix**: Move to Redis-backed rate limiting or use Vercel's `@vercel/ratelimit`.

---

## P1 — Correctness / Data Quality (Fix Soon)

### 5. Hardcoded State and Filing Status
- **File**: `lib/engine/buildEngineInput.ts:91-92`
- **Issue**: `stateCode: "CA"` and `filingStatus: "MFJ"` are hardcoded. Every user gets California married-filing-jointly tax calculations.
- **Fix**: Add state and filing status fields to the Member or Scenario model. Populate from user input.

### 6. Hardcoded Projection Dates
- **File**: `lib/engine/buildEngineInput.ts:79-81`
- **Issue**: `startDate: today`, `endDate: today + 20 years` hardcoded. No user control over projection horizon.
- **Fix**: Make projection range configurable per scenario (default 20 years, allow 5-40).

### 7. Date.now() ID Collisions
- **File**: `lib/modifications/apply.ts:104`
- **Issue**: `id: \`temp-income-${Date.now()}\`` — two modifications applied in the same millisecond get the same ID.
- **Fix**: Use `crypto.randomUUID()` or a counter-based approach.

### 8. Fragile LLM Response Parsing
- **File**: `lib/ai/prompts.ts:112`
- **Issue**: Uses regex to parse modification JSON from Claude's response. Breaks on nested JSON, markdown code fences, or partial responses.
- **Fix**: Use Claude's tool_use feature to get structured output, or implement a more robust JSON extraction with fallback.

---

## P2 — Architecture / DRY (Fix When Touching)

### 9. Copy-Paste Auth Pattern (4 Variants)
- **Files**: Every API route repeats `getCurrentUser()` + null check + 401 response
- **Fix**: Create a `withAuth()` wrapper or middleware that handles auth and injects the user.

### 10. Three Duplicate Mortgage Calculators
- **Files**: `what-if.ts`, `amortization/page.tsx`, `engine/src/index.ts`
- **Fix**: Extract to a shared `@finatlas/shared` package or `lib/math/mortgage.ts`.

### 11. Three Duplicate Frequency Multiplier Maps
- **Files**: `expenses/page.tsx`, `incomes/page.tsx`, `lib/constants.ts`
- **Fix**: Use the canonical `FREQUENCY_MULTIPLIERS` from `lib/constants.ts` everywhere.

### 12. Raw fetch() Everywhere (No Caching, No Retry)
- **Files**: Every page component uses raw `fetch()` with manual loading/error state
- **Fix**: Introduce a `useFetch()` hook or adopt SWR/React Query for client-side data fetching with caching, deduplication, and retry.

### 13. 85+ Inline SVG Icons
- **Files**: `Sidebar.tsx`, `DashboardClient.tsx`, list pages
- **Fix**: Extract to an `icons/` directory or use an icon library (lucide-react).

---

## P3 — Performance / Polish (Nice to Have)

### 14. AI Prompt Token Waste
- **File**: `lib/ai/prompts.ts:30-36`
- **Issue**: `JSON.stringify(scenarioData, null, 2)` in the system prompt sends pretty-printed JSON to Claude, wasting ~30% tokens.
- **Fix**: Use `JSON.stringify(scenarioData)` (no pretty-print).

### 15. No Database Connection Pooling Config
- **File**: `lib/db/prisma.ts`
- **Issue**: Uses default Prisma client without explicit connection pool sizing.
- **Fix**: Configure `connection_limit` in DATABASE_URL or use Prisma Accelerate for serverless.

### 16. Missing Loading States on New Pages
- **Files**: Various new feature pages (visualizations, retirement-income, college-savings, insurance-calculator)
- **Issue**: Some new pages don't show skeleton loaders during data fetch.
- **Fix**: Add `PageSkeleton` or custom skeletons to all pages with async data.

### 17. No Error Boundaries on Chart Components
- **Files**: Chart components (ProjectionChart, CashFlowSankey, SpendingHeatmap, etc.)
- **Issue**: A chart rendering error crashes the entire page.
- **Fix**: Wrap chart components in ErrorBoundary (already exists at `components/ErrorBoundary.tsx`).
