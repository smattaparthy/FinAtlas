import { describe, it, expect } from "vitest";
import {
  calculateLifeInsuranceNeed,
  calculateDisabilityInsuranceNeed,
} from "../../lib/insurance/insuranceCalculations";

describe("calculateLifeInsuranceNeed", () => {
  it("should calculate total recommended coverage", () => {
    const result = calculateLifeInsuranceNeed({
      annualIncome: 100000,
      yearsToReplace: 10,
      outstandingDebts: 200000,
      educationPerChild: 100000,
      numberOfChildren: 2,
      finalExpenses: 15000,
      existingCoverage: 500000,
      currentAge: 35,
      retirementAge: 65,
    });
    expect(result.incomeReplacement).toBe(1000000);
    expect(result.debtCoverage).toBe(200000);
    expect(result.educationFund).toBe(200000);
    expect(result.finalExpenses).toBe(15000);
    expect(result.totalRecommended).toBe(1415000);
    expect(result.coverageGap).toBe(915000);
    expect(result.suggestedTermYears).toBe(30);
    expect(result.breakdown).toHaveLength(4);
  });

  it("should handle over-insured scenario", () => {
    const result = calculateLifeInsuranceNeed({
      annualIncome: 50000,
      yearsToReplace: 5,
      outstandingDebts: 0,
      educationPerChild: 0,
      numberOfChildren: 0,
      finalExpenses: 10000,
      existingCoverage: 500000,
      currentAge: 55,
      retirementAge: 65,
    });
    expect(result.coverageGap).toBeLessThan(0); // over-insured
  });
});

describe("calculateDisabilityInsuranceNeed", () => {
  it("should calculate disability coverage gap", () => {
    const result = calculateDisabilityInsuranceNeed({
      annualIncome: 120000,
      monthlyEssentialExpenses: 5000,
      employerCoveragePct: 40,
      existingDisabilityCoverage: 0,
    });
    expect(result.grossMonthlyIncome).toBe(10000);
    expect(result.recommendedMonthlyBenefit).toBe(6500);
    expect(result.currentMonthlyBenefit).toBe(4000);
    expect(result.coverageGap).toBe(2500);
    expect(result.coverageRatio).toBe(80);
  });
});
