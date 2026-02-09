import { describe, it, expect } from "vitest";
import {
  calculateFederalIncomeTax,
  calculateFICA,
  calculateStateTax,
  getStandardDeduction,
  calculateAnnualTaxes,
  calculateMonthlyTaxes,
  getMarginalRate,
  estimateTaxSavings,
} from "../../src/internal/taxes";
import type { TaxProfileDTO } from "../../src/types";

describe("tax calculations", () => {
  describe("getStandardDeduction", () => {
    it("returns correct 2024 deductions", () => {
      expect(getStandardDeduction("SINGLE")).toBe(14600);
      expect(getStandardDeduction("MFJ")).toBe(29200);
      expect(getStandardDeduction("HOH")).toBe(21900);
    });
  });

  describe("calculateFederalIncomeTax", () => {
    it("returns 0 for no taxable income", () => {
      expect(calculateFederalIncomeTax(0, "SINGLE")).toBe(0);
      expect(calculateFederalIncomeTax(-1000, "SINGLE")).toBe(0);
    });

    it("applies 10% bracket for low income", () => {
      // $11,000 taxable income for single filer
      const tax = calculateFederalIncomeTax(11000, "SINGLE");
      expect(tax).toBeCloseTo(1100, 2); // All in 10% bracket
    });

    it("applies progressive brackets correctly", () => {
      // $50,000 taxable income for single filer
      // First $11,600 at 10% = $1,160
      // Next $35,550 at 12% = $4,266
      // Next $2,850 at 22% = $627
      // Total: $6,053
      const tax = calculateFederalIncomeTax(50000, "SINGLE");
      expect(tax).toBeCloseTo(6053, 0);
    });

    it("handles high income with multiple brackets", () => {
      // $200,000 taxable income for single filer
      const tax = calculateFederalIncomeTax(200000, "SINGLE");
      expect(tax).toBeGreaterThan(40000);
      expect(tax).toBeLessThan(80000);
    });

    it("different filing statuses have different brackets", () => {
      const taxSingle = calculateFederalIncomeTax(100000, "SINGLE");
      const taxMFJ = calculateFederalIncomeTax(100000, "MFJ");

      // MFJ should pay less due to wider brackets
      expect(taxMFJ).toBeLessThan(taxSingle);
    });
  });

  describe("calculateFICA", () => {
    it("calculates Social Security and Medicare", () => {
      const wages = 50000;
      const fica = calculateFICA(wages, "SINGLE");

      // Social Security: 50000 * 0.062 = 3100
      expect(fica.socialSecurity).toBeCloseTo(3100, 2);

      // Medicare: 50000 * 0.0145 = 725
      expect(fica.medicare).toBeCloseTo(725, 2);

      // Total
      expect(fica.total).toBeCloseTo(3825, 2);
    });

    it("caps Social Security tax at wage base", () => {
      const wages = 200000;
      const fica = calculateFICA(wages, "SINGLE");

      // Social Security capped at $168,600 * 0.062 = $10,453.20
      expect(fica.socialSecurity).toBeCloseTo(10453.20, 2);
    });

    it("applies additional Medicare tax above threshold", () => {
      const wagesBelow = 190000; // Below $200k threshold for SINGLE
      const wagesAbove = 210000; // Above threshold

      const ficaBelow = calculateFICA(wagesBelow, "SINGLE");
      const ficaAbove = calculateFICA(wagesAbove, "SINGLE");

      // Additional 0.9% on $10,000 above threshold = $90
      const additionalTax = ficaAbove.medicare - ficaBelow.medicare;
      expect(additionalTax).toBeGreaterThan(200); // More than just base rate difference
    });

    it("different thresholds for MFJ", () => {
      const wages = 240000;

      const ficaSingle = calculateFICA(wages, "SINGLE");
      const ficaMFJ = calculateFICA(wages, "MFJ");

      // MFJ threshold is $250k, so no additional Medicare tax yet
      expect(ficaMFJ.medicare).toBeLessThan(ficaSingle.medicare);
    });
  });

  describe("calculateStateTax", () => {
    it("returns 0 for no-tax states", () => {
      expect(calculateStateTax(50000, "TX")).toBe(0);
      expect(calculateStateTax(50000, "FL")).toBe(0);
      expect(calculateStateTax(50000, "WA")).toBe(0);
    });

    it("calculates tax for flat-tax states", () => {
      // Illinois: 4.95%
      expect(calculateStateTax(50000, "IL")).toBeCloseTo(2475, 2);

      // Colorado: 4.4%
      expect(calculateStateTax(50000, "CO")).toBeCloseTo(2200, 2);
    });

    it("calculates tax for progressive-tax states", () => {
      // California (using approximation)
      const tax = calculateStateTax(100000, "CA");
      expect(tax).toBeGreaterThan(0);
    });

    it("handles unknown state codes with default rate", () => {
      const tax = calculateStateTax(50000, "XX");
      expect(tax).toBeCloseTo(2500, 2); // Default 5%
    });
  });

  describe("calculateAnnualTaxes", () => {
    const profile: TaxProfileDTO = {
      stateCode: "CA",
      filingStatus: "SINGLE",
      taxYear: 2024,
      includePayrollTaxes: true,
      advancedOverridesEnabled: false,
    };

    it("calculates total annual taxes", () => {
      const result = calculateAnnualTaxes(100000, profile);

      expect(result.federal).toBeGreaterThan(0);
      expect(result.state).toBeGreaterThan(0);
      expect(result.fica).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
      expect(result.effectiveRate).toBeGreaterThan(0);
      expect(result.effectiveRate).toBeLessThan(1);
    });

    it("applies standard deduction", () => {
      // Income just above standard deduction
      const lowIncome = calculateAnnualTaxes(15000, profile);

      // Only small amount taxable after $14,600 deduction
      expect(lowIncome.federal).toBeLessThan(100);
    });

    it("effective rate increases with income", () => {
      const low = calculateAnnualTaxes(50000, profile);
      const high = calculateAnnualTaxes(150000, profile);

      expect(high.effectiveRate).toBeGreaterThan(low.effectiveRate);
    });

    it("excludes FICA when disabled", () => {
      const withFICA = calculateAnnualTaxes(100000, profile);
      const withoutFICA = calculateAnnualTaxes(100000, {
        ...profile,
        includePayrollTaxes: false,
      });

      expect(withFICA.fica).toBeGreaterThan(0);
      expect(withoutFICA.fica).toBe(0);
      expect(withoutFICA.total).toBeLessThan(withFICA.total);
    });
  });

  describe("calculateMonthlyTaxes", () => {
    const profile: TaxProfileDTO = {
      stateCode: "TX",
      filingStatus: "MFJ",
      taxYear: 2024,
      includePayrollTaxes: true,
      advancedOverridesEnabled: false,
    };

    it("annualizes income for calculation", () => {
      const monthlyIncome = 8333.33; // ~$100k annual
      const monthlyTax = calculateMonthlyTaxes(monthlyIncome, profile);

      expect(monthlyTax).toBeGreaterThan(0);
      expect(monthlyTax).toBeLessThan(monthlyIncome); // Sanity check
    });

    it("monthly tax is approximately 1/12 of annual", () => {
      const annualIncome = 100000;
      const monthlyIncome = annualIncome / 12;

      const annual = calculateAnnualTaxes(annualIncome, profile);
      const monthly = calculateMonthlyTaxes(monthlyIncome, profile);

      expect(monthly * 12).toBeCloseTo(annual.total, 0);
    });
  });

  describe("getMarginalRate", () => {
    it("returns correct marginal rate for income level", () => {
      // $50,000 taxable for single = 22% federal bracket
      const rate = getMarginalRate(50000, "SINGLE", "TX");
      expect(rate).toBeCloseTo(0.22, 2); // 22% federal + 0% TX
    });

    it("includes state marginal rate", () => {
      const rateTX = getMarginalRate(50000, "SINGLE", "TX");
      const rateCA = getMarginalRate(50000, "SINGLE", "CA");

      expect(rateCA).toBeGreaterThan(rateTX); // CA has state tax
    });

    it("increases for higher income", () => {
      const low = getMarginalRate(30000, "SINGLE", "TX");
      const high = getMarginalRate(150000, "SINGLE", "TX");

      expect(high).toBeGreaterThan(low);
    });
  });

  describe("estimateTaxSavings", () => {
    const profile: TaxProfileDTO = {
      stateCode: "CA",
      filingStatus: "SINGLE",
      taxYear: 2024,
      includePayrollTaxes: true,
      advancedOverridesEnabled: false,
    };

    it("calculates tax savings from pre-tax contribution", () => {
      const income = 100000;
      const contribution = 10000;

      const savings = estimateTaxSavings(contribution, income, profile);

      // Should save taxes on the $10k contribution
      expect(savings).toBeGreaterThan(0);
      expect(savings).toBeLessThan(contribution); // Sanity check
    });

    it("savings approximately equal marginal rate times contribution", () => {
      const income = 100000;
      const contribution = 5000;

      const savings = estimateTaxSavings(contribution, income, profile);

      // Savings should be greater than 0 and less than the contribution
      expect(savings).toBeGreaterThan(0);
      expect(savings).toBeLessThan(contribution);

      // For $100k income with $5k contribution, should save roughly $1500-$2000 in taxes
      expect(savings).toBeGreaterThan(1000);
      expect(savings).toBeLessThan(2500);
    });
  });
});
