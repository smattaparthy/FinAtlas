"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/format";

interface QuoteData {
  symbol: string;
  price: number;
  change: number | null;
  changePct: number | null;
  volume: number | null;
  name: string;
}

interface HoldingWithPrice {
  id: string;
  symbol: string;
  name: string | null;
  shares: number;
  costBasis: number | null;
  currentPrice: number;
  marketValue: number;
  gainLoss: number | null;
  gainLossPct: number | null;
  dayChange: number | null;
  dayChangePct: number | null;
}

interface HoldingsTableProps {
  holdings: Array<{
    id: string;
    symbol: string;
    name: string | null;
    shares: number;
    costBasis: number | null;
  }>;
  onRefresh?: () => void;
}

export default function HoldingsTable({ holdings, onRefresh }: HoldingsTableProps) {
  const [holdingsWithPrices, setHoldingsWithPrices] = useState<HoldingWithPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = async () => {
    if (holdings.length === 0) {
      setHoldingsWithPrices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const symbols = holdings.map((h) => h.symbol).join(",");
      const response = await fetch(`/api/market/quotes?symbols=${symbols}`);

      if (!response.ok) {
        throw new Error("Failed to fetch quotes");
      }

      const data = await response.json();
      const quoteMap = new Map<string, QuoteData>(
        data.quotes.map((q: QuoteData) => [q.symbol, q])
      );

      const enriched: HoldingWithPrice[] = holdings.map((holding) => {
        const quote = quoteMap.get(holding.symbol);
        const currentPrice = quote?.price ?? 0;
        const marketValue = currentPrice * holding.shares;
        const totalCostBasis = holding.costBasis ? holding.costBasis * holding.shares : null;
        const gainLoss = totalCostBasis ? marketValue - totalCostBasis : null;
        const gainLossPct = totalCostBasis && totalCostBasis > 0
          ? (gainLoss! / totalCostBasis) * 100
          : null;
        const dayChange = quote?.change ?? null;
        const dayChangePct = quote?.changePct ?? null;

        return {
          id: holding.id,
          symbol: holding.symbol,
          name: holding.name,
          shares: holding.shares,
          costBasis: holding.costBasis,
          currentPrice,
          marketValue,
          gainLoss,
          gainLossPct,
          dayChange,
          dayChangePct,
        };
      });

      setHoldingsWithPrices(enriched);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error fetching prices:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch prices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, [holdings]);

  const handleRefresh = () => {
    fetchPrices();
    onRefresh?.();
  };

  const formatTime = (date: Date): string => {
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "Just now";
    if (diffMin === 1) return "1 min ago";
    if (diffMin < 60) return `${diffMin} min ago`;

    const diffHr = Math.floor(diffMin / 60);
    if (diffHr === 1) return "1 hour ago";
    return `${diffHr} hours ago`;
  };

  const getGainLossColor = (value: number | null): string => {
    if (value === null) return "text-zinc-400";
    if (value > 0) return "text-emerald-400";
    if (value < 0) return "text-red-400";
    return "text-zinc-400";
  };

  const formatGainLoss = (value: number | null): string => {
    if (value === null) return "—";
    if (value > 0) return `+${formatCurrency(value)}`;
    return formatCurrency(value);
  };

  const formatPercent = (value: number | null): string => {
    if (value === null) return "—";
    const formatted = value.toFixed(2);
    return value > 0 ? `+${formatted}%` : `${formatted}%`;
  };

  if (holdings.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-400 text-sm">
        No holdings in this account
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-zinc-400">
          {lastUpdated && !loading && (
            <span>Last updated: {formatTime(lastUpdated)}</span>
          )}
          {loading && <span>Loading prices...</span>}
          {error && <span className="text-red-400">{error}</span>}
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="px-3 py-1 text-xs border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs text-zinc-400 uppercase tracking-wider">
              <th className="pb-2 font-medium">Symbol</th>
              <th className="pb-2 font-medium text-right">Shares</th>
              <th className="pb-2 font-medium text-right">Cost Basis</th>
              <th className="pb-2 font-medium text-right">Price</th>
              <th className="pb-2 font-medium text-right">Market Value</th>
              <th className="pb-2 font-medium text-right">P/L</th>
              <th className="pb-2 font-medium text-right">P/L %</th>
              <th className="pb-2 font-medium text-right">Day Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {holdingsWithPrices.map((holding) => (
              <tr key={holding.id} className="hover:bg-zinc-800/20">
                <td className="py-3">
                  <div className="font-medium">{holding.symbol}</div>
                  {holding.name && holding.name !== holding.symbol && (
                    <div className="text-xs text-zinc-500">{holding.name}</div>
                  )}
                </td>
                <td className="py-3 text-right text-zinc-300">
                  {holding.shares.toFixed(4)}
                </td>
                <td className="py-3 text-right text-zinc-400">
                  {holding.costBasis ? formatCurrency(holding.costBasis) : "—"}
                </td>
                <td className="py-3 text-right">
                  {holding.currentPrice > 0 ? formatCurrency(holding.currentPrice) : "—"}
                </td>
                <td className="py-3 text-right font-medium">
                  {formatCurrency(holding.marketValue)}
                </td>
                <td className={`py-3 text-right ${getGainLossColor(holding.gainLoss)}`}>
                  {formatGainLoss(holding.gainLoss)}
                </td>
                <td className={`py-3 text-right ${getGainLossColor(holding.gainLossPct)}`}>
                  {formatPercent(holding.gainLossPct)}
                </td>
                <td className={`py-3 text-right text-xs ${getGainLossColor(holding.dayChangePct)}`}>
                  {formatPercent(holding.dayChangePct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
