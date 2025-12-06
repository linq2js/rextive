/**
 * Transform utility for chaining signal transformations
 *
 * Automatically tracks and disposes intermediate signals when the final result is disposed.
 *
 * @param source - The source signal to start the transformation chain
 * @param operators - Array of operator functions that transform signals
 * @returns The final transformed signal with automatic cleanup
 */
export function signalPipe(
  source: any,
  operators: Array<(source: any) => any>
): any {
  if (operators.length === 0) return source;

  const intermediates = new Set<any>();
  const result = operators.reduce((acc, op) => {
    const next = op(acc);
    if (next !== acc && next !== source) {
      intermediates.add(acc);
    }
    return next;
  }, source);

  intermediates.delete(source);

  // If result is unchanged, return as-is
  if (result === source) return result;

  // If no intermediates, no need for cleanup dispose
  if (intermediates.size === 0) return result;

  // Attach dispose that cleans up intermediates
  if (result && (typeof result === "object" || typeof result === "function")) {
    const originalDispose = result.dispose;
    result.dispose = () => {
      for (const s of intermediates) {
        s?.dispose?.();
      }
      // Call original dispose if it exists
      if (typeof originalDispose === "function") {
        originalDispose.call(result);
      }
    };
  }

  return result;
}
