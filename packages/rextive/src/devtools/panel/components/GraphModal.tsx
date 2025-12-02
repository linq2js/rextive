/**
 * Graph Modal Component
 * Full-screen modal for dependency graph visualization
 */

import React, { useState } from "react";
import { IconClose } from "../icons";
import * as styles from "../styles";
import { SimpleTreeView } from "./SimpleTreeView";
import { ActionBar } from "./shared/ActionBar";
import type { DependencyGraph } from "@/devtools/utils/buildDependencyGraph";

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
  // Track expanded nodes - start empty and expand on first open
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const hasInitializedRef = React.useRef(false);

  // Get all nodes with children (for expand all button)
  const getAllNodesWithChildren = () => {
    const nodes = new Set<string>();
    for (const edge of graph.edges) {
      nodes.add(edge.from);
    }
    return nodes;
  };

  // Auto-expand all nodes on FIRST open only
  React.useEffect(() => {
    if (isOpen && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      setExpandedNodes(getAllNodesWithChildren());
    }
    // Reset flag when modal closes (so next open will expand again)
    if (!isOpen) {
      hasInitializedRef.current = false;
    }
    // Note: We intentionally don't depend on graph here to avoid re-expanding
    // when the graph updates while modal is open
  }, [isOpen]);
  
  const handleExpandAll = () => {
    setExpandedNodes(getAllNodesWithChildren());
  };
  
  const handleCollapseAll = () => {
    setExpandedNodes(new Set());
  };
  
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
          <ActionBar>
            <button
              style={{
                padding: "4px 10px",
                fontSize: "10px",
                backgroundColor: styles.colors.bgHover,
                border: `1px solid ${styles.colors.border}`,
                borderRadius: "4px",
                color: styles.colors.text,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
              onClick={handleExpandAll}
              title="Expand all nodes"
            >
              Expand All
            </button>
            <button
              style={{
                padding: "4px 10px",
                fontSize: "10px",
                backgroundColor: styles.colors.bgHover,
                border: `1px solid ${styles.colors.border}`,
                borderRadius: "4px",
                color: styles.colors.text,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
              onClick={handleCollapseAll}
              title="Collapse all nodes"
            >
              Collapse All
            </button>
          </ActionBar>
          <SimpleTreeView
            graph={graph}
            onNodeClick={onNodeClick}
            selectedNodeId={selectedNodeId}
            expandedNodes={expandedNodes}
            onExpandedNodesChange={setExpandedNodes}
          />
        </div>
      </div>
    </div>
  );
}

