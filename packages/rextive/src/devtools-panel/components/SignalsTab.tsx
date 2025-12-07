/**
 * Signals Tab Component
 * Displays and manages the signals list with virtualization for performance
 */

import React, { useState, useCallback, useMemo } from "react";
import type { SignalInfo } from "../../devtools/types";
import type { PanelPosition } from "../styles";
import * as styles from "../styles";
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
import { formatValue, formatValueFull, formatTime } from "../utils/formatUtils";
import { extractSignalValue } from "../utils/signalUtils";
import { deleteSignal } from "../../devtools";
import { VirtualizedList } from "./shared";

interface SignalsTabProps {
  signals: Map<string, SignalInfo>;
  filteredSignals: SignalInfo[];
  position: PanelPosition;
  recentActivitySort: boolean;
  bookmarkedSignals: Set<string>;
  toggleBookmark: (signalId: string) => void;
  onNavigateToEvents: (signalName: string) => void;
  onSearch: (query: string) => void;
  onCompare: (signalId: string, currentValue: unknown, historyValue: unknown, historyTimestamp: number) => void;
}

export function SignalsTab({
  signals,
  filteredSignals,
  position,
  recentActivitySort,
  bookmarkedSignals,
  toggleBookmark,
  onNavigateToEvents,
  onSearch,
  onCompare,
}: SignalsTabProps): React.ReactElement {
  const [expandedSignal, setExpandedSignal] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [editingSignal, setEditingSignal] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  // Sort signals based on mode
  const sortedSignals = useMemo(() => {
    return [...filteredSignals].sort((a, b) => {
      if (recentActivitySort) {
        // Sort by last activity time (updatedAt), latest first
        return b.updatedAt - a.updatedAt;
      }
      // Default: active signals first, then disposed
      if (a.disposed !== b.disposed) return a.disposed ? 1 : -1;
      return 0;
    });
  }, [filteredSignals, recentActivitySort]);

  // Pre-compute signal names map for stable lookups
  const signalNamesMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const [id, info] of signals) {
      map.set(id, info.name);
    }
    return map;
  }, [signals]);

  // Pre-compute dependents map for all signals (only recalculate when signals change)
  const dependentsMap = useMemo(() => {
    const map = new Map<string, Array<{ id: string; name: string }>>();
    for (const [, info] of signals) {
      if (info.depIds) {
        for (const depId of info.depIds) {
          const existing = map.get(depId) || [];
          existing.push({ id: info.id, name: info.name });
          map.set(depId, existing);
        }
      }
    }
    return map;
  }, [signals]);

  const getSignalKey = useCallback(
    (info: SignalInfo) => info.id,
    []
  );

  const renderSignalItem = useCallback(
    (info: SignalInfo) => {
      const { value: currentValue, error: signalError } =
        extractSignalValue(info);

      const isExpanded = expandedSignal === info.id;
      const isHovered = hoveredItem === `signal-${info.id}`;
      const hasError = !info.disposed && signalError !== undefined;

      // Get current display name from signal (may have been renamed)
      const displayName = info.signal.displayName || info.name;

      // Build hover tooltip with signal name, UID, and source location
      const hoverTitle = [
        displayName,
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
            style={{
              ...styles.itemStyles(isHovered, null, hasError),
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
                  {displayName}
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
                  <IconStar size={12} filled={bookmarkedSignals.has(info.id)} />
                </button>
                {/* View events button */}
                <button
                  style={styles.signalActionButtonStyles}
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateToEvents(displayName);
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
                  {displayName}
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
                              err instanceof Error ? err.message : "Invalid JSON"
                            );
                          }
                        }}
                      >
                        Set Value
                      </button>
                    </div>
                  </div>
                )}

                {/* Full value with actions - hide when editing */}
                {!info.disposed && editingSignal !== info.id && (
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
                )}

                {/* Source location */}
                {info.source && (
                  <div
                    style={{
                      fontSize: "9px",
                      color: styles.colors.textMuted,
                      marginBottom: info.history.length > 0 ? "6px" : 0,
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
                  <div style={{ marginTop: "6px", marginBottom: "6px" }}>
                    <div
                      style={{
                        fontSize: "9px",
                        color: styles.colors.textMuted,
                        marginBottom: "4px",
                      }}
                    >
                      Dependencies ({info.depIds.length}):
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px",
                      }}
                    >
                      {info.depIds.map((depId) => {
                        const depName = signalNamesMap.get(depId) || depId;
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
                              onSearch(depName);
                            }}
                            title={`${depName}\nUID: ${depId}\nClick to search`}
                          >
                            → {depName}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Dependents (signals that depend on this signal) */}
                {dependentsMap.get(info.id)?.length ? (
                  <div style={{ marginTop: "6px", marginBottom: "6px" }}>
                    <div
                      style={{
                        fontSize: "9px",
                        color: styles.colors.textMuted,
                        marginBottom: "4px",
                      }}
                    >
                      Dependents ({dependentsMap.get(info.id)!.length}):
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px",
                      }}
                    >
                      {dependentsMap.get(info.id)!.map(({ id, name }) => (
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
                            onSearch(name);
                          }}
                          title={`${name}\nUID: ${id}\nClick to search`}
                        >
                          ← {name}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* History */}
                {info.history.length > 0 && (
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
                                onCompare(
                                  info.id,
                                  currentValue,
                                  entry.value,
                                  entry.timestamp
                                );
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
                                const json = JSON.stringify(entry.value, null, 2);
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
                )}
              </div>
            )}
          </div>
        );
    },
    [
      expandedSignal,
      hoveredItem,
      editingSignal,
      editValue,
      editError,
      bookmarkedSignals,
      toggleBookmark,
      onNavigateToEvents,
      onSearch,
      onCompare,
      signalNamesMap,
      dependentsMap,
    ]
  );

  // Empty states
  const emptyContent = useMemo(() => {
    if (signals.size === 0) {
      return <div style={styles.emptyStateStyles}>No signals tracked</div>;
    }
    if (filteredSignals.length === 0) {
      return (
        <div style={styles.emptyStateStyles}>
          No user-named signals
          <div style={{ fontSize: "9px", marginTop: "4px", opacity: 0.7 }}>
            Check "Show #auto" to see {signals.size} auto-generated
          </div>
        </div>
      );
    }
    return null;
  }, [signals.size, filteredSignals.length]);

  return (
    <VirtualizedList
      items={sortedSignals}
      estimatedItemHeight={64}
      overscan={5}
      getItemKey={getSignalKey}
      renderItem={renderSignalItem}
      emptyContent={emptyContent}
      style={styles.contentGridStyles(position)}
    />
  );
}

