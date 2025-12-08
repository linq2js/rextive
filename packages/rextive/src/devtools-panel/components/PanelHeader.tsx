/**
 * Panel Header Component
 * Header with title, settings button, position toggle, and expand/collapse
 */

import { memo } from "react";
import * as styles from "../styles";
import type { PanelPosition } from "../styles";
import {
  IconBolt,
  IconSettings,
  IconReset,
  IconArrowLeft,
  IconArrowDown,
  IconChevronUp,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
} from "../icons";

interface PanelHeaderProps {
  position: PanelPosition;
  isExpanded: boolean;
  isMobile: boolean;
  onTogglePanel: () => void;
  onTogglePosition: () => void;
  onOpenSettings: () => void;
  onResetConfig: () => void;
}

export const PanelHeader = memo(function PanelHeader({
  position,
  isExpanded,
  isMobile,
  onTogglePanel,
  onTogglePosition,
  onOpenSettings,
  onResetConfig,
}: PanelHeaderProps) {
  const isLeftCollapsed = position === "left" && !isExpanded;

  return (
    <div
      style={styles.headerStyles(position, isExpanded)}
      onClick={onTogglePanel}
    >
      <h3 style={styles.titleStyles(isLeftCollapsed)}>
        <span style={{ color: "#fbbf24" }}>
          <IconBolt size={18} />
        </span>
        {!isLeftCollapsed && <span>Rextive Devtools</span>}
      </h3>

      <div
        style={{
          ...styles.headerRightStyles,
          flexDirection: isLeftCollapsed ? "column" : "row",
        }}
      >
        {!isLeftCollapsed && (
          <button
            style={styles.positionButtonStyles}
            onClick={(e) => {
              e.stopPropagation();
              onOpenSettings();
            }}
            title="DevTools settings"
          >
            <IconSettings size={14} />
          </button>
        )}

        {!isLeftCollapsed && (
          <button
            style={styles.positionButtonStyles}
            onClick={(e) => {
              e.stopPropagation();
              onResetConfig();
            }}
            title="Reset DevTools settings"
          >
            <IconReset size={14} />
          </button>
        )}

        {!isMobile && (
          <button
            style={styles.positionButtonStyles}
            onClick={(e) => {
              e.stopPropagation();
              onTogglePosition();
            }}
            title={position === "bottom" ? "Move to left" : "Move to bottom"}
          >
            {position === "bottom" ? <IconArrowLeft /> : <IconArrowDown />}
          </button>
        )}

        <button
          style={styles.toggleButtonStyles}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePanel();
          }}
          title={isExpanded ? "Collapse" : "Expand"}
        >
          {position === "bottom" ? (
            isExpanded ? (
              <IconChevronDown />
            ) : (
              <IconChevronUp />
            )
          ) : isExpanded ? (
            <IconChevronLeft />
          ) : (
            <IconChevronRight />
          )}
        </button>
      </div>
    </div>
  );
});

