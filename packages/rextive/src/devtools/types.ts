import type { Signal, Tag } from "../types";
import type { SignalErrorWhen } from "../utils/errorTracking";

/**
 * Context about when/how an error occurred.
 */
export type SignalErrorContext = {
  /** When in the signal lifecycle the error occurred */
  when: SignalErrorWhen;
  /** true = Promise rejection, false = sync throw */
  async: boolean;
};

/**
 * Metadata for a signal error.
 */
export type SignalError = {
  /** Error message */
  message: string;
  /** Full error object */
  error: unknown;
  /** When the error occurred */
  timestamp: number;
  /** Context about when/how the error occurred (if available) */
  context?: SignalErrorContext;
};

/**
 * Source location where a signal was declared.
 */
export type SourceLocation = {
  /** File path (may be full URL or relative path) */
  file: string;
  /** Line number */
  line: number;
  /** Column number (if available) */
  column?: number;
  /** Function name (if available) */
  functionName?: string;
};

/**
 * Metadata for a tracked signal.
 */
export type SignalInfo = {
  /** Unique identifier (displayName) */
  id: string;
  /** Signal kind */
  kind: "mutable" | "computed";
  /** The signal instance */
  signal: Signal<any>;
  /** Creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
  /** Number of value changes */
  changeCount: number;
  /** Value history (most recent first) */
  history: Array<{ value: unknown; timestamp: number }>;
  /** Tags this signal belongs to */
  tags: Set<string>;
  /** Error count */
  errorCount: number;
  /** Most recent errors (most recent first) */
  errors: SignalError[];
  /** Whether this signal has been disposed */
  disposed: boolean;
  /** Disposal timestamp */
  disposedAt?: number;
  /** Source location where signal was declared */
  source?: SourceLocation;
};

/**
 * Metadata for a tracked tag.
 */
export type TagInfo = {
  /** Unique identifier (displayName) */
  id: string;
  /** The tag instance */
  tag: Tag<any>;
  /** Creation timestamp */
  createdAt: number;
  /** Signal IDs in this tag */
  signals: Set<string>;
};

/**
 * Event types emitted by devtools.
 */
export type DevToolsEvent =
  | { type: "signal:create"; signal: SignalInfo }
  | { type: "signal:dispose"; signalId: string }
  | {
      type: "signal:change";
      signalId: string;
      value: unknown;
      timestamp: number;
    }
  | { type: "signal:error"; signalId: string; error: SignalError }
  | { type: "signal:rename"; oldId: string; newId: string }
  | { type: "tag:create"; tag: TagInfo }
  | { type: "tag:add"; tagId: string; signalId: string }
  | { type: "tag:remove"; tagId: string; signalId: string };

/**
 * Listener for devtools events.
 */
export type DevToolsEventListener = (event: DevToolsEvent) => void;

/**
 * Configuration options for devtools.
 */
export type DevToolsOptions = {
  /** Maximum number of history entries per signal (default: 50) */
  maxHistory?: number;
  /** Name for this devtools instance (for multi-app scenarios) */
  name?: string;
  /** Log events to console */
  logToConsole?: boolean;
};

// ============================================================================
// CHAIN REACTION TYPES
// ============================================================================

/**
 * A single occurrence of a chain reaction.
 */
export type ChainOccurrence = {
  /** When the chain started */
  startTime: number;
  /** When the chain ended (undefined if still pending) */
  endTime?: number;
  /** Duration in ms (undefined if still pending) */
  duration?: number;
  /** Status of this occurrence */
  status: "complete" | "interrupted" | "pending";
};

/**
 * A chain reaction pattern (grouped occurrences of the same path).
 */
export type ChainReaction = {
  /** Unique ID based on path hash */
  id: string;
  /** Ordered signal IDs in the chain */
  path: string[];
  /** Signals in the path that are async (computed with promises) */
  asyncSignals: Set<string>;
  /** All occurrences of this chain pattern */
  occurrences: ChainOccurrence[];
  /** Last time this chain was triggered */
  lastTriggered: number;
};

/**
 * Chain tracking state.
 */
export type ChainTrackingState = {
  /** Whether chain tracking is currently active */
  enabled: boolean;
  /** Current chain being built (null if no chain in progress) */
  currentChain: string[] | null;
  /** Start time of current chain */
  currentChainStartTime: number | null;
  /** Timeout for detecting end of sync chain */
  chainTimeout: ReturnType<typeof setTimeout> | null;
  /** All detected chain reactions (keyed by path hash) */
  chains: Map<string, ChainReaction>;
  /** Minimum chain length to track */
  minChainLength: number;
};
