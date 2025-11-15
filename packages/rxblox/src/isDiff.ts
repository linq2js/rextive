/**
 * Checks if two Sets are different by comparing their sizes and contents.
 * Two sets are considered different if they have different sizes or contain different items.
 *
 * @param a - First set to compare
 * @param b - Second set to compare
 * @returns True if the sets are different, false if they are the same
 */
export function isDiff<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) {
    return true;
  }
  for (const item of a) {
    if (!b.has(item)) {
      return true;
    }
  }
  for (const item of b) {
    if (!a.has(item)) {
      return true;
    }
  }
  return false;
}
