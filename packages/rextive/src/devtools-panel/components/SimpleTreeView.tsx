/**
 * Simple Tree View Component
 * Displays signal dependency graph as a simple hierarchical tree
 * Format: node name (type, dependents count)
 */

import React, { useState, useMemo } from "react";
import type {
  DependencyGraph,
  GraphNode,
  GraphEdge,
} from "@/devtools/utils/buildDependencyGraph";
import * as styles from "../styles";

// Status colors - consistent with Signals tab
const STATUS_COLORS = {
  active: styles.colors.change, // Orange - recently updated (same as Signals tab)
  idle: styles.colors.text, // Default text color
  error: styles.colors.error, // Red - has error
  disposed: styles.colors.textMuted, // Gray - disposed
} as const;

/**
 * Count dependents for each node
 */
function countDependents(
  nodes: Map<string, GraphNode>,
  edges: GraphEdge[]
): Map<string, number> {
  const counts = new Map<string, number>();

  // Initialize all nodes with 0
  for (const id of nodes.keys()) {
    counts.set(id, 0);
  }

  // Count dependents (edges where this node is the source)
  for (const edge of edges) {
    const current = counts.get(edge.from) || 0;
    counts.set(edge.from, current + 1);
  }

  return counts;
}

/**
 * Build tree structure: nodes with most dependents at top
 */
function buildTree(
  nodes: Map<string, GraphNode>,
  edges: GraphEdge[]
): Array<{ node: GraphNode; children: string[]; level: number }> {
  const dependentsCount = countDependents(nodes, edges);

  // Build parent-child relationships
  const children = new Map<string, string[]>();
  for (const id of nodes.keys()) {
    children.set(id, []);
  }

  // edge.from is parent, edge.to is child
  for (const edge of edges) {
    const parent = edge.from;
    const child = edge.to;
    if (!children.get(parent)!.includes(child)) {
      children.get(parent)!.push(child);
    }
  }

  // Sort nodes by dependents count (descending)
  const sortedNodes = Array.from(nodes.keys()).sort((a, b) => {
    const countA = dependentsCount.get(a) || 0;
    const countB = dependentsCount.get(b) || 0;
    return countB - countA; // Most dependents first
  });

  // Build tree structure with levels
  const tree: Array<{ node: GraphNode; children: string[]; level: number }> =
    [];
  const visited = new Set<string>();
  const nodeLevel = new Map<string, number>();

  function addNode(id: string, level: number) {
    if (visited.has(id)) return;

    const node = nodes.get(id);
    if (!node) return;

    visited.add(id);
    nodeLevel.set(id, level);

    const nodeChildren = children.get(id) || [];
    // Sort children by dependents count
    nodeChildren.sort((a, b) => {
      const countA = dependentsCount.get(a) || 0;
      const countB = dependentsCount.get(b) || 0;
      return countB - countA;
    });

    tree.push({ node, children: nodeChildren, level });

    // Add children recursively
    for (const childId of nodeChildren) {
      addNode(childId, level + 1);
    }
  }

  // Start with nodes that have most dependents
  for (const id of sortedNodes) {
    if (!visited.has(id)) {
      addNode(id, 0);
    }
  }

  return tree;
}

export interface SimpleTreeViewProps {
  graph: DependencyGraph;
  onNodeClick?: (nodeId: string) => void;
  selectedNodeId?: string | null;
  expandedNodes?: Set<string>;
  onExpandedNodesChange?: (nodes: Set<string>) => void;
  /** Set of node IDs that were recently updated (for flash effect) */
  recentlyUpdatedNodes?: Set<string>;
}

export function SimpleTreeView({
  graph,
  onNodeClick,
  selectedNodeId,
  expandedNodes: controlledExpandedNodes,
  onExpandedNodesChange,
  recentlyUpdatedNodes = new Set(),
}: SimpleTreeViewProps): React.ReactElement {
  const [internalExpandedNodes, setInternalExpandedNodes] = useState<
    Set<string>
  >(new Set());
  const dependentsCount = useMemo(
    () => countDependents(graph.nodes, graph.edges),
    [graph]
  );

  const tree = useMemo(() => buildTree(graph.nodes, graph.edges), [graph]);

  // Use controlled or internal state
  const expandedNodes = controlledExpandedNodes ?? internalExpandedNodes;

  // Expand all by default on mount (only if using internal state)
  // Using ref to track if we've done initial expansion to avoid re-running
  const hasInitialExpanded = React.useRef(false);

  React.useEffect(() => {
    if (controlledExpandedNodes !== undefined) {
      // Controlled mode - don't auto-expand
      return;
    }
    if (hasInitialExpanded.current) {
      // Already expanded once, don't repeat
      return;
    }
    const allNodesWithChildren = new Set<string>();
    for (const item of tree) {
      if (item.children.length > 0) {
        allNodesWithChildren.add(item.node.id);
      }
    }
    if (allNodesWithChildren.size > 0) {
      hasInitialExpanded.current = true;
      setInternalExpandedNodes(allNodesWithChildren);
    }
  }, [tree, controlledExpandedNodes]);

  const toggleExpand = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onExpandedNodesChange) {
      // Controlled mode - call the callback with new value
      const next = new Set(expandedNodes);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      onExpandedNodesChange(next);
    } else {
      // Internal state - use setState callback
      setInternalExpandedNodes((prev: Set<string>) => {
        const next = new Set(prev);
        if (next.has(nodeId)) {
          next.delete(nodeId);
        } else {
          next.add(nodeId);
        }
        return next;
      });
    }
  };

  const renderNode = (node: GraphNode, level: number, hasChildren: boolean) => {
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = node.id === selectedNodeId;
    const isRecentlyUpdated = recentlyUpdatedNodes.has(node.id);
    const dependents = dependentsCount.get(node.id) || 0;
    const nodeColor =
      node.kind === "mutable" ? styles.colors.mutable : styles.colors.computed;

    // Determine status color based on state (consistent with Signals tab)
    const getStatusColor = () => {
      if (node.hasError) return STATUS_COLORS.error;
      if (node.disposed) return STATUS_COLORS.disposed;
      if (isRecentlyUpdated) return STATUS_COLORS.active;
      return STATUS_COLORS.idle;
    };

    // Get background color (consistent with Signals tab itemStyles)
    const getBgColor = () => {
      if (node.hasError) return styles.colors.errorBg;
      if (isRecentlyUpdated) return STATUS_COLORS.active + "33"; // 20% opacity
      if (isSelected) return styles.colors.bgHover;
      return "transparent";
    };

    // Get border color (consistent with Signals tab)
    const getBorderColor = () => {
      if (node.hasError) return styles.colors.error;
      if (isRecentlyUpdated) return STATUS_COLORS.active;
      return "transparent";
    };

    // Get box shadow (consistent with Signals tab)
    const getBoxShadow = () => {
      if (node.hasError) return `0 0 8px ${styles.colors.error}44`;
      if (isRecentlyUpdated) return `0 0 8px ${STATUS_COLORS.active}44`;
      return "none";
    };

    // Status indicator dot style
    const statusDotStyle: React.CSSProperties = {
      width: "6px",
      height: "6px",
      borderRadius: "50%",
      backgroundColor: getStatusColor(),
      marginRight: "6px",
      flexShrink: 0,
      ...(isRecentlyUpdated && {
        boxShadow: `0 0 6px ${STATUS_COLORS.active}`,
      }),
    };

    return (
      <div key={node.id}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "4px 8px",
            backgroundColor: getBgColor(),
            borderRadius: "4px",
            fontFamily: styles.fontMono,
            fontSize: "11px",
            color: styles.colors.text,
            paddingLeft: `${8 + level * 16}px`,
            borderLeft: `3px solid ${getBorderColor()}`,
            boxShadow: getBoxShadow(),
            transition: "all 0.25s ease",
          }}
          onMouseEnter={(e) => {
            if (!isSelected && !isRecentlyUpdated && !node.hasError) {
              e.currentTarget.style.backgroundColor = styles.colors.bgHover;
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected && !isRecentlyUpdated && !node.hasError) {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          {hasChildren && (
            <button
              onClick={(e) => toggleExpand(node.id, e)}
              style={{
                background: "none",
                border: "none",
                color: styles.colors.textMuted,
                cursor: "pointer",
                padding: "2px 4px",
                marginRight: "4px",
                fontSize: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? "▼" : "▶"}
            </button>
          )}
          {!hasChildren && (
            <span style={{ width: "12px", marginRight: "4px" }} />
          )}
          {/* Status indicator dot */}
          <span
            style={statusDotStyle}
            title={
              node.hasError
                ? "Error"
                : node.disposed
                ? "Disposed"
                : isRecentlyUpdated
                ? "Recently updated"
                : "Idle"
            }
          />
          <span
            style={{
              color: nodeColor,
              fontWeight: 600,
              fontSize: "9px",
              padding: "1px 4px",
              borderRadius: "3px",
              backgroundColor: nodeColor + "22",
              marginRight: "6px",
            }}
          >
            {node.kind === "mutable" ? "M" : "C"}
          </span>
          <span
            style={{
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              cursor: "pointer",
              ...(node.disposed && {
                textDecoration: "line-through",
                opacity: 0.6,
              }),
              ...(node.hasError && {
                color: styles.colors.errorText,
              }),
              ...(isRecentlyUpdated &&
                !node.hasError &&
                !node.disposed && {
                  color: STATUS_COLORS.active,
                  fontWeight: 600,
                }),
            }}
            onClick={() => onNodeClick?.(node.id)}
            title={`${node.name}\nUID: ${node.id}`}
          >
            {node.name}
          </span>
          {dependents > 0 && (
            <span
              style={{
                color: styles.colors.textMuted,
                fontSize: "9px",
                marginLeft: "8px",
              }}
            >
              ({dependents})
            </span>
          )}
          {node.disposed && (
            <span
              style={{
                color: styles.colors.textMuted,
                fontSize: "8px",
                marginLeft: "4px",
                backgroundColor: styles.colors.textMuted + "22",
                padding: "1px 4px",
                borderRadius: "3px",
              }}
            >
              disposed
            </span>
          )}
          {node.hasError && (
            <span
              style={{
                color: styles.colors.error,
                fontSize: "8px",
                marginLeft: "4px",
                backgroundColor: styles.colors.error + "22",
                padding: "1px 4px",
                borderRadius: "3px",
              }}
            >
              ⚠ error
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderTree = () => {
    const result: React.ReactElement[] = [];
    const visibleNodes = new Set<string>();
    const parentMap = new Map<string, string>(); // child -> parent

    // Build parent map
    for (const edge of graph.edges) {
      parentMap.set(edge.to, edge.from);
    }

    // Determine visible nodes (expanded path from root)
    // Use visited set to prevent infinite recursion from circular dependencies
    function markVisible(nodeId: string, visited = new Set<string>()) {
      if (visited.has(nodeId)) return; // Prevent infinite recursion
      visited.add(nodeId);
      visibleNodes.add(nodeId);

      const item = tree.find((t) => t.node.id === nodeId);
      if (item && expandedNodes.has(nodeId)) {
        for (const childId of item.children) {
          markVisible(childId, visited);
        }
      }
    }

    // Start from root nodes (level 0)
    for (const item of tree) {
      if (item.level === 0) {
        markVisible(item.node.id);
      }
    }

    // Render visible nodes
    for (const item of tree) {
      if (!visibleNodes.has(item.node.id)) continue;

      result.push(renderNode(item.node, item.level, item.children.length > 0));
    }

    return result;
  };

  if (tree.length === 0) {
    return <div style={styles.emptyStateStyles}>No signals to display</div>;
  }

  return (
    <div
      style={{
        padding: "12px",
        overflowY: "auto",
        height: "100%",
        fontFamily: styles.fontMono,
      }}
    >
      {renderTree()}
    </div>
  );
}
