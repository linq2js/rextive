/**
 * TabBar Component
 * Displays tab headings/titles
 */

import React from "react";
import * as styles from "../../styles";

interface TabBarProps {
  tabs: Array<{ id: string; label: React.ReactNode }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function TabBar({
  tabs,
  activeTab,
  onTabChange,
}: TabBarProps): React.ReactElement {
  return (
    <div style={styles.tabsContainerStyles}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          style={styles.tabStyles(activeTab === tab.id)}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

