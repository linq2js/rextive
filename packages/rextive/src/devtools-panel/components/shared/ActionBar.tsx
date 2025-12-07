/**
 * ActionBar Component
 * Action bar that can wrap if too many buttons
 */

import React, { memo } from "react";
import * as styles from "../../styles";

interface ActionBarProps {
  children: React.ReactNode;
}

export const ActionBar = memo(function ActionBar({
  children,
}: ActionBarProps): React.ReactElement | null {
  if (!children) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 8px",
        borderBottom: `1px solid ${styles.colors.border}`,
        backgroundColor: styles.colors.bg,
        flexShrink: 0,
        flexWrap: "wrap",
      }}
    >
      {children}
    </div>
  );
});

