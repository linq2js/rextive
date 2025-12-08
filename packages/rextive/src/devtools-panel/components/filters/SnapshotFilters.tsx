/**
 * Snapshot Filters Component
 * Controls for snapshot management (take, filter, compare, auto-options)
 */

import { memo } from "react";
import * as styles from "../../styles";
import { FilterGroup } from "../shared";
import { IconStar, IconRecord, IconCompare } from "../../icons";
import type { Snapshot } from "../../types";

interface SnapshotFiltersProps {
  takeSnapshot: (options?: { skipIfNoDiff?: boolean }) => void;
  snapshotBookmarkedOnly: boolean;
  updateSnapshotBookmarkedOnly: (value: boolean) => void;
  bookmarkedSignals: Set<string>;
  snapshots: Snapshot[];
  setSnapshotDiffOpen: (open: boolean) => void;
  snapshotOnInit: boolean;
  updateSnapshotOnInit: (value: boolean) => void;
  snapshotAutoInterval: boolean;
  updateSnapshotAutoInterval: (value: boolean) => void;
  autoSnapshotIntervalSeconds: number;
}

export const SnapshotFilters = memo(function SnapshotFilters({
  takeSnapshot,
  snapshotBookmarkedOnly,
  updateSnapshotBookmarkedOnly,
  bookmarkedSignals,
  snapshots,
  setSnapshotDiffOpen,
  snapshotOnInit,
  updateSnapshotOnInit,
  snapshotAutoInterval,
  updateSnapshotAutoInterval,
  autoSnapshotIntervalSeconds,
}: SnapshotFiltersProps) {
  return (
    <>
      <button
        style={{
          padding: "3px 8px",
          fontSize: "10px",
          backgroundColor: styles.colors.error + "22",
          border: `1px solid ${styles.colors.error}`,
          borderRadius: "4px",
          color: styles.colors.error,
          cursor:
            snapshotBookmarkedOnly && bookmarkedSignals.size === 0
              ? "not-allowed"
              : "pointer",
          opacity: snapshotBookmarkedOnly && bookmarkedSignals.size === 0 ? 0.5 : 1,
          fontFamily: "inherit",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
        onClick={() => takeSnapshot()}
        disabled={snapshotBookmarkedOnly && bookmarkedSignals.size === 0}
        title={
          snapshotBookmarkedOnly
            ? bookmarkedSignals.size === 0
              ? "No bookmarked signals"
              : `Take snapshot of ${bookmarkedSignals.size} bookmarked signal(s)`
            : "Take snapshot of all mutable signals"
        }
      >
        <IconRecord size={10} />
      </button>
      <button
        style={{
          padding: "3px 8px",
          fontSize: "10px",
          backgroundColor: snapshotBookmarkedOnly
            ? styles.colors.warning + "33"
            : styles.colors.bgHover,
          border: `1px solid ${snapshotBookmarkedOnly ? styles.colors.warning : styles.colors.border}`,
          borderRadius: "4px",
          color: snapshotBookmarkedOnly ? styles.colors.warning : styles.colors.textMuted,
          cursor: "pointer",
          fontFamily: "inherit",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
        onClick={() => updateSnapshotBookmarkedOnly(!snapshotBookmarkedOnly)}
        title={
          snapshotBookmarkedOnly
            ? "Click to snapshot all signals"
            : "Click to snapshot bookmarked only"
        }
      >
        <IconStar size={10} filled={snapshotBookmarkedOnly} />
        {bookmarkedSignals.size > 0 && (
          <span style={{ fontSize: "9px" }}>{bookmarkedSignals.size}</span>
        )}
      </button>
      <FilterGroup>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            whiteSpace: "nowrap",
            padding: "3px 8px",
            fontSize: "10px",
            backgroundColor:
              snapshots.length < 2
                ? styles.colors.bgHover
                : styles.colors.computed + "22",
            border: `1px solid ${
              snapshots.length < 2 ? styles.colors.border : styles.colors.computed
            }`,
            borderRadius: "4px",
            color: snapshots.length < 2 ? styles.colors.textMuted : styles.colors.computed,
            cursor: snapshots.length < 2 ? "not-allowed" : "pointer",
            opacity: snapshots.length < 2 ? 0.5 : 1,
            fontFamily: "inherit",
          }}
          onClick={() => setSnapshotDiffOpen(true)}
          disabled={snapshots.length < 2}
          title={
            snapshots.length < 2
              ? "Need at least 2 snapshots to compare"
              : "Compare two snapshots"
          }
        >
          <IconCompare size={10} /> Diff
        </button>
      </FilterGroup>
      <FilterGroup>
        <button
          style={{
            padding: "3px 8px",
            fontSize: "10px",
            backgroundColor: snapshotOnInit
              ? styles.colors.accent + "33"
              : styles.colors.bgHover,
            border: `1px solid ${snapshotOnInit ? styles.colors.accent : styles.colors.border}`,
            borderRadius: "4px",
            color: snapshotOnInit ? styles.colors.accent : styles.colors.textMuted,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
          onClick={() => updateSnapshotOnInit(!snapshotOnInit)}
          title="Take snapshot when DevTools loads"
        >
          On Init
        </button>
        <button
          style={{
            padding: "3px 8px",
            fontSize: "10px",
            backgroundColor: snapshotAutoInterval
              ? styles.colors.accent + "33"
              : styles.colors.bgHover,
            border: `1px solid ${snapshotAutoInterval ? styles.colors.accent : styles.colors.border}`,
            borderRadius: "4px",
            color: snapshotAutoInterval ? styles.colors.accent : styles.colors.textMuted,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
          onClick={() => updateSnapshotAutoInterval(!snapshotAutoInterval)}
          title={`Auto snapshot every ${autoSnapshotIntervalSeconds} seconds`}
        >
          Auto {autoSnapshotIntervalSeconds}s
        </button>
      </FilterGroup>
    </>
  );
});

