import { describe, it, expect } from "vitest";
import { calculatePerformance } from "../../lib/performance/performanceCalculations";

describe("calculatePerformance", () => {
  it("should calculate portfolio performance with cost basis", () => {
    const result = calculatePerformance([
      {
        id: "acc1",
        name: "Brokerage",
        type: "BROKERAGE",
        balance: 110000,
        holdings: [
          { symbol: "AAPL", name: "Apple", shares: 100, costBasis: 150 },
          { symbol: "GOOGL", name: "Google", shares: 50, costBasis: 100 },
        ],
      },
    ]);
    expect(result.totalValue).toBe(110000);
    expect(result.totalCostBasis).toBe(20000); // 100*150 + 50*100
    expect(result.totalGainLoss).toBe(90000);
    expect(result.bestPerformer).not.toBeNull();
  });

  it("should handle accounts without cost basis", () => {
    const result = calculatePerformance([
      {
        id: "acc1",
        name: "Savings",
        type: "SAVINGS",
        balance: 50000,
        holdings: [
          { symbol: "CASH", name: null, shares: 1, costBasis: null },
        ],
      },
    ]);
    expect(result.totalCostBasis).toBe(0);
    expect(result.totalGainLoss).toBe(0);
    expect(result.bestPerformer).toBeNull();
  });

  it("should handle empty accounts array", () => {
    const result = calculatePerformance([]);
    expect(result.accounts).toHaveLength(0);
    expect(result.totalValue).toBe(0);
  });
});
