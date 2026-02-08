import { describe, it, expect } from "vitest";
import { calculateEmergencyFund } from "../../lib/emergency/emergencyFundCalculations";

describe("calculateEmergencyFund", () => {
  it("should calculate fully funded status", () => {
    const result = calculateEmergencyFund({
      monthlyEssentialExpenses: 3000,
      targetMonths: 6,
      currentLiquidAssets: 20000,
      monthlySavings: 500,
    });
    expect(result.targetAmount).toBe(18000);
    expect(result.currentAmount).toBe(20000);
    expect(result.gap).toBe(-2000); // surplus
    expect(result.status).toBe("FULLY_FUNDED");
    expect(result.fundedPercentage).toBeGreaterThan(100);
    expect(result.monthsToTarget).toBeNull();
  });

  it("should calculate partial status", () => {
    const result = calculateEmergencyFund({
      monthlyEssentialExpenses: 4000,
      targetMonths: 6,
      currentLiquidAssets: 15000,
      monthlySavings: 1000,
    });
    expect(result.targetAmount).toBe(24000);
    expect(result.gap).toBe(9000);
    expect(result.status).toBe("PARTIAL");
    expect(result.monthsToTarget).toBe(9);
  });

  it("should calculate critical status", () => {
    const result = calculateEmergencyFund({
      monthlyEssentialExpenses: 5000,
      targetMonths: 6,
      currentLiquidAssets: 5000,
      monthlySavings: 200,
    });
    expect(result.status).toBe("CRITICAL");
    expect(result.fundedPercentage).toBeCloseTo(16.67, 1);
  });

  it("should handle zero expenses", () => {
    const result = calculateEmergencyFund({
      monthlyEssentialExpenses: 0,
      targetMonths: 6,
      currentLiquidAssets: 5000,
      monthlySavings: 500,
    });
    expect(result.monthsCovered).toBe(0);
    expect(result.fundedPercentage).toBe(0);
  });

  it("should handle zero savings with gap", () => {
    const result = calculateEmergencyFund({
      monthlyEssentialExpenses: 3000,
      targetMonths: 6,
      currentLiquidAssets: 5000,
      monthlySavings: 0,
    });
    expect(result.monthsToTarget).toBeNull();
  });
});
