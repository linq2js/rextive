/**
 * Transform utility for chaining signal transformations
 *
 * Automatically tracks and disposes intermediate signals when the final result is disposed.
 *
 * @param source - The source signal to start the transformation chain
 * @param operators - Array of operator functions that transform signals
 * @returns The final transformed signal with automatic cleanup
 */
export function pipeSignals(
  source: any,
  operators: Array<(source: any) => any>
): any {
  if (operators.length === 0) return source;

  const intermediates: any[] = [];
  const result = operators.reduce((acc, op) => {
    const next = op(acc);
    if (next !== acc && next !== source) {
      intermediates.push(acc);
    }
    return next;
  }, source);

  // If no intermediates were created, return as-is
  if (intermediates.length === 0 || result === source) return result;

  if (result && (typeof result === "object" || typeof result === "function")) {
    // Attach dispose that cleans up intermediates
    const originalDispose = result.dispose;
    result.dispose = () => {
      intermediates.forEach((s) => s?.dispose?.());
      // Call original dispose if it exists
      if (typeof originalDispose === "function") {
        originalDispose.call(result);
      }
    };
  }

  return result;
}
