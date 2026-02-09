import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getQuotes } from "@/lib/market/marketDataService";

interface HoldingWithValue {
  symbol: string;
  name: string | null;
  shares: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number | null;
  totalCostBasis: number | null;
  gainLoss: number | null;
  gainLossPct: number | null;
}

interface AccountAllocation {
  accountType: string;
  value: number;
  percentage: number;
}

// GET /api/market/portfolio?scenarioId=xxx
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scenarioId = req.nextUrl.searchParams.get("scenarioId");
    if (!scenarioId) {
      return NextResponse.json({ error: "scenarioId is required" }, { status: 400 });
    }

    // Verify user owns the scenario
    const scenario = await prisma.scenario.findFirst({
      where: {
        id: scenarioId,
        household: { ownerUserId: user.id },
      },
    });

    if (!scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    // Fetch all accounts with holdings
    const accounts = await prisma.account.findMany({
      where: { scenarioId },
      include: {
        holdings: true,
      },
    });

    // Extract unique symbols from all holdings
    const allSymbols = Array.from(
      new Set(
        accounts.flatMap((acc) => acc.holdings.map((h) => h.symbol))
      )
    );

    // Get quotes for all symbols
    const quotes = await getQuotes(allSymbols);
    const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

    // Calculate portfolio value and holdings with market data
    let totalPortfolioValue = 0;
    let totalCostBasis = 0;
    const holdingsWithValues: HoldingWithValue[] = [];

    for (const account of accounts) {
      for (const holding of account.holdings) {
        const quote = quoteMap.get(holding.symbol);
        const currentPrice = quote?.price ?? 0;
        const marketValue = currentPrice * holding.shares;
        const totalHoldingCostBasis = holding.costBasis ? holding.costBasis * holding.shares : null;
        const gainLoss = totalHoldingCostBasis ? marketValue - totalHoldingCostBasis : null;
        const gainLossPct = totalHoldingCostBasis && totalHoldingCostBasis > 0
          ? (gainLoss! / totalHoldingCostBasis) * 100
          : null;

        totalPortfolioValue += marketValue;
        if (totalHoldingCostBasis) {
          totalCostBasis += totalHoldingCostBasis;
        }

        holdingsWithValues.push({
          symbol: holding.symbol,
          name: holding.name,
          shares: holding.shares,
          currentPrice,
          marketValue,
          costBasis: holding.costBasis,
          totalCostBasis: totalHoldingCostBasis,
          gainLoss,
          gainLossPct,
        });
      }
    }

    // Add account balances (cash positions without holdings)
    for (const account of accounts) {
      if (account.holdings.length === 0) {
        totalPortfolioValue += account.balance;
      }
    }

    // Calculate asset allocation by account type
    const allocationMap = new Map<string, number>();

    for (const account of accounts) {
      let accountValue = account.balance;

      // For accounts with holdings, use market value instead
      if (account.holdings.length > 0) {
        accountValue = account.holdings.reduce((sum, h) => {
          const quote = quoteMap.get(h.symbol);
          const currentPrice = quote?.price ?? 0;
          return sum + currentPrice * h.shares;
        }, 0);
      }

      const currentValue = allocationMap.get(account.type) ?? 0;
      allocationMap.set(account.type, currentValue + accountValue);
    }

    const allocation: AccountAllocation[] = Array.from(allocationMap.entries())
      .map(([accountType, value]) => ({
        accountType,
        value,
        percentage: totalPortfolioValue > 0 ? (value / totalPortfolioValue) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    const totalGainLoss = totalCostBasis > 0 ? totalPortfolioValue - totalCostBasis : null;
    const totalGainLossPct = totalCostBasis > 0 && totalGainLoss !== null
      ? (totalGainLoss / totalCostBasis) * 100
      : null;

    return NextResponse.json({
      totalValue: totalPortfolioValue,
      totalCostBasis,
      totalGainLoss,
      totalGainLossPct,
      holdings: holdingsWithValues,
      allocation,
    });
  } catch (error) {
    console.error("Error fetching portfolio data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
