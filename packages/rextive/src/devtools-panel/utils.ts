/**
 * DevTools Panel Utilities
 * Formatting and helper functions
 */

/**
 * Format a value for display (truncated)
 */
export const formatValue = (value: unknown, maxLength = 40): string => {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "function") return "[Function]";
  if (typeof value === "symbol") return value.toString();
  try {
    const str = JSON.stringify(value);
    return str.length > maxLength ? str.slice(0, maxLength) + "…" : str;
  } catch {
    return String(value);
  }
};

/**
 * Format a value for full display (not truncated)
 */
export const formatValueFull = (value: unknown): string => {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "function") return "[Function]";
  if (typeof value === "symbol") return value.toString();
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

/**
 * Format timestamp to time string (HH:MM:SS)
 */
export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

/**
 * Format snapshot timestamp
 */
export const formatSnapshotTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString("en-GB", { hour12: false });
};

/**
 * Get signal preview for snapshot display
 */
export const getSignalPreview = (
  snapshotSignals: Array<{ name: string }>,
  maxNames = 3
): string => {
  const names = snapshotSignals.slice(0, maxNames).map((s) => s.name);
  const remaining = snapshotSignals.length - maxNames;
  if (remaining > 0) {
    return `${names.join(", ")}... +${remaining}`;
  }
  return names.join(", ");
};

/**
 * Get tab label from tab id
 */
export const getTabLabel = (tab: string): string => {
  return tab.charAt(0).toUpperCase() + tab.slice(1);
};

