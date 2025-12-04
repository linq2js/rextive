/**
 * Graph Tab Component
 * Displays dependency graph visualization with search
 */

import React, { useMemo, useState, useEffect, useCallback } from "react";
import type { SignalInfo, ChainReaction } from "../../devtools/types";
import { buildDependencyGraph } from "../../devtools";
import { SimpleTreeView } from "./SimpleTreeView";
import { ActionBar } from "./shared/ActionBar";
import { IconSearch, IconClose } from "../icons";
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
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const hasInitializedRef = React.useRef(false);

  // Build dependency graph
  const graph = useMemo(
    () => buildDependencyGraph(signals, chains),
    [signals, chains]
  );

  // Get all nodes with children (for expand all button)
  const getAllNodesWithChildren = useCallback(() => {
    const nodes = new Set<string>();
    for (const edge of graph.edges) {
      nodes.add(edge.from);
    }
    return nodes;
  }, [graph.edges]);

  // Auto-expand all nodes on first render
  useEffect(() => {
    if (!hasInitializedRef.current && graph.nodes.size > 0) {
      hasInitializedRef.current = true;
      setExpandedNodes(getAllNodesWithChildren());
    }
  }, [graph.nodes.size, getAllNodesWithChildren]);

  // Build parent map for expanding paths to matched nodes
  const getParentMap = useCallback(() => {
    const parentMap = new Map<string, string>();
    for (const edge of graph.edges) {
      parentMap.set(edge.to, edge.from);
    }
    return parentMap;
  }, [graph.edges]);

  // When search query changes, expand paths to matching nodes
  useEffect(() => {
    if (!searchQuery.trim()) return;

    const query = searchQuery.toLowerCase();
    const matchingNodeIds: string[] = [];

    // Find all matching nodes
    for (const [id, node] of graph.nodes) {
      if (node.name.toLowerCase().includes(query)) {
        matchingNodeIds.push(id);
      }
    }

    if (matchingNodeIds.length === 0) return;

    // Expand all parent paths to matching nodes
    const parentMap = getParentMap();
    const nodesToExpand = new Set<string>();

    for (const nodeId of matchingNodeIds) {
      // Walk up the parent chain and expand each node
      let current = nodeId;
      let visited = new Set<string>();
      while (parentMap.has(current) && !visited.has(current)) {
        visited.add(current);
        const parent = parentMap.get(current)!;
        nodesToExpand.add(parent);
        current = parent;
      }
    }

    // Expand the matching nodes themselves if they have children
    for (const nodeId of matchingNodeIds) {
      const hasChildren = graph.edges.some((e) => e.from === nodeId);
      if (hasChildren) {
        nodesToExpand.add(nodeId);
      }
    }

    // Merge with existing expanded nodes
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      for (const id of nodesToExpand) {
        next.add(id);
      }
      return next;
    });
  }, [searchQuery, graph.nodes, graph.edges, getParentMap]);

  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId === selectedNodeId ? null : nodeId);
    // Navigate to signal in signals tab
    const node = graph.nodes.get(nodeId);
    if (node) {
      onNavigateToSignal(node.name);
    }
  };

  const handleExpandAll = () => {
    setExpandedNodes(getAllNodesWithChildren());
  };

  const handleCollapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Count matching nodes
  const matchCount = searchQuery.trim()
    ? Array.from(graph.nodes.values()).filter((n) =>
        n.name.toLowerCase().includes(searchQuery.toLowerCase())
      ).length
    : 0;

  if (graph.nodes.size === 0) {
    return <div style={styles.emptyStateStyles}>No signals to display</div>;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Search box */}
      <div style={styles.searchContainerStyles}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ ...styles.searchBoxStyles, flex: 1 }}>
            <span style={styles.searchIconStyles}>
              <IconSearch size={12} />
            </span>
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInputStyles}
              onClick={(e) => e.stopPropagation()}
            />
            {searchQuery && (
              <>
                <span
                  style={{
                    fontSize: "10px",
                    color:
                      matchCount > 0
                        ? styles.colors.textMuted
                        : styles.colors.error,
                    marginRight: "8px",
                  }}
                >
                  {matchCount > 0 ? `${matchCount} found` : "No matches"}
                </span>
                <button
                  style={styles.searchClearStyles}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery("");
                  }}
                  title="Clear search"
                >
                  <IconClose size={10} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action bar */}
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
        <span
          style={{
            fontSize: "10px",
            color: styles.colors.textDim,
            marginLeft: "auto",
          }}
        >
          {graph.nodes.size} nodes, {graph.edges.length} edges
        </span>
      </ActionBar>

      {/* Tree view */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <SimpleTreeView
          graph={graph}
          onNodeClick={handleNodeClick}
          selectedNodeId={selectedNodeId}
          expandedNodes={expandedNodes}
          onExpandedNodesChange={setExpandedNodes}
          searchQuery={searchQuery}
        />
      </div>
    </div>
  );
}
