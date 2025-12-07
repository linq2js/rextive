/**
 * TabBar Component
 * Displays tab headings/titles with optional flash animation
 */

import React, { memo } from "react";
import * as styles from "../../styles";

interface TabBarProps {
  tabs: Array<{ id: string; label: React.ReactNode }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  /** Set of tab IDs that should be flashing */
  flashingTabs?: Set<string>;
}

export const TabBar = memo(function TabBar({
  tabs,
  activeTab,
  onTabChange,
  flashingTabs,
}: TabBarProps): React.ReactElement {
  return (
    <div style={styles.tabsContainerStyles}>
      {/* Flash animation keyframes */}
      <style>
        {`
          @keyframes tab-flash {
            0%, 100% { 
              background-color: transparent;
              box-shadow: none;
            }
            50% { 
              background-color: ${styles.colors.warning}33;
              box-shadow: 0 0 8px ${styles.colors.warning}66;
            }
          }
        `}
      </style>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const isFlashing = flashingTabs?.has(tab.id) && !isActive;

        return (
          <button
            key={tab.id}
            style={{
              ...styles.tabStyles(isActive),
              ...(isFlashing && {
                animation: "tab-flash 0.5s ease-in-out 3",
              }),
            }}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
});
