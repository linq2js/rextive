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
import { useTranslation } from "@/i18n";

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
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <div className="card bg-blue-50 border-2 border-blue-200">
        <div className="flex items-start gap-3">
          <div className="text-3xl">📱</div>
          <div>
            <h3 className="font-semibold text-blue-800">
              {t("parent.syncDataBetweenDevices")}
            </h3>
            <p className="text-sm text-blue-600 mt-1">
              {t("parent.syncDescription")}
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
                {t("parent.host")}
              </h3>
              <p className="text-sm text-gray-500">
                {t("parent.hostDescription")}
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
                {t("parent.guest")}
              </h3>
              <p className="text-sm text-gray-500">
                {t("parent.guestDescription")}
              </p>
            </div>
            <Icon name="chevron-right" size={24} className="text-gray-400" />
          </div>
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Host View
// =============================================================================

function HostView({ $page }: { $page: ReturnType<typeof syncPageLogic> }) {
  const { t } = useTranslation();

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
            <p className="text-sm text-gray-500 mb-2">{t("parent.syncCode")}</p>
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
              {t("parent.enterCodeOnOtherDevice")}
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
              <span className="ml-2">{t("parent.waitingForConnection")}</span>
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
              {t("parent.sendMyData")}
            </button>
            
            {$page.hasReceivedData() && (
              <button
                onClick={() => $page.importReceivedData("replace")}
                className="btn w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all"
              >
                {t("parent.importTheirData")}
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
          {state === "success" || state === "error" ? t("parent.done") : t("parent.cancel")}
        </button>
      </div>
    );
  });
}

// =============================================================================
// Guest View
// =============================================================================

function GuestView({ $page, state }: { $page: ReturnType<typeof syncPageLogic>; state: SyncState }) {
  const { t } = useTranslation();

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
          <div className="card py-6">
            <label className="block text-sm text-gray-500 mb-2">
              {t("parent.enter6DigitCode")}
            </label>
            
            {/* Simple text input */}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={codeInput}
              onChange={(e) => $page.setCodeInput(e.target.value)}
              placeholder="000000"
              autoFocus
              className="input text-center text-2xl font-bold tracking-widest"
            />
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
            {t("parent.connect")}
          </button>

          {/* Back Button */}
          <button
            onClick={() => $page.reset()}
            className="btn w-full py-3 bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            {t("parent.back")}
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
            <p className="text-gray-500">{t("parent.connectingToDevice")}</p>
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
              {t("parent.sendMyData")}
            </button>
            
            {$page.hasReceivedData() && (
              <button
                onClick={() => $page.importReceivedData("replace")}
                className="btn w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all"
              >
                {t("parent.importTheirData")}
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
          {state === "success" || state === "error" ? t("parent.done") : t("parent.cancel")}
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
  const { t } = useTranslation();

  const statusConfig: Record<SyncState, { icon: string; color: string; labelKey: string }> = {
    idle: { icon: "📱", color: "bg-gray-100", labelKey: "parent.ready" },
    hosting: { icon: "📡", color: "bg-blue-100", labelKey: "parent.hosting" },
    joining: { icon: "🔗", color: "bg-purple-100", labelKey: "parent.connecting" },
    connected: { icon: "✅", color: "bg-green-100", labelKey: "parent.connected" },
    syncing: { icon: "🔄", color: "bg-amber-100", labelKey: "parent.syncing" },
    success: { icon: "🎉", color: "bg-green-100", labelKey: "parent.success" },
    error: { icon: "❌", color: "bg-red-100", labelKey: "parent.error" },
  };

  const config = statusConfig[state];

  return (
    <div className={`card ${config.color}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{config.icon}</span>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800">{t(config.labelKey)}</h3>
          <p className="text-sm text-gray-600">
            {error || progress || t("parent.processing")}
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
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* This Device */}
      <div className="card bg-blue-50">
        <h4 className="text-xs font-semibold text-blue-600 mb-2">{t("parent.thisDevice")}</h4>
        <div className="space-y-1 text-sm">
          <p className="flex items-center gap-2">
            <span>👤</span>
            <span className="font-bold">{localSummary?.profileCount || 0}</span>
            <span className="text-gray-500">{t("parent.profiles")}</span>
          </p>
          <p className="flex items-center gap-2">
            <span>🎮</span>
            <span className="font-bold">{localSummary?.gameSessionCount || 0}</span>
            <span className="text-gray-500">{t("parent.sessions")}</span>
          </p>
        </div>
      </div>

      {/* Other Device */}
      <div className="card bg-purple-50">
        <h4 className="text-xs font-semibold text-purple-600 mb-2">{t("parent.otherDevice")}</h4>
        {remoteSummary ? (
          <div className="space-y-1 text-sm">
            <p className="flex items-center gap-2">
              <span>👤</span>
              <span className="font-bold">{remoteSummary.profileCount}</span>
              <span className="text-gray-500">{t("parent.profiles")}</span>
            </p>
            <p className="flex items-center gap-2">
              <span>🎮</span>
              <span className="font-bold">{remoteSummary.gameSessionCount}</span>
              <span className="text-gray-500">{t("parent.sessions")}</span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-400">{t("parent.waiting")}</p>
        )}
      </div>
    </div>
  );
}

function SuccessView({ progress }: { progress: string }) {
  const { t } = useTranslation();

  return (
    <div className="card text-center py-8 bg-green-50">
      <div className="text-5xl mb-4">🎉</div>
      <h3 className="font-display text-xl font-bold text-green-800">
        {t("parent.syncComplete")}
      </h3>
      <p className="text-sm text-green-600 mt-2">{progress}</p>
    </div>
  );
}

