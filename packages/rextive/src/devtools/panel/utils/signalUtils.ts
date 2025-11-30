/**
 * Signal value extraction utilities
 */

import { loadable } from "../../../utils/loadable";
import { isPromiseLike } from "../../../utils/isPromiseLike";
import { signal } from "../../../index";
import type { SignalInfo } from "../../types";

/**
 * Extract current value from a signal, handling errors and async states
 * Also handles cases where the value itself is a signal (nested signals)
 */
export function extractSignalValue(info: SignalInfo): {
  value: unknown;
  error: unknown;
} {
  let currentValue: unknown;
  let signalError: unknown = undefined;

  if (info.disposed) {
    // Format disposal time
    const disposedTime = info.disposedAt
      ? new Date(info.disposedAt).toLocaleTimeString()
      : "";
    currentValue = disposedTime
      ? `[disposed at ${disposedTime}]`
      : "[disposed]";
  } else {
    // Check for error first (works for both sync and async signals)
    signalError = info.signal.error();
    if (signalError) {
      currentValue = signalError;
    } else {
      currentValue = info.signal.tryGet();
      
      // Handle nested signals - if the value is itself a signal, extract its value
      if (signal.is(currentValue)) {
        try {
          const nestedError = (currentValue as any).error?.();
          if (nestedError) {
            currentValue = `[Signal with error: ${String(nestedError)}]`;
          } else {
            const nestedValue = (currentValue as any).tryGet?.();
            if (nestedValue !== undefined) {
              // Recursively handle nested signals
              currentValue = signal.is(nestedValue) 
                ? `[Signal: ${(nestedValue as any).displayName || "nested"}]`
                : nestedValue;
            } else {
              currentValue = `[Signal: ${(currentValue as any).displayName || "signal"}]`;
            }
          }
        } catch {
          currentValue = `[Signal: ${(currentValue as any).displayName || "signal"}]`;
        }
      }
      // For async signals, show the resolved/rejected value from loadable
      else if (isPromiseLike(currentValue)) {
        const state = loadable(currentValue);
        if (state.status === "success") {
          currentValue = state.value;
        } else if (state.status === "error") {
          signalError = state.error;
          currentValue = state.error;
        } else {
          // Loading state - show "[async]"
          currentValue = "[async]";
        }
      }
    }
  }

  return { value: currentValue, error: signalError };
}

