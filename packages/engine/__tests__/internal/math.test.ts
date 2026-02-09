import { describe, it, expect } from "vitest";
import {
  round,
  sum,
  compoundGrowth,
  presentValue,
  futureValue,
  calculatePMT,
  annualToMonthlyRate,
  monthlyToAnnualRate,
  clamp,
  percentChange,
} from "../../src/internal/math";

describe("math utilities", () => {
  describe("round", () => {
    it("rounds to 2 decimal places by default", () => {
      expect(round(3.14159)).toBe(3.14);
      expect(round(2.5)).toBe(2.5);
      expect(round(2.555)).toBe(2.56);
    });

    it("rounds to specified decimal places", () => {
      expect(round(3.14159, 3)).toBe(3.142);
      expect(round(100.456, 1)).toBe(100.5);
      expect(round(123.456, 0)).toBe(123);
    });

    it("handles non-finite values", () => {
      expect(round(Infinity)).toBe(0);
      expect(round(-Infinity)).toBe(0);
      expect(round(NaN)).toBe(0);
    });
  });

  describe("sum", () => {
    it("sums an array of numbers", () => {
      expect(sum([1, 2, 3, 4, 5])).toBe(15);
      expect(sum([10, -5, 3])).toBe(8);
    });

    it("returns 0 for empty array", () => {
      expect(sum([])).toBe(0);
    });

    it("handles single element", () => {
      expect(sum([42])).toBe(42);
    });
  });

  describe("compoundGrowth", () => {
    it("calculates compound growth correctly", () => {
      expect(compoundGrowth(1000, 0.05, 12)).toBeCloseTo(1795.86, 2);
      expect(compoundGrowth(10000, 0.08, 10)).toBeCloseTo(21589.25, 2);
    });

    it("returns principal when rate is 0", () => {
      expect(compoundGrowth(1000, 0, 12)).toBe(1000);
    });

    it("returns principal when periods is 0", () => {
      expect(compoundGrowth(1000, 0.05, 0)).toBe(1000);
    });

    it("handles negative rates (decay)", () => {
      expect(compoundGrowth(1000, -0.05, 12)).toBeCloseTo(540.36, 2);
    });
  });

  describe("presentValue", () => {
    it("calculates present value correctly", () => {
      expect(presentValue(1000, 0.05, 12)).toBeCloseTo(556.84, 2);
      expect(presentValue(10000, 0.08, 10)).toBeCloseTo(4631.93, 2);
    });

    it("returns future value when rate is 0", () => {
      expect(presentValue(1000, 0, 12)).toBe(1000);
    });

    it("returns future value when periods is 0", () => {
      expect(presentValue(1000, 0.05, 0)).toBe(1000);
    });
  });

  describe("futureValue", () => {
    it("calculates future value correctly", () => {
      expect(futureValue(1000, 0.05, 12)).toBeCloseTo(1795.86, 2);
      expect(futureValue(5000, 0.07, 10)).toBeCloseTo(9835.76, 2);
    });

    it("returns present value when rate is 0", () => {
      expect(futureValue(1000, 0, 12)).toBe(1000);
    });
  });

  describe("calculatePMT", () => {
    it("calculates standard loan payment", () => {
      // $200,000 loan at 4% APR for 30 years (360 months)
      expect(calculatePMT(200000, 0.04, 360)).toBeCloseTo(954.83, 2);
    });

    it("calculates car loan payment", () => {
      // $30,000 loan at 5% APR for 5 years (60 months)
      expect(calculatePMT(30000, 0.05, 60)).toBeCloseTo(566.14, 2);
    });

    it("handles 0% interest rate", () => {
      // $10,000 loan at 0% for 12 months
      expect(calculatePMT(10000, 0, 12)).toBeCloseTo(833.33, 2);
    });

    it("returns 0 for 0 principal", () => {
      expect(calculatePMT(0, 0.05, 12)).toBe(0);
    });

    it("handles 1-month term", () => {
      expect(calculatePMT(1000, 0.05, 1)).toBeCloseTo(1004.17, 2);
    });
  });

  describe("rate conversions", () => {
    it("converts annual to monthly rate", () => {
      expect(annualToMonthlyRate(0.12)).toBeCloseTo(0.01, 4);
      expect(annualToMonthlyRate(0.06)).toBeCloseTo(0.005, 4);
    });

    it("converts monthly to annual rate", () => {
      expect(monthlyToAnnualRate(0.01)).toBeCloseTo(0.12, 4);
      expect(monthlyToAnnualRate(0.005)).toBeCloseTo(0.06, 4);
    });

    it("round-trips correctly", () => {
      const annual = 0.08;
      expect(monthlyToAnnualRate(annualToMonthlyRate(annual))).toBeCloseTo(annual, 6);
    });
  });

  describe("clamp", () => {
    it("clamps values within range", () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it("handles edge cases", () => {
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });
  });

  describe("percentChange", () => {
    it("calculates percentage change", () => {
      expect(percentChange(100, 150)).toBe(50);
      expect(percentChange(100, 75)).toBe(-25);
      expect(percentChange(100, 100)).toBe(0);
    });

    it("returns 0 when original is 0", () => {
      expect(percentChange(0, 100)).toBe(0);
    });

    it("handles large changes", () => {
      expect(percentChange(100, 300)).toBe(200);
    });
  });
});
