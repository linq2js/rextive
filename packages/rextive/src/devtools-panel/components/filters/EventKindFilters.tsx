/**
 * Event Kind Filters Component
 * Filters for event types (all, error, update, create, dispose)
 */

import { memo } from "react";
import * as styles from "../../styles";
import type { EventKindFilter, EventLogEntry } from "../../types";

interface EventKindFiltersProps {
  filter: EventKindFilter;
  setFilter: (filter: EventKindFilter) => void;
  events: EventLogEntry[];
}

export const EventKindFilters = memo(function EventKindFilters({
  filter,
  setFilter,
  events,
}: EventKindFiltersProps) {
  return (
    <>
      {(["all", "error", "update", "create", "dispose"] as const).map((kind) => {
        const isActive = filter === kind;
        const label =
          kind === "all"
            ? "A"
            : kind === "error"
            ? "E"
            : kind === "update"
            ? "U"
            : kind === "create"
            ? "C"
            : "D";
        const color =
          kind === "error"
            ? styles.colors.error
            : kind === "update"
            ? styles.colors.warning
            : kind === "create"
            ? styles.colors.success
            : kind === "dispose"
            ? "#666"
            : styles.colors.text;
        const count =
          kind === "all"
            ? events.length
            : kind === "error"
            ? events.filter((e) => e.isError || e.type === "signal:error").length
            : kind === "update"
            ? events.filter((e) => e.type === "signal:change").length
            : kind === "create"
            ? events.filter((e) => e.type === "signal:create" || e.type === "tag:create").length
            : events.filter((e) => e.type === "signal:dispose").length;

        const hasErrors =
          kind === "error" && events.some((e) => e.isError || e.type === "signal:error");

        return (
          <button
            key={kind}
            style={{
              padding: "3px 8px",
              fontSize: "10px",
              fontWeight: 600,
              backgroundColor: isActive || hasErrors ? color + "33" : styles.colors.bgHover,
              border: `1px solid ${isActive || hasErrors ? color : styles.colors.border}`,
              borderRadius: "4px",
              color: isActive || hasErrors ? color : styles.colors.textMuted,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              ...(hasErrors && !isActive && { animation: "pulse 2s infinite" }),
            }}
            onClick={() => setFilter(kind)}
            title={`Show ${kind} events`}
          >
            {label}
            <span style={{ fontWeight: 400, fontSize: "9px", opacity: 0.8 }}>{count}</span>
          </button>
        );
      })}
    </>
  );
});

