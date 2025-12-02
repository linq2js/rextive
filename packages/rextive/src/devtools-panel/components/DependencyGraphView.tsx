/**
 * Dependency Graph Visualization Component
 * 
 * Renders a visual graph of signal dependencies using SVG
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import type { DependencyGraph, GraphNode, GraphEdge } from "@/devtools/utils/buildDependencyGraph";
import * as styles from "../styles";
import { getDependencies, getDependents } from "@/devtools/utils/buildDependencyGraph";

interface DependencyGraphViewProps {
  graph: DependencyGraph;
  onNodeClick?: (nodeId: string) => void;
  selectedNodeId?: string | null;
}

/**
 * Calculate number of dependents for each node
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
 * Tree layout: signals with most dependents at the top
 * This creates a hierarchical tree where important signals (with many dependents) are at the root
 */
function calculateTreeLayout(
  nodes: Map<string, GraphNode>,
  edges: GraphEdge[],
  width: number,
  height: number
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const dependentsCount = countDependents(nodes, edges);
  
  // Build dependency tree (reverse edges: dependents → dependencies)
  // This way, nodes with most dependents become roots
  const children = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  
  // Initialize
  for (const id of nodes.keys()) {
    children.set(id, []);
    parents.set(id, []);
  }
  
  // Build reverse tree: edge.from (source) → edge.to (dependent)
  // In tree view: we want to show source → dependents, so source is parent
  for (const edge of edges) {
    // edge.from is the source, edge.to depends on it
    // In tree: edge.from is parent, edge.to is child
    const parent = edge.from;
    const child = edge.to;
    
    if (!children.get(parent)!.includes(child)) {
      children.get(parent)!.push(child);
    }
    if (!parents.get(child)!.includes(parent)) {
      parents.get(child)!.push(parent);
    }
  }
  
  // Sort nodes by number of dependents (descending)
  // Nodes with most dependents go to top level
  const sortedNodes = Array.from(nodes.keys()).sort((a, b) => {
    const countA = dependentsCount.get(a) || 0;
    const countB = dependentsCount.get(b) || 0;
    return countB - countA; // Descending
  });
  
  // Assign levels: nodes with most dependents at level 0
  const nodeLevel = new Map<string, number>();
  const visited = new Set<string>();
  
  // Assign levels using BFS from nodes with most dependents
  const queue: { id: string; level: number }[] = [];
  
  // Start with nodes that have no parents (or most dependents)
  for (const id of sortedNodes) {
    if (parents.get(id)!.length === 0 || !visited.has(id)) {
      nodeLevel.set(id, 0);
      visited.add(id);
      queue.push({ id, level: 0 });
    }
  }
  
  // BFS to assign levels
  while (queue.length > 0) {
    const { id } = queue.shift()!;
    
    // Assign children to next level
    for (const childId of children.get(id) || []) {
      if (!visited.has(childId)) {
        const parentLevel = nodeLevel.get(id) || 0;
        nodeLevel.set(childId, parentLevel + 1);
        visited.add(childId);
        queue.push({ id: childId, level: parentLevel + 1 });
      } else {
        // If already visited, use minimum level
        const currentLevel = nodeLevel.get(childId) || 0;
        const parentLevel = nodeLevel.get(id) || 0;
        nodeLevel.set(childId, Math.min(currentLevel, parentLevel + 1));
      }
    }
  }
  
  // Handle unvisited nodes (isolated or cycles)
  for (const id of nodes.keys()) {
    if (!visited.has(id)) {
      // Put them at a level based on dependents count
      const count = dependentsCount.get(id) || 0;
      nodeLevel.set(id, Math.max(0, 5 - Math.floor(count / 2))); // Lower count = lower level
    }
  }
  
  // Group nodes by level
  const levels = new Map<number, string[]>();
  for (const [id, level] of nodeLevel) {
    if (!levels.has(level)) {
      levels.set(level, []);
    }
    levels.get(level)!.push(id);
  }
  
  // Sort levels and assign positions
  const sortedLevels = Array.from(levels.entries()).sort((a, b) => a[0] - b[0]);
  const padding = 40;
  const nodeWidth = 120;
  const nodeHeight = 60;
  const levelHeight = Math.max(
    nodeHeight + 40,
    height / Math.max(sortedLevels.length, 1)
  );
  
  for (let i = 0; i < sortedLevels.length; i++) {
    const [, levelNodes] = sortedLevels[i];
    // Sort nodes within level by dependents count (most first)
    levelNodes.sort((a, b) => {
      const countA = dependentsCount.get(a) || 0;
      const countB = dependentsCount.get(b) || 0;
      return countB - countA;
    });
    
    const levelWidth = Math.max(
      levelNodes.length * (nodeWidth + padding),
      width * 0.8
    );
    const startX = (width - levelWidth) / 2;
    const y = padding + i * levelHeight;
    
    for (let j = 0; j < levelNodes.length; j++) {
      const id = levelNodes[j];
      const x = startX + j * (nodeWidth + padding) + nodeWidth / 2;
      positions.set(id, { x, y });
    }
  }
  
  return positions;
}

/**
 * Simple force-directed graph layout (original)
 */
function calculateLayout(
  nodes: Map<string, GraphNode>,
  edges: GraphEdge[],
  width: number,
  height: number
): Map<string, { x: number; y: number }> {
  // Use tree layout by default
  return calculateTreeLayout(nodes, edges, width, height);
}

export function DependencyGraphView({
  graph,
  onNodeClick,
  selectedNodeId,
}: DependencyGraphViewProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [showDisposed, setShowDisposed] = useState(false);
  
  // Pan and zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.max(800, rect.width - 40),
          height: Math.max(600, rect.height - 40),
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    // Only start dragging if clicking on background (not on a node or edge)
    const target = e.target as SVGElement;
    if (
      target === svgRef.current ||
      target.tagName === 'svg' ||
      (target.tagName === 'g' && !target.closest('g[data-node]'))
    ) {
      // Check if we're clicking on a node or edge
      const isNode = target.closest('g[data-node]') || target.closest('circle');
      const isEdge = target.closest('line') || target.closest('g[data-edge]');
      
      if (!isNode && !isEdge) {
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        panStartRef.current = { x: pan.x, y: pan.y };
        e.preventDefault();
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPan({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom handlers
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(3, zoom * delta));
    
    // Zoom towards mouse position
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Convert mouse position to SVG coordinates
      const svgX = (mouseX - pan.x) / zoom;
      const svgY = (mouseY - pan.y) / zoom;
      
      // Adjust pan to zoom towards mouse position
      setPan({
        x: mouseX - svgX * newZoom,
        y: mouseY - svgY * newZoom,
      });
      setZoom(newZoom);
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(3, prev * 1.2));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(0.1, prev / 1.2));
  };

  const handleResetView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  // Filter graph
  const filteredGraph = useMemo(() => {
    const filteredNodes = new Map<string, GraphNode>();
    const filteredEdges: GraphEdge[] = [];

    for (const [id, node] of graph.nodes) {
      if (!showDisposed && node.disposed) continue;
      filteredNodes.set(id, node);
    }

    for (const edge of graph.edges) {
      if (filteredNodes.has(edge.from) && filteredNodes.has(edge.to)) {
        filteredEdges.push(edge);
      }
    }

    return { nodes: filteredNodes, edges: filteredEdges };
  }, [graph, showDisposed]);

  // Calculate layout
  const positions = useMemo(
    () =>
      calculateLayout(
        filteredGraph.nodes,
        filteredGraph.edges,
        dimensions.width,
        dimensions.height
      ),
    [filteredGraph, dimensions]
  );

  // Get highlighted nodes (dependencies and dependents of selected node)
  const highlightedNodes = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const deps = getDependencies(filteredGraph, selectedNodeId).map((n) => n.id);
    const dependents = getDependents(filteredGraph, selectedNodeId).map((n) => n.id);
    return new Set([selectedNodeId, ...deps, ...dependents]);
  }, [selectedNodeId, filteredGraph]);

  if (filteredGraph.nodes.size === 0) {
    return (
      <div style={styles.emptyStateStyles}>
        No signals to display
        {!showDisposed && graph.nodes.size > filteredGraph.nodes.size && (
          <div style={{ fontSize: "9px", marginTop: "4px", opacity: 0.7 }}>
            {graph.nodes.size - filteredGraph.nodes.size} disposed signals hidden
          </div>
        )}
      </div>
    );
  }

  const nodeRadius = 25;
  const strokeWidth = 2;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "auto",
        backgroundColor: styles.colors.bg,
      }}
    >
      {/* Controls */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          padding: "8px",
          backgroundColor: styles.colors.bg,
          borderBottom: `1px solid ${styles.colors.border}`,
          display: "flex",
          gap: "8px",
          alignItems: "center",
        }}
      >
        <button
          style={{
            padding: "4px 8px",
            fontSize: "10px",
            backgroundColor: showDisposed
              ? styles.colors.bgHover
              : "transparent",
            border: `1px solid ${styles.colors.border}`,
            borderRadius: "4px",
            color: styles.colors.text,
            cursor: "pointer",
          }}
          onClick={() => setShowDisposed(!showDisposed)}
        >
          Show Disposed
        </button>
        <span style={{ fontSize: "10px", color: styles.colors.textMuted }}>
          {filteredGraph.nodes.size} nodes, {filteredGraph.edges.length} edges
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "4px", alignItems: "center" }}>
          <button
            style={{
              padding: "4px 8px",
              fontSize: "10px",
              backgroundColor: "transparent",
              border: `1px solid ${styles.colors.border}`,
              borderRadius: "4px",
              color: styles.colors.text,
              cursor: "pointer",
            }}
            onClick={handleZoomOut}
            title="Zoom out"
          >
            −
          </button>
          <span style={{ fontSize: "10px", color: styles.colors.textMuted, minWidth: "40px", textAlign: "center" }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            style={{
              padding: "4px 8px",
              fontSize: "10px",
              backgroundColor: "transparent",
              border: `1px solid ${styles.colors.border}`,
              borderRadius: "4px",
              color: styles.colors.text,
              cursor: "pointer",
            }}
            onClick={handleZoomIn}
            title="Zoom in"
          >
            +
          </button>
          <button
            style={{
              padding: "4px 8px",
              fontSize: "10px",
              backgroundColor: "transparent",
              border: `1px solid ${styles.colors.border}`,
              borderRadius: "4px",
              color: styles.colors.text,
              cursor: "pointer",
              marginLeft: "4px",
            }}
            onClick={handleResetView}
            title="Reset view"
          >
            Reset
          </button>
        </div>
      </div>

      {/* SVG Graph */}
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{
          display: "block",
          fontFamily: styles.fontMono,
          cursor: isDragging ? "grabbing" : "grab",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Transform group for pan and zoom */}
        <g
          transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
        >
        {/* Edges */}
        <g>
          {filteredGraph.edges.map((edge, idx) => {
            const fromPos = positions.get(edge.from);
            const toPos = positions.get(edge.to);
            if (!fromPos || !toPos) return null;

            const isHighlighted =
              selectedNodeId &&
              (edge.from === selectedNodeId || edge.to === selectedNodeId);

            const edgeColor =
              edge.type === "focus"
                ? styles.colors.accent
                : edge.type === "pipe"
                ? styles.colors.warning
                : styles.colors.textMuted;

            return (
              <g key={`edge-${idx}`}>
                <line
                  x1={fromPos.x}
                  y1={fromPos.y}
                  x2={toPos.x}
                  y2={toPos.y}
                  stroke={isHighlighted ? styles.colors.warning : edgeColor}
                  strokeWidth={isHighlighted ? 3 : strokeWidth}
                  opacity={isHighlighted ? 1 : 0.4}
                  markerEnd="url(#arrowhead)"
                />
                {edge.label && (
                  <text
                    x={(fromPos.x + toPos.x) / 2}
                    y={(fromPos.y + toPos.y) / 2 - 5}
                    fontSize="8px"
                    fill={styles.colors.textMuted}
                    textAnchor="middle"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* Arrow marker definition */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3, 0 6"
              fill={styles.colors.textMuted}
            />
          </marker>
        </defs>

        {/* Nodes */}
        <g>
          {Array.from(filteredGraph.nodes.values()).map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return null;

            const isSelected = node.id === selectedNodeId;
            const isHovered = node.id === hoveredNodeId;
            const isHighlighted = highlightedNodes.has(node.id);

            const nodeColor =
              node.kind === "mutable"
                ? styles.colors.mutable
                : styles.colors.computed;

            return (
              <g
                key={node.id}
                data-node={node.id}
                style={{ cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onNodeClick?.(node.id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
              >
                {/* Tooltip */}
                <title>{`${node.name}\nUID: ${node.id}`}</title>
                {/* Node circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={nodeRadius}
                  fill={
                    isSelected
                      ? nodeColor
                      : isHighlighted
                      ? nodeColor + "66"
                      : styles.colors.bgLight
                  }
                  stroke={
                    node.hasError
                      ? styles.colors.error
                      : isSelected || isHovered
                      ? nodeColor
                      : styles.colors.border
                  }
                  strokeWidth={isSelected || isHovered ? 3 : strokeWidth}
                  opacity={node.disposed ? 0.5 : 1}
                />
                {/* Node label */}
                <text
                  x={pos.x}
                  y={pos.y - nodeRadius - 8}
                  fontSize="9px"
                  fill={styles.colors.text}
                  textAnchor="middle"
                  style={{
                    fontWeight: isSelected ? 600 : 400,
                    pointerEvents: "none",
                  }}
                >
                  {node.name.length > 15
                    ? node.name.slice(0, 12) + "..."
                    : node.name}
                </text>
                {/* Node kind badge */}
                <text
                  x={pos.x}
                  y={pos.y + 4}
                  fontSize="10px"
                  fill={
                    node.hasError
                      ? styles.colors.errorText
                      : isSelected
                      ? "#fff"
                      : nodeColor
                  }
                  textAnchor="middle"
                  style={{ fontWeight: 600, pointerEvents: "none" }}
                >
                  {node.disposed ? "✕" : node.kind === "mutable" ? "M" : "C"}
                </text>
                {/* Change count */}
                {node.changeCount > 0 && (
                  <text
                    x={pos.x + nodeRadius - 4}
                    y={pos.y - nodeRadius + 12}
                    fontSize="8px"
                    fill={styles.colors.textMuted}
                    textAnchor="end"
                    style={{ pointerEvents: "none" }}
                  >
                    {node.changeCount}×
                  </text>
                )}
              </g>
            );
          })}
        </g>
        </g>
      </svg>

      {/* Legend */}
      <div
        style={{
          position: "absolute",
          bottom: "10px",
          right: "10px",
          padding: "8px",
          backgroundColor: styles.colors.bgLight,
          border: `1px solid ${styles.colors.border}`,
          borderRadius: "4px",
          fontSize: "9px",
          color: styles.colors.text,
        }}
      >
        <div style={{ marginBottom: "4px", fontWeight: 600 }}>Legend:</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: styles.colors.mutable,
              }}
            />
            Mutable
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: styles.colors.computed,
              }}
            />
            Computed
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                width: "12px",
                height: "2px",
                backgroundColor: styles.colors.accent,
              }}
            />
            Focus
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                width: "12px",
                height: "2px",
                backgroundColor: styles.colors.warning,
              }}
            />
            Pipe
          </div>
        </div>
      </div>
    </div>
  );
}


