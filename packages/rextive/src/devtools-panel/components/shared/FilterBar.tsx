/**
 * FilterBar Component
 * Unified filter bar with filter groups separated by dividers
 */

import React from "react";
import * as styles from "../../styles";

/**
 * Separator component for visual grouping
 */
export function FilterSeparator(): React.ReactElement {
  return (
    <div
      style={{
        width: "1px",
        height: "16px",
        backgroundColor: styles.colors.border,
        margin: "0 4px",
        flexShrink: 0,
      }}
    />
  );
}

interface FilterGroupProps {
  children: React.ReactNode;
}

/**
 * FilterGroup component - keeps buttons together on the same line (no wrap within group)
 * Includes a left separator for visual grouping
 */
export function FilterGroup({ children }: FilterGroupProps): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        flexShrink: 0,
        flexWrap: "nowrap",
      }}
    >
      {/* Left separator */}
      <div
        style={{
          width: "1px",
          height: "16px",
          backgroundColor: styles.colors.border,
          marginRight: "4px",
          flexShrink: 0,
        }}
      />
      {children}
    </div>
  );
}

interface FilterBarProps {
  /** All filter elements (use FilterSeparator for visual grouping) */
  filters?: React.ReactNode;
}

export function FilterBar({
  filters,
}: FilterBarProps): React.ReactElement | null {
  if (!filters) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        padding: "6px 8px",
        borderBottom: `1px solid ${styles.colors.border}`,
        backgroundColor: styles.colors.bg,
        flexShrink: 0,
        flexWrap: "wrap",
      }}
    >
      {filters}
    </div>
  );
}

