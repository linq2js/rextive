/**
 * Graph Tab Component
 * Opens dependency graph visualization in a modal
 */

import React, { useMemo, useState } from "react";
import type { SignalInfo, ChainReaction } from "../../devtools/types";
import { buildDependencyGraph } from "../../devtools";
import { GraphModal } from "./GraphModal";
import * as styles from "../styles";

interface GraphTabProps {
  signals: Map<string, SignalInfo>;
  chains: ChainReaction[];
  onNavigateToSignal: (signalName: string) => void;
}

export function GraphTab({
  signals,
  chains,
  onNavigateToSignal,
}: GraphTabProps): React.ReactElement {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Build dependency graph
  const graph = useMemo(
    () => buildDependencyGraph(signals, chains),
    [signals, chains]
  );

  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId === selectedNodeId ? null : nodeId);
    // Navigate to signal in signals tab
    const node = graph.nodes.get(nodeId);
    if (node) {
      onNavigateToSignal(node.name);
      setIsModalOpen(false); // Close modal when navigating
    }
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          padding: "40px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "48px",
            marginBottom: "16px",
            opacity: 0.8,
          }}
        >
          📊
        </div>
        <h3
          style={{
            fontSize: "16px",
            color: styles.colors.text,
            marginBottom: "8px",
          }}
        >
          Dependency Graph
        </h3>
        <p
          style={{
            fontSize: "12px",
            color: styles.colors.textMuted,
            marginBottom: "24px",
            maxWidth: "400px",
          }}
        >
          Visualize signal dependencies and relationships. Click the button below
          to open the interactive graph.
        </p>
        <button
          style={{
            padding: "12px 24px",
            fontSize: "13px",
            backgroundColor: styles.colors.accent,
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: 600,
            transition: "background-color 0.2s",
          }}
          onClick={() => setIsModalOpen(true)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = styles.colors.accentHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = styles.colors.accent;
          }}
        >
          Open Graph View
        </button>
        <div
          style={{
            marginTop: "24px",
            fontSize: "10px",
            color: styles.colors.textDim,
          }}
        >
          {graph.nodes.size} nodes, {graph.edges.length} edges
        </div>
      </div>

      <GraphModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        graph={graph}
        onNodeClick={handleNodeClick}
        selectedNodeId={selectedNodeId}
      />
    </>
  );
}

