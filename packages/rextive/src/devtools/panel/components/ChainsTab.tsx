/**
 * Chains Tab Component
 * Displays chain reactions
 */

import React, { useState } from "react";
import type { ChainReaction, SignalInfo } from "../../types";
import * as styles from "../styles";
import { IconClose } from "../icons";
import { deleteChain } from "../../index";

interface ChainsTabProps {
  chains: ChainReaction[];
  filteredChains: ChainReaction[];
  signals: Map<string, SignalInfo>;
  onNavigateToSignal: (signalName: string) => void;
  onChainsUpdate: () => void;
}

export function ChainsTab({
  chains,
  filteredChains,
  signals,
  onNavigateToSignal,
  onChainsUpdate,
}: ChainsTabProps): React.ReactElement {
  const [expandedChain, setExpandedChain] = useState<string | null>(null);

  if (chains.length === 0) {
    return (
      <div
        style={{
          ...styles.emptyStateStyles,
          textAlign: "center",
          padding: "32px",
        }}
      >
        <div style={{ fontSize: "24px", marginBottom: "4px" }}>🔗</div>
        <div style={{ marginBottom: "4px" }}>
          No chain reactions detected yet
        </div>
        <div style={{ fontSize: "11px", color: styles.colors.textMuted }}>
          Chain reactions with 2+ signals will appear here
        </div>
      </div>
    );
  }

  if (filteredChains.length === 0) {
    return (
      <div
        style={{
          ...styles.emptyStateStyles,
          textAlign: "center",
          padding: "32px",
        }}
      >
        <div style={{ marginBottom: "8px" }}>No chains match filter</div>
        <div style={{ fontSize: "11px", color: styles.colors.textMuted }}>
          {chains.length} chain{chains.length !== 1 ? "s" : ""} total
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {filteredChains.map((chain) => {
        const isExpanded = expandedChain === chain.id;
        const occurrenceCount = chain.occurrences.length;

        return (
          <div
            key={chain.id}
            style={{
              backgroundColor: styles.colors.bgLight,
              borderRadius: "6px",
              border: `1px solid ${styles.colors.border}`,
              overflow: "hidden",
            }}
          >
            {/* Chain header */}
            <div
              style={{
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                backgroundColor: isExpanded
                  ? styles.colors.bgHover
                  : "transparent",
              }}
              onClick={() => setExpandedChain(isExpanded ? null : chain.id)}
            >
              {/* Expand arrow */}
              <span
                style={{
                  fontSize: "10px",
                  color: styles.colors.textMuted,
                  transition: "transform 0.15s",
                  transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                }}
              >
                ▶
              </span>

              {/* Chain path */}
              <div
                style={{
                  flex: 1,
                  fontSize: "11px",
                  fontFamily: styles.fontMono,
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {chain.path.map((signalId, idx) => {
                  // Look up signal name for display
                  const signalInfo = signals.get(signalId);
                  const signalName = signalInfo?.name || signalId;
                  return (
                    <React.Fragment key={idx}>
                      <span
                        style={{
                          color: chain.asyncSignals.has(signalId)
                            ? styles.colors.warning
                            : styles.colors.text,
                          cursor: "pointer",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToSignal(signalName);
                        }}
                        title={`Go to signal: ${signalName}`}
                      >
                        {signalName}
                        {chain.asyncSignals.has(signalId) && (
                          <span
                            style={{
                              fontSize: "8px",
                              marginLeft: "2px",
                              color: styles.colors.warning,
                            }}
                          >
                            [async]
                          </span>
                        )}
                      </span>
                      {idx < chain.path.length - 1 && (
                        <span style={{ color: styles.colors.textMuted }}>
                          →
                        </span>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Occurrence count */}
              <span
                style={{
                  fontSize: "10px",
                  color: styles.colors.textMuted,
                  backgroundColor: styles.colors.bgHover,
                  padding: "2px 6px",
                  borderRadius: "10px",
                }}
              >
                ×{occurrenceCount}
              </span>

              {/* Delete button */}
              <button
                style={{
                  ...styles.signalActionButtonStyles,
                  padding: "2px 6px",
                  fontSize: "10px",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChain(chain.id);
                  onChainsUpdate();
                }}
                title="Delete chain"
              >
                <IconClose size={12} />
              </button>
            </div>

            {/* Expanded: occurrence history */}
            {isExpanded && (
              <div
                style={{
                  borderTop: `1px solid ${styles.colors.border}`,
                  padding: "8px 12px",
                  maxHeight: "200px",
                  overflowY: "auto",
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    color: styles.colors.textMuted,
                    marginBottom: "8px",
                  }}
                >
                  Recent occurrences:
                </div>
                {chain.occurrences.slice(0, 20).map((occ, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "10px",
                      padding: "4px 0",
                      borderBottom:
                        idx < chain.occurrences.length - 1
                          ? `1px solid ${styles.colors.border}`
                          : "none",
                    }}
                  >
                    <span style={{ color: styles.colors.textDim }}>
                      {new Date(occ.startTime).toLocaleTimeString()}
                    </span>
                    {occ.duration !== undefined && (
                      <span
                        style={{
                          color: styles.colors.textMuted,
                          backgroundColor: styles.colors.bgHover,
                          padding: "1px 4px",
                          borderRadius: "3px",
                        }}
                      >
                        {occ.duration}ms
                      </span>
                    )}
                    <span
                      style={{
                        color:
                          occ.status === "complete"
                            ? styles.colors.success
                            : occ.status === "interrupted"
                            ? styles.colors.error
                            : styles.colors.warning,
                      }}
                    >
                      {occ.status === "complete"
                        ? "✓"
                        : occ.status === "interrupted"
                        ? "✕"
                        : "⏳"}
                    </span>
                  </div>
                ))}
                {chain.occurrences.length > 20 && (
                  <div
                    style={{
                      fontSize: "9px",
                      color: styles.colors.textMuted,
                      textAlign: "center",
                      marginTop: "8px",
                    }}
                  >
                    ... and {chain.occurrences.length - 20} more
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

