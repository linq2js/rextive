/**
 * Signals Tab Component
 * Displays and manages signal information in the DevTools panel
 */

import React, { memo } from "react";
import type { SignalInfo } from "../../devtools/types";
import { isPromiseLike } from "../../utils/isPromiseLike";
import { task } from "../../utils/task";
import { formatValue, formatValueFull, formatTime } from "../utils";
import * as styles from "../styles";
import type { PanelPosition } from "../styles";
import type { CompareModalState, Tab } from "../types";
import {
  IconStar,
  IconHistory,
  IconResetSmall,
  IconRefresh,
  IconTrash,
  IconCopy,
  IconEdit,
  IconCompare,
  IconRevert,
} from "../icons";

export interface SignalsTabProps {
  signals: Map<string, SignalInfo>;
  filteredSignals: SignalInfo[];
  position: PanelPosition;
  expandedSignal: string | null;
  setExpandedSignal: (id: string | null) => void;
  hoveredItem: string | null;
  setHoveredItem: (id: string | null) => void;
  flashingSignals: Record<string, "change" | "create">;
  bookmarkedSignals: Set<string>;
  toggleBookmark: (signalId: string) => void;
  editingSignal: string | null;
  setEditingSignal: (id: string | null) => void;
  editValue: string;
  setEditValue: (value: string) => void;
  editError: string | null;
  setEditError: (error: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  recentActivitySort: boolean;
  setSignalKindFilter: (filter: "all" | "mutable" | "computed" | "error" | "disposed") => void;
  updateActiveTab: (tab: Tab) => void;
  setCompareModal: (modal: CompareModalState | null) => void;
  dependentsMap: Map<string, Array<{ id: string; name: string }>>;
  deleteSignal: (id: string) => void;
}

export const SignalsTab = memo(function SignalsTab({
  signals,
  filteredSignals,
  position,
  expandedSignal,
  setExpandedSignal,
  hoveredItem,
  setHoveredItem,
  flashingSignals,
  bookmarkedSignals,
  toggleBookmark,
  editingSignal,
  setEditingSignal,
  editValue,
  setEditValue,
  editError,
  setEditError,
  searchQuery,
  setSearchQuery,
  recentActivitySort,
  setSignalKindFilter,
  updateActiveTab,
  setCompareModal,
  dependentsMap,
  deleteSignal,
}: SignalsTabProps): React.ReactElement {
  if (signals.size === 0) {
    return <div style={styles.emptyStateStyles}>No signals tracked</div>;
  }

  if (filteredSignals.length === 0) {
    if (searchQuery.trim()) {
      return (
        <div style={styles.emptyStateStyles}>
          No signals match "{searchQuery}"
        </div>
      );
    }
    return (
      <div style={styles.emptyStateStyles}>
        No user-named signals
        <div style={{ fontSize: "9px", marginTop: "4px", opacity: 0.7 }}>
          Check "Show #auto" to see {signals.size} auto-generated
        </div>
      </div>
    );
  }

  // Sort signals based on mode
  const sortedSignals = [...filteredSignals].sort((a, b) => {
    if (recentActivitySort) {
      // Sort by last activity time (updatedAt), latest first
      return b.updatedAt - a.updatedAt;
    }
    // Default: active signals first, then disposed
    if (a.disposed !== b.disposed) return a.disposed ? 1 : -1;
    return 0;
  });

  return (
    <div style={styles.contentGridStyles(position)}>
      {sortedSignals.map((info) => {
        let currentValue: unknown;
        let signalError: unknown = undefined;

        if (info.disposed) {
          // Format disposal time
          const disposedTime = info.disposedAt
            ? new Date(info.disposedAt).toLocaleTimeString("en-GB", {
                hour12: false,
              })
            : "";
          currentValue = disposedTime
            ? `[disposed at ${disposedTime}]`
            : "[disposed]";
        } else {
          // Check for error first (works for both sync and async signals)
          signalError = info.signal.error();
          if (signalError) {
            currentValue = signalError;
          } else {
            currentValue = info.signal.tryGet();
            // For async signals, show the resolved/rejected value from task
            if (isPromiseLike(currentValue)) {
              const state = task.from(currentValue);
              if (state.status === "success") {
                currentValue = state.value;
              } else if (state.status === "error") {
                signalError = state.error;
                currentValue = state.error;
              } else {
                // Loading state - show "[async]"
                currentValue = "[async]";
              }
            }
          }
        }

        const isExpanded = expandedSignal === info.id;
        const isHovered = hoveredItem === `signal-${info.id}`;
        const flashType = flashingSignals[info.id] ?? null;
        const hasError = !info.disposed && signalError !== undefined;

        // Build hover tooltip with full name, UID, and source location
        const hoverTitle = [
          info.name,
          `UID: ${info.id}`,
          info.source
            ? `📍 ${info.source.file}:${info.source.line}${
                info.source.functionName
                  ? ` (${info.source.functionName})`
                  : ""
              }`
            : null,
        ]
          .filter(Boolean)
          .join("\n");

        return (
          <div
            key={info.id}
            id={`signal-item-${info.id}`}
            style={{
              ...styles.itemStyles(isHovered, flashType, hasError),
              ...(info.disposed && {
                opacity: 0.6,
                borderLeft: `3px solid #666`,
                backgroundColor: "#2a2a2a",
                filter: "grayscale(100%)",
              }),
            }}
            title={hoverTitle}
            onClick={() => setExpandedSignal(isExpanded ? null : info.id)}
            onMouseEnter={() => setHoveredItem(`signal-${info.id}`)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <div style={styles.itemHeaderStyles}>
              <span style={styles.itemNameStyles}>
                <span
                  style={{
                    ...styles.badgeStyles(info.kind),
                    ...(info.disposed && {
                      backgroundColor: "#444",
                      color: "#888",
                    }),
                  }}
                >
                  {info.disposed ? "✕" : info.kind === "mutable" ? "M" : "C"}
                </span>
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    ...(info.disposed && {
                      textDecoration: "line-through",
                      color: "#666",
                    }),
                  }}
                >
                  {info.name}
                </span>
                {info.disposed && (
                  <span
                    style={{
                      color: "#888",
                      fontSize: "9px",
                      marginLeft: "6px",
                      flexShrink: 0,
                      backgroundColor: "#333",
                      padding: "1px 4px",
                      borderRadius: "3px",
                    }}
                  >
                    disposed
                  </span>
                )}
              </span>
              <div style={styles.signalActionsContainerStyles}>
                {/* Bookmark button */}
                <button
                  style={{
                    ...styles.signalActionButtonStyles,
                    color: bookmarkedSignals.has(info.id)
                      ? styles.colors.warning
                      : styles.colors.textMuted,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBookmark(info.id);
                  }}
                  title={
                    bookmarkedSignals.has(info.id)
                      ? "Remove bookmark"
                      : "Bookmark signal"
                  }
                >
                  <IconStar
                    size={12}
                    filled={bookmarkedSignals.has(info.id)}
                  />
                </button>
                {/* View events button */}
                <button
                  style={styles.signalActionButtonStyles}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery(info.name);
                    setSignalKindFilter("all");
                    updateActiveTab("events");
                  }}
                  title="View events for this signal"
                >
                  <IconHistory size={12} />
                </button>
                {/* Reset button for mutable signals */}
                {!info.disposed && info.kind === "mutable" && (
                  <button
                    style={styles.signalActionButtonStyles}
                    onClick={(e) => {
                      e.stopPropagation();
                      try {
                        (info.signal as any).reset();
                      } catch (err) {
                        console.error("Reset failed:", err);
                      }
                    }}
                    title="Reset to initial value"
                  >
                    <IconResetSmall size={12} />
                  </button>
                )}
                {/* Refresh button for computed signals */}
                {!info.disposed && info.kind === "computed" && (
                  <button
                    style={styles.signalActionButtonStyles}
                    onClick={(e) => {
                      e.stopPropagation();
                      try {
                        const sig = info.signal as any;
                        if (sig.paused?.()) {
                          sig.resume();
                        } else {
                          // Force re-read to refresh
                          sig();
                        }
                      } catch (err) {
                        console.error("Refresh failed:", err);
                      }
                    }}
                    title="Refresh / Resume if paused"
                  >
                    <IconRefresh size={12} />
                  </button>
                )}
                {/* Delete button for disposed signals */}
                {info.disposed && (
                  <button
                    style={{
                      ...styles.signalActionButtonStyles,
                      color: "#888",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSignal(info.id);
                    }}
                    title="Remove from devtools"
                  >
                    <IconTrash size={12} />
                  </button>
                )}
              </div>
            </div>
            <div
              style={{
                ...styles.valueStyles,
                ...(info.disposed && { color: "#555" }),
                ...(hasError && { color: styles.colors.errorText }),
              }}
            >
              {!info.disposed && (
                <span
                  style={{
                    color: styles.colors.textMuted,
                    marginRight: "4px",
                  }}
                >
                  {info.changeCount}×
                </span>
              )}
              {hasError
                ? `⚠ ${String(currentValue)}`
                : formatValue(currentValue)}
            </div>

            {isExpanded && (
              <SignalExpandedDetails
                info={info}
                signals={signals}
                currentValue={currentValue}
                signalError={signalError}
                hasError={hasError}
                editingSignal={editingSignal}
                setEditingSignal={setEditingSignal}
                editValue={editValue}
                setEditValue={setEditValue}
                editError={editError}
                setEditError={setEditError}
                setSearchQuery={setSearchQuery}
                setCompareModal={setCompareModal}
                dependentsMap={dependentsMap}
              />
            )}
          </div>
        );
      })}
    </div>
  );
});

interface SignalExpandedDetailsProps {
  info: SignalInfo;
  signals: Map<string, SignalInfo>;
  currentValue: unknown;
  signalError: unknown;
  hasError: boolean;
  editingSignal: string | null;
  setEditingSignal: (id: string | null) => void;
  editValue: string;
  setEditValue: (value: string) => void;
  editError: string | null;
  setEditError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  setCompareModal: (modal: CompareModalState | null) => void;
  dependentsMap: Map<string, Array<{ id: string; name: string }>>;
}

const SignalExpandedDetails = memo(function SignalExpandedDetails({
  info,
  signals,
  currentValue,
  signalError,
  hasError,
  editingSignal,
  setEditingSignal,
  editValue,
  setEditValue,
  editError,
  setEditError,
  setSearchQuery,
  setCompareModal,
  dependentsMap,
}: SignalExpandedDetailsProps): React.ReactElement {
  return (
    <div
      style={{
        marginTop: "6px",
        paddingTop: "6px",
        borderTop: `1px solid ${styles.colors.border}`,
      }}
    >
      {/* Full signal name */}
      <div
        style={{
          fontSize: "10px",
          color: styles.colors.text,
          marginBottom: "4px",
          wordBreak: "break-all",
          fontFamily: styles.fontMono,
        }}
      >
        <span
          style={{
            color: styles.colors.textMuted,
            fontSize: "9px",
          }}
        >
          Name:{" "}
        </span>
        {info.name}
      </div>

      {/* Signal UID */}
      <div
        style={{
          fontSize: "10px",
          color: styles.colors.textMuted,
          marginBottom: "8px",
          fontFamily: styles.fontMono,
        }}
      >
        <span
          style={{
            fontSize: "9px",
          }}
        >
          UID:{" "}
        </span>
        {info.id}
      </div>

      {/* Edit form for mutable signals - replaces readonly value display */}
      {editingSignal === info.id && info.kind === "mutable" && (
        <SignalEditForm
          info={info}
          editValue={editValue}
          setEditValue={setEditValue}
          editError={editError}
          setEditError={setEditError}
          setEditingSignal={setEditingSignal}
        />
      )}

      {/* Full value with actions - hide when editing */}
      {!info.disposed && editingSignal !== info.id && (
        <SignalValueDisplay
          info={info}
          currentValue={currentValue}
          signalError={signalError}
          hasError={hasError}
          setEditValue={setEditValue}
          setEditError={setEditError}
          setEditingSignal={setEditingSignal}
        />
      )}

      {/* Source location */}
      {info.source && (
        <div
          style={{
            fontSize: "9px",
            color: styles.colors.textMuted,
            marginBottom: "6px",
          }}
        >
          <span style={{ opacity: 0.6 }}>📍</span>{" "}
          <span
            style={{ color: styles.colors.textDim }}
            title={info.source.functionName || undefined}
          >
            {info.source.file}:{info.source.line}
          </span>
          {info.source.functionName && (
            <span style={{ opacity: 0.6 }}>
              {" "}
              ({info.source.functionName})
            </span>
          )}
        </div>
      )}

      {/* Dependencies (for computed signals) */}
      {info.depIds && info.depIds.length > 0 && (
        <SignalDependencies
          depIds={info.depIds}
          signals={signals}
          setSearchQuery={setSearchQuery}
        />
      )}

      {/* Dependents (signals that depend on this signal) */}
      {dependentsMap.get(info.id)?.length ? (
        <SignalDependents
          dependents={dependentsMap.get(info.id)!}
          setSearchQuery={setSearchQuery}
        />
      ) : null}

      {/* History */}
      {info.history.length > 0 && (
        <SignalHistory
          info={info}
          setCompareModal={setCompareModal}
        />
      )}
    </div>
  );
});

interface SignalEditFormProps {
  info: SignalInfo;
  editValue: string;
  setEditValue: (value: string) => void;
  editError: string | null;
  setEditError: (error: string | null) => void;
  setEditingSignal: (id: string | null) => void;
}

const SignalEditForm = memo(function SignalEditForm({
  info,
  editValue,
  setEditValue,
  editError,
  setEditError,
  setEditingSignal,
}: SignalEditFormProps): React.ReactElement {
  return (
    <div
      style={{
        marginBottom: "8px",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "4px",
        }}
      >
        <span
          style={{
            fontSize: "9px",
            color: styles.colors.textMuted,
          }}
        >
          Value:
        </span>
      </div>
      <textarea
        value={editValue}
        onChange={(e) => {
          setEditValue(e.target.value);
          setEditError(null);
        }}
        style={{
          width: "100%",
          minHeight: "150px",
          backgroundColor: styles.colors.bg,
          border: editError
            ? `1px solid ${styles.colors.error}`
            : `1px solid ${styles.colors.border}`,
          borderRadius: "4px",
          color: styles.colors.text,
          fontSize: "10px",
          fontFamily: styles.fontMono,
          padding: "6px",
          resize: "vertical",
          outline: "none",
          overflow: "auto",
          whiteSpace: "pre",
          wordBreak: "normal",
        }}
        placeholder="Enter JSON value..."
        autoFocus
      />
      {editError && (
        <div
          style={{
            color: styles.colors.error,
            fontSize: "9px",
            marginTop: "4px",
          }}
        >
          {editError}
        </div>
      )}
      <div
        style={{
          display: "flex",
          gap: "6px",
          marginTop: "6px",
          justifyContent: "flex-end",
          flexWrap: "nowrap",
        }}
      >
        <button
          style={{
            ...styles.signalActionButtonStyles,
            width: "auto",
            height: "auto",
            padding: "4px 10px",
            whiteSpace: "nowrap",
          }}
          onClick={() => {
            setEditingSignal(null);
            setEditError(null);
          }}
        >
          Cancel
        </button>
        <button
          style={{
            ...styles.signalActionButtonStyles,
            width: "auto",
            height: "auto",
            padding: "4px 10px",
            backgroundColor: styles.colors.mutable + "33",
            color: styles.colors.mutable,
            whiteSpace: "nowrap",
          }}
          onClick={() => {
            try {
              const parsed = JSON.parse(editValue);
              (info.signal as any).set(parsed);
              setEditingSignal(null);
              setEditError(null);
            } catch (err) {
              setEditError(
                err instanceof Error
                  ? err.message
                  : "Invalid JSON"
              );
            }
          }}
        >
          Set Value
        </button>
      </div>
    </div>
  );
});

interface SignalValueDisplayProps {
  info: SignalInfo;
  currentValue: unknown;
  signalError: unknown;
  hasError: boolean;
  setEditValue: (value: string) => void;
  setEditError: (error: string | null) => void;
  setEditingSignal: (id: string | null) => void;
}

const SignalValueDisplay = memo(function SignalValueDisplay({
  info,
  currentValue,
  signalError,
  hasError,
  setEditValue,
  setEditError,
  setEditingSignal,
}: SignalValueDisplayProps): React.ReactElement {
  return (
    <div style={{ marginBottom: "8px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "4px",
        }}
      >
        <span
          style={{
            fontSize: "9px",
            color: styles.colors.textMuted,
          }}
        >
          Value:
        </span>
        <div style={{ display: "flex", gap: "4px" }}>
          {/* Copy button */}
          <button
            style={styles.signalActionButtonStyles}
            onClick={(e) => {
              e.stopPropagation();
              try {
                if (hasError) {
                  navigator.clipboard.writeText(
                    String(signalError)
                  );
                } else {
                  const value = info.signal.tryGet();
                  const json = JSON.stringify(value, null, 2);
                  navigator.clipboard.writeText(json);
                }
              } catch (err) {
                console.error("Copy failed:", err);
              }
            }}
            title={
              hasError
                ? "Copy error message"
                : "Copy JSON value"
            }
          >
            <IconCopy size={12} />
          </button>
          {/* Edit button for mutable signals */}
          {info.kind === "mutable" && !hasError && (
            <button
              style={styles.signalActionButtonStyles}
              onClick={(e) => {
                e.stopPropagation();
                try {
                  const value = info.signal.tryGet();
                  setEditValue(JSON.stringify(value, null, 2));
                  setEditError(null);
                  setEditingSignal(info.id);
                } catch (err) {
                  console.error("Edit failed:", err);
                }
              }}
              title="Edit value (JSON)"
            >
              <IconEdit size={12} />
            </button>
          )}
        </div>
      </div>
      <pre
        style={{
          margin: 0,
          padding: "6px",
          backgroundColor: styles.colors.bg,
          borderRadius: "4px",
          fontSize: "9px",
          color: hasError
            ? styles.colors.errorText
            : styles.colors.text,
          overflow: "auto",
          maxHeight: "150px",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          fontFamily: styles.fontMono,
        }}
      >
        {hasError
          ? `⚠ ${String(signalError)}`
          : formatValueFull(currentValue)}
      </pre>
    </div>
  );
});

interface SignalDependenciesProps {
  depIds: string[];
  signals: Map<string, SignalInfo>;
  setSearchQuery: (query: string) => void;
}

const SignalDependencies = memo(function SignalDependencies({
  depIds,
  signals,
  setSearchQuery,
}: SignalDependenciesProps): React.ReactElement {
  return (
    <div style={{ marginTop: "6px", marginBottom: "6px" }}>
      <div
        style={{
          fontSize: "9px",
          color: styles.colors.textMuted,
          marginBottom: "4px",
        }}
      >
        Dependencies ({depIds.length}):
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "4px",
        }}
      >
        {depIds.map((depId) => {
          const depInfo = signals.get(depId);
          const depName = depInfo?.name || depId;
          return (
            <span
              key={depId}
              style={{
                fontSize: "9px",
                padding: "2px 6px",
                backgroundColor: styles.colors.bgHover,
                borderRadius: "3px",
                color: styles.colors.text,
                cursor: "pointer",
                fontFamily: styles.fontMono,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSearchQuery(depName);
              }}
              title={`${depName}\nUID: ${depId}\nClick to search`}
            >
              → {depName}
            </span>
          );
        })}
      </div>
    </div>
  );
});

interface SignalDependentsProps {
  dependents: Array<{ id: string; name: string }>;
  setSearchQuery: (query: string) => void;
}

const SignalDependents = memo(function SignalDependents({
  dependents,
  setSearchQuery,
}: SignalDependentsProps): React.ReactElement {
  return (
    <div style={{ marginTop: "6px", marginBottom: "6px" }}>
      <div
        style={{
          fontSize: "9px",
          color: styles.colors.textMuted,
          marginBottom: "4px",
        }}
      >
        Dependents ({dependents.length}):
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "4px",
        }}
      >
        {dependents.map(({ id, name }) => (
          <span
            key={id}
            style={{
              fontSize: "9px",
              padding: "2px 6px",
              backgroundColor: styles.colors.bgHover,
              borderRadius: "3px",
              color: styles.colors.text,
              cursor: "pointer",
              fontFamily: styles.fontMono,
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSearchQuery(name);
            }}
            title={`${name}\nUID: ${id}\nClick to search`}
          >
            ← {name}
          </span>
        ))}
      </div>
    </div>
  );
});

interface SignalHistoryProps {
  info: SignalInfo;
  setCompareModal: (modal: CompareModalState | null) => void;
}

const SignalHistory = memo(function SignalHistory({
  info,
  setCompareModal,
}: SignalHistoryProps): React.ReactElement {
  return (
    <div style={{ marginTop: "6px" }}>
      <div
        style={{
          fontSize: "9px",
          color: styles.colors.textMuted,
          marginBottom: "4px",
        }}
      >
        History:
      </div>
      {info.history.slice(0, 5).map((entry, i) => {
        const isCurrentValue = i === 0;
        let currentValue: unknown;
        try {
          currentValue = info.signal.get();
        } catch {
          currentValue = undefined;
        }
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "9px",
              color: styles.colors.textDim,
              marginBottom: "2px",
            }}
          >
            <span style={{ color: styles.colors.textMuted }}>
              {formatTime(entry.timestamp)}
            </span>
            <span
              style={{
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              → {formatValue(entry.value)}
            </span>
            {/* Compare button */}
            {!isCurrentValue && (
              <button
                style={{
                  ...styles.signalActionButtonStyles,
                  width: "18px",
                  height: "18px",
                  flexShrink: 0,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setCompareModal({
                    signalId: info.id,
                    currentValue,
                    historyValue: entry.value,
                    historyTimestamp: entry.timestamp,
                  });
                }}
                title="Compare with current value"
              >
                <IconCompare size={10} />
              </button>
            )}
            {/* Revert button for mutable signals */}
            {!info.disposed &&
              info.kind === "mutable" &&
              !isCurrentValue && (
                <button
                  style={{
                    ...styles.signalActionButtonStyles,
                    width: "18px",
                    height: "18px",
                    flexShrink: 0,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    try {
                      (info.signal as any).set(entry.value);
                    } catch (err) {
                      console.error("Revert failed:", err);
                    }
                  }}
                  title="Revert to this value"
                >
                  <IconRevert size={10} />
                </button>
              )}
            <button
              style={{
                ...styles.signalActionButtonStyles,
                width: "18px",
                height: "18px",
                flexShrink: 0,
              }}
              onClick={(e) => {
                e.stopPropagation();
                try {
                  const json = JSON.stringify(
                    entry.value,
                    null,
                    2
                  );
                  navigator.clipboard.writeText(json);
                } catch (err) {
                  console.error("Copy failed:", err);
                }
              }}
              title="Copy value"
            >
              <IconCopy size={10} />
            </button>
          </div>
        );
      })}
    </div>
  );
});

