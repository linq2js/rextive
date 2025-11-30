/**
 * FilterBar Component
 * Filter bar with left (wrap) and right (no wrap) groups
 */

import React from "react";
import * as styles from "../../styles";

interface FilterBarProps {
  leftFilters?: React.ReactNode;
  rightFilters?: React.ReactNode;
}

export function FilterBar({
  leftFilters,
  rightFilters,
}: FilterBarProps): React.ReactElement | null {
  if (!leftFilters && !rightFilters) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "6px",
        padding: "6px 8px",
        borderBottom: `1px solid ${styles.colors.border}`,
        backgroundColor: styles.colors.bg,
        flexShrink: 0,
        flexWrap: "wrap",
      }}
    >
      {/* Left filters - can wrap */}
      {leftFilters && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flexWrap: "wrap",
            flex: 1,
            minWidth: 0,
          }}
        >
          {leftFilters}
        </div>
      )}

      {/* Right filters - no wrap */}
      {rightFilters && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flexWrap: "nowrap",
            flexShrink: 0,
          }}
        >
          {rightFilters}
        </div>
      )}
    </div>
  );
}

