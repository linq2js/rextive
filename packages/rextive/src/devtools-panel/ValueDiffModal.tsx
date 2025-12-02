/**
 * Value Diff Modal Component
 * Shows side-by-side comparison of two signal values
 */

import React from "react";
import { IconClose } from "./icons";
import * as styles from "./styles";

interface ValueDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  signalName: string;
  currentValue: unknown;
  historyValue: unknown;
  historyTimestamp: number;
  formatTime: (timestamp: number) => string;
}

/**
 * Deep diff two values and return formatted diff
 */
function diffValues(oldValue: unknown, newValue: unknown): {
  old: string;
  new: string;
  hasChanges: boolean;
} {
  const formatValue = (value: unknown): string => {
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

  const oldStr = formatValue(oldValue);
  const newStr = formatValue(newValue);

  // Simple diff: if strings are equal, no changes
  if (oldStr === newStr) {
    return {
      old: oldStr,
      new: newStr,
      hasChanges: false,
    };
  }

  // For more complex diff, we could use a library like diff-match-patch
  // For now, just show both values side by side
  return {
    old: oldStr,
    new: newStr,
    hasChanges: true,
  };
}

export function ValueDiffModal({
  isOpen,
  onClose,
  signalName,
  currentValue,
  historyValue,
  historyTimestamp,
  formatTime,
}: ValueDiffModalProps): React.ReactElement | null {
  if (!isOpen) return null;

  const diff = diffValues(historyValue, currentValue);

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
          <h3 style={styles.modalTitleStyles}>Compare Values: {signalName}</h3>
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
          <div style={{ marginBottom: "16px" }}>
            <div style={styles.helpDescriptionStyles}>
              Comparing value from {formatTime(historyTimestamp)} with current
              value
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            {/* History Value */}
            <div>
              <div
                style={{
                  ...styles.helpSectionTitleStyles,
                  marginBottom: "8px",
                  fontSize: "12px",
                }}
              >
                Previous Value ({formatTime(historyTimestamp)})
              </div>
              <div
                style={{
                  ...styles.helpExampleStyles,
                  maxHeight: "400px",
                  overflow: "auto",
                  backgroundColor: diff.hasChanges
                    ? "rgba(233, 69, 96, 0.1)"
                    : styles.colors.bgLight,
                  borderColor: diff.hasChanges
                    ? styles.colors.error
                    : styles.colors.border,
                }}
              >
                {diff.old}
              </div>
            </div>

            {/* Current Value */}
            <div>
              <div
                style={{
                  ...styles.helpSectionTitleStyles,
                  marginBottom: "8px",
                  fontSize: "12px",
                }}
              >
                Current Value
              </div>
              <div
                style={{
                  ...styles.helpExampleStyles,
                  maxHeight: "400px",
                  overflow: "auto",
                  backgroundColor: diff.hasChanges
                    ? "rgba(78, 204, 163, 0.1)"
                    : styles.colors.bgLight,
                  borderColor: diff.hasChanges
                    ? styles.colors.success
                    : styles.colors.border,
                }}
              >
                {diff.new}
              </div>
            </div>
          </div>

          {!diff.hasChanges && (
            <div
              style={{
                ...styles.helpDescriptionStyles,
                textAlign: "center",
                color: styles.colors.success,
                padding: "8px",
                backgroundColor: "rgba(78, 204, 163, 0.1)",
                borderRadius: "4px",
              }}
            >
              ✓ Values are identical
            </div>
          )}

          {diff.hasChanges && (
            <div
              style={{
                ...styles.helpDescriptionStyles,
                fontSize: "11px",
                color: styles.colors.textMuted,
                fontStyle: "italic",
              }}
            >
              💡 Tip: Use the "Revert" button in history to restore the
              previous value
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

