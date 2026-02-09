import { prisma } from "@/lib/db/prisma";

export interface QuoteData {
  symbol: string;
  price: number;
  change: number | null;
  changePct: number | null;
  volume: number | null;
  name: string;
}

const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Fetch quotes from Yahoo Finance API
 * Uses the v7 quote endpoint which is more reliable for server-side requests
 */
async function fetchQuotesFromYahoo(symbols: string[]): Promise<Map<string, QuoteData>> {
  if (symbols.length === 0) return new Map();

  const results = new Map<string, QuoteData>();

  try {
    const symbolsParam = symbols.join(",");
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolsParam}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      console.warn("Yahoo Finance API returned non-200 status:", response.status);
      return results;
    }

    const data = await response.json();

    if (!data?.quoteResponse?.result) {
      console.warn("Invalid response structure from Yahoo Finance");
      return results;
    }

    for (const quote of data.quoteResponse.result) {
      const symbol = quote.symbol;
      const price = quote.regularMarketPrice ?? quote.currentPrice ?? 0;
      const change = quote.regularMarketChange ?? null;
      const changePct = quote.regularMarketChangePercent ?? null;
      const volume = quote.regularMarketVolume ?? null;
      const name = quote.shortName ?? quote.longName ?? symbol;

      if (price > 0) {
        results.set(symbol, {
          symbol,
          price,
          change,
          changePct,
          volume,
          name,
        });
      }
    }
  } catch (error) {
    console.error("Error fetching quotes from Yahoo Finance:", error);
  }

  return results;
}

/**
 * Get quotes for symbols, using cache when available
 * Refreshes stale quotes (>15 min old)
 * Returns cached data if fetch fails
 */
export async function getQuotes(symbols: string[]): Promise<QuoteData[]> {
  if (symbols.length === 0) return [];

  // Deduplicate and normalize symbols
  const uniqueSymbols = Array.from(new Set(symbols.map((s) => s.toUpperCase())));

  // Check cache for existing quotes
  const cachedQuotes = await prisma.priceQuote.findMany({
    where: {
      symbol: {
        in: uniqueSymbols,
      },
    },
  });

  const now = Date.now();
  const cacheMap = new Map<string, { price: number; change: number | null; changePct: number | null; volume: number | null; fetchedAt: Date }>();
  const staleSymbols: string[] = [];

  for (const cached of cachedQuotes) {
    const age = now - cached.fetchedAt.getTime();
    cacheMap.set(cached.symbol, cached);

    if (age > CACHE_DURATION_MS) {
      staleSymbols.push(cached.symbol);
    }
  }

  // Identify symbols not in cache
  const missingSymbols = uniqueSymbols.filter((sym) => !cacheMap.has(sym));

  // Fetch fresh data for stale and missing symbols
  const symbolsToFetch = [...staleSymbols, ...missingSymbols];
  let freshQuotes = new Map<string, QuoteData>();

  if (symbolsToFetch.length > 0) {
    freshQuotes = await fetchQuotesFromYahoo(symbolsToFetch);

    // Upsert fresh quotes into database
    for (const [symbol, quote] of freshQuotes) {
      try {
        await prisma.priceQuote.upsert({
          where: { symbol },
          update: {
            price: quote.price,
            change: quote.change,
            changePct: quote.changePct,
            volume: quote.volume,
            fetchedAt: new Date(),
          },
          create: {
            symbol,
            price: quote.price,
            change: quote.change,
            changePct: quote.changePct,
            volume: quote.volume,
            fetchedAt: new Date(),
          },
        });
      } catch (error) {
        console.error(`Error upserting quote for ${symbol}:`, error);
      }
    }
  }

  // Build results: prefer fresh data, fall back to cache
  const results: QuoteData[] = [];

  for (const symbol of uniqueSymbols) {
    if (freshQuotes.has(symbol)) {
      results.push(freshQuotes.get(symbol)!);
    } else if (cacheMap.has(symbol)) {
      const cached = cacheMap.get(symbol)!;
      results.push({
        symbol,
        price: cached.price,
        change: cached.change,
        changePct: cached.changePct,
        volume: cached.volume,
        name: symbol, // Name not stored in cache
      });
    } else {
      // No data available at all
      results.push({
        symbol,
        price: 0,
        change: null,
        changePct: null,
        volume: null,
        name: symbol,
      });
    }
  }

  return results;
}

/**
 * Get the age of the oldest cached quote for given symbols
 * Returns null if no quotes are cached
 */
export async function getCacheAge(symbols: string[]): Promise<number | null> {
  if (symbols.length === 0) return null;

  const uniqueSymbols = Array.from(new Set(symbols.map((s) => s.toUpperCase())));

  const quotes = await prisma.priceQuote.findMany({
    where: {
      symbol: {
        in: uniqueSymbols,
      },
    },
    orderBy: {
      fetchedAt: "asc",
    },
    take: 1,
  });

  if (quotes.length === 0) return null;

  return Date.now() - quotes[0].fetchedAt.getTime();
}
