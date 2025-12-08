/**
 * Snapshots Tab Component
 * Displays and manages snapshots in the DevTools panel
 */

import React, { memo } from "react";
import type { SignalInfo } from "../../devtools/types";
import { formatSnapshotTime, getSignalPreview } from "../utils";
import * as styles from "../styles";
import type { PanelPosition } from "../styles";
import type { Snapshot, SnapshotSignal, CompareModalState, Tab } from "../types";
import {
  IconEdit,
  IconCompare,
  IconUndo,
  IconTrash,
  IconCopy,
} from "../icons";

export interface SnapshotsTabProps {
  snapshots: Snapshot[];
  signals: Map<string, SignalInfo>;
  position: PanelPosition;
  snapshotSearch: string;
  expandedSnapshot: string | null;
  setExpandedSnapshot: (id: string | null) => void;
  editingSnapshotId: string | null;
  setEditingSnapshotId: (id: string | null) => void;
  editingSnapshotName: string;
  setEditingSnapshotName: (name: string) => void;
  deleteSnapshot: (id: string) => void;
  renameSnapshot: (id: string, name: string) => void;
  revertSnapshot: (snapshot: Snapshot) => void;
  revertSingleSignal: (signal: SnapshotSignal) => void;
  compareSnapshotWithCurrent: (snapshotId: string) => void;
  setSearchQuery: (query: string) => void;
  setSignalKindFilter: (filter: "all" | "mutable" | "computed" | "error" | "disposed") => void;
  updateActiveTab: (tab: Tab) => void;
  setCompareModal: (modal: CompareModalState | null) => void;
}

export const SnapshotsTab = memo(function SnapshotsTab({
  snapshots,
  signals,
  position,
  snapshotSearch,
  expandedSnapshot,
  setExpandedSnapshot,
  editingSnapshotId,
  setEditingSnapshotId,
  editingSnapshotName,
  setEditingSnapshotName,
  deleteSnapshot,
  renameSnapshot,
  revertSnapshot,
  revertSingleSignal,
  compareSnapshotWithCurrent,
  setSearchQuery,
  setSignalKindFilter,
  updateActiveTab,
  setCompareModal,
}: SnapshotsTabProps): React.ReactElement {
  // Filter snapshots by search
  const filteredSnapshots = snapshotSearch.trim()
    ? snapshots.filter((snapshot) => {
        const searchLower = snapshotSearch.toLowerCase();
        if (snapshot.name.toLowerCase().includes(searchLower)) return true;
        if (
          snapshot.signals.some((s) =>
            s.name.toLowerCase().includes(searchLower)
          )
        )
          return true;
        return false;
      })
    : snapshots;

  if (snapshots.length === 0) {
    return (
      <div style={styles.emptyStateStyles}>
        No snapshots yet
        <div style={{ fontSize: "9px", marginTop: "4px", opacity: 0.7 }}>
          Click "Take Snapshot" to capture mutable signal states
        </div>
      </div>
    );
  }

  if (filteredSnapshots.length === 0) {
    return (
      <div style={styles.emptyStateStyles}>
        No snapshots match "{snapshotSearch}"
      </div>
    );
  }

  return (
    <div style={styles.contentGridStyles(position)}>
      {filteredSnapshots.map((snapshot) => (
        <SnapshotItem
          key={snapshot.id}
          snapshot={snapshot}
          signals={signals}
          isExpanded={expandedSnapshot === snapshot.id}
          isEditing={editingSnapshotId === snapshot.id}
          editingName={editingSnapshotName}
          onToggleExpand={() =>
            setExpandedSnapshot(expandedSnapshot === snapshot.id ? null : snapshot.id)
          }
          onStartEdit={() => {
            setEditingSnapshotId(snapshot.id);
            setEditingSnapshotName(snapshot.name);
          }}
          onCancelEdit={() => {
            setEditingSnapshotId(null);
            setEditingSnapshotName("");
          }}
          onSaveEdit={(name) => renameSnapshot(snapshot.id, name)}
          onEditNameChange={setEditingSnapshotName}
          onDelete={() => deleteSnapshot(snapshot.id)}
          onRevert={() => revertSnapshot(snapshot)}
          onCompareWithCurrent={() => compareSnapshotWithCurrent(snapshot.id)}
          onRevertSingle={revertSingleSignal}
          setSearchQuery={setSearchQuery}
          setSignalKindFilter={setSignalKindFilter}
          updateActiveTab={updateActiveTab}
          setCompareModal={setCompareModal}
        />
      ))}
    </div>
  );
});

interface SnapshotItemProps {
  snapshot: Snapshot;
  signals: Map<string, SignalInfo>;
  isExpanded: boolean;
  isEditing: boolean;
  editingName: string;
  onToggleExpand: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (name: string) => void;
  onEditNameChange: (name: string) => void;
  onDelete: () => void;
  onRevert: () => void;
  onCompareWithCurrent: () => void;
  onRevertSingle: (signal: SnapshotSignal) => void;
  setSearchQuery: (query: string) => void;
  setSignalKindFilter: (filter: "all" | "mutable" | "computed" | "error" | "disposed") => void;
  updateActiveTab: (tab: Tab) => void;
  setCompareModal: (modal: CompareModalState | null) => void;
}

const SnapshotItem = memo(function SnapshotItem({
  snapshot,
  signals,
  isExpanded,
  isEditing,
  editingName,
  onToggleExpand,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditNameChange,
  onDelete,
  onRevert,
  onCompareWithCurrent,
  onRevertSingle,
  setSearchQuery,
  setSignalKindFilter,
  updateActiveTab,
  setCompareModal,
}: SnapshotItemProps): React.ReactElement {
  return (
    <div
      style={{
        backgroundColor: styles.colors.bgLight,
        borderRadius: "6px",
        border: `1px solid ${styles.colors.border}`,
        overflow: "hidden",
      }}
    >
      {/* Snapshot header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 10px",
          cursor: "pointer",
          backgroundColor: isExpanded ? styles.colors.bgHover : "transparent",
        }}
        onClick={onToggleExpand}
      >
        {/* Expand/collapse indicator */}
        <span
          style={{
            fontSize: "10px",
            color: styles.colors.textMuted,
            width: "12px",
          }}
        >
          {isExpanded ? "▼" : "▶"}
        </span>

        {/* Timestamp */}
        <span
          style={{
            fontSize: "10px",
            color: styles.colors.textMuted,
            fontFamily: styles.fontMono,
          }}
        >
          {formatSnapshotTime(snapshot.timestamp)}
        </span>

        {/* Name (editable) */}
        {isEditing ? (
          <input
            type="text"
            value={editingName}
            onChange={(e) => onEditNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSaveEdit(editingName);
              } else if (e.key === "Escape") {
                onCancelEdit();
              }
            }}
            onBlur={() => {
              if (editingName.trim()) {
                onSaveEdit(editingName);
              } else {
                onCancelEdit();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            style={{
              flex: 1,
              fontSize: "11px",
              fontWeight: 600,
              color: styles.colors.text,
              backgroundColor: styles.colors.bg,
              border: `1px solid ${styles.colors.accent}`,
              borderRadius: "3px",
              padding: "2px 6px",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
        ) : (
          <span
            style={{
              flex: 1,
              fontSize: "11px",
              fontWeight: 600,
              color: styles.colors.text,
            }}
          >
            {snapshot.name}
          </span>
        )}

        {/* Action buttons */}
        <div
          style={{ display: "flex", gap: "4px" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Rename */}
          <button
            style={{
              padding: "3px 6px",
              fontSize: "10px",
              backgroundColor: styles.colors.bgHover,
              border: `1px solid ${styles.colors.border}`,
              borderRadius: "3px",
              color: styles.colors.textMuted,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
            onClick={onStartEdit}
            title="Rename snapshot"
          >
            <IconEdit size={10} />
          </button>
          {/* Compare with current */}
          <button
            style={{
              padding: "3px 6px",
              fontSize: "10px",
              backgroundColor: styles.colors.bgHover,
              border: `1px solid ${styles.colors.border}`,
              borderRadius: "3px",
              color: styles.colors.computed,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
            onClick={onCompareWithCurrent}
            title="Compare with current state"
          >
            <IconCompare size={10} />
          </button>
          {/* Revert all */}
          <button
            style={{
              padding: "3px 6px",
              fontSize: "10px",
              backgroundColor: styles.colors.bgHover,
              border: `1px solid ${styles.colors.border}`,
              borderRadius: "3px",
              color: styles.colors.warning,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
            onClick={onRevert}
            title="Revert all signals to this snapshot"
          >
            <IconUndo size={10} />
          </button>
          {/* Delete */}
          <button
            style={{
              padding: "3px 6px",
              fontSize: "10px",
              backgroundColor: styles.colors.bgHover,
              border: `1px solid ${styles.colors.border}`,
              borderRadius: "3px",
              color: styles.colors.error,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
            onClick={onDelete}
            title="Delete snapshot"
          >
            <IconTrash size={10} />
          </button>
        </div>
      </div>

      {/* Simple view (collapsed) */}
      {!isExpanded && (
        <div
          style={{
            padding: "4px 10px 8px 30px",
            fontSize: "10px",
            color: styles.colors.textMuted,
          }}
        >
          <span style={{ color: styles.colors.mutable }}>
            {snapshot.signals.length}
          </span>{" "}
          {getSignalPreview(snapshot.signals)}
        </div>
      )}

      {/* Detailed view (expanded) */}
      {isExpanded && (
        <SnapshotSignalsList
          snapshot={snapshot}
          signals={signals}
          onRevertSingle={onRevertSingle}
          setSearchQuery={setSearchQuery}
          setSignalKindFilter={setSignalKindFilter}
          updateActiveTab={updateActiveTab}
          setCompareModal={setCompareModal}
        />
      )}
    </div>
  );
});

interface SnapshotSignalsListProps {
  snapshot: Snapshot;
  signals: Map<string, SignalInfo>;
  onRevertSingle: (signal: SnapshotSignal) => void;
  setSearchQuery: (query: string) => void;
  setSignalKindFilter: (filter: "all" | "mutable" | "computed" | "error" | "disposed") => void;
  updateActiveTab: (tab: Tab) => void;
  setCompareModal: (modal: CompareModalState | null) => void;
}

const SnapshotSignalsList = memo(function SnapshotSignalsList({
  snapshot,
  signals,
  onRevertSingle,
  setSearchQuery,
  setSignalKindFilter,
  updateActiveTab,
  setCompareModal,
}: SnapshotSignalsListProps): React.ReactElement {
  return (
    <div
      style={{
        borderTop: `1px solid ${styles.colors.border}`,
        maxHeight: "300px",
        overflowY: "auto",
      }}
    >
      {snapshot.signals.length === 0 ? (
        <div
          style={{
            padding: "12px",
            fontSize: "10px",
            color: styles.colors.textMuted,
            textAlign: "center",
          }}
        >
          No mutable signals captured
        </div>
      ) : (
        snapshot.signals.map((sig) => {
          const currentSignal = signals.get(sig.id);
          const signalFromRef = sig.signalRef?.deref();
          const isDisposed =
            !signalFromRef && currentSignal?.disposed !== false;
          let currentValue: unknown;
          try {
            currentValue = currentSignal?.signal?.get?.();
          } catch {
            currentValue = "[error]";
          }
          const hasChanged =
            JSON.stringify(currentValue) !== JSON.stringify(sig.value);
          const canRevert = hasChanged && !isDisposed;

          return (
            <div
              key={sig.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 10px",
                borderBottom: `1px solid ${styles.colors.border}`,
                fontSize: "10px",
                opacity: isDisposed ? 0.5 : 1,
              }}
            >
              {/* Signal name (clickable) */}
              <span
                style={{
                  color: isDisposed
                    ? styles.colors.textMuted
                    : styles.colors.mutable,
                  cursor: isDisposed ? "default" : "pointer",
                  fontWeight: 500,
                  minWidth: "80px",
                  textDecoration: isDisposed ? "line-through" : "none",
                }}
                onClick={() => {
                  if (!isDisposed) {
                    setSearchQuery(sig.name);
                    setSignalKindFilter("mutable");
                    updateActiveTab("signals");
                  }
                }}
                title={isDisposed ? "Signal disposed" : "Jump to signal"}
              >
                {sig.name}
              </span>
              {/* Value */}
              <span
                style={{
                  flex: 1,
                  color: hasChanged
                    ? styles.colors.warning
                    : styles.colors.text,
                  fontFamily: styles.fontMono,
                  fontSize: "9px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={JSON.stringify(sig.value, null, 2)}
              >
                {JSON.stringify(sig.value)}
              </span>
              {/* Actions */}
              <div style={{ display: "flex", gap: "2px" }}>
                {/* Copy */}
                <button
                  style={{
                    padding: "2px 4px",
                    fontSize: "9px",
                    backgroundColor: "transparent",
                    border: "none",
                    color: styles.colors.textMuted,
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    navigator.clipboard.writeText(
                      JSON.stringify(sig.value, null, 2)
                    );
                  }}
                  title="Copy value"
                >
                  <IconCopy size={10} />
                </button>
                {/* Compare */}
                {hasChanged && !isDisposed && (
                  <button
                    style={{
                      padding: "2px 4px",
                      fontSize: "9px",
                      backgroundColor: "transparent",
                      border: "none",
                      color: styles.colors.warning,
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setCompareModal({
                        signalId: sig.id,
                        currentValue,
                        historyValue: sig.value,
                        historyTimestamp: snapshot.timestamp,
                      });
                    }}
                    title="Compare with current"
                  >
                    <IconCompare size={10} />
                  </button>
                )}
                {/* Revert single */}
                <button
                  style={{
                    padding: "2px 4px",
                    fontSize: "9px",
                    backgroundColor: "transparent",
                    border: "none",
                    color: canRevert
                      ? styles.colors.warning
                      : styles.colors.textMuted,
                    cursor: canRevert ? "pointer" : "not-allowed",
                    opacity: canRevert ? 1 : 0.5,
                  }}
                  onClick={() => {
                    if (canRevert) {
                      onRevertSingle(sig);
                    }
                  }}
                  disabled={!canRevert}
                  title={isDisposed ? "Signal disposed" : "Revert this signal"}
                >
                  <IconUndo size={10} />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
});

