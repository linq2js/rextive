import { signal, logic } from "rextive";

export type AlertType = "info" | "success" | "warning" | "error";

export interface AlertOptions {
  title?: string;
  message: string;
  type?: AlertType;
  confirmText?: string;
  onConfirm?: () => void;
}

/**
 * Alert logic - manages global alert modal state.
 * Provides a styled alternative to native alert().
 */
export const alertLogic = logic("alertLogic", () => {
  const isOpen = signal(false, { name: "alert.isOpen" });
  const title = signal("", { name: "alert.title" });
  const message = signal("", { name: "alert.message" });
  const type = signal<AlertType>("info", { name: "alert.type" });
  const confirmText = signal("OK", { name: "alert.confirmText" });

  // Store callback ref
  let onConfirmCallback: (() => void) | undefined;

  /**
   * Show an alert modal.
   */
  const show = (options: AlertOptions | string) => {
    const opts = typeof options === "string" ? { message: options } : options;

    signal.batch(() => {
      title.set(opts.title ?? "");
      message.set(opts.message);
      type.set(opts.type ?? "info");
      confirmText.set(opts.confirmText ?? "OK");
      isOpen.set(true);
    });

    onConfirmCallback = opts.onConfirm;
  };

  /**
   * Close the alert modal.
   */
  const close = () => {
    isOpen.set(false);
    onConfirmCallback?.();
    onConfirmCallback = undefined;
  };

  // Convenience methods
  const info = (message: string, title?: string) =>
    show({ message, title, type: "info" });

  const success = (message: string, title?: string) =>
    show({ message, title, type: "success" });

  const warning = (message: string, title?: string) =>
    show({ message, title, type: "warning" });

  const error = (message: string, title?: string) =>
    show({ message, title, type: "error" });

  return {
    // State
    isOpen,
    title,
    message,
    type,
    confirmText,

    // Actions
    show,
    close,
    info,
    success,
    warning,
    error,
  };
});

