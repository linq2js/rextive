/**
 * Search Help Modal Component
 * Displays a comprehensive guide for the advanced search functionality
 */

import React from "react";
import { IconClose } from "./icons";
import * as styles from "./styles";

interface SearchHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchHelpModal({
  isOpen,
  onClose,
}: SearchHelpModalProps): React.ReactElement | null {
  if (!isOpen) return null;

  return (
    <div
      style={styles.modalOverlayStyles}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        style={styles.modalContainerStyles}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.modalHeaderStyles}>
          <h3 style={styles.modalTitleStyles}>🔍 Search Guide</h3>
          <button
            style={styles.modalCloseButtonStyles}
            onClick={onClose}
            title="Close"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = styles.colors.bgHover;
              e.currentTarget.style.color = styles.colors.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = styles.colors.textMuted;
            }}
          >
            <IconClose size={18} />
          </button>
        </div>

        <div style={styles.modalContentStyles}>
          {/* Basic Search */}
          <div style={styles.helpSectionStyles}>
            <h4 style={styles.helpSectionTitleStyles}>Basic Search</h4>
            <div style={styles.helpDescriptionStyles}>
              Type any text to search across signal names, values, and file
              paths. Search is case-insensitive.
            </div>
            <div style={styles.helpExampleStyles}>user</div>
            <div style={styles.helpDescriptionStyles}>
              Matches signals with "user" in name, value, or file path.
            </div>
          </div>

          {/* Field-Specific Search */}
          <div style={styles.helpSectionStyles}>
            <h4 style={styles.helpSectionTitleStyles}>Field-Specific Search</h4>
            <div style={styles.helpDescriptionStyles}>
              Use <code style={{ color: styles.colors.accent }}>field:value</code>{" "}
              syntax to search specific fields:
            </div>
            <ul style={styles.helpListStyles}>
              <li>
                <code style={{ color: styles.colors.accent }}>name:user</code> - Search by signal/tag name
              </li>
              <li>
                <code style={{ color: styles.colors.accent }}>value:42</code> - Search by signal value (stringified)
              </li>
              <li>
                <code style={{ color: styles.colors.accent }}>file:App.tsx</code> - Search by source file path
              </li>
              <li>
                <code style={{ color: styles.colors.accent }}>tag:form</code> - Search signals by tag membership
              </li>
              <li>
                <code style={{ color: styles.colors.accent }}>kind:mutable</code> - Filter by signal kind (mutable/computed)
              </li>
              <li>
                <code style={{ color: styles.colors.accent }}>error:true</code> - Show only signals with errors
              </li>
              <li>
                <code style={{ color: styles.colors.accent }}>disposed:true</code> - Show only disposed signals
              </li>
            </ul>
          </div>

          {/* Multiple Filters */}
          <div style={styles.helpSectionStyles}>
            <h4 style={styles.helpSectionTitleStyles}>Multiple Filters</h4>
            <div style={styles.helpDescriptionStyles}>
              Combine multiple field filters:
            </div>
            <div style={styles.helpExampleStyles}>
              name:user kind:computed error:false
            </div>
            <div style={styles.helpDescriptionStyles}>
              Finds computed signals named "user" without errors.
            </div>
          </div>

          {/* Regex Patterns */}
          <div style={styles.helpSectionStyles}>
            <h4 style={styles.helpSectionTitleStyles}>Regex Patterns</h4>
            <div style={styles.helpDescriptionStyles}>
              Wrap your pattern in <code style={{ color: styles.colors.accent }}>/</code> for regex matching:
            </div>
            <div style={styles.helpExampleStyles}>/user.*count/i</div>
            <div style={styles.helpDescriptionStyles}>
              Matches "userCount", "user_count", etc. (case-insensitive).
            </div>
          </div>

          {/* Auto-Generated Override */}
          <div style={styles.helpSectionStyles}>
            <h4 style={styles.helpSectionTitleStyles}>Auto-Generated Signals</h4>
            <div style={styles.helpDescriptionStyles}>
              Prefix your search with <code style={{ color: styles.colors.accent }}>#</code> to include auto-generated signals:
            </div>
            <div style={styles.helpExampleStyles}>#signal</div>
            <div style={styles.helpDescriptionStyles}>
              Searches auto-generated signals even when "Show #auto" is disabled.
            </div>
          </div>

          {/* Examples */}
          <div style={styles.helpSectionStyles}>
            <h4 style={styles.helpSectionTitleStyles}>Examples</h4>
            <div style={styles.helpExampleStyles}>
              {`# Find all user-related signals
name:user

# Find signals with value 42
value:42

# Find signals from App.tsx
file:App.tsx

# Find computed signals with errors
kind:computed error:true

# Find signals matching pattern
/user.*count/i

# Complex query
name:user kind:mutable file:App.tsx tag:form`}
            </div>
          </div>

          {/* Tips */}
          <div style={styles.helpSectionStyles}>
            <h4 style={styles.helpSectionTitleStyles}>💡 Tips</h4>
            <ul style={styles.helpListStyles}>
              <li>Value search works on stringified JSON for objects/arrays</li>
              <li>File search matches any part of the file path</li>
              <li>Tag search finds signals that belong to the specified tag</li>
              <li>Boolean fields (error, disposed) use <code style={{ color: styles.colors.accent }}>true</code> or <code style={{ color: styles.colors.accent }}>false</code></li>
              <li>Press <code style={{ color: styles.colors.accent }}>Escape</code> to close this modal</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

