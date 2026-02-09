"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useScenario } from "@/contexts/ScenarioContext";
import { formatCurrency, formatPercent } from "@/lib/format";
import { PageSkeleton } from "@/components/ui/Skeleton";
import Link from "next/link";

interface QuoteData {
  symbol: string;
  price: number;
  change: number | null;
  changePct: number | null;
  volume: number | null;
  name: string;
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function TrendingUp({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  );
}

function TrendingDown({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.306-4.307a11.95 11.95 0 015.814 5.519l2.74 1.22m0 0l-5.94 2.28m5.94-2.28l-2.28-5.941" />
    </svg>
  );
}

interface Holding {
  symbol: string;
  name: string | null;
  shares: number;
  costBasis: number | null;
}

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  holdings: Holding[];
}

interface HoldingPerformance {
  symbol: string;
  name: string;
  shares: number;
  costBasis: number;
  currentPrice: number;
  marketValue: number;
  totalCostBasis: number;
  gainLoss: number;
  gainLossPct: number;
  returnPct: number;
  hasCostBasis: boolean;
}

interface AccountPerformance {
  id: string;
  name: string;
  type: string;
  balance: number;
  marketValue: number;
  totalCostBasis: number;
  gainLoss: number;
  returnPct: number;
  holdings: HoldingPerformance[];
}

interface PortfolioPerformance {
  accounts: AccountPerformance[];
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalReturnPct: number;
  bestPerformer: { name: string; returnPct: number } | null;
  worstPerformer: { name: string; returnPct: number } | null;
}

export default function InvestmentPerformancePage() {
  const { selectedScenarioId } = useScenario();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAccountIds, setExpandedAccountIds] = useState<Set<string>>(new Set());
  const [quotes, setQuotes] = useState<Map<string, QuoteData>>(new Map());

  useEffect(() => {
    async function fetchData() {
      if (!selectedScenarioId) return;

      try {
        // Fetch accounts
        const response = await fetch(`/api/accounts?scenarioId=${selectedScenarioId}`);
        if (!response.ok) throw new Error("Failed to fetch accounts");
        const data = await response.json();
        setAccounts(data.accounts ?? []);

        // Extract all symbols
        const allSymbols = Array.from(
          new Set(
            data.accounts.flatMap((acc: Account) => acc.holdings.map((h) => h.symbol))
          )
        );

        // Fetch quotes
        if (allSymbols.length > 0) {
          const quotesResponse = await fetch(`/api/market/quotes?symbols=${allSymbols.join(",")}`);
          if (quotesResponse.ok) {
            const quotesData = await quotesResponse.json();
            const quoteMap = new Map<string, QuoteData>(
              quotesData.quotes.map((q: QuoteData) => [q.symbol, q])
            );
            setQuotes(quoteMap);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedScenarioId]);

  const performance: PortfolioPerformance = useMemo(() => {
    const accountPerformances: AccountPerformance[] = [];
    let portfolioTotalValue = 0;
    let portfolioTotalCostBasis = 0;

    for (const account of accounts) {
      const holdingPerformances: HoldingPerformance[] = [];
      let accountMarketValue = 0;
      let accountTotalCostBasis = 0;

      // Calculate performance for each holding with market prices
      for (const holding of account.holdings) {
        const quote = quotes.get(holding.symbol);
        const currentPrice = quote?.price ?? 0;
        const marketValue = currentPrice * holding.shares;
        const totalHoldingCostBasis = holding.costBasis ? holding.costBasis * holding.shares : 0;
        const gainLoss = totalHoldingCostBasis > 0 ? marketValue - totalHoldingCostBasis : 0;
        const gainLossPct = totalHoldingCostBasis > 0 ? (gainLoss / totalHoldingCostBasis) * 100 : 0;

        accountMarketValue += marketValue;
        if (totalHoldingCostBasis > 0) {
          accountTotalCostBasis += totalHoldingCostBasis;
        }

        holdingPerformances.push({
          symbol: holding.symbol,
          name: holding.name || holding.symbol,
          shares: holding.shares,
          costBasis: holding.costBasis ?? 0,
          currentPrice,
          marketValue,
          totalCostBasis: totalHoldingCostBasis,
          gainLoss,
          gainLossPct,
          returnPct: gainLossPct,
          hasCostBasis: holding.costBasis !== null && holding.costBasis > 0,
        });
      }

      // For accounts without holdings, use balance as market value
      if (account.holdings.length === 0) {
        accountMarketValue = account.balance;
      }

      const accountGainLoss = accountTotalCostBasis > 0 ? accountMarketValue - accountTotalCostBasis : 0;
      const accountReturnPct = accountTotalCostBasis > 0 ? (accountGainLoss / accountTotalCostBasis) * 100 : 0;

      accountPerformances.push({
        id: account.id,
        name: account.name,
        type: account.type,
        balance: account.balance,
        marketValue: accountMarketValue,
        totalCostBasis: accountTotalCostBasis,
        gainLoss: accountGainLoss,
        returnPct: accountReturnPct,
        holdings: holdingPerformances,
      });

      // Add to portfolio totals
      portfolioTotalValue += accountMarketValue;
      if (accountTotalCostBasis > 0) {
        portfolioTotalCostBasis += accountTotalCostBasis;
      }
    }

    const portfolioTotalGainLoss = portfolioTotalCostBasis > 0 ? portfolioTotalValue - portfolioTotalCostBasis : 0;
    const portfolioTotalReturnPct = portfolioTotalCostBasis > 0 ? (portfolioTotalGainLoss / portfolioTotalCostBasis) * 100 : 0;

    // Find best and worst performers
    const accountsWithReturns = accountPerformances.filter((acc) => acc.returnPct !== 0);
    let bestPerformer: { name: string; returnPct: number } | null = null;
    let worstPerformer: { name: string; returnPct: number } | null = null;

    if (accountsWithReturns.length > 0) {
      const sorted = [...accountsWithReturns].sort((a, b) => b.returnPct - a.returnPct);
      bestPerformer = { name: sorted[0].name, returnPct: sorted[0].returnPct };
      worstPerformer = { name: sorted[sorted.length - 1].name, returnPct: sorted[sorted.length - 1].returnPct };
    }

    return {
      accounts: accountPerformances,
      totalValue: portfolioTotalValue,
      totalCostBasis: portfolioTotalCostBasis,
      totalGainLoss: portfolioTotalGainLoss,
      totalReturnPct: portfolioTotalReturnPct,
      bestPerformer,
      worstPerformer,
    };
  }, [accounts, quotes]);

  const toggleAccount = (accountId: string) => {
    setExpandedAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  const formatAccountType = (type: string): string => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const getGainLossColor = (value: number): string => {
    if (value > 0) return "text-emerald-400";
    if (value < 0) return "text-red-400";
    return "text-zinc-400";
  };

  const formatGainLoss = (value: number): string => {
    if (value > 0) return `+${formatCurrency(value)}`;
    return formatCurrency(value);
  };

  const formatReturnPct = (value: number): string => {
    if (value > 0) return `+${formatPercent(value / 100)}`;
    return formatPercent(value / 100);
  };

  if (loading) {
    return <PageSkeleton />;
  }

  const investmentAccounts = accounts.filter((acc) => acc.holdings.length > 0);

  if (investmentAccounts.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
            <TrendingUp className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-zinc-50">No investment accounts found</h3>
          <p className="mb-6 text-sm text-zinc-400">Add an investment account to track performance.</p>
          <Link
            href="/investments/new"
            className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Add Investment Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-50">Investment Performance</h1>
        <p className="mt-2 text-zinc-400">Track your investment returns and portfolio performance</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <p className="text-sm text-zinc-400">Total Portfolio Value</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-50">{formatCurrency(performance.totalValue)}</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <p className="text-sm text-zinc-400">Total Cost Basis</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-50">{formatCurrency(performance.totalCostBasis)}</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <p className="text-sm text-zinc-400">Total Gain/Loss</p>
          <p className={`mt-2 text-2xl font-semibold ${getGainLossColor(performance.totalGainLoss)}`}>
            {formatGainLoss(performance.totalGainLoss)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <p className="text-sm text-zinc-400">Total Return</p>
          <p className={`mt-2 text-2xl font-semibold ${getGainLossColor(performance.totalReturnPct)}`}>
            {formatReturnPct(performance.totalReturnPct)}
          </p>
        </div>
      </div>

      {/* Best/Worst Performers */}
      {(performance.bestPerformer || performance.worstPerformer) && (
        <div className="flex gap-4">
          {performance.bestPerformer && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-800/30 bg-emerald-950/20 px-3 py-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-zinc-400">Best:</span>
              <span className="text-sm font-medium text-zinc-50">{performance.bestPerformer.name}</span>
              <span className="text-sm font-medium text-emerald-400">
                {formatReturnPct(performance.bestPerformer.returnPct)}
              </span>
            </div>
          )}

          {performance.worstPerformer && (
            <div className="flex items-center gap-2 rounded-lg border border-red-800/30 bg-red-950/20 px-3 py-2">
              <TrendingDown className="h-4 w-4 text-red-400" />
              <span className="text-sm text-zinc-400">Worst:</span>
              <span className="text-sm font-medium text-zinc-50">{performance.worstPerformer.name}</span>
              <span className="text-sm font-medium text-red-400">
                {formatReturnPct(performance.worstPerformer.returnPct)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Account Breakdown Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
        <h2 className="mb-4 text-lg font-semibold text-zinc-50">Account Breakdown</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-sm text-zinc-400">
                <th className="pb-3 font-medium">Account</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium text-right">Balance</th>
                <th className="pb-3 font-medium text-right">Cost Basis</th>
                <th className="pb-3 font-medium text-right">Gain/Loss</th>
                <th className="pb-3 font-medium text-right">Return %</th>
              </tr>
            </thead>
            <tbody>
              {performance.accounts.map((account) => (
                <React.Fragment key={account.id}>
                  {/* Account Row */}
                  <tr
                    className="cursor-pointer border-b border-zinc-800/50 hover:bg-zinc-800/20"
                    onClick={() => toggleAccount(account.id)}
                  >
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        {expandedAccountIds.has(account.id) ? (
                          <ChevronDown className="h-4 w-4 text-zinc-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-zinc-400" />
                        )}
                        <span className="font-medium text-zinc-50">{account.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-sm text-zinc-400">{formatAccountType(account.type)}</td>
                    <td className="py-3 text-right text-zinc-50">{formatCurrency(account.marketValue)}</td>
                    <td className="py-3 text-right text-zinc-400">
                      {account.totalCostBasis > 0 ? formatCurrency(account.totalCostBasis) : "—"}
                    </td>
                    <td className={`py-3 text-right ${getGainLossColor(account.gainLoss)}`}>
                      {account.totalCostBasis > 0 ? formatGainLoss(account.gainLoss) : "—"}
                    </td>
                    <td className={`py-3 text-right ${getGainLossColor(account.returnPct)}`}>
                      {account.totalCostBasis > 0 ? formatReturnPct(account.returnPct) : "—"}
                    </td>
                  </tr>

                  {/* Holdings Rows (Expanded) */}
                  {expandedAccountIds.has(account.id) &&
                    account.holdings.map((holding, idx) => (
                      <tr key={`${account.id}-${holding.symbol}-${idx}`} className="border-b border-zinc-800/30 bg-zinc-900/40">
                        <td className="py-3 pl-10">
                          <div className="text-sm">
                            <span className="font-medium text-zinc-300">{holding.symbol}</span>
                            {holding.name !== holding.symbol && (
                              <span className="ml-2 text-zinc-500">— {holding.name}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-sm text-zinc-500">{holding.shares.toFixed(4)} shares</td>
                        <td className="py-3 text-right text-sm text-zinc-400">
                          {holding.currentPrice > 0 ? formatCurrency(holding.marketValue) : "—"}
                        </td>
                        <td className="py-3 text-right text-sm text-zinc-500">
                          {holding.hasCostBasis ? formatCurrency(holding.totalCostBasis) : "N/A"}
                        </td>
                        <td className={`py-3 text-right text-sm ${holding.hasCostBasis ? getGainLossColor(holding.gainLoss) : "text-zinc-500"}`}>
                          {holding.hasCostBasis ? formatGainLoss(holding.gainLoss) : "N/A"}
                        </td>
                        <td className={`py-3 text-right text-sm ${holding.hasCostBasis ? getGainLossColor(holding.returnPct) : "text-zinc-500"}`}>
                          {holding.hasCostBasis ? formatReturnPct(holding.returnPct) : "N/A"}
                        </td>
                      </tr>
                    ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
