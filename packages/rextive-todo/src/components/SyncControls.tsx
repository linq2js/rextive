import { rx } from "rextive/react";
import {
  syncStatus,
  lastSyncTime,
  syncError,
  pendingChangesCount,
  syncPull,
  syncPush,
  resetServer,
} from "../store/todoStore";

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatRelative(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return formatTime(timestamp);
}

export function SyncControls() {
  return (
    <div className="sync-controls">
      <div className="sync-status-row">
        {rx(() => {
          const status = syncStatus();
          const error = syncError();
          const lastSync = lastSyncTime();

          return (
            <div className={`sync-status ${status}`}>
              {status === "syncing" && (
                <>
                  <span className="sync-spinner" />
                  <span>Syncing...</span>
                </>
              )}
              {status === "idle" && lastSync && (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                  <span>Last sync: {formatRelative(lastSync)}</span>
                </>
              )}
              {status === "idle" && !lastSync && <span>Not synced yet</span>}
              {status === "error" && (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span title={error || undefined}>Sync failed</span>
                </>
              )}
            </div>
          );
        })}

        {rx(() => {
          const pending = pendingChangesCount();
          if (pending === 0) return null;
          return (
            <span className="pending-badge">
              {pending} pending change{pending !== 1 ? "s" : ""}
            </span>
          );
        })}
      </div>

      <div className="sync-buttons">
        {rx(() => {
          const isSyncing = syncStatus() === "syncing";
          return (
            <button
              className="sync-btn pull"
              onClick={() => syncPull().catch(() => {})}
              disabled={isSyncing}
              title="Fetch latest from server"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="8,17 12,21 16,17" />
                <line x1="12" y1="12" x2="12" y2="21" />
                <path d="M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.29" />
              </svg>
              Pull
            </button>
          );
        })}

        {rx(() => {
          const isSyncing = syncStatus() === "syncing";
          const pending = pendingChangesCount();
          return (
            <button
              className="sync-btn push"
              onClick={() => syncPush().catch(() => {})}
              disabled={isSyncing || pending === 0}
              title={pending === 0 ? "No changes to push" : "Push changes to server"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16,16 12,12 8,16" />
                <line x1="12" y1="12" x2="12" y2="21" />
                <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
                <polyline points="16,16 12,12 8,16" />
              </svg>
              Push {pending > 0 && `(${pending})`}
            </button>
          );
        })}

        {rx(() => {
          const isSyncing = syncStatus() === "syncing";
          return (
            <button
              className="sync-btn reset"
              onClick={() => {
                if (confirm("Reset server data to initial state? This will clear all changes.")) {
                  resetServer().catch(() => {});
                }
              }}
              disabled={isSyncing}
              title="Reset server to initial data"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Reset
            </button>
          );
        })}
      </div>
    </div>
  );
}
