import type { Signal, Tag } from "../types";

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
