import { memo } from "react";
import { rx, task } from "rextive/react";
import { authLogic } from "@/logic/authLogic";
import { loginLogic } from "@/logic/loginLogic";

export const LoginModal = memo(function LoginModal() {
  const { loginModalOpen, closeLoginModal, loginResult } = authLogic();
  const $login = loginLogic();

  return rx(() => {
    const open = loginModalOpen();
    const state = task.from(loginResult);
    const loading = state.loading;
    const errorMessage = state.error ? String(state.error) : null;

    if (!open) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => closeLoginModal()}
        />

        {/* Modal */}
        <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-8 animate-slide-up border border-stone-200 dark:border-slate-800">
          {/* Close button */}
          <button
            onClick={() => closeLoginModal()}
            className="absolute top-4 right-4 p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg
              className="w-5 h-5 text-stone-500 dark:text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-brand-100 dark:bg-brand-900/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-7 h-7 text-brand-600 dark:text-brand-400"
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
            </div>
            <h2 className="text-2xl font-bold text-stone-900 dark:text-white">
              Welcome Back
            </h2>
            <p className="text-stone-500 dark:text-slate-400 mt-2">
              Sign in to access your cart and orders
            </p>
          </div>

          {/* Demo credentials notice */}
          <div className="mb-6 p-4 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl text-sm">
            <p className="text-brand-700 dark:text-brand-300 font-medium mb-1">
              Demo Credentials
            </p>
            <p className="text-brand-600 dark:text-brand-400">
              Username:{" "}
              <code className="font-mono bg-brand-100 dark:bg-brand-900/40 px-1 rounded">
                emilys
              </code>
            </p>
            <p className="text-brand-600 dark:text-brand-400">
              Password:{" "}
              <code className="font-mono bg-brand-100 dark:bg-brand-900/40 px-1 rounded">
                emilyspass
              </code>
            </p>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
              {errorMessage}
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              $login.login();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-slate-300 mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={$login.username()}
                onChange={(e) => $login.username.set(e.target.value)}
                className="input"
                placeholder="Enter your username"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={$login.password()}
                onChange={(e) => $login.password.set(e.target.value)}
                className="input"
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-lg mt-6"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
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
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  });
});
