import { signal, logic } from "rextive";
import { rx, task } from "rextive/react";
import { authLogic } from "@/logic/authLogic";

/**
 * Local logic for LoginModal - manages form state.
 * Using singleton pattern - form state persists across modal open/close.
 */
const loginFormLogic = logic("loginFormLogic", () => {
  const username = signal("emilys", { name: "loginForm.username" });
  const password = signal("emilyspass", { name: "loginForm.password" });

  const reset = () => {
    username.set("emilys");
    password.set("emilyspass");
  };

  return {
    username,
    password,
    reset,
  };
});

export function LoginModal() {
  const $auth = authLogic();
  // Use singleton - form state persists. No useScope needed.
  const $form = loginFormLogic();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await $auth.login({
        username: $form.username(),
        password: $form.password(),
      });
    } catch {
      // Error is handled in authLogic
    }
  };

  return rx(() => {
    const isOpen = $auth.loginModalOpen();
    const loginState = task.from($auth.loginResult());
    const loading = loginState.loading;
    const error =
      loginState.error instanceof Error
        ? loginState.error.message
        : loginState.error
        ? String(loginState.error)
        : null;
    const username = $form.username();
    const password = $form.password();

    return (
      <>
        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-warm-900/50 backdrop-blur-sm z-50 transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => $auth.closeLoginModal()}
          aria-hidden="true"
        />

        {/* Modal */}
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <div
            className={`bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 ${
              isOpen ? "scale-100" : "scale-95"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-warm-200">
              <h2 className="text-xl font-semibold text-warm-900">Sign In</h2>
              <button
                onClick={() => $auth.closeLoginModal()}
                className="btn-ghost p-2"
                aria-label="Close"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Demo credentials notice */}
              <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 text-sm text-brand-700">
                <p className="font-medium">Demo Credentials</p>
                <p className="text-brand-600">
                  Username: emilys / Password: emilyspass
                </p>
              </div>

              {/* Error message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Username */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-warm-700 mb-1"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => $form.username.set(e.target.value)}
                  className="input w-full"
                  placeholder="Enter username"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-warm-700 mb-1"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => $form.password.set(e.target.value)}
                  className="input w-full"
                  placeholder="Enter password"
                  required
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 disabled:opacity-50"
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
      </>
    );
  });
}
