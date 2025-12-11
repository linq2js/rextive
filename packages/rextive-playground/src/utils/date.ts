/**
 * Date Utility Functions
 *
 * Common date formatting and manipulation helpers used across the app.
 */

/**
 * Formats a date to show relative time (e.g., "Today", "Yesterday", "3 days ago").
 *
 * @param date - The date to format
 * @returns A human-readable relative time string
 */
export function formatLastPlayed(date: Date): string {
  const now = new Date();
  const lastPlayed = new Date(date);
  const diffDays = Math.floor(
    (now.getTime() - lastPlayed.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return lastPlayed.toLocaleDateString();
}

