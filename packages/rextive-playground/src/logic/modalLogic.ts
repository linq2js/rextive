/**
 * @file modalLogic.ts
 * @description App-level modal system for alerts, confirms, and custom dialogs.
 *
 * This is a global singleton logic that provides a Promise-based modal API.
 * It supports various modal types (alert, confirm, custom) with different icons
 * and button configurations.
 *
 * @example
 * ```ts
 * const $modal = modalLogic();
 *
 * // Simple alert
 * await $modal.alert("Operation completed!");
 *
 * // Confirmation dialog
 * const confirmed = await $modal.confirm("Are you sure?");
 * if (confirmed) { ... }
 *
 * // Dangerous action confirmation
 * const confirmed = await $modal.confirmDanger("Delete all data?", "Warning");
 * ```
 */
import { logic, signal } from "rextive";

/**
 * Configuration for a modal button.
 */
export type ModalButton = {
  /** Button text label */
  label: string;
  /** Visual style variant */
  variant?: "primary" | "secondary" | "danger" | "outline";
  /** Value returned when this button is clicked */
  value: string;
};

/**
 * Configuration for displaying a modal.
 */
export type ModalConfig = {
  /** Modal type determines default behavior */
  type: "alert" | "confirm" | "custom";
  /** Optional title displayed at the top */
  title?: string;
  /** Main message content */
  message: string;
  /** Icon displayed next to title/message */
  icon?: "info" | "warning" | "error" | "success" | "question";
  /** Array of buttons to display */
  buttons: ModalButton[];
};

/**
 * Internal state type for the modal.
 * When closed, only tracks open: false.
 * When open, stores config and promise resolver.
 */
type ModalState =
  | { open: false }
  | {
      open: true;
      config: ModalConfig;
      resolve: (value: string | null) => void;
    };

export const modalLogic = logic("modalLogic", () => {
  // ============================================================================
  // STATE
  // ============================================================================

  /** Modal visibility and configuration state */
  const state = signal<ModalState>({ open: false }, { name: "modal.state" });

  // ============================================================================
  // CORE METHODS
  // ============================================================================

  /**
   * Shows a modal with the given configuration.
   * Returns a Promise that resolves when any button is clicked.
   *
   * @param config - Modal configuration
   * @returns Promise resolving to button value or null if dismissed
   */
  function showModal(config: ModalConfig): Promise<string | null> {
    return new Promise((resolve) => {
      state.set({ open: true, config, resolve });
    });
  }

  /**
   * Closes the modal and resolves the pending promise.
   *
   * @param value - Value to resolve the promise with (button value or null)
   */
  function close(value: string | null) {
    const current = state();
    if (current.open) {
      // Resolve the pending promise before closing
      current.resolve(value);
    }
    state.set({ open: false });
  }

  // ============================================================================
  // CONVENIENCE METHODS
  // These provide simpler APIs for common modal patterns
  // ============================================================================

  /**
   * Shows an informational alert dialog.
   *
   * @param message - Message to display
   * @param title - Optional title (defaults to "Notice")
   */
  async function alert(message: string, title?: string): Promise<void> {
    await showModal({
      type: "alert",
      title: title || "Notice",
      message,
      icon: "info",
      buttons: [{ label: "OK", variant: "primary", value: "ok" }],
    });
  }

  /**
   * Shows a success alert dialog with green styling.
   *
   * @param message - Success message to display
   * @param title - Optional title (defaults to "Success")
   */
  async function success(message: string, title?: string): Promise<void> {
    await showModal({
      type: "alert",
      title: title || "Success",
      message,
      icon: "success",
      buttons: [{ label: "OK", variant: "primary", value: "ok" }],
    });
  }

  /**
   * Shows an error alert dialog with red styling.
   *
   * @param message - Error message to display
   * @param title - Optional title (defaults to "Error")
   */
  async function error(message: string, title?: string): Promise<void> {
    await showModal({
      type: "alert",
      title: title || "Error",
      message,
      icon: "error",
      buttons: [{ label: "OK", variant: "danger", value: "ok" }],
    });
  }

  /**
   * Shows a warning alert dialog with yellow styling.
   *
   * @param message - Warning message to display
   * @param title - Optional title (defaults to "Warning")
   */
  async function warning(message: string, title?: string): Promise<void> {
    await showModal({
      type: "alert",
      title: title || "Warning",
      message,
      icon: "warning",
      buttons: [{ label: "OK", variant: "primary", value: "ok" }],
    });
  }

  /**
   * Shows a confirmation dialog with Cancel/Confirm buttons.
   *
   * @param message - Question or statement to confirm
   * @param title - Optional title (defaults to "Confirm")
   * @returns Promise resolving to true if confirmed, false otherwise
   */
  async function confirm(message: string, title?: string): Promise<boolean> {
    const value = await showModal({
      type: "confirm",
      title: title || "Confirm",
      message,
      icon: "question",
      buttons: [
        { label: "Cancel", variant: "outline", value: "cancel" },
        { label: "Confirm", variant: "primary", value: "confirm" },
      ],
    });
    return value === "confirm";
  }

  /**
   * Shows a dangerous action confirmation dialog.
   * Uses warning icon and red "danger" button for emphasis.
   *
   * @param message - Warning message about the dangerous action
   * @param title - Optional title (defaults to "Are you sure?")
   * @returns Promise resolving to true if confirmed, false otherwise
   */
  async function confirmDanger(
    message: string,
    title?: string
  ): Promise<boolean> {
    const value = await showModal({
      type: "confirm",
      title: title || "Are you sure?",
      message,
      icon: "warning",
      buttons: [
        { label: "Cancel", variant: "outline", value: "cancel" },
        { label: "Yes, I'm sure", variant: "danger", value: "confirm" },
      ],
    });
    return value === "confirm";
  }

  /**
   * Shows a simple Yes/No question dialog.
   *
   * @param message - Question to ask
   * @param title - Optional title (defaults to "Question")
   * @returns Promise resolving to true if Yes clicked, false if No
   */
  async function yesNo(message: string, title?: string): Promise<boolean> {
    const value = await showModal({
      type: "confirm",
      title: title || "Question",
      message,
      icon: "question",
      buttons: [
        { label: "No", variant: "outline", value: "no" },
        { label: "Yes", variant: "primary", value: "yes" },
      ],
    });
    return value === "yes";
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  return {
    // State (for UI rendering)
    state,

    // Core methods
    showModal,
    close,

    // Convenience methods
    alert,
    success,
    error,
    warning,
    confirm,
    confirmDanger,
    yesNo,
  };
});
