import { describe, it, expect } from "vitest";
import { runMonteCarlo } from "../../src/internal/montecarlo";
import type { ScenarioInputDTO } from "../../src/types";

describe("Monte Carlo simulation", () => {
  const baseInput: ScenarioInputDTO = {
    scenarioId: "test",
    household: {
      currency: "USD",
      anchorDate: "2024-01-01",
      startDate: "2024-01-01",
      endDate: "2024-12-01",
    },
    assumptions: {
      inflationRatePct: 3,
      taxableInterestYieldPct: 2,
      taxableDividendYieldPct: 2,
      realizedStGainPct: 0,
      realizedLtGainPct: 0,
    },
    taxProfile: {
      stateCode: "CA",
      filingStatus: "SINGLE",
      taxYear: 2024,
      includePayrollTaxes: true,
      advancedOverridesEnabled: false,
    },
    taxRules: {
      federal: null,
      state: null,
    },
    incomes: [
      {
        id: "income1",
        name: "Salary",
        amount: 5000,
        frequency: "MONTHLY",
        startDate: "2024-01-01",
        growthRule: "NONE",
      },
    ],
    expenses: [
      {
        id: "expense1",
        category: "Housing",
        name: "Rent",
        amount: 2000,
        frequency: "MONTHLY",
        startDate: "2024-01-01",
        growthRule: "NONE",
        isEssential: true,
      },
    ],
    accounts: [
      {
        id: "account1",
        name: "Investment",
        type: "TAXABLE",
        expectedReturnPct: 8,
        holdings: [
          {
            ticker: "VTI",
            shares: 100,
            avgPrice: 200,
            lastPrice: 200,
          },
        ],
      },
    ],
    contributions: [],
    loans: [],
    goals: [],
  };

  describe("runMonteCarlo", () => {
    it("generates expected number of simulations", () => {
      const result = runMonteCarlo(baseInput, {
        simulations: 100,
        volatilityPct: 15,
        seed: 42,
      });

      expect(result.simulations).toBe(100);
    });

    it("produces percentile bands for each month", () => {
      const result = runMonteCarlo(baseInput, {
        simulations: 100,
        volatilityPct: 15,
        seed: 42,
      });

      expect(result.bands.length).toBeGreaterThan(0);

      for (const band of result.bands) {
        expect(band.p10).toBeLessThanOrEqual(band.p25);
        expect(band.p25).toBeLessThanOrEqual(band.p50);
        expect(band.p50).toBeLessThanOrEqual(band.p75);
        expect(band.p75).toBeLessThanOrEqual(band.p90);
      }
    });

    it("success rate is between 0 and 100", () => {
      const result = runMonteCarlo(baseInput, {
        simulations: 100,
        volatilityPct: 15,
        seed: 42,
      });

      expect(result.successRate).toBeGreaterThanOrEqual(0);
      expect(result.successRate).toBeLessThanOrEqual(100);
    });

    it("median is between p10 and p90", () => {
      const result = runMonteCarlo(baseInput, {
        simulations: 100,
        volatilityPct: 15,
        seed: 42,
      });

      expect(result.medianFinalNetWorth).toBeGreaterThanOrEqual(result.p10FinalNetWorth);
      expect(result.medianFinalNetWorth).toBeLessThanOrEqual(result.p90FinalNetWorth);
    });

    it("higher volatility produces wider bands", () => {
      const lowVol = runMonteCarlo(baseInput, {
        simulations: 100,
        volatilityPct: 5,
        seed: 42,
      });

      const highVol = runMonteCarlo(baseInput, {
        simulations: 100,
        volatilityPct: 30,
        seed: 42,
      });

      const lowSpread = lowVol.p90FinalNetWorth - lowVol.p10FinalNetWorth;
      const highSpread = highVol.p90FinalNetWorth - highVol.p10FinalNetWorth;

      expect(highSpread).toBeGreaterThan(lowSpread);
    });

    it("deterministic with same seed", () => {
      const result1 = runMonteCarlo(baseInput, {
        simulations: 50,
        volatilityPct: 15,
        seed: 123,
      });

      const result2 = runMonteCarlo(baseInput, {
        simulations: 50,
        volatilityPct: 15,
        seed: 123,
      });

      expect(result1.medianFinalNetWorth).toBe(result2.medianFinalNetWorth);
      expect(result1.bands.length).toBe(result2.bands.length);
    });

    it("different results with different seed", () => {
      const result1 = runMonteCarlo(baseInput, {
        simulations: 50,
        volatilityPct: 15,
        seed: 123,
      });

      const result2 = runMonteCarlo(baseInput, {
        simulations: 50,
        volatilityPct: 15,
        seed: 456,
      });

      // Very unlikely to be exactly equal
      expect(result1.medianFinalNetWorth).not.toBe(result2.medianFinalNetWorth);
    });

    it("clamps simulation count to valid range", () => {
      const tooFew = runMonteCarlo(baseInput, {
        simulations: 10,
        volatilityPct: 15,
      });
      expect(tooFew.simulations).toBe(50); // Minimum

      const tooMany = runMonteCarlo(baseInput, {
        simulations: 5000,
        volatilityPct: 15,
      });
      expect(tooMany.simulations).toBe(2000); // Maximum
    });

    it("clamps volatility to valid range", () => {
      // This should not crash with extreme volatility
      const result = runMonteCarlo(baseInput, {
        simulations: 50,
        volatilityPct: 0.5, // Will be clamped to 1
        seed: 42,
      });

      expect(result.simulations).toBe(50);
    });

    it("tracks goal success rates", () => {
      const inputWithGoal: ScenarioInputDTO = {
        ...baseInput,
        goals: [
          {
            id: "goal1",
            type: "RETIREMENT",
            name: "Retirement",
            targetAmountReal: 30000,
            targetDate: "2024-12-01",
            priority: 1,
          },
        ],
      };

      const result = runMonteCarlo(inputWithGoal, {
        simulations: 100,
        volatilityPct: 15,
        seed: 42,
      });

      expect(result.goalSuccessRates["goal1"]).toBeDefined();
      expect(result.goalSuccessRates["goal1"]).toBeGreaterThanOrEqual(0);
      expect(result.goalSuccessRates["goal1"]).toBeLessThanOrEqual(100);
    });

    it("produces reasonable final net worth values", () => {
      const result = runMonteCarlo(baseInput, {
        simulations: 100,
        volatilityPct: 15,
        seed: 42,
      });

      // Starting with $20k in account, positive cashflow
      // Should have positive net worth at end
      expect(result.medianFinalNetWorth).toBeGreaterThan(0);
    });
  });

  describe("percentile ordering", () => {
    it("maintains correct ordering across all time points", () => {
      const result = runMonteCarlo(baseInput, {
        simulations: 200,
        volatilityPct: 20,
        seed: 42,
      });

      for (const band of result.bands) {
        expect(band.p10).toBeLessThanOrEqual(band.p25);
        expect(band.p25).toBeLessThanOrEqual(band.p50);
        expect(band.p50).toBeLessThanOrEqual(band.p75);
        expect(band.p75).toBeLessThanOrEqual(band.p90);
      }
    });
  });
});
