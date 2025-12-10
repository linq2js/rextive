// Global modal component - renders modals from modalLogic
import { rx } from "rextive/react";
import { modalLogic } from "@/logic/modal.logic";
import type { ModalButton } from "@/logic/modal.logic";

// Icon components for different modal types
function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4m0-4h.01" />
    </svg>
  );
}

function SuccessIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-12 h-12 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4m0 4h.01" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6m0-6 6 6" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-12 h-12 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3m.08 4h.01" />
    </svg>
  );
}

const ICONS = {
  info: InfoIcon,
  success: SuccessIcon,
  warning: WarningIcon,
  error: ErrorIcon,
  question: QuestionIcon,
};

function getButtonClasses(variant: ModalButton["variant"] = "primary"): string {
  const base = "px-4 py-2 rounded-xl font-medium transition-all min-w-[80px]";
  switch (variant) {
    case "primary":
      return `${base} bg-primary-500 text-white hover:bg-primary-600 active:scale-95`;
    case "secondary":
      return `${base} bg-gray-500 text-white hover:bg-gray-600 active:scale-95`;
    case "danger":
      return `${base} bg-red-500 text-white hover:bg-red-600 active:scale-95`;
    case "outline":
      return `${base} bg-white text-gray-700 border-2 border-gray-200 hover:bg-gray-50 active:scale-95`;
    default:
      return `${base} bg-primary-500 text-white hover:bg-primary-600 active:scale-95`;
  }
}

export function GlobalModal() {
  const $modal = modalLogic();

  return rx(() => {
    const modalState = $modal.state();
    if (!modalState.open) return null;

    const { config } = modalState;
    const IconComponent = config.icon ? ICONS[config.icon] : null;

    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-fadeIn"
        onClick={() => $modal.close(null)}
      >
        <div
          className="card w-full max-w-sm animate-pop"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Icon */}
          {IconComponent && (
            <div className="flex justify-center mb-4">
              <IconComponent />
            </div>
          )}

          {/* Title */}
          {config.title && (
            <h2 className="font-display text-xl font-bold text-gray-800 text-center mb-2">
              {config.title}
            </h2>
          )}

          {/* Message */}
          <p className="text-gray-600 text-center whitespace-pre-line">
            {config.message}
          </p>

          {/* Buttons */}
          <div className="mt-6 flex justify-center gap-3">
            {config.buttons.map((button) => (
              <button
                key={button.value}
                onClick={() => $modal.close(button.value)}
                className={getButtonClasses(button.variant)}
              >
                {button.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  });
}

