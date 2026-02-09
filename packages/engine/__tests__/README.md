# FinAtlas Engine Test Suite

Comprehensive test coverage for the financial projection engine core.

## Test Structure

```
__tests__/
├── contract.test.ts           # Main engine API tests (27 tests)
└── internal/
    ├── dates.test.ts          # Date utilities (22 tests)
    ├── growth.test.ts         # Growth & inflation (17 tests)
    ├── loans.test.ts          # Loan amortization (18 tests)
    ├── math.test.ts           # Financial math (28 tests)
    ├── montecarlo.test.ts     # Monte Carlo simulation (12 tests)
    ├── schedules.test.ts      # Frequency normalization (24 tests)
    └── taxes.test.ts          # Tax calculations (25 tests)
```

## Coverage

**Total: 173 tests across 8 test files**

### Core Engine (`contract.test.ts`)
- Output structure validation
- Engine version and input hashing
- Series generation and length verification
- Financial invariants (net worth = assets - liabilities)
- Monthly/annual aggregations
- Multi-year projections
- Growth rules (TRACK_INFLATION, CUSTOM_PERCENT)
- Account balance tracking
- Loan payment processing
- Investment returns
- Tax calculations
- Contribution processing
- Goal tracking and warnings

### Financial Math (`math.test.ts`)
- Rounding with decimal precision
- Array summation
- Compound growth calculations
- Present/future value
- Loan payment calculations (PMT formula)
- Rate conversions (annual ↔ monthly)
- Value clamping
- Percentage change calculations

### Date Handling (`dates.test.ts`)
- ISO date parsing and formatting
- Month arithmetic (addMonths)
- Month difference calculations
- Start of month normalization
- Date comparisons (isBefore, isAfter)
- Same month detection
- Month key generation (YYYY-MM)
- Edge cases: leap years, month-end overflow

### Growth & Inflation (`growth.test.ts`)
- Inflation index building
- NONE growth rule (no change)
- TRACK_INFLATION (follows inflation index)
- CUSTOM_PERCENT (custom annual rate)
- Negative growth rates
- Real ↔ nominal conversions
- Edge cases: 0% inflation, missing index dates

### Loan Amortization (`loans.test.ts`)
- Monthly payment calculation
- Full amortization schedule generation
- Principal + interest = total payments
- Extra payments reduce interest
- 0% interest loans
- Payment overrides
- Loans starting before projection
- Balance lookups by date
- Financial invariants: monotonic balance decrease

### Tax Calculations (`taxes.test.ts`)
- 2024 standard deductions
- Federal progressive brackets
- FICA (Social Security + Medicare)
- Social Security wage cap
- Additional Medicare tax above thresholds
- State tax rates (no-tax, flat, progressive)
- Filing status differences (SINGLE, MFJ, HOH)
- Annual/monthly tax calculations
- Marginal rate determination
- Tax savings from pre-tax contributions

### Schedule Normalization (`schedules.test.ts`)
- Frequency normalization to monthly:
  - MONTHLY: same amount
  - BIWEEKLY: ×26/12
  - WEEKLY: ×52/12
  - ANNUAL: ÷12
  - ONE_TIME: special handling
- Round-trip conversions
- Schedule generation for date ranges
- Date period membership checks
- Month range generation

### Monte Carlo Simulation (`montecarlo.test.ts`)
- Expected simulation count
- Percentile band generation (p10, p25, p50, p75, p90)
- Percentile ordering invariants
- Success rate calculations (0-100%)
- Median between p10 and p90
- Volatility impact on band spread
- Deterministic results with same seed
- Different results with different seeds
- Simulation count clamping (50-2000)
- Volatility clamping (1-50%)
- Goal success rate tracking

## Running Tests

```bash
# Run all tests
pnpm --filter @finatlas/engine test

# Run in watch mode
pnpm --filter @finatlas/engine test:watch

# Run with coverage
pnpm --filter @finatlas/engine test -- --coverage
```

## Test Principles

1. **Financial Invariants**: Tests verify fundamental accounting principles (net worth = assets - liabilities)
2. **Edge Cases**: Comprehensive coverage of boundary conditions (0%, negative rates, leap years)
3. **Realistic Scenarios**: Tests use real-world financial values and assumptions
4. **Determinism**: All calculations are deterministic and reproducible
5. **Precision**: Financial calculations use proper rounding and decimal handling

## Key Test Patterns

### Financial Invariant Testing
```typescript
// Net worth must equal assets minus liabilities
for (const point of result.series.netWorth) {
  const assets = getAssets(point.t);
  const liabilities = getLiabilities(point.t);
  expect(point.v).toBeCloseTo(assets - liabilities, 1);
}
```

### Amortization Testing
```typescript
// Total payments = principal + interest
const totalPayments = getTotalPaymentsMade(schedule);
const totalInterest = getTotalInterestPaid(schedule);
const totalPrincipal = schedule.reduce((sum, row) => sum + row.principal, 0);
expect(totalPayments).toBeCloseTo(totalPrincipal + totalInterest, 2);
```

### Monte Carlo Testing
```typescript
// Percentile ordering must be maintained
expect(band.p10).toBeLessThanOrEqual(band.p25);
expect(band.p25).toBeLessThanOrEqual(band.p50);
expect(band.p50).toBeLessThanOrEqual(band.p75);
expect(band.p75).toBeLessThanOrEqual(band.p90);
```

## Next Steps

- Add integration tests with real API calls
- Add performance benchmarks
- Add property-based testing (fast-check)
- Add snapshot tests for complex outputs
- Measure and improve test coverage percentage
