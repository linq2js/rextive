/**
 * SnapshotDiffModal Component
 * Modal to compare two snapshots side-by-side
 */

import React, { useMemo } from "react";
import * as styles from "./styles";
import { IconClose } from "./icons";

interface SnapshotSignal {
  id: string;
  name: string;
  value: unknown;
}

interface Snapshot {
  id: string;
  timestamp: number;
  name: string;
  signals: SnapshotSignal[];
}

const CURRENT_STATE_ID = "__CURRENT__";

interface SnapshotDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: Snapshot[];
  snapshot1Id: string | null;
  snapshot2Id: string | null; // Can be "__CURRENT__" to compare with current state
  onSelectSnapshot1: (id: string) => void;
  onSelectSnapshot2: (id: string) => void;
  /** Current state signals for "Compare with Current" feature */
  currentStateSignals?: SnapshotSignal[];
}

export function SnapshotDiffModal({
  isOpen,
  onClose,
  snapshots,
  snapshot1Id,
  snapshot2Id,
  onSelectSnapshot1,
  onSelectSnapshot2,
  currentStateSignals,
}: SnapshotDiffModalProps): React.ReactElement | null {
  if (!isOpen) return null;

  const snapshot1 = snapshots.find((s) => s.id === snapshot1Id);
  
  // Handle "Current State" as snapshot2
  const snapshot2 = snapshot2Id === CURRENT_STATE_ID && currentStateSignals
    ? {
        id: CURRENT_STATE_ID,
        timestamp: Date.now(),
        name: "Current State",
        signals: currentStateSignals,
      }
    : snapshots.find((s) => s.id === snapshot2Id);

  // Calculate diff
  const diff = useMemo(() => {
    if (!snapshot1 || !snapshot2) return null;

    const signal1Map = new Map(snapshot1.signals.map((s) => [s.id, s]));
    const signal2Map = new Map(snapshot2.signals.map((s) => [s.id, s]));

    const allSignalIds = new Set([
      ...snapshot1.signals.map((s) => s.id),
      ...snapshot2.signals.map((s) => s.id),
    ]);

    const results: Array<{
      id: string;
      name: string;
      value1: unknown;
      value2: unknown;
      status: "unchanged" | "changed" | "added" | "removed";
    }> = [];

    for (const id of allSignalIds) {
      const s1 = signal1Map.get(id);
      const s2 = signal2Map.get(id);

      if (s1 && s2) {
        const val1 = JSON.stringify(s1.value);
        const val2 = JSON.stringify(s2.value);
        results.push({
          id,
          name: s1.name,
          value1: s1.value,
          value2: s2.value,
          status: val1 === val2 ? "unchanged" : "changed",
        });
      } else if (s1 && !s2) {
        results.push({
          id,
          name: s1.name,
          value1: s1.value,
          value2: undefined,
          status: "removed",
        });
      } else if (!s1 && s2) {
        results.push({
          id,
          name: s2.name,
          value1: undefined,
          value2: s2.value,
          status: "added",
        });
      }
    }

    // Sort: changed first, then added, then removed, then unchanged
    const order = { changed: 0, added: 1, removed: 2, unchanged: 3 };
    results.sort((a, b) => order[a.status] - order[b.status]);

    return results;
  }, [snapshot1, snapshot2]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("en-GB", { hour12: false });
  };

  const formatValue = (value: unknown) => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  };

  const statusColors = {
    unchanged: styles.colors.textMuted,
    changed: styles.colors.warning,
    added: styles.colors.success,
    removed: styles.colors.error,
  };

  const statusLabels = {
    unchanged: "=",
    changed: "≠",
    added: "+",
    removed: "-",
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10001,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: styles.colors.bg,
          borderRadius: "8px",
          width: "90%",
          maxWidth: "900px",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          border: `1px solid ${styles.colors.border}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${styles.colors.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontWeight: 600,
              color: styles.colors.text,
              fontSize: "13px",
            }}
          >
            Compare Snapshots
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: styles.colors.textMuted,
              padding: "4px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <IconClose size={16} />
          </button>
        </div>

        {/* Snapshot selectors */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${styles.colors.border}`,
            display: "flex",
            gap: "16px",
          }}
        >
          <div style={{ flex: 1 }}>
            <label
              style={{
                fontSize: "10px",
                color: styles.colors.textMuted,
                marginBottom: "4px",
                display: "block",
              }}
            >
              Snapshot A (older)
            </label>
            <select
              value={snapshot1Id || ""}
              onChange={(e) => onSelectSnapshot1(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 8px",
                backgroundColor: styles.colors.bgLight,
                border: `1px solid ${styles.colors.border}`,
                borderRadius: "4px",
                color: styles.colors.text,
                fontSize: "11px",
              }}
            >
              <option value="">Select snapshot...</option>
              {snapshots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({formatTime(s.timestamp)})
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label
              style={{
                fontSize: "10px",
                color: styles.colors.textMuted,
                marginBottom: "4px",
                display: "block",
              }}
            >
              Snapshot B (newer)
            </label>
            <select
              value={snapshot2Id || ""}
              onChange={(e) => onSelectSnapshot2(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 8px",
                backgroundColor: styles.colors.bgLight,
                border: `1px solid ${styles.colors.border}`,
                borderRadius: "4px",
                color: styles.colors.text,
                fontSize: "11px",
              }}
            >
              <option value="">Select snapshot...</option>
              {/* Current State option - always at top */}
              {currentStateSignals && (
                <option value={CURRENT_STATE_ID} style={{ fontWeight: 600 }}>
                  📍 Current State (now)
                </option>
              )}
              {snapshots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({formatTime(s.timestamp)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Diff content */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: "12px 16px",
          }}
        >
          {!snapshot1 || !snapshot2 ? (
            <div style={styles.emptyStateStyles}>
              Select two snapshots to compare
            </div>
          ) : diff && diff.length === 0 ? (
            <div style={styles.emptyStateStyles}>
              No signals to compare
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {/* Summary */}
              {diff && (
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    padding: "8px 12px",
                    backgroundColor: styles.colors.bgLight,
                    borderRadius: "4px",
                    fontSize: "10px",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ color: styles.colors.warning }}>
                    {diff.filter((d) => d.status === "changed").length} changed
                  </span>
                  <span style={{ color: styles.colors.success }}>
                    {diff.filter((d) => d.status === "added").length} added
                  </span>
                  <span style={{ color: styles.colors.error }}>
                    {diff.filter((d) => d.status === "removed").length} removed
                  </span>
                  <span style={{ color: styles.colors.textMuted }}>
                    {diff.filter((d) => d.status === "unchanged").length} unchanged
                  </span>
                </div>
              )}

              {/* Diff items */}
              {diff?.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: "8px 12px",
                    backgroundColor: styles.colors.bgLight,
                    borderRadius: "4px",
                    borderLeft: `3px solid ${statusColors[item.status]}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        color: statusColors[item.status],
                        width: "16px",
                        textAlign: "center",
                      }}
                    >
                      {statusLabels[item.status]}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        color: styles.colors.text,
                        fontFamily: styles.fontMono,
                      }}
                    >
                      {item.name}
                    </span>
                  </div>

                  {item.status !== "unchanged" && (
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        marginLeft: "24px",
                      }}
                    >
                      {/* Value A */}
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: "9px",
                            color: styles.colors.textMuted,
                            marginBottom: "2px",
                          }}
                        >
                          A:
                        </div>
                        <pre
                          style={{
                            margin: 0,
                            padding: "4px 6px",
                            backgroundColor:
                              item.status === "removed"
                                ? `${styles.colors.error}15`
                                : styles.colors.bg,
                            borderRadius: "3px",
                            fontSize: "9px",
                            color:
                              item.status === "added"
                                ? styles.colors.textMuted
                                : styles.colors.text,
                            fontFamily: styles.fontMono,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                            maxHeight: "100px",
                            overflow: "auto",
                          }}
                        >
                          {item.value1 === undefined
                            ? "(not in snapshot)"
                            : formatValue(item.value1)}
                        </pre>
                      </div>

                      {/* Value B */}
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: "9px",
                            color: styles.colors.textMuted,
                            marginBottom: "2px",
                          }}
                        >
                          B:
                        </div>
                        <pre
                          style={{
                            margin: 0,
                            padding: "4px 6px",
                            backgroundColor:
                              item.status === "added"
                                ? `${styles.colors.success}15`
                                : styles.colors.bg,
                            borderRadius: "3px",
                            fontSize: "9px",
                            color:
                              item.status === "removed"
                                ? styles.colors.textMuted
                                : styles.colors.text,
                            fontFamily: styles.fontMono,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                            maxHeight: "100px",
                            overflow: "auto",
                          }}
                        >
                          {item.value2 === undefined
                            ? "(not in snapshot)"
                            : formatValue(item.value2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { CURRENT_STATE_ID };
