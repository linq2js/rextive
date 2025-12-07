/**
 * Config Modal Component
 * Modal for DevTools configuration settings
 */

import React, { useState, useEffect, memo } from "react";
import { IconClose, IconSettings } from "../icons";
import * as styles from "../styles";

export interface DevToolsSettings {
  /** Auto-remove disposed signals after X seconds. 0 = remove immediately. -1 = never remove */
  autoRemoveDisposedTimer: number;
  /** Auto snapshot interval in seconds. 0 = disabled */
  autoSnapshotInterval: number;
  /** Maximum number of history entries per signal */
  signalHistoryLimit: number;
}

export const DEFAULT_SETTINGS: DevToolsSettings = {
  autoRemoveDisposedTimer: 3,
  autoSnapshotInterval: 5,
  signalHistoryLimit: 5,
};

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DevToolsSettings;
  onSettingsChange: (settings: DevToolsSettings) => void;
}

export const ConfigModal = memo(function ConfigModal({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}: ConfigModalProps): React.ReactElement | null {
  // Local state for editing
  const [localSettings, setLocalSettings] =
    useState<DevToolsSettings>(settings);

  // Sync local state only when modal opens (not on every settings change)
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Only depend on isOpen, not settings

  const handleSave = () => {
    onSettingsChange(localSettings);
    onClose();
  };

  const handleCancel = () => {
    setLocalSettings(settings); // Reset to original
    onClose();
  };

  const handleNumberChange = (
    field: keyof DevToolsSettings,
    value: string,
    min = 0
  ) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= min) {
      setLocalSettings((prev) => ({
        ...prev,
        [field]: num,
      }));
    }
  };

  if (!isOpen) return null;

  const inputStyles: React.CSSProperties = {
    padding: "8px 12px",
    fontSize: "12px",
    backgroundColor: styles.colors.bg,
    border: `1px solid ${styles.colors.border}`,
    borderRadius: "6px",
    color: styles.colors.text,
    fontFamily: styles.fontMono,
    width: "80px",
    textAlign: "center",
  };

  const labelStyles: React.CSSProperties = {
    fontSize: "12px",
    color: styles.colors.text,
    display: "flex",
    alignItems: "center",
    gap: "12px",
  };

  const descriptionStyles: React.CSSProperties = {
    fontSize: "10px",
    color: styles.colors.textMuted,
    marginTop: "4px",
    lineHeight: 1.4,
  };

  const sectionStyles: React.CSSProperties = {
    marginBottom: "20px",
  };

  const sectionTitleStyles: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: 600,
    color: styles.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "12px",
    paddingBottom: "8px",
    borderBottom: `1px solid ${styles.colors.border}`,
  };

  return (
    <div
      style={{
        ...styles.modalOverlayStyles,
        zIndex: 100000,
      }}
      onClick={handleCancel}
      onKeyDown={(e) => {
        if (e.key === "Escape") handleCancel();
      }}
    >
      <div
        style={{
          ...styles.modalContainerStyles,
          width: "420px",
          maxWidth: "90vw",
          display: "flex",
          flexDirection: "column",
          padding: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={styles.modalHeaderStyles}>
          <h3
            style={{
              ...styles.modalTitleStyles,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <IconSettings size={16} />
            DevTools Settings
          </h3>
          <button
            style={styles.modalCloseButtonStyles}
            onClick={handleCancel}
            title="Close (Esc)"
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

        {/* Content */}
        <div
          style={{
            ...styles.modalContentStyles,
            padding: "20px",
          }}
        >
          {/* Signals Section */}
          <div style={sectionStyles}>
            <div style={sectionTitleStyles}>Signals</div>

            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyles}>
                <span>Auto-remove disposed signals after</span>
                <input
                  type="number"
                  min="-1"
                  value={localSettings.autoRemoveDisposedTimer}
                  onChange={(e) =>
                    handleNumberChange(
                      "autoRemoveDisposedTimer",
                      e.target.value,
                      -1
                    )
                  }
                  style={inputStyles}
                />
                <span>seconds</span>
              </label>
              <div style={descriptionStyles}>
                <strong>0</strong> = remove immediately when disposed
                <br />
                <strong>-1</strong> = never auto-remove (keep all disposed
                signals)
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyles}>
                <span>Signal history limit</span>
                <input
                  type="number"
                  min="1"
                  value={localSettings.signalHistoryLimit}
                  onChange={(e) =>
                    handleNumberChange("signalHistoryLimit", e.target.value, 1)
                  }
                  style={inputStyles}
                />
                <span>entries</span>
              </label>
              <div style={descriptionStyles}>
                Maximum number of value history entries to keep per signal.
                <br />
                Lower values use less memory.
              </div>
            </div>
          </div>

          {/* Snapshots Section */}
          <div style={sectionStyles}>
            <div style={sectionTitleStyles}>Snapshots</div>

            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyles}>
                <span>Auto snapshot interval</span>
                <input
                  type="number"
                  min="0"
                  value={localSettings.autoSnapshotInterval}
                  onChange={(e) =>
                    handleNumberChange(
                      "autoSnapshotInterval",
                      e.target.value,
                      0
                    )
                  }
                  style={inputStyles}
                />
                <span>seconds</span>
              </label>
              <div style={descriptionStyles}>
                Interval for automatic snapshots when enabled.
                <br />
                <strong>0</strong> = disable auto snapshots
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: `1px solid ${styles.colors.border}`,
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
          }}
        >
          <button
            onClick={handleCancel}
            style={{
              padding: "8px 16px",
              fontSize: "12px",
              backgroundColor: "transparent",
              border: `1px solid ${styles.colors.border}`,
              borderRadius: "6px",
              color: styles.colors.text,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = styles.colors.bgHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: "8px 16px",
              fontSize: "12px",
              backgroundColor: styles.colors.success,
              border: "none",
              borderRadius: "6px",
              color: "#fff",
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
});
