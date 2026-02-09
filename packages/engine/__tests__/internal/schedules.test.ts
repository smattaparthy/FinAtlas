import { describe, it, expect } from "vitest";
import {
  normalizeToMonthly,
  monthlyToFrequency,
  generateSchedule,
  isDateInPeriod,
  getMonthKeyFromDate,
  generateMonthRange,
} from "../../src/internal/schedules";
import type { Frequency } from "../../src/types";

describe("schedule utilities", () => {
  describe("normalizeToMonthly", () => {
    it("MONTHLY returns same amount", () => {
      expect(normalizeToMonthly(1000, "MONTHLY")).toBe(1000);
    });

    it("BIWEEKLY converts correctly (26 periods/year)", () => {
      // 1000 biweekly = 26000/year = 2166.67/month
      expect(normalizeToMonthly(1000, "BIWEEKLY")).toBeCloseTo(2166.67, 2);
    });

    it("WEEKLY converts correctly (52 periods/year)", () => {
      // 1000 weekly = 52000/year = 4333.33/month
      expect(normalizeToMonthly(1000, "WEEKLY")).toBeCloseTo(4333.33, 2);
    });

    it("ANNUAL converts correctly (1 period/year)", () => {
      // 12000 annual = 1000/month
      expect(normalizeToMonthly(12000, "ANNUAL")).toBe(1000);
    });

    it("ONE_TIME returns original amount", () => {
      expect(normalizeToMonthly(5000, "ONE_TIME")).toBe(5000);
    });
  });

  describe("monthlyToFrequency", () => {
    it("converts to BIWEEKLY", () => {
      // 2166.67 monthly = 1000 biweekly
      expect(monthlyToFrequency(2166.67, "BIWEEKLY")).toBeCloseTo(1000, 0);
    });

    it("converts to WEEKLY", () => {
      // 4333.33 monthly = 1000 weekly
      expect(monthlyToFrequency(4333.33, "WEEKLY")).toBeCloseTo(1000, 0);
    });

    it("converts to ANNUAL", () => {
      // 1000 monthly = 12000 annual
      expect(monthlyToFrequency(1000, "ANNUAL")).toBe(12000);
    });

    it("round-trips correctly", () => {
      const frequencies: Frequency[] = ["MONTHLY", "BIWEEKLY", "WEEKLY", "ANNUAL"];
      for (const freq of frequencies) {
        const monthly = normalizeToMonthly(1000, freq);
        const backToFreq = monthlyToFrequency(monthly, freq);
        expect(backToFreq).toBeCloseTo(1000, 1);
      }
    });
  });

  describe("generateSchedule", () => {
    it("generates monthly schedule for date range", () => {
      const schedule = generateSchedule(
        "2024-01-01",
        undefined,
        "2024-03-01",
        "MONTHLY"
      );
      expect(schedule).toEqual(["2024-01", "2024-02", "2024-03"]);
    });

    it("respects end date", () => {
      const schedule = generateSchedule(
        "2024-01-01",
        "2024-02-01",
        "2024-12-01",
        "MONTHLY"
      );
      expect(schedule).toEqual(["2024-01", "2024-02"]);
    });

    it("ONE_TIME generates single entry", () => {
      const schedule = generateSchedule(
        "2024-06-15",
        undefined,
        "2024-12-01",
        "ONE_TIME"
      );
      expect(schedule).toEqual(["2024-06"]);
    });

    it("ONE_TIME outside range generates empty schedule", () => {
      const schedule = generateSchedule(
        "2025-01-01",
        undefined,
        "2024-12-01",
        "ONE_TIME"
      );
      expect(schedule).toEqual([]);
    });

    it("handles all recurring frequencies", () => {
      const frequencies: Frequency[] = ["MONTHLY", "BIWEEKLY", "WEEKLY", "ANNUAL"];
      for (const freq of frequencies) {
        const schedule = generateSchedule(
          "2024-01-01",
          undefined,
          "2024-03-01",
          freq
        );
        expect(schedule.length).toBeGreaterThan(0);
        expect(schedule[0]).toBe("2024-01");
      }
    });
  });

  describe("isDateInPeriod", () => {
    it("returns true for date within period", () => {
      expect(isDateInPeriod("2024-06-15", "2024-01-01", "2024-12-31")).toBe(true);
    });

    it("returns false for date before start", () => {
      expect(isDateInPeriod("2023-12-15", "2024-01-01", "2024-12-31")).toBe(false);
    });

    it("returns false for date after end", () => {
      expect(isDateInPeriod("2025-01-15", "2024-01-01", "2024-12-31")).toBe(false);
    });

    it("returns true when no end date provided", () => {
      expect(isDateInPeriod("2025-06-15", "2024-01-01", undefined)).toBe(true);
    });

    it("includes start date", () => {
      expect(isDateInPeriod("2024-01-01", "2024-01-01", "2024-12-31")).toBe(true);
    });

    it("includes end date", () => {
      expect(isDateInPeriod("2024-12-31", "2024-01-01", "2024-12-31")).toBe(true);
    });
  });

  describe("getMonthKeyFromDate", () => {
    it("extracts month key from date", () => {
      expect(getMonthKeyFromDate("2024-06-15")).toBe("2024-06");
      expect(getMonthKeyFromDate("2024-01-01")).toBe("2024-01");
    });
  });

  describe("generateMonthRange", () => {
    it("generates range of month keys", () => {
      const months = generateMonthRange("2024-01-01", "2024-03-01");
      expect(months).toEqual(["2024-01", "2024-02", "2024-03"]);
    });

    it("handles single month", () => {
      const months = generateMonthRange("2024-06-01", "2024-06-30");
      expect(months).toEqual(["2024-06"]);
    });

    it("handles year boundaries", () => {
      const months = generateMonthRange("2023-11-01", "2024-02-01");
      expect(months).toEqual(["2023-11", "2023-12", "2024-01", "2024-02"]);
    });
  });
});
