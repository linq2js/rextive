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
}

export function SimpleTreeView({
  graph,
  onNodeClick,
  selectedNodeId,
  expandedNodes: controlledExpandedNodes,
  onExpandedNodesChange,
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
  React.useEffect(() => {
    if (controlledExpandedNodes !== undefined) {
      // Controlled mode - don't auto-expand
      return;
    }
    const allNodesWithChildren = new Set<string>();
    for (const item of tree) {
      if (item.children.length > 0) {
        allNodesWithChildren.add(item.node.id);
      }
    }
    if (allNodesWithChildren.size > 0 && internalExpandedNodes.size === 0) {
      setInternalExpandedNodes(allNodesWithChildren);
    }
  }, [tree, controlledExpandedNodes, internalExpandedNodes.size]);

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
    const dependents = dependentsCount.get(node.id) || 0;
    const nodeColor =
      node.kind === "mutable" ? styles.colors.mutable : styles.colors.computed;

    return (
      <div key={node.id}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "4px 8px",
            backgroundColor: isSelected ? styles.colors.bgHover : "transparent",
            borderRadius: "4px",
            fontFamily: styles.fontMono,
            fontSize: "11px",
            color: styles.colors.text,
            paddingLeft: `${8 + level * 16}px`,
          }}
          onMouseEnter={(e) => {
            if (!isSelected) {
              e.currentTarget.style.backgroundColor = styles.colors.bgHover;
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected) {
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
            }}
            onClick={() => onNodeClick?.(node.id)}
            title={node.name}
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
              }}
            >
              [disposed]
            </span>
          )}
          {node.hasError && (
            <span
              style={{
                color: styles.colors.error,
                fontSize: "8px",
                marginLeft: "4px",
              }}
            >
              ⚠
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
