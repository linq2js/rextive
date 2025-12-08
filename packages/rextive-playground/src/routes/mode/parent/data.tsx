import { createFileRoute } from "@tanstack/react-router";
import { signal } from "rextive";
import { rx } from "rextive/react";
import { kidProfilesLogic } from "@/logic";
import { dataExportRepository } from "@/infrastructure/repositories";
import { useRef } from "react";

export const Route = createFileRoute("/mode/parent/data")({
  component: DataTab,
});

function DataTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const $profiles = kidProfilesLogic();

  const isExporting = signal(false, { name: "data.isExporting" });
  const isImporting = signal(false, { name: "data.isImporting" });
  const message = signal<{ type: "success" | "error"; text: string } | null>(
    null,
    { name: "data.message" }
  );

  function showMessage(type: "success" | "error", text: string) {
    message.set({ type, text });
    setTimeout(() => message.set(null), 5000);
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

      showMessage("success", "Data exported successfully! 📥");
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
      if (
        !confirm(
          "⚠️ This will REPLACE all existing data (profiles, stats, settings).\n\nAre you sure you want to continue?"
        )
      ) {
        return;
      }

      const result = await dataExportRepository.importAll(text);

      if (result.success) {
        showMessage("success", result.message);
        // Refresh profiles
        await $profiles.refresh?.();
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
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return rx(() => {
    const msgState = message();
    const exporting = isExporting();
    const importing = isImporting();

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
          <h3 className="font-display text-lg font-semibold text-gray-800 mb-3">
            📤 Export Data
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
            onClick={handleExport}
            disabled={exporting}
            className="btn btn-primary w-full py-3"
          >
            {exporting ? "Exporting..." : "📥 Download Backup"}
          </button>
        </div>

        {/* Import Section */}
        <div className="card">
          <h3 className="font-display text-lg font-semibold text-gray-800 mb-3">
            📥 Import Data
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Restore data from a previously exported JSON file.
          </p>
          <div className="p-4 bg-amber-50 rounded-xl mb-4">
            <p className="text-sm text-amber-800 font-medium">
              ⚠️ Warning: Importing will replace ALL existing data!
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleImport(file);
              }
            }}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="btn btn-outline w-full py-3"
          >
            {importing ? "Importing..." : "📤 Choose File to Import"}
          </button>
        </div>

        {/* Info */}
        <div className="card bg-blue-50">
          <h4 className="font-display font-semibold text-blue-800 mb-2">
            💡 Tips
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Export regularly to keep backups</li>
            <li>• Store backups in a safe place</li>
            <li>• Use import to restore or transfer data</li>
            <li>• JSON format is human-readable</li>
          </ul>
        </div>
      </div>
    );
  });
}

