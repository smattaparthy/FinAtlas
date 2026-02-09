import { describe, it, expect } from "vitest";
import {
  parseISO,
  formatISO,
  addMonths,
  diffMonths,
  startOfMonth,
  isBefore,
  isAfter,
  isSameMonth,
  getMonthKey,
  parseMonthKey,
} from "../../src/internal/dates";

describe("date utilities", () => {
  describe("parseISO and formatISO", () => {
    it("round-trips dates correctly", () => {
      const dateString = "2024-06-15";
      const parsed = parseISO(dateString);
      expect(formatISO(parsed)).toBe(dateString);
    });

    it("parses ISO dates with correct UTC values", () => {
      const date = parseISO("2024-03-15");
      expect(date.getUTCFullYear()).toBe(2024);
      expect(date.getUTCMonth()).toBe(2); // 0-indexed
      expect(date.getUTCDate()).toBe(15);
    });

    it("formats dates with leading zeros", () => {
      const date = new Date(Date.UTC(2024, 0, 5, 12, 0, 0));
      expect(formatISO(date)).toBe("2024-01-05");
    });
  });

  describe("addMonths", () => {
    it("adds months correctly", () => {
      const date = parseISO("2024-01-15");
      expect(formatISO(addMonths(date, 1))).toBe("2024-02-15");
      expect(formatISO(addMonths(date, 12))).toBe("2025-01-15");
    });

    it("handles year boundaries", () => {
      const date = parseISO("2024-11-15");
      expect(formatISO(addMonths(date, 2))).toBe("2025-01-15");
    });

    it("handles negative months (subtraction)", () => {
      const date = parseISO("2024-03-15");
      expect(formatISO(addMonths(date, -2))).toBe("2024-01-15");
    });

    it("handles month-end edge cases", () => {
      // Jan 31 + 1 month should be Feb 28/29
      const jan31 = parseISO("2024-01-31");
      expect(formatISO(addMonths(jan31, 1))).toBe("2024-02-29"); // 2024 is leap year

      const jan31_2023 = parseISO("2023-01-31");
      expect(formatISO(addMonths(jan31_2023, 1))).toBe("2023-02-28"); // 2023 is not leap year
    });
  });

  describe("diffMonths", () => {
    it("calculates month difference correctly", () => {
      const start = parseISO("2024-01-01");
      const end = parseISO("2024-12-01");
      expect(diffMonths(start, end)).toBe(11);
    });

    it("handles multi-year spans", () => {
      const start = parseISO("2020-01-01");
      const end = parseISO("2024-01-01");
      expect(diffMonths(start, end)).toBe(48);
    });

    it("returns negative for reverse order", () => {
      const start = parseISO("2024-06-01");
      const end = parseISO("2024-01-01");
      expect(diffMonths(start, end)).toBe(-5);
    });

    it("returns 0 for same month", () => {
      const start = parseISO("2024-03-15");
      const end = parseISO("2024-03-20");
      expect(diffMonths(start, end)).toBe(0);
    });
  });

  describe("startOfMonth", () => {
    it("returns first day of month", () => {
      const date = parseISO("2024-06-15");
      const result = startOfMonth(date);
      expect(result.getUTCDate()).toBe(1);
      expect(result.getUTCMonth()).toBe(5); // June
      expect(result.getUTCFullYear()).toBe(2024);
    });

    it("handles date already at start of month", () => {
      const date = parseISO("2024-06-01");
      const result = startOfMonth(date);
      expect(result.getUTCDate()).toBe(1);
    });
  });

  describe("isBefore and isAfter", () => {
    it("correctly compares dates", () => {
      const early = parseISO("2024-01-01");
      const late = parseISO("2024-12-31");

      expect(isBefore(early, late)).toBe(true);
      expect(isAfter(late, early)).toBe(true);
      expect(isBefore(late, early)).toBe(false);
      expect(isAfter(early, late)).toBe(false);
    });

    it("returns false for equal dates", () => {
      const date1 = parseISO("2024-06-15");
      const date2 = parseISO("2024-06-15");

      expect(isBefore(date1, date2)).toBe(false);
      expect(isAfter(date1, date2)).toBe(false);
    });
  });

  describe("isSameMonth", () => {
    it("identifies same month and year", () => {
      const date1 = parseISO("2024-06-15");
      const date2 = parseISO("2024-06-20");
      expect(isSameMonth(date1, date2)).toBe(true);
    });

    it("identifies different months", () => {
      const date1 = parseISO("2024-06-15");
      const date2 = parseISO("2024-07-15");
      expect(isSameMonth(date1, date2)).toBe(false);
    });

    it("identifies different years", () => {
      const date1 = parseISO("2024-06-15");
      const date2 = parseISO("2025-06-15");
      expect(isSameMonth(date1, date2)).toBe(false);
    });
  });

  describe("getMonthKey and parseMonthKey", () => {
    it("generates month key correctly", () => {
      const date = parseISO("2024-06-15");
      expect(getMonthKey(date)).toBe("2024-06");
    });

    it("includes leading zeros", () => {
      const date = parseISO("2024-01-05");
      expect(getMonthKey(date)).toBe("2024-01");
    });

    it("round-trips correctly", () => {
      const monthKey = "2024-06";
      const parsed = parseMonthKey(monthKey);
      expect(getMonthKey(parsed)).toBe(monthKey);
    });

    it("parses to first of month", () => {
      const parsed = parseMonthKey("2024-06");
      expect(parsed.getUTCDate()).toBe(1);
      expect(parsed.getUTCMonth()).toBe(5); // June
      expect(parsed.getUTCFullYear()).toBe(2024);
    });
  });
});
