import { createFileRoute } from "@tanstack/react-router";
import { signal } from "rextive";
import { patch } from "rextive/helpers";
import { rx, useScope } from "rextive/react";
import { kidProfilesLogic, modalLogic } from "@/logic";
import { dataExportRepository } from "@/infrastructure/repositories";
import { db } from "@/infrastructure/database";
import { useRef } from "react";
import { Icon } from "@/components/Icons";

export const Route = createFileRoute("/mode/parent/data")({
  component: DataTab,
});

function dataTabLogic() {
  const $profiles = kidProfilesLogic();

  const isExporting = signal(false, { name: "data.isExporting" });
  const isImporting = signal(false, { name: "data.isImporting" });
  const message = signal<{ type: "success" | "error"; text: string } | null>(
    null,
    { name: "data.message" }
  );

  // Reset data state
  const resetState = signal(
    { showConfirm: false, loading: false },
    { name: "resetData.state" }
  );

  let messageTimeout: ReturnType<typeof setTimeout> | null = null;

  function showMessage(type: "success" | "error", text: string) {
    if (messageTimeout) clearTimeout(messageTimeout);
    message.set({ type, text });
    messageTimeout = setTimeout(() => {
      try {
        message.set(null);
      } catch {
        // Signal may be disposed if user navigated away
      }
    }, 5000);
  }

  async function handleExport() {
    isExporting.set(true);
    try {
      const jsonData = await dataExportRepository.exportAll();

      // Create and download file
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rextive-playground-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showMessage("success", "Data exported successfully!");
    } catch (e) {
      console.error("Export error:", e);
      showMessage("error", "Failed to export data");
    } finally {
      isExporting.set(false);
    }
  }

  async function handleImport(file: File) {
    isImporting.set(true);
    try {
      const text = await file.text();

      // Validate first
      const validation = dataExportRepository.validateImportData(text);
      if (!validation.valid) {
        showMessage("error", validation.error || "Invalid file format");
        return;
      }

      // Confirm before importing
      const $modal = modalLogic();
      const confirmed = await $modal.confirmDanger(
        "This will REPLACE all existing data (profiles, stats, settings).\n\nAre you sure you want to continue?",
        "Import Data"
      );
      if (!confirmed) {
        return;
      }

      const result = await dataExportRepository.importAll(text);

      if (result.success) {
        showMessage("success", result.message);
        // Refresh profiles
        $profiles.refresh();
        // Reload page to ensure all data is fresh
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showMessage("error", result.message);
      }
    } catch (e) {
      console.error("Import error:", e);
      showMessage("error", "Failed to import data");
    } finally {
      isImporting.set(false);
    }
  }

  async function resetAllData() {
    resetState.set(patch("loading", true));

    try {
      // Clear all database tables in parallel
      await Promise.all([
        db.kidProfiles.clear(),
        db.parentSettings.clear(),
        db.gameProgress.clear(),
        db.kidEnergy.clear(),
        db.kidGameSettings.clear(),
      ]);

      // Clear localStorage
      localStorage.clear();

      // Full page reload to clear all in-memory signal state
      // This is intentional - logic() creates singletons that need a fresh start
      window.location.replace("/");
    } catch (error) {
      console.error("Failed to reset data:", error);
      resetState.set(patch("loading", false));
      const $modal = modalLogic();
      await $modal.error("Failed to reset data. Please try again.");
    }
  }

  return {
    // State
    isExporting,
    isImporting,
    message,
    resetState,
    // Actions
    handleExport,
    handleImport,
    showResetConfirm: () => resetState.set(patch("showConfirm", true)),
    hideResetConfirm: () => resetState.set(patch("showConfirm", false)),
    resetAllData,
  };
}

function DataTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const $data = useScope(dataTabLogic);

  return rx(() => {
    const msgState = $data.message();
    const exporting = $data.isExporting();
    const importing = $data.isImporting();

    return (
      <div className="space-y-6">
        {/* Message */}
        {msgState && (
          <div
            className={`p-3 rounded-xl text-center font-medium animate-pop ${
              msgState.type === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {msgState.text}
          </div>
        )}

        {/* Export Section */}
        <div className="card">
          <h3 className="font-display text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Icon name="upload" size={20} className="text-green-500" /> Export Data
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Download all your data as a JSON file. This includes:
          </p>
          <ul className="text-sm text-gray-600 mb-4 space-y-1">
            <li>• Kid profiles</li>
            <li>• Game progress & stats</li>
            <li>• Energy levels</li>
            <li>• Game visibility settings</li>
            <li>• Parent settings</li>
          </ul>
          <button
            onClick={() => $data.handleExport()}
            disabled={exporting}
            className="btn btn-primary w-full py-3"
          >
            {exporting ? "Exporting..." : <><Icon name="download" size={18} /> Download Backup</>}
          </button>
        </div>

        {/* Import Section */}
        <div className="card">
          <h3 className="font-display text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Icon name="download" size={20} className="text-blue-500" /> Import Data
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Restore data from a previously exported JSON file.
          </p>
          <div className="p-4 bg-amber-50 rounded-xl mb-4 flex items-start gap-2">
            <Icon name="warning" size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 font-medium">
              Warning: Importing will replace ALL existing data!
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                $data.handleImport(file).finally(() => {
                  // Reset file input after import
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                });
              }
            }}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="btn btn-outline w-full py-3"
          >
            {importing ? "Importing..." : <><Icon name="upload" size={18} /> Choose File to Import</>}
          </button>
        </div>

        {/* Info */}
        <div className="card bg-blue-50">
          <h4 className="font-display font-semibold text-blue-800 mb-2">
            Tips
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Export regularly to keep backups</li>
            <li>• Store backups in a safe place</li>
            <li>• Use import to restore or transfer data</li>
            <li>• JSON format is human-readable</li>
          </ul>
        </div>

        {/* Danger Zone */}
        <DangerZone $data={$data} />
      </div>
    );
  });
}

function DangerZone({ $data }: { $data: ReturnType<typeof dataTabLogic> }) {
  return rx(() => {
    const { showConfirm, loading } = $data.resetState();

    return (
      <div className="card border-2 border-red-200 bg-red-50">
        <h3 className="font-display text-lg font-semibold text-red-800 mb-2 flex items-center gap-2">
          <Icon name="warning" size={20} className="text-red-600" /> Danger Zone
        </h3>
        <p className="text-sm text-red-700 mb-4">
          These actions are irreversible. Please proceed with caution.
        </p>

        {showConfirm ? (
          <div className="p-4 bg-white rounded-xl border border-red-300">
            <p className="text-sm text-red-800 font-medium mb-3">
              Are you sure you want to delete ALL data? This includes:
            </p>
            <ul className="text-sm text-red-700 mb-4 space-y-1">
              <li>• All kid profiles</li>
              <li>• All game progress and scores</li>
              <li>• All energy data</li>
              <li>• Parent password</li>
              <li>• All settings</li>
            </ul>
            <p className="text-sm text-red-800 font-bold mb-4">
              This action CANNOT be undone!
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => $data.hideResetConfirm()}
                disabled={loading}
                className="btn btn-outline flex-1 py-2"
              >
                Cancel
              </button>
              <button
                onClick={() => $data.resetAllData()}
                disabled={loading}
                className="btn flex-1 py-2 bg-red-500 text-white hover:bg-red-600"
              >
                {loading ? "Deleting..." : "Yes, Delete Everything"}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => $data.showResetConfirm()}
            className="btn w-full py-3 bg-red-100 text-red-700 border border-red-300 hover:bg-red-200"
          >
            <Icon name="trash" size={18} /> Reset All Data
          </button>
        )}
      </div>
    );
  });
}
