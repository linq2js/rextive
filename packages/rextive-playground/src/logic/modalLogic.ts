// App-level modal system for alerts, confirms, and custom dialogs
import { logic, signal } from "rextive";

export type ModalButton = {
  label: string;
  variant?: "primary" | "secondary" | "danger" | "outline";
  value: string;
};

export type ModalConfig = {
  type: "alert" | "confirm" | "custom";
  title?: string;
  message: string;
  icon?: "info" | "warning" | "error" | "success" | "question";
  buttons: ModalButton[];
};

type ModalState =
  | { open: false }
  | { open: true; config: ModalConfig; resolve: (value: string | null) => void };

export const modalLogic = logic("modalLogic", () => {
  const state = signal<ModalState>({ open: false }, { name: "modal.state" });

  function showModal(config: ModalConfig): Promise<string | null> {
    return new Promise((resolve) => {
      state.set({ open: true, config, resolve });
    });
  }

  function close(value: string | null) {
    const current = state();
    if (current.open) {
      current.resolve(value);
    }
    state.set({ open: false });
  }

  // Convenience methods
  function alert(message: string, title?: string): Promise<void> {
    return showModal({
      type: "alert",
      title: title || "Notice",
      message,
      icon: "info",
      buttons: [{ label: "OK", variant: "primary", value: "ok" }],
    }).then(() => {});
  }

  function success(message: string, title?: string): Promise<void> {
    return showModal({
      type: "alert",
      title: title || "Success",
      message,
      icon: "success",
      buttons: [{ label: "OK", variant: "primary", value: "ok" }],
    }).then(() => {});
  }

  function error(message: string, title?: string): Promise<void> {
    return showModal({
      type: "alert",
      title: title || "Error",
      message,
      icon: "error",
      buttons: [{ label: "OK", variant: "danger", value: "ok" }],
    }).then(() => {});
  }

  function warning(message: string, title?: string): Promise<void> {
    return showModal({
      type: "alert",
      title: title || "Warning",
      message,
      icon: "warning",
      buttons: [{ label: "OK", variant: "primary", value: "ok" }],
    }).then(() => {});
  }

  function confirm(message: string, title?: string): Promise<boolean> {
    return showModal({
      type: "confirm",
      title: title || "Confirm",
      message,
      icon: "question",
      buttons: [
        { label: "Cancel", variant: "outline", value: "cancel" },
        { label: "Confirm", variant: "primary", value: "confirm" },
      ],
    }).then((value) => value === "confirm");
  }

  function confirmDanger(message: string, title?: string): Promise<boolean> {
    return showModal({
      type: "confirm",
      title: title || "Are you sure?",
      message,
      icon: "warning",
      buttons: [
        { label: "Cancel", variant: "outline", value: "cancel" },
        { label: "Yes, I'm sure", variant: "danger", value: "confirm" },
      ],
    }).then((value) => value === "confirm");
  }

  function yesNo(message: string, title?: string): Promise<boolean> {
    return showModal({
      type: "confirm",
      title: title || "Question",
      message,
      icon: "question",
      buttons: [
        { label: "No", variant: "outline", value: "no" },
        { label: "Yes", variant: "primary", value: "yes" },
      ],
    }).then((value) => value === "yes");
  }

  return {
    state,
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

