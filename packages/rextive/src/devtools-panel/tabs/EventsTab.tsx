/**
 * Events Tab Component
 * Displays event log in the DevTools panel
 */

import React, { memo } from "react";
import type { SignalInfo } from "../../devtools/types";
import { formatValue, formatTime } from "../utils";
import * as styles from "../styles";
import type { Tab, EventLogEntry } from "../types";
import {
  IconCopy,
  IconChevronDown,
  IconChevronRight,
} from "../icons";

export interface EventsTabProps {
  events: EventLogEntry[];
  filteredEvents: EventLogEntry[];
  signals: Map<string, SignalInfo>;
  expandedEvents: Set<number>;
  setExpandedEvents: React.Dispatch<React.SetStateAction<Set<number>>>;
  setSearchQuery: (query: string) => void;
  setSignalKindFilter: (filter: "all" | "mutable" | "computed" | "error" | "disposed") => void;
  updateActiveTab: (tab: Tab) => void;
}

export const EventsTab = memo(function EventsTab({
  events,
  filteredEvents,
  signals,
  expandedEvents,
  setExpandedEvents,
  setSearchQuery,
  setSignalKindFilter,
  updateActiveTab,
}: EventsTabProps): React.ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {filteredEvents.length === 0 ? (
        <div style={styles.emptyStateStyles}>
          {events.length === 0 ? "No events yet" : "No matching events"}
        </div>
      ) : (
        <div
          style={{
            ...styles.eventLogStyles,
            flex: 1,
            overflowY: "auto",
            maxHeight: "none",
          }}
        >
          {filteredEvents.map((event) => (
            <EventItem
              key={event.id}
              event={event}
              signals={signals}
              isExpanded={expandedEvents.has(event.id)}
              onToggleExpand={() => {
                setExpandedEvents((prev) => {
                  const next = new Set(prev);
                  if (next.has(event.id)) {
                    next.delete(event.id);
                  } else {
                    next.add(event.id);
                  }
                  return next;
                });
              }}
              setSearchQuery={setSearchQuery}
              setSignalKindFilter={setSignalKindFilter}
              updateActiveTab={updateActiveTab}
            />
          ))}
        </div>
      )}
    </div>
  );
});

interface EventItemProps {
  event: EventLogEntry;
  signals: Map<string, SignalInfo>;
  isExpanded: boolean;
  onToggleExpand: () => void;
  setSearchQuery: (query: string) => void;
  setSignalKindFilter: (filter: "all" | "mutable" | "computed" | "error" | "disposed") => void;
  updateActiveTab: (tab: Tab) => void;
}

const EventItem = memo(function EventItem({
  event,
  signals,
  isExpanded,
  onToggleExpand,
  setSearchQuery,
  setSignalKindFilter,
  updateActiveTab,
}: EventItemProps): React.ReactElement {
  // Get signal name and UID for display
  let signalName: string | null = null;
  let signalUid: string | null = null;
  if ("signal" in event && event.signal) {
    signalName =
      (event.signal as any).name || (event.signal as any).id;
    signalUid = (event.signal as any).id || null;
  } else if ("signalId" in event) {
    signalUid = String(event.signalId);
    const info = signals.get(signalUid);
    signalName = info?.name || signalUid;
  }
  const tagId = "tagId" in event ? String(event.tagId) : null;

  // Handle both value and error events
  let valueStr: string | null = null;
  let errorContext: string | null = null;
  let errorPreview: string | null = null;

  if (event.type === "window:error") {
    const winError = event as any;
    const errorMsg =
      winError.message || String(winError.error || "Unknown error");
    errorPreview = errorMsg;
    if (winError.source) {
      errorContext = `${winError.source}:${
        winError.lineno || "?"
      }:${winError.colno || "?"}`;
    }
    try {
      if (winError.error) {
        const errorObj: any = {
          message: winError.error.message || winError.message,
          name: winError.error.name,
          stack: winError.error.stack,
        };
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
      valueStr = JSON.stringify({ message: errorMsg }, null, 2);
    }
  } else if (event.type === "window:unhandledrejection") {
    const rejection = event as any;
    const reason = rejection.reason ?? (event as any).reason;
    if (reason !== undefined && reason !== null) {
      if (reason instanceof Error) {
        errorPreview = reason.message || reason.toString();
        try {
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
        errorPreview = String(reason);
        try {
          if (typeof reason === "string") {
            valueStr = reason;
          } else {
            valueStr = JSON.stringify(reason, null, 2);
          }
        } catch {
          valueStr = String(reason);
        }
      }
    } else {
      errorPreview = "Unhandled promise rejection (no reason provided)";
      valueStr = JSON.stringify(
        { message: "Unhandled promise rejection (no reason provided)" },
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
          onToggleExpand();
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
        <span style={styles.eventTypeStyles(event.type, event.isError)}>
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
                setSearchQuery(signalName!);
                setSignalKindFilter("all");
                updateActiveTab("signals");
              }}
              title={
                signalUid
                  ? `${signalName}\nUID: ${signalUid}`
                  : signalName!
              }
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
                setSearchQuery(tagId);
                updateActiveTab("tags");
              }}
              title={`Go to tag: ${tagId}`}
            >
              {tagId}
            </span>
          )}
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
          {event.type === "window:unhandledrejection" && !errorPreview && (
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
            {isExpanded ? (
              <IconChevronDown size={12} />
            ) : (
              <IconChevronRight size={12} />
            )}
          </span>
        )}
      </div>
      {/* Value on second line - aligned with the tag */}
      {valueStr && !isExpanded && (
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
            paddingLeft: "56px",
          }}
        >
          {event.type === "window:error" ||
          event.type === "window:unhandledrejection"
            ? formatValue(valueStr, 100)
            : formatValue((event as any).value)}
        </div>
      )}
      {isExpanded && valueStr && (
        <pre
          style={{
            margin: "6px 0 0 0",
            marginLeft: "56px",
            padding: "6px",
            backgroundColor: styles.colors.bg,
            borderRadius: "4px",
            fontSize: "9px",
            color: styles.colors.text,
            overflow: "auto",
            maxHeight: "200px",
            width: "calc(100% - 56px)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {valueStr}
        </pre>
      )}
    </div>
  );
});

