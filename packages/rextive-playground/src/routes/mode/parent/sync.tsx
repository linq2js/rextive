/**
 * Sync Page - P2P data synchronization between devices
 * 
 * Features:
 * - Host mode: Generate 6-digit code for other device to connect
 * - Guest mode: Enter code to connect to host device
 * - Send/receive data with preview
 */

import { createFileRoute } from "@tanstack/react-router";
import { signal } from "rextive";
import { rx, useScope } from "rextive/react";
import { syncLogic, type SyncState } from "@/features/sync";
import { Icon } from "@/components/Icons";

export const Route = createFileRoute("/mode/parent/sync")({
  component: SyncPage,
});

// =============================================================================
// Page Logic
// =============================================================================

function syncPageLogic() {
  const $sync = syncLogic();
  
  // Code input for guest mode
  const codeInput = signal("", { name: "syncPage.codeInput" });
  
  return {
    ...$sync,
    codeInput,
    setCodeInput: (val: string) => {
      // Only allow digits, max 6
      const cleaned = val.replace(/\D/g, "").slice(0, 6);
      codeInput.set(cleaned);
    },
  };
}

// =============================================================================
// Components
// =============================================================================

function SyncPage() {
  const $page = useScope(syncPageLogic);

  return (
    <div className="space-y-6">
      {/* Main Content */}
      {rx(() => {
        const state = $page.state();
        const mode = $page.mode();

        // No mode selected - show mode selection
        if (mode === null) {
          return <ModeSelection $page={$page} />;
        }

        // Host mode
        if (mode === "host") {
          return <HostView $page={$page} />;
        }

        // Guest mode
        if (mode === "guest") {
          return <GuestView $page={$page} state={state} />;
        }

        return null;
      })}
    </div>
  );
}

// =============================================================================
// Mode Selection
// =============================================================================

function ModeSelection({ $page }: { $page: ReturnType<typeof syncPageLogic> }) {
  return (
    <div className="space-y-6">
      {/* Info Card */}
      <div className="card bg-blue-50 border-2 border-blue-200">
        <div className="flex items-start gap-3">
          <div className="text-3xl">📱</div>
          <div>
            <h3 className="font-semibold text-blue-800">
              Sync data between devices
            </h3>
            <p className="text-sm text-blue-600 mt-1">
              Transfer profiles and game progress to another phone or tablet
              using a secure peer-to-peer connection.
            </p>
          </div>
        </div>
      </div>

      {/* Mode Buttons */}
      <div className="grid grid-cols-1 gap-4">
        {/* Share Button */}
        <button
          onClick={() => $page.startHosting()}
          className="card hover:ring-2 hover:ring-blue-400 transition-all active:scale-98 text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-2xl shadow-lg">
              📤
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg font-bold text-gray-800">
                Share from this device
              </h3>
              <p className="text-sm text-gray-500">
                Generate a code for another device to connect
              </p>
            </div>
            <Icon name="chevron-right" size={24} className="text-gray-400" />
          </div>
        </button>

        {/* Receive Button */}
        <button
          onClick={() => $page.mode.set("guest")}
          className="card hover:ring-2 hover:ring-purple-400 transition-all active:scale-98 text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-2xl shadow-lg">
              📥
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg font-bold text-gray-800">
                Receive from another device
              </h3>
              <p className="text-sm text-gray-500">
                Enter a code to connect and receive data
              </p>
            </div>
            <Icon name="chevron-right" size={24} className="text-gray-400" />
          </div>
        </button>
      </div>

      {/* How it works */}
      <div className="card bg-gray-50">
        <h4 className="font-semibold text-gray-800 mb-3">How it works</h4>
        <ol className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
              1
            </span>
            <span>One device shares and shows a 6-digit code</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
              2
            </span>
            <span>Other device enters the code to connect</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
              3
            </span>
            <span>Choose which data to transfer</span>
          </li>
        </ol>
      </div>
    </div>
  );
}

// =============================================================================
// Host View
// =============================================================================

function HostView({ $page }: { $page: ReturnType<typeof syncPageLogic> }) {
  return rx(() => {
    const state = $page.state();
    const code = $page.syncCode();
    const progress = $page.progress();
    const error = $page.errorMessage();
    const localSummary = $page.localSummary();
    const remoteSummary = $page.remoteSummary();

    return (
      <div className="space-y-6">
        {/* Status Header */}
        <StatusHeader state={state} error={error} progress={progress} />

        {/* Code Display */}
        {(state === "hosting" || state === "connected") && (
          <div className="card text-center py-8">
            <p className="text-sm text-gray-500 mb-2">Your sync code</p>
            <div className="flex justify-center gap-2">
              {code.split("").map((digit, i) => (
                <div
                  key={i}
                  className="w-12 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg"
                >
                  {digit}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-4">
              Enter this code on the other device
            </p>
          </div>
        )}

        {/* Waiting Animation */}
        {state === "hosting" && (
          <div className="card text-center">
            <div className="flex justify-center items-center gap-2 text-gray-500">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: "0.2s" }} />
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: "0.4s" }} />
              <span className="ml-2">Waiting for connection...</span>
            </div>
          </div>
        )}

        {/* Connected - Show Data Summary */}
        {state === "connected" && (
          <DataSummaryCards
            localSummary={localSummary}
            remoteSummary={remoteSummary}
          />
        )}

        {/* Action Buttons */}
        {state === "connected" && (
          <div className="space-y-3">
            <button
              onClick={() => $page.sendData()}
              className="btn w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all"
            >
              📤 Send My Data
            </button>
            
            {$page.hasReceivedData() && (
              <button
                onClick={() => $page.importReceivedData("replace")}
                className="btn w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all"
              >
                📥 Import Their Data
              </button>
            )}
          </div>
        )}

        {/* Success State */}
        {state === "success" && <SuccessView progress={progress} />}

        {/* Cancel/Back Button */}
        <button
          onClick={() => $page.reset()}
          className="btn w-full py-3 bg-gray-200 text-gray-700 hover:bg-gray-300"
        >
          {state === "success" || state === "error" ? "Done" : "Cancel"}
        </button>
      </div>
    );
  });
}

// =============================================================================
// Guest View
// =============================================================================

function GuestView({ $page, state }: { $page: ReturnType<typeof syncPageLogic>; state: SyncState }) {
  return rx(() => {
    const codeInput = $page.codeInput();
    const progress = $page.progress();
    const error = $page.errorMessage();
    const localSummary = $page.localSummary();
    const remoteSummary = $page.remoteSummary();

    // Initial code entry
    if (state === "idle") {
      return (
        <div className="space-y-6">
          <div className="card text-center py-6">
            <p className="text-sm text-gray-500 mb-4">
              Enter the 6-digit code from the other device
            </p>
            
            {/* Code Input */}
            <div className="flex justify-center gap-2 mb-6">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`w-12 h-14 rounded-xl flex items-center justify-center text-2xl font-bold shadow-inner transition-all ${
                    codeInput[i]
                      ? "bg-gradient-to-br from-purple-400 to-pink-500 text-white"
                      : "bg-gray-100 text-gray-300"
                  }`}
                >
                  {codeInput[i] || "•"}
                </div>
              ))}
            </div>
            
            {/* Hidden input for mobile keyboard */}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={codeInput}
              onChange={(e) => $page.setCodeInput(e.target.value)}
              className="sr-only"
              autoFocus
              id="code-input"
            />
            
            {/* Visible number pad for easier input */}
            <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "⌫"].map((key, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (key === "⌫") {
                      $page.setCodeInput(codeInput.slice(0, -1));
                    } else if (key !== null) {
                      $page.setCodeInput(codeInput + key);
                    }
                  }}
                  disabled={key === null}
                  className={`h-12 rounded-xl font-bold text-xl transition-all ${
                    key === null
                      ? "invisible"
                      : key === "⌫"
                        ? "bg-gray-200 text-gray-600 hover:bg-gray-300 active:scale-95"
                        : "bg-gray-100 text-gray-800 hover:bg-gray-200 active:scale-95"
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>

          {/* Connect Button */}
          <button
            onClick={() => $page.joinHost(codeInput)}
            disabled={codeInput.length !== 6}
            className={`btn w-full py-4 font-bold text-lg transition-all ${
              codeInput.length === 6
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            Connect
          </button>

          {/* Back Button */}
          <button
            onClick={() => $page.reset()}
            className="btn w-full py-3 bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            Back
          </button>
        </div>
      );
    }

    // Connecting/Connected states
    return (
      <div className="space-y-6">
        {/* Status Header */}
        <StatusHeader state={state} error={error} progress={progress} />

        {/* Connecting Animation */}
        {state === "joining" && (
          <div className="card text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-purple-200 border-t-purple-500 animate-spin" />
            <p className="text-gray-500">Connecting to device...</p>
          </div>
        )}

        {/* Connected - Show Data Summary */}
        {state === "connected" && (
          <DataSummaryCards
            localSummary={localSummary}
            remoteSummary={remoteSummary}
          />
        )}

        {/* Action Buttons */}
        {state === "connected" && (
          <div className="space-y-3">
            <button
              onClick={() => $page.sendData()}
              className="btn w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all"
            >
              📤 Send My Data
            </button>
            
            {$page.hasReceivedData() && (
              <button
                onClick={() => $page.importReceivedData("replace")}
                className="btn w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all"
              >
                📥 Import Their Data
              </button>
            )}
          </div>
        )}

        {/* Success State */}
        {state === "success" && <SuccessView progress={progress} />}

        {/* Cancel/Back Button */}
        <button
          onClick={() => $page.reset()}
          className="btn w-full py-3 bg-gray-200 text-gray-700 hover:bg-gray-300"
        >
          {state === "success" || state === "error" ? "Done" : "Cancel"}
        </button>
      </div>
    );
  });
}

// =============================================================================
// Shared Components
// =============================================================================

function StatusHeader({
  state,
  error,
  progress,
}: {
  state: SyncState;
  error: string;
  progress: string;
}) {
  const statusConfig: Record<SyncState, { icon: string; color: string; label: string }> = {
    idle: { icon: "📱", color: "bg-gray-100", label: "Ready" },
    hosting: { icon: "📡", color: "bg-blue-100", label: "Hosting" },
    joining: { icon: "🔗", color: "bg-purple-100", label: "Connecting" },
    connected: { icon: "✅", color: "bg-green-100", label: "Connected" },
    syncing: { icon: "🔄", color: "bg-amber-100", label: "Syncing" },
    success: { icon: "🎉", color: "bg-green-100", label: "Success" },
    error: { icon: "❌", color: "bg-red-100", label: "Error" },
  };

  const config = statusConfig[state];

  return (
    <div className={`card ${config.color}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{config.icon}</span>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800">{config.label}</h3>
          <p className="text-sm text-gray-600">
            {error || progress || "Processing..."}
          </p>
        </div>
      </div>
    </div>
  );
}

function DataSummaryCards({
  localSummary,
  remoteSummary,
}: {
  localSummary: { profileCount: number; gameSessionCount: number } | null;
  remoteSummary: { profileCount: number; gameSessionCount: number } | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* This Device */}
      <div className="card bg-blue-50">
        <h4 className="text-xs font-semibold text-blue-600 mb-2">THIS DEVICE</h4>
        <div className="space-y-1 text-sm">
          <p className="flex items-center gap-2">
            <span>👤</span>
            <span className="font-bold">{localSummary?.profileCount || 0}</span>
            <span className="text-gray-500">profiles</span>
          </p>
          <p className="flex items-center gap-2">
            <span>🎮</span>
            <span className="font-bold">{localSummary?.gameSessionCount || 0}</span>
            <span className="text-gray-500">sessions</span>
          </p>
        </div>
      </div>

      {/* Other Device */}
      <div className="card bg-purple-50">
        <h4 className="text-xs font-semibold text-purple-600 mb-2">OTHER DEVICE</h4>
        {remoteSummary ? (
          <div className="space-y-1 text-sm">
            <p className="flex items-center gap-2">
              <span>👤</span>
              <span className="font-bold">{remoteSummary.profileCount}</span>
              <span className="text-gray-500">profiles</span>
            </p>
            <p className="flex items-center gap-2">
              <span>🎮</span>
              <span className="font-bold">{remoteSummary.gameSessionCount}</span>
              <span className="text-gray-500">sessions</span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Waiting...</p>
        )}
      </div>
    </div>
  );
}

function SuccessView({ progress }: { progress: string }) {
  return (
    <div className="card text-center py-8 bg-green-50">
      <div className="text-5xl mb-4">🎉</div>
      <h3 className="font-display text-xl font-bold text-green-800">
        Sync Complete!
      </h3>
      <p className="text-sm text-green-600 mt-2">{progress}</p>
    </div>
  );
}

