/**
 * Formatting utilities for DevTools
 */

import { signal } from "@/index";

export function formatValue(value: unknown, maxLength = 40): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "function") {
    // Check if it's a signal
    if (signal.is(value)) {
      try {
        const nestedValue = (value as any).tryGet?.();
        if (nestedValue !== undefined) {
          return formatValue(nestedValue, maxLength);
        }
        return `[Signal: ${(value as any).displayName || "signal"}]`;
      } catch {
        return `[Signal: ${(value as any).displayName || "signal"}]`;
      }
    }
    return "[Function]";
  }
  if (typeof value === "symbol") return value.toString();
  try {
    const str = JSON.stringify(value);
    return str.length > maxLength ? str.slice(0, maxLength) + "…" : str;
  } catch {
    return String(value);
  }
}

export function formatValueFull(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "function") {
    // Check if it's a signal
    if (signal.is(value)) {
      try {
        const nestedError = (value as any).error?.();
        if (nestedError) {
          return `[Signal with error: ${String(nestedError)}]`;
        }
        const nestedValue = (value as any).tryGet?.();
        if (nestedValue !== undefined) {
          // Recursively format nested value
          return formatValueFull(nestedValue);
        }
        return `[Signal: ${(value as any).displayName || "signal"}]`;
      } catch {
        return `[Signal: ${(value as any).displayName || "signal"}]`;
      }
    }
    return "[Function]";
  }
  if (typeof value === "symbol") return value.toString();
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

