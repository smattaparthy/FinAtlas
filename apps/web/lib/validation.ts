/**
 * Input validation and sanitization utilities for API security
 */

/**
 * Sanitizes a string by trimming whitespace and limiting length
 * @param input - The input string to sanitize
 * @param maxLength - Maximum allowed length
 * @returns Sanitized string
 */
export function sanitizeString(input: string, maxLength: number): string {
  const trimmed = input.trim();
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

/**
 * Validates if a string matches CUID format
 * @param id - The ID string to validate
 * @returns true if valid CUID format
 */
export function validateId(id: string): boolean {
  // CUID format: c followed by 24 alphanumeric characters
  const cuidRegex = /^c[a-z0-9]{24}$/i;
  return cuidRegex.test(id);
}

/**
 * Validates and bounds pagination parameters
 * @param page - Page number (1-based)
 * @param limit - Items per page
 * @returns Validated pagination parameters
 */
export function validatePagination(
  page: number,
  limit: number
): { page: number; limit: number; skip: number } {
  // Ensure positive integers
  const validPage = Math.max(1, Math.floor(Math.abs(page)));
  // Cap limit to prevent excessive queries (max 100 items)
  const validLimit = Math.min(100, Math.max(1, Math.floor(Math.abs(limit))));
  const skip = (validPage - 1) * validLimit;

  return {
    page: validPage,
    limit: validLimit,
    skip,
  };
}

/**
 * Extracts client IP from request headers
 * @param request - Next.js request object
 * @returns IP address string
 */
export function getClientIp(request: Request): string {
  // Check common proxy headers
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

/**
 * Validates if a number is within a safe range
 * @param value - Number to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Bounded number
 */
export function validateNumberRange(
  value: number,
  min: number,
  max: number
): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Validates array length to prevent DoS attacks
 * @param arr - Array to validate
 * @param maxLength - Maximum allowed length
 * @returns true if array length is valid
 */
export function validateArrayLength<T>(arr: T[], maxLength: number): boolean {
  return Array.isArray(arr) && arr.length > 0 && arr.length <= maxLength;
}
