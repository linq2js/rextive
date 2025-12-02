/**
 * Tags Tab Component
 * Displays and manages the tags list
 */

import React, { useState } from "react";
import type { TagInfo, SignalInfo } from "@/devtools/types";
import type { PanelPosition } from "../styles";
import * as styles from "../styles";
import { formatValue } from "../utils/formatUtils";
import { task } from "@/utils/task";
import { isPromiseLike } from "@/utils/isPromiseLike";
import { IconCamera } from "../icons";

interface TagsTabProps {
  tags: Map<string, TagInfo>;
  filteredTags: TagInfo[];
  signals: Map<string, SignalInfo>;
  position: PanelPosition;
  searchQuery: string;
  onNavigateToSignal: (signalId: string) => void;
  onTakeSnapshotForTag?: (tagId: string, signalIds: string[]) => void;
}

export function TagsTab({
  tags,
  filteredTags,
  signals,
  position,
  searchQuery,
  onNavigateToSignal,
  onTakeSnapshotForTag,
}: TagsTabProps): React.ReactElement {
  const [expandedTag, setExpandedTag] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  if (tags.size === 0) {
    return <div style={styles.emptyStateStyles}>No tags tracked</div>;
  }

  if (filteredTags.length === 0) {
    if (searchQuery.trim()) {
      return (
        <div style={styles.emptyStateStyles}>No tags match "{searchQuery}"</div>
      );
    }
    return (
      <div style={styles.emptyStateStyles}>
        No user-named tags
        <div style={{ fontSize: "9px", marginTop: "4px", opacity: 0.7 }}>
          Check "Show #auto" to see {tags.size} auto-generated
        </div>
      </div>
    );
  }

  return (
    <div style={styles.contentGridStyles(position)}>
      {filteredTags.map((info) => {
        const isHovered = hoveredItem === `tag-${info.id}`;
        const isExpanded = expandedTag === info.id;
        const signalIds = Array.from(info.signals);

        return (
          <div
            key={info.id}
            style={styles.itemStyles(isHovered)}
            onMouseEnter={() => setHoveredItem(`tag-${info.id}`)}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={() => setExpandedTag(isExpanded ? null : info.id)}
          >
            <div style={styles.itemHeaderStyles}>
              <span style={styles.itemNameStyles}>
                <span style={styles.badgeStyles("tag")}>T</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                  {info.id}
                </span>
              </span>
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <span style={{ color: styles.colors.textDim, fontSize: "9px" }}>
                  {info.signals.size} sig
                </span>
                {onTakeSnapshotForTag && info.signals.size > 0 && (
                  <button
                    style={{
                      ...styles.signalActionButtonStyles,
                      color: styles.colors.error,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTakeSnapshotForTag(info.id, Array.from(info.signals));
                    }}
                    title={`Take snapshot of signals in "${info.id}"`}
                  >
                    <IconCamera size={12} />
                  </button>
                )}
                <span
                  style={{
                    color: styles.colors.textMuted,
                    fontSize: "8px",
                    transition: "transform 0.2s",
                    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                  }}
                >
                  ▶
                </span>
              </div>
            </div>

            {/* Collapsed preview */}
            {!isExpanded && info.signals.size > 0 && (
              <div style={styles.valueStyles}>
                {signalIds.slice(0, 3).join(", ")}
                {info.signals.size > 3 && ` +${info.signals.size - 3}`}
              </div>
            )}

            {/* Expanded details box */}
            {isExpanded && (
              <div
                style={{
                  marginTop: "8px",
                  paddingTop: "8px",
                  borderTop: `1px solid ${styles.colors.border}`,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    fontSize: "9px",
                    color: styles.colors.textMuted,
                    marginBottom: "6px",
                    fontWeight: 600,
                  }}
                >
                  Signals ({info.signals.size})
                </div>
                {info.signals.size === 0 ? (
                  <div
                    style={{
                      fontSize: "10px",
                      color: styles.colors.textDim,
                      fontStyle: "italic",
                    }}
                  >
                    No signals in this tag
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      maxHeight: "200px",
                      overflowY: "auto",
                    }}
                  >
                    {signalIds.map((signalId) => {
                      const signalInfo = signals.get(signalId);
                      const isDisposed = signalInfo?.disposed;

                      return (
                        <div
                          key={signalId}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "4px 6px",
                            backgroundColor: styles.colors.bgHover,
                            borderRadius: "4px",
                            cursor: "pointer",
                            ...(isDisposed && {
                              opacity: 0.5,
                              textDecoration: "line-through",
                            }),
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToSignal(signalId);
                          }}
                          title={`${signalInfo?.name || signalId}\nUID: ${signalId}`}
                        >
                          <span
                            style={{
                              ...styles.badgeStyles(
                                signalInfo?.kind || "mutable"
                              ),
                              ...(isDisposed && {
                                backgroundColor: "#444",
                                color: "#888",
                              }),
                            }}
                          >
                            {isDisposed
                              ? "✕"
                              : signalInfo?.kind === "computed"
                              ? "C"
                              : "M"}
                          </span>
                          <span
                            style={{
                              fontSize: "10px",
                              color: styles.colors.text,
                              flex: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {signalId}
                          </span>
                          {signalInfo && !isDisposed && (
                            <span
                              style={{
                                fontSize: "9px",
                                color: styles.colors.textDim,
                                maxWidth: "100px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {(() => {
                                const val = signalInfo.signal.tryGet();
                                if (isPromiseLike(val)) {
                                  const state = task.from(val);
                                  if (state.status === "success")
                                    return formatValue(state.value);
                                  if (state.status === "error")
                                    return `⚠ ${String(state.error)}`;
                                  return "[async]";
                                }
                                return formatValue(val);
                              })()}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
