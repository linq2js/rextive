/**
 * Events Tab Component
 * Displays the event log with virtualization for performance
 */

import React, { useState, useCallback } from "react";
import type { SignalInfo } from "@/devtools/types";
import * as styles from "../styles";
import { IconCopy, IconChevronRight, IconChevronDown } from "../icons";
import { formatValue, formatTime } from "../utils/formatUtils";
import { VirtualizedList } from "./shared";

type EventLogEntry = {
  id: number;
  timestamp: number;
  type: string;
  isError?: boolean;
  signalId?: string;
  tagId?: string;
  value?: unknown;
  error?: unknown;
  signal?: { id: string; name?: string };
};

interface EventsTabProps {
  events: EventLogEntry[];
  filteredEvents: EventLogEntry[];
  signals: Map<string, SignalInfo>;
  onNavigateToSignal: (signalName: string) => void;
  onNavigateToTag: (tagId: string) => void;
}

export function EventsTab({
  events,
  filteredEvents,
  signals,
  onNavigateToSignal,
  onNavigateToTag,
}: EventsTabProps): React.ReactElement {
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());

  const getEventKey = useCallback(
    (event: EventLogEntry) => event.id,
    []
  );

  const renderEventItem = useCallback(
    (event: EventLogEntry) => {
            // Get signal name for display (lookup by ID if needed)
            let signalName: string | null = null;
            if ("signal" in event && event.signal) {
              signalName =
                (event.signal as any).name || (event.signal as any).id;
            } else if ("signalId" in event) {
              const info = signals.get(String(event.signalId));
              signalName = info?.name || String(event.signalId);
            }
            const tagId = "tagId" in event ? String(event.tagId) : null;
            const isEventExpanded = expandedEvents.has(event.id);

            // Handle both value and error events
            let valueStr: string | null = null;
            let errorContext: string | null = null;
            let errorPreview: string | null = null; // For first line display
            if (event.type === "window:error") {
              // Window error event
              const winError = event as any;
              const errorMsg =
                winError.message || String(winError.error || "Unknown error");
              errorPreview = errorMsg; // Show in first line
              if (winError.source) {
                errorContext = `${winError.source}:${winError.lineno || "?"}:${
                  winError.colno || "?"
                }`;
              }
              // Serialize full error object
              try {
                if (winError.error) {
                  // Create a serializable error object
                  const errorObj: any = {
                    message: winError.error.message || winError.message,
                    name: winError.error.name,
                    stack: winError.error.stack,
                  };
                  // Add any additional properties
                  Object.getOwnPropertyNames(winError.error).forEach((key) => {
                    if (!["message", "name", "stack"].includes(key)) {
                      try {
                        errorObj[key] = (winError.error as any)[key];
                      } catch {
                        // Skip non-serializable properties
                      }
                    }
                  });
                  valueStr = JSON.stringify(errorObj, null, 2);
                } else {
                  valueStr = JSON.stringify({ message: errorMsg }, null, 2);
                }
              } catch {
                // Fallback to message if serialization fails
                valueStr = JSON.stringify({ message: errorMsg }, null, 2);
              }
            } else if (event.type === "window:unhandledrejection") {
              // Unhandled promise rejection
              const rejection = event as any;
              // Access reason directly from event (it's at the top level)
              const reason = rejection.reason ?? (event as any).reason;
              if (reason !== undefined && reason !== null) {
                if (reason instanceof Error) {
                  errorPreview = reason.message || reason.toString();
                  try {
                    // Serialize Error object with all properties
                    const errorObj: any = {
                      message: reason.message,
                      name: reason.name,
                      stack: reason.stack,
                    };
                    Object.getOwnPropertyNames(reason).forEach((key) => {
                      if (!["message", "name", "stack"].includes(key)) {
                        try {
                          errorObj[key] = (reason as any)[key];
                        } catch {
                          // Skip non-serializable properties
                        }
                      }
                    });
                    valueStr = JSON.stringify(errorObj, null, 2);
                  } catch {
                    valueStr = JSON.stringify(
                      { message: reason.message || String(reason) },
                      null,
                      2
                    );
                  }
                } else {
                  // For non-Error reasons (strings, objects, etc.), show them directly
                  errorPreview = String(reason);
                  try {
                    // For strings, just use the string directly (no JSON.stringify to avoid double quotes)
                    if (typeof reason === "string") {
                      valueStr = reason;
                    } else {
                      // For objects/arrays, stringify them
                      valueStr = JSON.stringify(reason, null, 2);
                    }
                  } catch {
                    // If stringification fails, just use the string representation
                    valueStr = String(reason);
                  }
                }
              } else {
                errorPreview =
                  "Unhandled promise rejection (no reason provided)";
                valueStr = JSON.stringify(
                  {
                    message: "Unhandled promise rejection (no reason provided)",
                  },
                  null,
                  2
                );
              }
            } else if ("value" in event) {
              valueStr = JSON.stringify(event.value, null, 2);
            } else if ("error" in event && event.error) {
              const err = event.error as any;
              errorPreview = err.message || String(err.error);
              valueStr = err.message || String(err.error);
              // Show error context (when/async)
              if (err.context) {
                errorContext = `${err.context.when}${
                  err.context.async ? " (async)" : ""
                }`;
              }
            }

            return (
              <div
                style={{
                  ...styles.eventItemStyles,
                  cursor: valueStr ? "pointer" : "default",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "4px",
                  ...(event.isError && {
                    backgroundColor: `${styles.colors.error}15`,
                    borderLeft: `3px solid ${styles.colors.error}`,
                  }),
                }}
                onClick={() => {
                  if (valueStr) {
                    setExpandedEvents((prev) => {
                      const next = new Set(prev);
                      if (next.has(event.id)) {
                        next.delete(event.id);
                      } else {
                        next.add(event.id);
                      }
                      return next;
                    });
                  }
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    width: "100%",
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                  }}
                >
                  <span
                    style={{
                      color: styles.colors.textMuted,
                      fontSize: "8px",
                      minWidth: "50px",
                      flexShrink: 0,
                    }}
                  >
                    {formatTime(event.timestamp)}
                  </span>
                  <span
                    style={styles.eventTypeStyles(event.type, event.isError)}
                  >
                    {event.type === "window:error"
                      ? "window error"
                      : event.type === "window:unhandledrejection"
                      ? "unhandled rejection"
                      : event.type.split(":")[1] === "change"
                      ? "update"
                      : event.type.split(":")[1]}
                  </span>
                  {errorContext && (
                    <span
                      style={{
                        fontSize: "8px",
                        padding: "1px 4px",
                        borderRadius: "3px",
                        backgroundColor: `${styles.colors.error}30`,
                        color: styles.colors.errorText,
                        fontFamily: styles.fontMono,
                      }}
                      title="Error context: when the error occurred"
                    >
                      {errorContext}
                    </span>
                  )}
                  <span
                    style={{
                      color: styles.colors.textDim,
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {signalName && (
                      <span
                        style={{
                          cursor: "pointer",
                          textDecoration: "underline",
                          textDecorationStyle: "dotted",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToSignal(signalName!);
                        }}
                        title={`Go to signal: ${signalName}`}
                      >
                        {signalName}
                      </span>
                    )}
                    {tagId && (
                      <span
                        style={{
                          cursor: "pointer",
                          textDecoration: "underline",
                          textDecorationStyle: "dotted",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToTag(tagId);
                        }}
                        title={`Go to tag: ${tagId}`}
                      >
                        {tagId}
                      </span>
                    )}
                    {/* Show error/reason preview for window errors and rejections */}
                    {errorPreview &&
                      (event.type === "window:error" ||
                        event.type === "window:unhandledrejection") && (
                        <span
                          style={{
                            color: styles.colors.errorText,
                            fontFamily: styles.fontMono,
                            fontSize: "9px",
                            marginLeft: signalName || tagId ? "8px" : "0",
                            fontWeight: 500,
                          }}
                          title={
                            errorPreview.length > 60 ? errorPreview : undefined
                          }
                        >
                          {errorPreview.length > 60
                            ? errorPreview.slice(0, 57) + "..."
                            : errorPreview}
                        </span>
                      )}
                    {/* Always show reason for unhandled rejections, even if errorPreview wasn't set */}
                    {event.type === "window:unhandledrejection" &&
                      !errorPreview && (
                        <span
                          style={{
                            color: styles.colors.errorText,
                            fontFamily: styles.fontMono,
                            fontSize: "9px",
                            marginLeft: signalName || tagId ? "8px" : "0",
                            fontWeight: 500,
                          }}
                        >
                          {(event as any).reason !== undefined &&
                          (event as any).reason !== null
                            ? String((event as any).reason)
                            : "(no reason)"}
                        </span>
                      )}
                  </span>
                  {valueStr && (
                    <button
                      style={{
                        ...styles.signalActionButtonStyles,
                        flexShrink: 0,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        try {
                          navigator.clipboard.writeText(valueStr!);
                        } catch (err) {
                          console.error("Copy failed:", err);
                        }
                      }}
                      title="Copy value"
                    >
                      <IconCopy size={12} />
                    </button>
                  )}
                  {valueStr && (
                    <span
                      style={{
                        color: styles.colors.textMuted,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {isEventExpanded ? (
                        <IconChevronDown size={12} />
                      ) : (
                        <IconChevronRight size={12} />
                      )}
                    </span>
                  )}
                </div>
                {/* Value on second line */}
                {valueStr && !isEventExpanded && (
                  <div
                    style={{
                      fontSize: "9px",
                      color:
                        event.type === "window:error" ||
                        event.type === "window:unhandledrejection"
                          ? styles.colors.errorText
                          : styles.colors.textMuted,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      width: "100%",
                      fontFamily: styles.fontMono,
                    }}
                  >
                    {event.type === "window:error" ||
                    event.type === "window:unhandledrejection"
                      ? formatValue(valueStr, 100) // Longer preview for errors
                      : formatValue((event as any).value)}
                  </div>
                )}
                {isEventExpanded && valueStr && (
                  <pre
                    style={{
                      margin: "6px 0 0 0",
                      padding: "6px",
                      backgroundColor: styles.colors.bg,
                      borderRadius: "4px",
                      fontSize: "9px",
                      color: styles.colors.text,
                      overflow: "auto",
                      maxHeight: "200px",
                      width: "100%",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                    }}
                  >
                    {valueStr}
                  </pre>
                )}
              </div>
            );
    },
    [expandedEvents, signals, onNavigateToSignal, onNavigateToTag]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <VirtualizedList
        items={filteredEvents}
        estimatedItemHeight={56}
        overscan={5}
        getItemKey={getEventKey}
        renderItem={renderEventItem}
        emptyContent={
          <div style={styles.emptyStateStyles}>
            {events.length === 0 ? "No events yet" : "No matching events"}
          </div>
        }
        style={{
          ...styles.eventLogStyles,
          flex: 1,
          maxHeight: "none",
        }}
      />
    </div>
  );
}
