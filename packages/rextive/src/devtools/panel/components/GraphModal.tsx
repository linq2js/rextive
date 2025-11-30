/**
 * Graph Modal Component
 * Full-screen modal for dependency graph visualization
 */

import React from "react";
import { IconClose } from "../icons";
import * as styles from "../styles";
import { DependencyGraphView } from "./DependencyGraphView";
import type { DependencyGraph } from "../../utils/buildDependencyGraph";

interface GraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  graph: DependencyGraph;
  onNodeClick?: (nodeId: string) => void;
  selectedNodeId?: string | null;
}

export function GraphModal({
  isOpen,
  onClose,
  graph,
  onNodeClick,
  selectedNodeId,
}: GraphModalProps): React.ReactElement | null {
  if (!isOpen) return null;

  return (
    <div
      style={{
        ...styles.modalOverlayStyles,
        zIndex: 100000, // Higher than DevTools panel
      }}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        style={{
          ...styles.modalContainerStyles,
          width: "95vw",
          height: "95vh",
          maxWidth: "1600px",
          maxHeight: "1000px",
          display: "flex",
          flexDirection: "column",
          padding: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.modalHeaderStyles}>
          <h3 style={styles.modalTitleStyles}>📊 Dependency Graph</h3>
          <button
            style={styles.modalCloseButtonStyles}
            onClick={onClose}
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

        <div
          style={{
            ...styles.modalContentStyles,
            flex: 1,
            overflow: "hidden",
            padding: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <DependencyGraphView
            graph={graph}
            onNodeClick={onNodeClick}
            selectedNodeId={selectedNodeId}
          />
        </div>
      </div>
    </div>
  );
}

