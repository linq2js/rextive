/**
 * SearchBox Component
 * Optional main search box for tab content
 */

import React from "react";
import * as styles from "../../styles";
import { IconClose, IconHelp, IconSearch } from "../../icons";

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showHelp?: boolean;
  onHelpClick?: () => void;
  leftActions?: React.ReactNode;
}

export function SearchBox({
  value,
  onChange,
  placeholder = "Search...",
  showHelp = true,
  onHelpClick,
  leftActions,
}: SearchBoxProps): React.ReactElement {
  return (
    <div style={styles.searchContainerStyles}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {leftActions}
        <div style={{ ...styles.searchBoxStyles, flex: 1 }}>
          <span style={styles.searchIconStyles}>
            <IconSearch size={12} />
          </span>
          <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={styles.searchInputStyles}
            onClick={(e) => e.stopPropagation()}
          />
          {showHelp && onHelpClick && (
            <button
              style={{
                ...styles.searchClearStyles,
                opacity: 0.7,
                marginRight: value ? "4px" : "0",
              }}
              onClick={(e) => {
                e.stopPropagation();
                onHelpClick();
              }}
              title="Search help"
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.backgroundColor = styles.colors.bgHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "0.7";
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <IconHelp size={12} />
            </button>
          )}
          {value && (
            <button
              style={styles.searchClearStyles}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              title="Clear search"
            >
              <IconClose size={10} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

