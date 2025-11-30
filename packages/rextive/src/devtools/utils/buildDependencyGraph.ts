/**
 * Build dependency graph from tracked signals
 *
 * Approaches:
 * 1. Use chain reactions (temporal flow: A → B → C)
 * 2. Parse focus signal names (parent → focus)
 * 3. Analyze signal relationships from events
 */

import type { SignalInfo, ChainReaction } from "../types";

export interface GraphNode {
  id: string;
  name: string;
  kind: "mutable" | "computed";
  hasError: boolean;
  disposed: boolean;
  changeCount: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: "dependency" | "focus" | "chain" | "pipe";
  label?: string;
  weight?: number; // Number of times this edge occurred
}

export interface DependencyGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
}

/**
 * Build dependency graph from signals and chain reactions
 */
export function buildDependencyGraph(
  signals: Map<string, SignalInfo>,
  chains: ChainReaction[] = []
): DependencyGraph {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const edgeMap = new Map<string, GraphEdge>(); // For deduplication and weighting

  // 1. Build nodes from all signals
  for (const [id, info] of signals) {
    nodes.set(id, {
      id,
      name: info.signal.displayName || info.name,
      kind: info.kind,
      hasError: info.errorCount > 0,
      disposed: info.disposed,
      changeCount: info.changeCount,
    });
  }

  // 2. Extract edges from chain reactions (temporal dependencies)
  // Chains show: A → B → C means A's change triggered B, B's change triggered C
  for (const chain of chains) {
    for (let i = 0; i < chain.path.length - 1; i++) {
      const from = chain.path[i];
      const to = chain.path[i + 1];

      if (nodes.has(from) && nodes.has(to)) {
        const key = `${from}→${to}:chain`;
        const existing = edgeMap.get(key);
        if (existing) {
          existing.weight = (existing.weight || 1) + 1;
        } else {
          const edge: GraphEdge = {
            from,
            to,
            type: "chain",
            weight: 1,
          };
          edgeMap.set(key, edge);
          edges.push(edge);
        }
      }
    }
  }

  // 3. Extract focus signal relationships (parent → focus)
  // Focus signals have names like: "#focus(parentName.path)" or "focus(parentName.path)"
  for (const [id, info] of signals) {
    if (info.disposed) continue;

    const name = info.signal.displayName || info.name;

    // Check if it's a focus signal
    const focusMatch = name.match(/#?focus\(([^)]+)\)/);
    if (focusMatch) {
      const path = focusMatch[1];
      // Extract parent name (before first dot, or entire path if no dot)
      const parts = path.split(".");
      const parentName = parts[0];
      const focusPath = parts.slice(1).join(".");

      // Find parent signal by name
      for (const [parentId, parentInfo] of signals) {
        const parentDisplayName =
          parentInfo.signal.displayName || parentInfo.name;
        // Match parent name (could be full name or just the base)
        if (
          parentDisplayName === parentName ||
          parentDisplayName.endsWith(`.${parentName}`) ||
          parentName === parentDisplayName.split(".")[0]
        ) {
          const key = `${parentId}→${id}:focus`;
          if (!edgeMap.has(key)) {
            const edge: GraphEdge = {
              from: parentId,
              to: id,
              type: "focus",
              label: focusPath || undefined,
              weight: 1,
            };
            edgeMap.set(key, edge);
            edges.push(edge);
          }
          break;
        }
      }
    }
  }

  // 4. Extract pipe relationships (source → transformed)
  // Pipe operators create signals with names like: "#to(sourceName)" or "#filter(sourceName)"
  for (const [id, info] of signals) {
    if (info.disposed) continue;

    const name = info.signal.displayName || info.name;

    // Check for pipe operators (to, filter, scan, etc.)
    const pipeMatch = name.match(
      /#(to|filter|scan|debounce|throttle)\(([^)]+)\)/
    );
    if (pipeMatch) {
      const operator = pipeMatch[1];
      const sourceName = pipeMatch[2];

      // Find source signal
      for (const [sourceId, sourceInfo] of signals) {
        const sourceDisplayName =
          sourceInfo.signal.displayName || sourceInfo.name;
        if (
          sourceDisplayName === sourceName ||
          sourceDisplayName.includes(sourceName)
        ) {
          const key = `${sourceId}→${id}:pipe`;
          if (!edgeMap.has(key)) {
            const edge: GraphEdge = {
              from: sourceId,
              to: id,
              type: "pipe",
              label: operator,
              weight: 1,
            };
            edgeMap.set(key, edge);
            edges.push(edge);
          }
          break;
        }
      }
    }
  }

  return { nodes, edges };
}

/**
 * Get nodes that have no incoming edges (root nodes)
 */
export function getRootNodes(graph: DependencyGraph): GraphNode[] {
  const hasIncoming = new Set(graph.edges.map((e) => e.to));
  return Array.from(graph.nodes.values()).filter(
    (node) => !hasIncoming.has(node.id)
  );
}

/**
 * Get nodes that have no outgoing edges (leaf nodes)
 */
export function getLeafNodes(graph: DependencyGraph): GraphNode[] {
  const hasOutgoing = new Set(graph.edges.map((e) => e.from));
  return Array.from(graph.nodes.values()).filter(
    (node) => !hasOutgoing.has(node.id)
  );
}

/**
 * Get all dependencies of a signal (signals it depends on)
 */
export function getDependencies(
  graph: DependencyGraph,
  signalId: string
): GraphNode[] {
  const deps = new Set<string>();
  const visited = new Set<string>();

  function traverse(id: string) {
    if (visited.has(id)) return;
    visited.add(id);

    for (const edge of graph.edges) {
      if (edge.to === id) {
        deps.add(edge.from);
        traverse(edge.from);
      }
    }
  }

  traverse(signalId);

  return Array.from(deps)
    .map((id) => graph.nodes.get(id))
    .filter((node): node is GraphNode => node !== undefined);
}

/**
 * Get all dependents of a signal (signals that depend on it)
 */
export function getDependents(
  graph: DependencyGraph,
  signalId: string
): GraphNode[] {
  const dependents = new Set<string>();
  const visited = new Set<string>();

  function traverse(id: string) {
    if (visited.has(id)) return;
    visited.add(id);

    for (const edge of graph.edges) {
      if (edge.from === id) {
        dependents.add(edge.to);
        traverse(edge.to);
      }
    }
  }

  traverse(signalId);

  return Array.from(dependents)
    .map((id) => graph.nodes.get(id))
    .filter((node): node is GraphNode => node !== undefined);
}

/**
 * Filter graph to show only signals matching criteria
 */
export function filterGraph(
  graph: DependencyGraph,
  options: {
    includeDisposed?: boolean;
    includeErrors?: boolean;
    signalIds?: string[];
    minChangeCount?: number;
  }
): DependencyGraph {
  const {
    includeDisposed = false,
    includeErrors = true,
    signalIds,
    minChangeCount = 0,
  } = options;

  const filteredNodes = new Map<string, GraphNode>();
  const filteredEdges: GraphEdge[] = [];

  // Filter nodes
  for (const [id, node] of graph.nodes) {
    if (!includeDisposed && node.disposed) continue;
    if (!includeErrors && node.hasError) continue;
    if (signalIds && !signalIds.includes(id)) continue;
    if (node.changeCount < minChangeCount) continue;

    filteredNodes.set(id, node);
  }

  // Filter edges (only include if both nodes are in filtered set)
  for (const edge of graph.edges) {
    if (filteredNodes.has(edge.from) && filteredNodes.has(edge.to)) {
      filteredEdges.push(edge);
    }
  }

  return { nodes: filteredNodes, edges: filteredEdges };
}
