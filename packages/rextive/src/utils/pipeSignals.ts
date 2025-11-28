import { is } from "../is";
import { AUTO_NAME_PREFIX } from "./nameGenerator";

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

  // Rename auto-generated signal names to something more meaningful.
  // This improves DevTools visibility by showing the source signal name.
  //
  // Before: #computed-42
  // After:  pipe(count|#computed-42)
  //
  // Conditions for renaming:
  // 1. is(result)           - Result is a valid signal (not a plain object)
  // 2. startsWith(AUTO_NAME_PREFIX) - Only rename auto-generated names (#...),
  //                                   preserve user-defined names
  if (is(result) && result.displayName.startsWith(AUTO_NAME_PREFIX)) {
    Object.assign(result, {
      displayName: `pipe(${source.displayName}|${result.displayName})`,
    });
    // Notify DevTools of the rename
    globalThis.__REXTIVE_DEVTOOLS__?.onSignalRename?.(result as any);
  }

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
