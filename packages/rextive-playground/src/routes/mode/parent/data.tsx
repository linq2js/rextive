import { createFileRoute } from "@tanstack/react-router";
import { signal } from "rextive";
import { patch } from "rextive/helpers";
import { rx, useScope } from "rextive/react";
import { kidProfilesLogic, modalLogic } from "@/logic";
import { dataExportRepository } from "@/infrastructure/repositories";
import { db } from "@/infrastructure/database";
import { useRef } from "react";
import { Icon } from "@/components/Icons";
import { useTranslation, t } from "@/i18n";

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

      showMessage("success", "dataExportedSuccessfully");
    } catch (e) {
      console.error("Export error:", e);
      showMessage("error", "failedToExport");
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
        showMessage("error", validation.error || "invalidFileFormat");
        return;
      }

      // Confirm before importing - use t() directly in logic
      const $modal = modalLogic();
      const confirmed = await $modal.confirmDanger(
        t("parent.importConfirm"),
        t("parent.importData")
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
      showMessage("error", "failedToImport");
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
      await $modal.error("failedToResetData");
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
  const { t } = useTranslation();

  // Helper to translate message codes
  const translateMessage = (text: string) => {
    const messageMap: Record<string, string> = {
      dataExportedSuccessfully: t("parent.dataExportedSuccessfully"),
      failedToExport: t("parent.failedToExport"),
      failedToImport: t("parent.failedToImport"),
      invalidFileFormat: t("parent.invalidFileFormat"),
      failedToResetData: t("parent.failedToResetData"),
    };
    return messageMap[text] || text;
  };

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
            {translateMessage(msgState.text)}
          </div>
        )}

        {/* Export Section */}
        <div className="card">
          <h3 className="font-display text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Icon name="upload" size={20} className="text-green-500" />{" "}
            {t("parent.exportData")}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {t("parent.exportDescription")}
          </p>
          <ul className="text-sm text-gray-600 mb-4 space-y-1">
            <li>• {t("parent.exportIncludes1")}</li>
            <li>• {t("parent.exportIncludes2")}</li>
            <li>• {t("parent.exportIncludes3")}</li>
            <li>• {t("parent.exportIncludes4")}</li>
            <li>• {t("parent.exportIncludes5")}</li>
          </ul>
          <button
            onClick={() => $data.handleExport()}
            disabled={exporting}
            className="btn btn-primary w-full py-3"
          >
            {exporting ? (
              t("parent.exporting")
            ) : (
              <>
                <Icon name="download" size={18} /> {t("parent.downloadBackup")}
              </>
            )}
          </button>
        </div>

        {/* Import Section */}
        <div className="card">
          <h3 className="font-display text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Icon name="download" size={20} className="text-blue-500" />{" "}
            {t("parent.importData")}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {t("parent.importDescription")}
          </p>
          <div className="p-4 bg-amber-50 rounded-xl mb-4 flex items-start gap-2">
            <Icon
              name="warning"
              size={18}
              className="text-amber-600 flex-shrink-0 mt-0.5"
            />
            <p className="text-sm text-amber-800 font-medium">
              {t("parent.importWarning")}
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
            {importing ? (
              t("parent.importing")
            ) : (
              <>
                <Icon name="upload" size={18} />{" "}
                {t("parent.chooseFileToImport")}
              </>
            )}
          </button>
        </div>

        {/* Info */}
        <div className="card bg-blue-50">
          <h4 className="font-display font-semibold text-blue-800 mb-2">
            {t("parent.tips")}
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• {t("parent.tip1")}</li>
            <li>• {t("parent.tip2")}</li>
            <li>• {t("parent.tip3")}</li>
            <li>• {t("parent.tip4")}</li>
          </ul>
        </div>

        {/* Danger Zone */}
        <DangerZone $data={$data} />
      </div>
    );
  });
}

function DangerZone({ $data }: { $data: ReturnType<typeof dataTabLogic> }) {
  const { t } = useTranslation();

  return rx(() => {
    const { showConfirm, loading } = $data.resetState();

    return (
      <div className="card border-2 border-red-200 bg-red-50">
        <h3 className="font-display text-lg font-semibold text-red-800 mb-2 flex items-center gap-2">
          <Icon name="warning" size={20} className="text-red-600" />{" "}
          {t("parent.dangerZone")}
        </h3>
        <p className="text-sm text-red-700 mb-4">
          {t("parent.dangerZoneDescription")}
        </p>

        {showConfirm ? (
          <div className="p-4 bg-white rounded-xl border border-red-300">
            <p className="text-sm text-red-800 font-medium mb-3">
              {t("parent.resetAllDataConfirm")}
            </p>
            <ul className="text-sm text-red-700 mb-4 space-y-1">
              <li>• {t("parent.resetAllDataIncludes1")}</li>
              <li>• {t("parent.resetAllDataIncludes2")}</li>
              <li>• {t("parent.resetAllDataIncludes3")}</li>
              <li>• {t("parent.resetAllDataIncludes4")}</li>
              <li>• {t("parent.resetAllDataIncludes5")}</li>
            </ul>
            <p className="text-sm text-red-800 font-bold mb-4">
              {t("parent.cannotBeUndone")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => $data.hideResetConfirm()}
                disabled={loading}
                className="btn btn-outline flex-1 py-3 w-full sm:w-auto"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => $data.resetAllData()}
                disabled={loading}
                className="btn flex-1 py-3 w-full sm:w-auto bg-red-500 text-white hover:bg-red-600"
              >
                {loading
                  ? t("parent.deleting")
                  : t("parent.yesDeleteEverything")}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => $data.showResetConfirm()}
            className="btn w-full py-3 bg-red-100 text-red-700 border border-red-300 hover:bg-red-200"
          >
            <Icon name="trash" size={18} /> {t("parent.resetAllData")}
          </button>
        )}
      </div>
    );
  });
}
