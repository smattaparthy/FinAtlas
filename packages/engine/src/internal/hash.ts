/**
 * Input hashing for caching purposes.
 * Uses a deterministic hash to identify identical inputs.
 */
import type { ScenarioInputDTO } from "../types";

/**
 * Simple string hash function (djb2 algorithm).
 * Produces a 32-bit hash as a hex string.
 *
 * Note: For production, consider using SHA-256 via crypto module.
 * This implementation is for demonstration and works in all environments.
 *
 * @param str - String to hash
 * @returns Hash as hexadecimal string
 */
function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return hash >>> 0; // Convert to unsigned 32-bit
}

/**
 * Create a more robust hash by combining multiple djb2 passes.
 * Produces a 64-character hex string similar to SHA-256.
 *
 * @param str - String to hash
 * @returns 64-character hex hash
 */
function multiPassHash(str: string): string {
  const parts: string[] = [];

  // Use different seeds for each pass
  const seeds = [5381, 33, 65599, 31];

  for (const seed of seeds) {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    }
    // Add character position variant
    for (let i = 0; i < str.length; i++) {
      hash = ((hash * 33) ^ (str.charCodeAt(i) * (i + 1))) >>> 0;
    }
    parts.push((hash >>> 0).toString(16).padStart(8, "0"));
  }

  // Add length-based variations
  const len = str.length;
  parts.push(((len * 2654435761) >>> 0).toString(16).padStart(8, "0"));
  parts.push(((len * 1597334677) >>> 0).toString(16).padStart(8, "0"));
  parts.push(((djb2Hash(str.slice(0, len / 2))) >>> 0).toString(16).padStart(8, "0"));
  parts.push(((djb2Hash(str.slice(len / 2))) >>> 0).toString(16).padStart(8, "0"));

  return parts.join("");
}

/**
 * Serialize input to a canonical JSON string.
 * Keys are sorted to ensure deterministic output.
 *
 * @param input - Input object to serialize
 * @returns Canonical JSON string
 */
function canonicalJSON(input: unknown): string {
  return JSON.stringify(input, Object.keys(input as object).sort(), 0);
}

/**
 * Recursively sort object keys for deterministic serialization.
 *
 * @param obj - Object to sort
 * @returns Object with sorted keys (deep)
 */
function sortObjectKeys<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys) as T;
  }

  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj as object).sort();

  for (const key of keys) {
    sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
  }

  return sorted as T;
}

/**
 * Generate a hash of the input for caching.
 * The hash is deterministic - same input always produces same hash.
 *
 * @param input - Scenario input to hash
 * @returns 64-character hex hash string
 */
export function hashInput(input: ScenarioInputDTO): string {
  // Sort all keys recursively for deterministic JSON
  const sorted = sortObjectKeys(input);

  // Convert to canonical JSON (no whitespace, sorted keys)
  const json = JSON.stringify(sorted);

  // Generate hash
  return multiPassHash(json);
}

/**
 * Create a short hash (first 8 characters) for display purposes.
 *
 * @param input - Scenario input to hash
 * @returns 8-character short hash
 */
export function shortHash(input: ScenarioInputDTO): string {
  return hashInput(input).slice(0, 8);
}

/**
 * Check if two inputs would produce the same hash.
 *
 * @param a - First input
 * @param b - Second input
 * @returns True if inputs are equivalent for caching
 */
export function inputsEqual(a: ScenarioInputDTO, b: ScenarioInputDTO): boolean {
  return hashInput(a) === hashInput(b);
}
