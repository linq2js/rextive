import { rx } from "rextive/react";
import { authLogic } from "@/logic/authLogic";

export function UserMenu() {
  const { user, isRestoring, logout, openLoginModal } = authLogic();

  return rx(() => {
    // Show loading while restoring session
    if (isRestoring()) {
      return (
        <div className="flex items-center gap-2 text-warm-600">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="hidden sm:inline text-sm">Loading...</span>
        </div>
      );
    }

    const currentUser = user();

    if (currentUser) {
      return (
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-warm-900 dark:text-warm-100">
              {currentUser.firstName}
            </p>
            <p className="text-xs text-warm-600 dark:text-warm-400">Welcome back!</p>
          </div>
          <button
            onClick={() => logout()}
            className="btn-ghost p-2"
            title="Logout"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      );
    }

    return (
      <button onClick={() => openLoginModal()} className="btn-ghost text-sm">
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <span className="hidden sm:inline">Sign In</span>
      </button>
    );
  });
}
