import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import { rx, useScope, inputValue } from "rextive/react";
import { focus } from "rextive/op";
import { parentAuthLogic, kidProfilesLogic } from "@/logic";
import { setupPasswordFormLogic } from "@/logic/setupPasswordFormLogic";
import { loginFormLogic } from "@/logic/loginFormLogic";

export const Route = createFileRoute("/mode/parent")({
  component: ParentLayout,
});

function ParentLayout() {
  const $auth = parentAuthLogic();

  return rx(() => {
    if ($auth.isLoading()) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-2xl">Loading...</div>
        </div>
      );
    }

    if (!$auth.isSetup()) {
      return <SetupPassword />;
    }

    if (!$auth.isAuthenticated()) {
      return <LoginScreen />;
    }

    return <ParentDashboardLayout />;
  });
}

// ============================================================================
// Setup Password Screen
// ============================================================================

function SetupPassword() {
  const $form = useScope(setupPasswordFormLogic);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-md">
        <Link to="/" className="mb-4 inline-block text-2xl">
          ←
        </Link>
        <h1 className="font-display text-2xl font-bold text-gray-800">
          🔐 Set Up Parent Access
        </h1>
        <p className="mt-2 text-gray-600">
          Create a password to protect parent settings.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            $form.submit();
          }}
          className="mt-6 space-y-4"
        >
          {rx(() => {
            const [get, set] = focus
              .lens($form.state, "password")
              .map(inputValue);
            return (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  value={get()}
                  onChange={set}
                  className="input"
                  placeholder="Enter password"
                  autoComplete="new-password"
                />
              </div>
            );
          })}

          {rx(() => {
            const [get, set] = focus
              .lens($form.state, "confirm")
              .map(inputValue);
            return (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={get()}
                  onChange={set}
                  className="input"
                  placeholder="Confirm password"
                  autoComplete="new-password"
                />
              </div>
            );
          })}

          {rx(() => {
            const error = $form.state().error;
            return error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : null;
          })}

          {rx(() => (
            <button
              type="submit"
              disabled={$form.state().loading}
              className="btn btn-primary w-full py-3"
            >
              {$form.state().loading ? "Setting up..." : "Set Password"}
            </button>
          ))}
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Login Screen
// ============================================================================

function LoginScreen() {
  const $form = useScope(loginFormLogic);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-md">
        <Link to="/" className="mb-4 inline-block text-2xl">
          ←
        </Link>
        <h1 className="font-display text-2xl font-bold text-gray-800">
          🔐 Parent Access
        </h1>
        <p className="mt-2 text-gray-600">Enter your password to continue.</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            $form.submit();
          }}
          className="mt-6 space-y-4"
        >
          {rx(() => {
            const [get, set] = focus
              .lens($form.state, "password")
              .map(inputValue);
            return (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  value={get()}
                  onChange={set}
                  className="input"
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
              </div>
            );
          })}

          {rx(() => {
            const error = $form.state().error;
            return error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : null;
          })}

          {rx(() => (
            <button
              type="submit"
              disabled={$form.state().loading}
              className="btn btn-primary w-full py-3"
            >
              {$form.state().loading ? "Verifying..." : "Enter"}
            </button>
          ))}
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Parent Dashboard Layout (with tabs and outlet)
// ============================================================================

function ParentDashboardLayout() {
  const $auth = parentAuthLogic();
  const $profiles = kidProfilesLogic();
  const location = useLocation();

  // Determine active tab from URL
  const pathname = location.pathname;
  const activeTab = pathname.endsWith("/data") ? "data" : "kids";

  return rx(() => {
    if ($profiles.isLoading()) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-2xl">Loading...</div>
        </div>
      );
    }

    return (
      <div className="min-h-screen safe-bottom">
        {/* Navigation Bar */}
        <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
          <div className="mx-auto max-w-2xl px-4">
            <div className="flex h-14 items-center justify-between">
              <Link
                to="/"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <span className="text-xl">←</span>
                <span className="text-sm font-medium hidden sm:inline">
                  Home
                </span>
              </Link>

              <h1 className="font-display text-lg font-bold text-gray-800">
                👨‍👩‍👧 Parent Dashboard
              </h1>

              <button
                onClick={() => $auth.logout()}
                className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors"
              >
                <span className="text-sm font-medium hidden sm:inline">
                  Logout
                </span>
                <span className="text-xl">🚪</span>
              </button>
            </div>
          </div>
        </nav>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-2xl px-4">
            <div className="flex gap-4">
              <TabLink
                to="/mode/parent"
                active={activeTab === "kids"}
                label="👶 Kids"
              />
              <TabLink
                to="/mode/parent/data"
                active={activeTab === "data"}
                label="💾 Data"
              />
            </div>
          </div>
        </div>

        {/* Content - Rendered by child routes */}
        <div className="mx-auto max-w-2xl p-4">
          <Outlet />
        </div>
      </div>
    );
  });
}

function TabLink({
  to,
  active,
  label,
}: {
  to: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      to={to}
      className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
        active
          ? "border-primary-500 text-primary-600"
          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
      }`}
    >
      {label}
    </Link>
  );
}
