/**
 * Unit tests for validation utilities
 * Run with: pnpm test validation.test.ts
 */
import { describe, it, expect } from "vitest";

import {
  sanitizeString,
  validateId,
  validatePagination,
  validateNumberRange,
  validateArrayLength,
} from "../validation";

describe("validation utilities", () => {
  describe("sanitizeString", () => {
    it("should trim whitespace", () => {
      expect(sanitizeString("  hello  ", 100)).toBe("hello");
    });

    it("should limit length", () => {
      expect(sanitizeString("abcdefghij", 5)).toBe("abcde");
    });

    it("should handle empty strings", () => {
      expect(sanitizeString("", 100)).toBe("");
    });
  });

  describe("validateId", () => {
    it("should accept valid CUID", () => {
      expect(validateId("c1234567890abcdefghijk123")).toBe(true);
    });

    it("should reject invalid format", () => {
      expect(validateId("invalid")).toBe(false);
      expect(validateId("x1234567890abcdefghijk123")).toBe(false);
      expect(validateId("c123")).toBe(false);
    });
  });

  describe("validatePagination", () => {
    it("should bound page to minimum 1", () => {
      const result = validatePagination(0, 10);
      expect(result.page).toBe(1);
    });

    it("should bound limit to maximum 100", () => {
      const result = validatePagination(1, 200);
      expect(result.limit).toBe(100);
    });

    it("should calculate skip correctly", () => {
      const result = validatePagination(3, 10);
      expect(result.skip).toBe(20);
    });

    it("should handle negative values", () => {
      const result = validatePagination(-5, -10);
      // Math.abs(-5) = 5, Math.abs(-10) = 10
      expect(result.page).toBe(5);
      expect(result.limit).toBe(10);
      expect(result.skip).toBe(40);
    });
  });

  describe("validateNumberRange", () => {
    it("should bound to min", () => {
      expect(validateNumberRange(5, 10, 20)).toBe(10);
    });

    it("should bound to max", () => {
      expect(validateNumberRange(25, 10, 20)).toBe(20);
    });

    it("should allow values in range", () => {
      expect(validateNumberRange(15, 10, 20)).toBe(15);
    });
  });

  describe("validateArrayLength", () => {
    it("should accept valid arrays", () => {
      expect(validateArrayLength([1, 2, 3], 10)).toBe(true);
    });

    it("should reject empty arrays", () => {
      expect(validateArrayLength([], 10)).toBe(false);
    });

    it("should reject arrays exceeding max", () => {
      expect(validateArrayLength([1, 2, 3, 4, 5], 3)).toBe(false);
    });

    it("should reject non-arrays", () => {
      expect(validateArrayLength("not an array" as any, 10)).toBe(false);
    });
  });
});
