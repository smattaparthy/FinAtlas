import { describe, it, expect } from "vitest";
import {
  projectCollegeSavings,
  estimate529TaxBenefit,
  calculateSensitivity,
} from "../../lib/college/collegeSavingsCalculations";

describe("projectCollegeSavings", () => {
  it("should project savings growth over time", () => {
    const result = projectCollegeSavings(
      5,    // currentAge
      18,   // enrollmentAge
      10000, // currentSavings
      500,   // monthlyContrib
      0.06,  // returnRate (6%)
      30000, // annualCost
      0.05   // costInflation (5%)
    );
    // 13 years to enrollment
    expect(result.projectedSavingsAtEnrollment).toBeGreaterThan(10000);
    expect(result.totalCostAt4Years).toBeGreaterThan(120000); // inflated over 13+ years
    expect(result.projectionPoints).toHaveLength(13 + 4 + 1); // years 0..17
    expect(result.projectionPoints[0].age).toBe(5);
    expect(result.projectionPoints[0].year).toBe(0);
    expect(result.requiredMonthlyContribution).toBeGreaterThanOrEqual(0);
    expect(result.tax529Benefit).toBe(500 * 12 * 0.05); // annualContrib * 5%
  });

  it("should handle zero years to enrollment", () => {
    const result = projectCollegeSavings(
      18,    // currentAge = enrollmentAge
      18,    // enrollmentAge
      50000, // currentSavings
      0,     // monthlyContrib
      0.06,  // returnRate
      25000, // annualCost
      0.05   // costInflation
    );
    // yearsToEnroll = 0, so savings stay at currentSavings
    expect(result.projectedSavingsAtEnrollment).toBe(50000);
    // Total 4-year cost: sum of 25000*(1.05)^(0+i) for i=0..3
    expect(result.totalCostAt4Years).toBeGreaterThan(0);
    expect(result.projectionPoints).toHaveLength(5); // years 0..4
  });

  it("should return positive shortfall when savings are insufficient", () => {
    const result = projectCollegeSavings(
      10,    // currentAge
      18,    // enrollmentAge
      0,     // currentSavings (none)
      100,   // monthlyContrib (small)
      0.06,  // returnRate
      40000, // annualCost (high)
      0.05   // costInflation
    );
    expect(result.shortfall).toBeGreaterThan(0);
    expect(result.requiredMonthlyContribution).toBeGreaterThan(100);
  });

  it("should return negative shortfall (surplus) when well-funded", () => {
    const result = projectCollegeSavings(
      5,      // currentAge
      18,     // enrollmentAge
      200000, // currentSavings (large)
      2000,   // monthlyContrib (generous)
      0.08,   // returnRate (8%)
      20000,  // annualCost (modest)
      0.03    // costInflation (3%)
    );
    expect(result.shortfall).toBeLessThan(0); // surplus
    expect(result.requiredMonthlyContribution).toBe(0); // already fully funded
  });
});

describe("estimate529TaxBenefit", () => {
  it("should calculate tax benefit correctly", () => {
    expect(estimate529TaxBenefit(6000, 0.05)).toBe(300);
    expect(estimate529TaxBenefit(0, 0.05)).toBe(0);
    expect(estimate529TaxBenefit(10000, 0)).toBe(0);
  });
});

describe("calculateSensitivity", () => {
  it("should return 5 sensitivity rows", () => {
    const rows = calculateSensitivity(
      5,     // currentAge
      18,    // enrollmentAge
      10000, // currentSavings
      500,   // monthlyContrib
      0.06,  // baseReturnRate
      30000, // annualCost
      0.05   // costInflation
    );
    expect(rows).toHaveLength(5);
    expect(rows[0].returnRate).toBeCloseTo(0.04); // 6% - 2%
    expect(rows[2].returnRate).toBeCloseTo(0.06); // base rate
    expect(rows[4].returnRate).toBeCloseTo(0.08); // 6% + 2%
  });

  it("should show higher savings at higher return rates", () => {
    const rows = calculateSensitivity(
      5, 18, 10000, 500, 0.06, 30000, 0.05
    );
    // Higher return rate should yield higher projected savings
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].projectedSavings).toBeGreaterThanOrEqual(
        rows[i - 1].projectedSavings
      );
    }
  });

  it("should clamp return rate to zero minimum", () => {
    const rows = calculateSensitivity(
      5, 18, 10000, 500, 0.01, 30000, 0.05
    );
    // 0.01 - 0.02 = -0.01 -> clamped to 0
    expect(rows[0].returnRate).toBe(0);
  });
});
