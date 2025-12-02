/**
 * TabContent Component
 * Wrapper for tab content with optional search, filter bar, action bar, and main content
 */

import React from "react";
import * as styles from "../../styles";
import { SearchBox } from "./SearchBox";
import { FilterBar } from "./FilterBar";
import { ActionBar } from "./ActionBar";

interface TabContentProps {
  // Optional search box
  searchBox?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    showHelp?: boolean;
    onHelpClick?: () => void;
    leftActions?: React.ReactNode;
  };

  // Optional filter bar (unified - use FilterSeparator for grouping)
  filterBar?: React.ReactNode;

  // Optional action bar
  actionBar?: React.ReactNode;

  // Main content
  children: React.ReactNode;
}

export function TabContent({
  searchBox,
  filterBar,
  actionBar,
  children,
}: TabContentProps): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Optional search box */}
      {searchBox && (
        <SearchBox
          value={searchBox.value}
          onChange={searchBox.onChange}
          placeholder={searchBox.placeholder}
          showHelp={searchBox.showHelp}
          onHelpClick={searchBox.onHelpClick}
          leftActions={searchBox.leftActions}
        />
      )}

      {/* Optional filter bar */}
      {filterBar && <FilterBar filters={filterBar} />}

      {/* Optional action bar */}
      {actionBar && <ActionBar>{actionBar}</ActionBar>}

      {/* Main content */}
      <div style={styles.contentStyles}>{children}</div>
    </div>
  );
}

