import { memo } from "react";
import { rx } from "rextive/react";
import { alertLogic, type AlertType } from "@/logic/alertLogic";

const typeConfig: Record<
  AlertType,
  { icon: JSX.Element; bgColor: string; iconBg: string; iconColor: string; darkBg: string; darkIconBg: string; darkIconColor: string }
> = {
  info: {
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
    bgColor: "bg-blue-50",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    darkBg: "dark:bg-blue-950",
    darkIconBg: "dark:bg-blue-900/50",
    darkIconColor: "dark:text-blue-400",
  },
  success: {
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
    bgColor: "bg-green-50",
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    darkBg: "dark:bg-green-950",
    darkIconBg: "dark:bg-green-900/50",
    darkIconColor: "dark:text-green-400",
  },
  warning: {
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    ),
    bgColor: "bg-amber-50",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    darkBg: "dark:bg-amber-950",
    darkIconBg: "dark:bg-amber-900/50",
    darkIconColor: "dark:text-amber-400",
  },
  error: {
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
    bgColor: "bg-red-50",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    darkBg: "dark:bg-red-950",
    darkIconBg: "dark:bg-red-900/50",
    darkIconColor: "dark:text-red-400",
  },
};

export const AlertModal = memo(function AlertModal() {
  const $alert = alertLogic();

  return rx(() => {
    const isOpen = $alert.isOpen();
    const title = $alert.title();
    const message = $alert.message();
    const alertType = $alert.type();
    const confirmText = $alert.confirmText();

    const config = typeConfig[alertType];

    return (
      <>
        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-[60] transition-opacity duration-200 ${
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => $alert.close()}
          aria-hidden="true"
        />

        {/* Modal */}
        <div
          className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-opacity duration-200 ${
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <div
            className={`${config.bgColor} ${config.darkBg} rounded-2xl shadow-2xl w-full max-w-sm transform transition-all duration-200 border border-stone-200 dark:border-slate-700 ${
              isOpen ? "scale-100" : "scale-95"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Icon */}
              <div
                className={`w-14 h-14 ${config.iconBg} ${config.darkIconBg} rounded-full flex items-center justify-center mx-auto mb-4`}
              >
                <svg
                  className={`w-7 h-7 ${config.iconColor} ${config.darkIconColor}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {config.icon}
                </svg>
              </div>

              {/* Title */}
              {title && (
                <h3 className="text-lg font-semibold text-stone-900 dark:text-white text-center mb-2">
                  {title}
                </h3>
              )}

              {/* Message */}
              <p className="text-stone-600 dark:text-slate-300 text-center whitespace-pre-line">
                {message}
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6">
              <button
                onClick={() => $alert.close()}
                className="w-full btn-primary py-3 text-base font-medium"
                autoFocus
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  });
});
