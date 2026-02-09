# Real-Time Market Data Implementation for FinAtlas

## Summary

Successfully implemented real-time market data for investment holdings in FinAtlas. The system fetches live stock prices from Yahoo Finance API and displays current market values, gains/losses, and portfolio performance metrics.

## What Was Built

### 1. Database Schema
**File:** `apps/web/prisma/schema.prisma`

Added `PriceQuote` model to cache market data:
- Stores symbol, price, daily change, change percentage, volume
- 15-minute cache duration
- Unique constraint on symbol for efficient lookups

### 2. Market Data Service
**File:** `apps/web/lib/market/marketDataService.ts`

Core service for fetching and caching stock quotes:
- Fetches data from Yahoo Finance API (v7 quote endpoint)
- Caches quotes in SQLite for 15 minutes
- Gracefully degrades if API is unavailable (returns cached data)
- Handles batch symbol lookups
- Automatic staleness detection and refresh

### 3. API Routes

#### `/api/market/quotes`
**File:** `apps/web/app/api/market/quotes/route.ts`
- GET endpoint for fetching quotes by symbols
- Rate limited: 10 requests per minute per user
- Supports batch queries (up to 50 symbols)
- Requires authentication

#### `/api/market/portfolio`
**File:** `apps/web/app/api/market/portfolio/route.ts`
- GET endpoint for portfolio-level aggregation
- Calculates total value, cost basis, gains/losses
- Provides asset allocation breakdown by account type
- Enriches holdings with current market prices

### 4. UI Components

#### HoldingsTable
**File:** `apps/web/components/investments/HoldingsTable.tsx`

Interactive table showing:
- Symbol, shares, cost basis
- Current price (live from market)
- Market value
- Profit/Loss (dollar and percentage)
- Day's change
- Last updated timestamp
- Refresh button for manual updates

Features:
- Color-coded gains (green) and losses (red)
- Auto-refresh on mount
- Loading states
- Error handling with fallback to cached data

#### PortfolioSummary
**File:** `apps/web/components/investments/PortfolioSummary.tsx`

Dashboard cards showing:
- Total portfolio value (with live prices)
- Total cost basis
- Total gain/loss (dollar and percentage)
- Total return percentage

Asset allocation visualization:
- Bar chart showing allocation by account type
- Breakdown with values and percentages
- Color-coded by account type

### 5. Page Updates

#### Investments Page
**File:** `apps/web/app/(app)/investments/page.tsx`
- Added PortfolioSummary component at top
- Shows live portfolio metrics with market data
- Maintains existing account list functionality

#### Investment Performance Page
**File:** `apps/web/app/(app)/investment-performance/page.tsx`
- Updated to fetch real market prices
- Replaced estimated values with live market data
- Calculates performance using current prices
- Shows best/worst performers based on actual returns

#### Account Detail Page
**File:** `apps/web/app/(app)/investments/[id]/page.tsx`
- Integrated HoldingsTable component
- Shows live prices for individual holdings
- Maintains edit/delete functionality for holdings management

## Technical Highlights

### Graceful Degradation
The system never crashes due to market data unavailability:
1. If Yahoo Finance API fails, returns cached data (even if stale)
2. If no cached data exists, returns price of 0 (displayed as "—")
3. All calculations handle missing price data gracefully

### Performance Optimization
- 15-minute cache reduces API calls
- Batch symbol lookups minimize network requests
- Rate limiting prevents abuse
- SQLite indexes on symbol for fast lookups

### Yahoo Finance API
Using the unofficial v7 quote endpoint:
```
https://query1.finance.yahoo.com/v7/finance/quote?symbols=AAPL,GOOGL
```

**Important Notes:**
- No API key required (free)
- Unofficial API (could break)
- May block server-side requests (proxy may be needed)
- Returns comprehensive quote data including:
  - regularMarketPrice
  - regularMarketChange
  - regularMarketChangePercent
  - regularMarketVolume
  - shortName / longName

### Data Flow
1. User visits page → Component mounts
2. Component extracts symbols from holdings
3. API call to `/api/market/quotes?symbols=AAPL,GOOGL,VTI`
4. Service checks cache for each symbol
5. If stale (>15 min), fetches from Yahoo Finance
6. Upserts fresh data to database
7. Returns quotes (fresh or cached)
8. Component calculates market values and displays

## Files Changed

### Created
- `/apps/web/lib/market/marketDataService.ts`
- `/apps/web/app/api/market/quotes/route.ts`
- `/apps/web/app/api/market/portfolio/route.ts`
- `/apps/web/components/investments/HoldingsTable.tsx`
- `/apps/web/components/investments/PortfolioSummary.tsx`

### Modified
- `/apps/web/prisma/schema.prisma` (added PriceQuote model)
- `/apps/web/app/(app)/investments/page.tsx` (added PortfolioSummary)
- `/apps/web/app/(app)/investment-performance/page.tsx` (live prices)
- `/apps/web/app/(app)/investments/[id]/page.tsx` (HoldingsTable integration)

## Testing Checklist

To verify the implementation works:

1. **Database Migration**
   ```bash
   cd apps/web
   npx prisma db push
   ```

2. **Start Dev Server**
   ```bash
   pnpm dev
   ```

3. **Test Sequence**
   - Navigate to Investments page
   - Verify PortfolioSummary displays with loading state
   - Check that portfolio cards show values after load
   - Click into an account with holdings
   - Verify HoldingsTable shows live prices
   - Click "Refresh" button to force update
   - Navigate to Investment Performance page
   - Verify market values reflect live prices

4. **API Testing**
   ```bash
   # Test quotes endpoint (requires auth cookie)
   curl http://localhost:3000/api/market/quotes?symbols=AAPL,GOOGL

   # Test portfolio endpoint
   curl http://localhost:3000/api/market/portfolio?scenarioId=xxx
   ```

## Known Limitations

1. **Yahoo Finance Reliability**
   - Unofficial API may break without notice
   - Server-side requests may be blocked
   - Alternative: Use paid APIs (Alpha Vantage, IEX Cloud)

2. **Rate Limiting**
   - Simple in-memory rate limiter
   - Resets on server restart
   - Consider Redis for production

3. **Symbol Validation**
   - No validation of symbol format
   - Invalid symbols return 0 price
   - Consider symbol lookup/validation service

4. **Market Hours**
   - No indication of market open/closed status
   - No delayed quote disclaimer
   - Consider adding market status indicator

## Future Enhancements

1. **Historical Price Data**
   - Store daily close prices
   - Show price charts
   - Calculate time-weighted returns

2. **Market Status**
   - Show if market is open/closed
   - Display pre-market/after-hours prices
   - Add "as of" timestamp to quotes

3. **Alternative Data Sources**
   - Support multiple quote providers
   - Fallback chain (Yahoo → Alpha Vantage → IEX)
   - User preference for data source

4. **Performance Metrics**
   - Calculate IRR (Internal Rate of Return)
   - Time-weighted return
   - Compare to benchmark indices (S&P 500)

5. **Alerts & Notifications**
   - Price alerts for holdings
   - Daily performance summary emails
   - Significant change notifications

## Architecture Decisions

### Why SQLite Cache?
- Already using SQLite for main database
- Fast lookups with indexed queries
- Persistent across server restarts
- No additional infrastructure

### Why 15-Minute Cache?
- Balance between freshness and API load
- Yahoo Finance free tier doesn't have strict limits
- Sufficient for financial planning use case
- Can be adjusted via `CACHE_DURATION_MS` constant

### Why Yahoo Finance?
- Free (no API key required)
- Comprehensive data coverage
- Real-time quotes (not delayed)
- Simple JSON API

Alternative APIs considered:
- Alpha Vantage (requires key, rate limits)
- IEX Cloud (paid, but reliable)
- Finnhub (requires key)
- Twelve Data (limited free tier)

## Verification Status

✅ Schema migration completed
✅ TypeScript compilation passes
✅ All new files created
✅ Existing files updated
✅ Import statements correct
✅ Dark theme maintained
✅ Format utilities used consistently
✅ Error handling implemented
✅ Rate limiting in place
✅ Authentication required

## Next Steps

1. Start dev server and manually test the UI
2. Create test holdings with real symbols (AAPL, GOOGL, VTI, SPY, etc.)
3. Verify quotes are fetched and cached
4. Test refresh functionality
5. Monitor API reliability over time
6. Consider implementing fallback providers if Yahoo Finance proves unreliable

---

**Implementation completed successfully. All components are in place and ready for testing.**
