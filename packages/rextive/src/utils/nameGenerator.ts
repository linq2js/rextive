/**
 * Auto-incrementing counter for generating unique names.
 *
 * Used by devtools to identify signals, tags, etc. when no explicit name is provided.
 * Format: `{kind}-{counter}` (e.g., "mutable-1", "computed-42", "tag-5")
 *
 * @module nameGenerator
 */

let counter = 0;

/**
 * Valid prefixes for auto-generated names.
 */
export type NamePrefix = "mutable" | "computed" | "tag";

/**
 * Generate a unique name with the given prefix.
 * @param prefix - The prefix to use: "mutable", "computed", or "tag"
 * @returns Name in format "{prefix}-{n}"
 */
export function nextName(prefix: NamePrefix): string {
  return `${prefix}-${++counter}`;
}

/**
 * Reset counter (for testing purposes only).
 * @internal
 */
export function resetCounter(): void {
  counter = 0;
}

/**
 * Get current counter value (for debugging/devtools).
 * @internal
 */
export function getCounter(): number {
  return counter;
}
