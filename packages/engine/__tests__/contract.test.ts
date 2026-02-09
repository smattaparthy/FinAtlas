import { describe, it, expect } from "vitest";
import { runEngine, validateInput, getInputHash } from "../src/contract";
import { ENGINE_VERSION } from "../src/version";
import type { ScenarioInputDTO } from "../src/types";

describe("runEngine", () => {
  const minimalInput: ScenarioInputDTO = {
    scenarioId: "baseline",
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
        name: "Checking",
        type: "TAXABLE",
        expectedReturnPct: 1,
        holdings: [
          {
            ticker: "CASH",
            shares: 1,
            avgPrice: 10000,
            lastPrice: 10000,
          },
        ],
      },
    ],
    contributions: [],
    loans: [
      {
        id: "loan1",
        type: "AUTO",
        name: "Car Loan",
        principal: 15000,
        aprPct: 5,
        termMonths: 60,
        startDate: "2024-01-01",
      },
    ],
    goals: [],
  };

  describe("basic output structure", () => {
    it("returns result with expected shape", () => {
      const result = runEngine(minimalInput);

      expect(result).toBeDefined();
      expect(result.engineVersion).toBeDefined();
      expect(result.inputHash).toBeDefined();
      expect(result.series).toBeDefined();
      expect(result.monthly).toBeDefined();
      expect(result.annual).toBeDefined();
      expect(result.warnings).toBeDefined();
    });

    it("includes engine version", () => {
      const result = runEngine(minimalInput);
      expect(result.engineVersion).toBe(ENGINE_VERSION);
    });

    it("includes input hash", () => {
      const result = runEngine(minimalInput);
      expect(result.inputHash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    });

    it("generates series data", () => {
      const result = runEngine(minimalInput);

      expect(result.series.netWorth).toBeInstanceOf(Array);
      expect(result.series.assetsTotal).toBeInstanceOf(Array);
      expect(result.series.liabilitiesTotal).toBeInstanceOf(Array);
      expect(result.series.incomeTotal).toBeInstanceOf(Array);
      expect(result.series.expenseTotal).toBeInstanceOf(Array);
      expect(result.series.taxesTotal).toBeInstanceOf(Array);
      expect(result.series.cashflowNet).toBeInstanceOf(Array);
    });

    it("series length matches projection period", () => {
      const result = runEngine(minimalInput);

      // 12 months from Jan to Dec 2024
      expect(result.series.netWorth.length).toBe(12);
      expect(result.monthly.length).toBe(12);
    });

    it("monthly breakdown has expected fields", () => {
      const result = runEngine(minimalInput);
      const firstMonth = result.monthly[0];

      expect(firstMonth).toHaveProperty("t");
      expect(firstMonth).toHaveProperty("income");
      expect(firstMonth).toHaveProperty("expenses");
      expect(firstMonth).toHaveProperty("taxes");
      expect(firstMonth).toHaveProperty("loanPayments");
      expect(firstMonth).toHaveProperty("contributions");
      expect(firstMonth).toHaveProperty("investmentReturns");
      expect(firstMonth).toHaveProperty("netCashflow");
      expect(firstMonth).toHaveProperty("assetsEnd");
      expect(firstMonth).toHaveProperty("liabilitiesEnd");
    });

    it("annual summary aggregates correctly", () => {
      const result = runEngine(minimalInput);

      expect(result.annual.length).toBe(1); // Only 2024
      const year2024 = result.annual[0];

      expect(year2024.year).toBe(2024);
      expect(year2024).toHaveProperty("income");
      expect(year2024).toHaveProperty("expenses");
      expect(year2024).toHaveProperty("taxes");
      expect(year2024).toHaveProperty("netSavings");
      expect(year2024).toHaveProperty("endNetWorth");
    });
  });

  describe("financial invariants", () => {
    it("net worth equals assets minus liabilities", () => {
      const result = runEngine(minimalInput);

      for (const point of result.series.netWorth) {
        const date = point.t;
        const netWorth = point.v;

        const assets = result.series.assetsTotal.find(p => p.t === date)!.v;
        const liabilities = result.series.liabilitiesTotal.find(p => p.t === date)!.v;

        expect(netWorth).toBeCloseTo(assets - liabilities, 1);
      }
    });

    it("monthly breakdown matches series data", () => {
      const result = runEngine(minimalInput);

      for (let i = 0; i < result.monthly.length; i++) {
        const monthly = result.monthly[i];
        const netWorth = result.series.netWorth[i];

        expect(monthly.t).toBe(netWorth.t);
        expect(monthly.assetsEnd - monthly.liabilitiesEnd).toBeCloseTo(netWorth.v, 1);
      }
    });

    it("annual income equals sum of monthly income", () => {
      const result = runEngine(minimalInput);
      const annual = result.annual[0];

      const monthlySum = result.monthly.reduce((sum, m) => sum + m.income, 0);
      expect(annual.income).toBeCloseTo(monthlySum, 1);
    });

    it("liabilities decrease over time for loan", () => {
      const result = runEngine(minimalInput);

      const firstLiability = result.series.liabilitiesTotal[0].v;
      const lastLiability = result.series.liabilitiesTotal[11].v;

      expect(lastLiability).toBeLessThan(firstLiability);
    });
  });

  describe("realistic scenarios", () => {
    it("handles positive cashflow correctly", () => {
      const result = runEngine(minimalInput);

      // Income $5k, expenses $2k, some taxes/loan payments
      // Should have positive net cashflow most months
      const positiveCashflowMonths = result.monthly.filter(m => m.netCashflow > 0);
      expect(positiveCashflowMonths.length).toBeGreaterThan(0);
    });

    it("processes account balances", () => {
      const result = runEngine(minimalInput);

      expect(result.series.accountBalances["account1"]).toBeDefined();
      expect(result.series.accountBalances["account1"].length).toBe(12);

      // Starting balance should be ~$10k (may have small returns applied)
      const startBalance = result.series.accountBalances["account1"][0].v;
      expect(startBalance).toBeGreaterThan(9900);
      expect(startBalance).toBeLessThan(10100);
    });

    it("applies investment returns", () => {
      const result = runEngine(minimalInput);

      const startBalance = result.series.accountBalances["account1"][0].v;
      const endBalance = result.series.accountBalances["account1"][11].v;

      // With 1% expected return and positive cashflow, should grow
      expect(endBalance).toBeGreaterThan(startBalance);
    });

    it("calculates taxes on income", () => {
      const result = runEngine(minimalInput);

      for (const month of result.monthly) {
        if (month.income > 0) {
          expect(month.taxes).toBeGreaterThan(0);
        }
      }
    });

    it("processes loan payments", () => {
      const result = runEngine(minimalInput);

      for (const month of result.monthly) {
        expect(month.loanPayments).toBeGreaterThan(0);
      }

      // Loan payments should be roughly consistent
      const payments = result.monthly.map(m => m.loanPayments);
      const avgPayment = payments.reduce((a, b) => a + b, 0) / payments.length;

      for (const payment of payments) {
        expect(payment).toBeCloseTo(avgPayment, 0);
      }
    });
  });

  describe("with contributions", () => {
    it("processes monthly contributions", () => {
      const inputWithContributions: ScenarioInputDTO = {
        ...minimalInput,
        contributions: [
          {
            accountId: "account1",
            amountMonthly: 500,
            startDate: "2024-01-01",
          },
        ],
      };

      const result = runEngine(inputWithContributions);

      for (const month of result.monthly) {
        expect(month.contributions).toBeCloseTo(500, 1);
      }
    });
  });

  describe("with goals", () => {
    it("tracks goal progress", () => {
      const inputWithGoals: ScenarioInputDTO = {
        ...minimalInput,
        goals: [
          {
            id: "goal1",
            type: "RETIREMENT",
            name: "Retirement Fund",
            targetAmountReal: 50000,
            targetDate: "2024-12-01",
            priority: 1,
          },
        ],
      };

      const result = runEngine(inputWithGoals);

      expect(result.series.goalProgress["goal1"]).toBeDefined();
      expect(result.series.goalProgress["goal1"].funded.length).toBe(12);
      expect(result.series.goalProgress["goal1"].targetNominal.length).toBe(12);
    });

    it("generates goal shortfall warnings", () => {
      const inputWithGoals: ScenarioInputDTO = {
        ...minimalInput,
        goals: [
          {
            id: "goal1",
            type: "RETIREMENT",
            name: "Retirement Fund",
            targetAmountReal: 1000000, // Unrealistic target
            targetDate: "2024-12-01",
            priority: 1,
          },
        ],
      };

      const result = runEngine(inputWithGoals);

      const shortfallWarnings = result.warnings.filter(w => w.code === "GOAL_SHORTFALL");
      expect(shortfallWarnings.length).toBeGreaterThan(0);
    });
  });

  describe("multi-year projections", () => {
    it("handles multi-year projections", () => {
      const multiYearInput: ScenarioInputDTO = {
        ...minimalInput,
        household: {
          ...minimalInput.household,
          endDate: "2026-12-01",
        },
      };

      const result = runEngine(multiYearInput);

      // 36 months from 2024-01 to 2026-12
      expect(result.series.netWorth.length).toBe(36);
      expect(result.annual.length).toBe(3); // 2024, 2025, 2026
    });
  });

  describe("growth rules", () => {
    it("applies TRACK_INFLATION to expenses", () => {
      const inputWithInflation: ScenarioInputDTO = {
        ...minimalInput,
        household: {
          ...minimalInput.household,
          endDate: "2025-12-01",
        },
        expenses: [
          {
            id: "expense1",
            category: "Housing",
            name: "Rent",
            amount: 2000,
            frequency: "MONTHLY",
            startDate: "2024-01-01",
            growthRule: "TRACK_INFLATION",
            isEssential: true,
          },
        ],
      };

      const result = runEngine(inputWithInflation);

      const jan2024Expense = result.monthly[0].expenses;
      const dec2025Expense = result.monthly[23].expenses;

      // With 3% inflation, should have grown
      expect(dec2025Expense).toBeGreaterThan(jan2024Expense);
    });

    it("applies CUSTOM_PERCENT growth", () => {
      const inputWithGrowth: ScenarioInputDTO = {
        ...minimalInput,
        household: {
          ...minimalInput.household,
          endDate: "2025-12-01",
        },
        incomes: [
          {
            id: "income1",
            name: "Salary",
            amount: 5000,
            frequency: "MONTHLY",
            startDate: "2024-01-01",
            growthRule: "CUSTOM_PERCENT",
            growthPct: 5, // 5% annual raises
          },
        ],
      };

      const result = runEngine(inputWithGrowth);

      const jan2024Income = result.monthly[0].income;
      const dec2025Income = result.monthly[23].income;

      // With 5% growth, should have increased
      expect(dec2025Income).toBeGreaterThan(jan2024Income);
    });
  });

  describe("validateInput", () => {
    it("returns true for valid input", () => {
      expect(validateInput(minimalInput)).toBe(true);
    });

    it("throws for invalid input", () => {
      const invalidInput = {
        ...minimalInput,
        household: undefined as any,
      };

      expect(() => validateInput(invalidInput)).toThrow();
    });
  });

  describe("getInputHash", () => {
    it("generates consistent hash for same input", () => {
      const hash1 = getInputHash(minimalInput);
      const hash2 = getInputHash(minimalInput);

      expect(hash1).toBe(hash2);
    });

    it("generates different hash for different input", () => {
      const hash1 = getInputHash(minimalInput);

      const modifiedInput = {
        ...minimalInput,
        scenarioId: "modified",
      };
      const hash2 = getInputHash(modifiedInput);

      expect(hash1).not.toBe(hash2);
    });

    it("hash is 64-character hex string", () => {
      const hash = getInputHash(minimalInput);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});
