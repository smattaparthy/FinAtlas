import { describe, it, expect } from "vitest";
import {
  buildInflationIndex,
  applyGrowth,
  getInflationFactor,
  nominalToReal,
  realToNominal,
} from "../../src/internal/growth";

describe("growth utilities", () => {
  describe("buildInflationIndex", () => {
    it("starts at 1.0 for first month", () => {
      const index = buildInflationIndex("2024-01-01", "2024-12-01", 0.03);
      expect(index.get("2024-01")).toBe(1.0);
    });

    it("compounds monthly correctly", () => {
      const index = buildInflationIndex("2024-01-01", "2024-12-01", 0.12);
      const jan = index.get("2024-01")!;
      const dec = index.get("2024-12")!;

      expect(jan).toBe(1.0);
      // After 11 months at 1% per month: (1.01)^11 ≈ 1.115668
      expect(dec).toBeCloseTo(1.115668, 4);
    });

    it("handles 0% inflation", () => {
      const index = buildInflationIndex("2024-01-01", "2024-12-01", 0);
      expect(index.get("2024-01")).toBe(1.0);
      expect(index.get("2024-12")).toBe(1.0);
    });

    it("covers entire date range", () => {
      const index = buildInflationIndex("2024-01-01", "2024-03-01", 0.03);
      expect(index.has("2024-01")).toBe(true);
      expect(index.has("2024-02")).toBe(true);
      expect(index.has("2024-03")).toBe(true);
      expect(index.size).toBe(3);
    });
  });

  describe("applyGrowth", () => {
    const inflationIndex = buildInflationIndex("2024-01-01", "2024-12-01", 0.03);

    it("NONE growth rule returns original amount", () => {
      expect(applyGrowth(1000, "NONE", undefined, inflationIndex, "2024-06-01")).toBe(1000);
      expect(applyGrowth(1000, "NONE", 0.05, inflationIndex, "2024-12-01")).toBe(1000);
    });

    it("TRACK_INFLATION applies inflation multiplier", () => {
      const result = applyGrowth(1000, "TRACK_INFLATION", undefined, inflationIndex, "2024-01-01");
      expect(result).toBe(1000); // First month = 1.0 multiplier

      const decResult = applyGrowth(1000, "TRACK_INFLATION", undefined, inflationIndex, "2024-12-01");
      expect(decResult).toBeGreaterThan(1000); // Should have grown
    });

    it("CUSTOM_PERCENT applies custom growth rate", () => {
      // 12% annual = 1% monthly
      const result = applyGrowth(1000, "CUSTOM_PERCENT", 0.12, inflationIndex, "2024-12-01");
      // After 11 months at 1% per month
      expect(result).toBeCloseTo(1115.67, 2);
    });

    it("CUSTOM_PERCENT with 0% returns original", () => {
      expect(applyGrowth(1000, "CUSTOM_PERCENT", 0, inflationIndex, "2024-06-01")).toBe(1000);
    });

    it("CUSTOM_PERCENT with undefined rate returns original", () => {
      expect(applyGrowth(1000, "CUSTOM_PERCENT", undefined, inflationIndex, "2024-06-01")).toBe(1000);
    });

    it("handles negative growth rates", () => {
      const result = applyGrowth(1000, "CUSTOM_PERCENT", -0.12, inflationIndex, "2024-12-01");
      expect(result).toBeLessThan(1000); // Should have decreased
    });
  });

  describe("getInflationFactor", () => {
    const inflationIndex = buildInflationIndex("2024-01-01", "2024-12-01", 0.03);

    it("returns factor from index", () => {
      expect(getInflationFactor(inflationIndex, "2024-01-01")).toBe(1.0);
    });

    it("returns 1 for date not in index", () => {
      expect(getInflationFactor(inflationIndex, "2025-01-01")).toBe(1);
    });
  });

  describe("nominalToReal", () => {
    const inflationIndex = buildInflationIndex("2024-01-01", "2024-12-01", 0.03);

    it("converts nominal to real dollars", () => {
      // If inflation factor is 1.1, then 1100 nominal = 1000 real
      const factor = getInflationFactor(inflationIndex, "2024-12-01");
      const nominal = 1000 * factor;
      const real = nominalToReal(nominal, inflationIndex, "2024-12-01");
      expect(real).toBeCloseTo(1000, 0);
    });

    it("returns same value at base date", () => {
      expect(nominalToReal(1000, inflationIndex, "2024-01-01")).toBe(1000);
    });
  });

  describe("realToNominal", () => {
    const inflationIndex = buildInflationIndex("2024-01-01", "2024-12-01", 0.03);

    it("converts real to nominal dollars", () => {
      const factor = getInflationFactor(inflationIndex, "2024-12-01");
      const nominal = realToNominal(1000, inflationIndex, "2024-12-01");
      expect(nominal).toBeCloseTo(1000 * factor, 2);
    });

    it("returns same value at base date", () => {
      expect(realToNominal(1000, inflationIndex, "2024-01-01")).toBe(1000);
    });

    it("round-trips with nominalToReal", () => {
      const real = 1000;
      const nominal = realToNominal(real, inflationIndex, "2024-06-01");
      const backToReal = nominalToReal(nominal, inflationIndex, "2024-06-01");
      expect(backToReal).toBeCloseTo(real, 2);
    });
  });
});
