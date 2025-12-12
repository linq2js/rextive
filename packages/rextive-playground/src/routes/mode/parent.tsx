import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import { Suspense } from "react";
import { rx, useScope, inputValue } from "rextive/react";
import { focus } from "rextive/op";
import { task } from "rextive";
import { parentAuthLogic, kidProfilesLogic } from "@/logic";
import { setupPasswordFormLogic } from "@/logic/setupPasswordForm.logic";
import { loginFormLogic } from "@/logic/loginForm.logic";
import { Icon } from "@/components/Icons";
import { useTranslation } from "@/i18n";

export const Route = createFileRoute("/mode/parent")({
  component: ParentLayout,
});

function LoadingSpinner() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-2xl">{t("parent.loading")}</div>
    </div>
  );
}

function ParentLayout() {
  const $auth = parentAuthLogic();
  useScope($auth.autoLogoutLogic);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      {rx(() => {
        // Use task.from to get loading/value state
        const setupState = task.from($auth.isSetup());

        // Still loading setup status
        if (setupState?.loading) {
          return <LoadingSpinner />;
        }

        // Not set up yet
        if (!setupState?.value) {
          return <SetupPassword />;
        }

        // Not authenticated
        if (!$auth.isAuthenticated()) {
          return <LoginScreen />;
        }

        return <ParentDashboardLayout />;
      })}
    </Suspense>
  );
}

// ============================================================================
// Setup Password Screen
// ============================================================================

function SetupPassword() {
  const $form = useScope(setupPasswordFormLogic);
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-md">
        <Link to="/" viewTransition className="mb-4 inline-block text-2xl">
          ←
        </Link>
        <h1 className="font-display text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
          <Icon name="lock" size={24} /> {t("parent.setUpParentAccess")}
        </h1>
        <p className="mt-2 text-gray-600">
          {t("parent.createPasswordDescription")}
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
                  {t("parent.password")}
                </label>
                <input
                  type="password"
                  value={get()}
                  onChange={set}
                  className="input"
                  placeholder={t("parent.enterPassword")}
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
                  {t("parent.confirmPassword")}
                </label>
                <input
                  type="password"
                  value={get()}
                  onChange={set}
                  className="input"
                  placeholder={t("parent.confirmPassword")}
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
              {$form.state().loading ? t("parent.settingUp") : t("parent.setPassword")}
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
  const { t } = useTranslation();

  // Create input-mapped lens for password field
  const passwordLens = focus.lens($form.state, "password").map(inputValue);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-md">
        <Link
          to="/"
          viewTransition
          className="mb-4 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          title={t("common.back")}
        >
          <Icon name="back" size={20} />
          <span className="text-sm font-medium">{t("common.back")}</span>
        </Link>
        <h1 className="font-display text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
          <Icon name="lock" size={24} /> {t("parent.parentAccess")}
        </h1>
        <p className="mt-2 text-gray-600">{t("parent.enterPasswordToContinue")}</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            $form.submit();
          }}
          className="mt-6 space-y-4"
        >
          {rx(() => (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t("parent.password")}
              </label>
              <input
                type="password"
                value={passwordLens[0]()}
                onChange={passwordLens[1]}
                className="input"
                placeholder={t("parent.enterPassword")}
                autoComplete="current-password"
              />
            </div>
          ))}

          {rx(() => {
            const error = $form.getError();
            return error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : null;
          })}

          {rx(() => (
            <button
              type="submit"
              disabled={$form.getLoading()}
              className="btn btn-primary w-full py-3"
            >
              {$form.getLoading() ? t("parent.verifying") : t("parent.enter")}
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
  const { t } = useTranslation();

  // Determine active tab from URL
  const pathname = location.pathname;
  const activeTab = pathname.endsWith("/data")
    ? "data"
    : pathname.endsWith("/sync")
      ? "sync"
      : pathname.endsWith("/settings")
        ? "settings"
        : "kids";

  return (
    <Suspense fallback={<LoadingSpinner />}>
      {rx(() => {
        // Use task.from to check loading state
        const profilesState = task.from($profiles.profiles());

        if (profilesState?.loading) {
          return <LoadingSpinner />;
        }

        return (
          <div className="min-h-screen safe-bottom">
            {/* Navigation Bar */}
            <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
              <div className="mx-auto max-w-2xl px-4">
                <div className="flex h-14 items-center justify-between">
                  <Link
                    to="/"
                    viewTransition
                    className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                    title={t("parent.home")}
                  >
                    <span className="text-xl">←</span>
                  </Link>

                  <h1 className="font-display text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Icon name="settings" size={20} /> {t("parent.title")}
                  </h1>

                  <button
                    onClick={() => $auth.logout()}
                    className="flex items-center text-gray-600 hover:text-red-600 transition-colors"
                    title={t("parent.logout")}
                  >
                    <Icon name="power" size={20} />
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
                    icon="baby"
                    label={t("parent.kids")}
                  />
                  <TabLink
                    to="/mode/parent/sync"
                    active={activeTab === "sync"}
                    icon="refresh"
                    label={t("parent.sync")}
                  />
                  <TabLink
                    to="/mode/parent/data"
                    active={activeTab === "data"}
                    icon="download"
                    label={t("parent.backup")}
                  />
                  <TabLink
                    to="/mode/parent/settings"
                    active={activeTab === "settings"}
                    icon="settings"
                    label={t("parent.settings")}
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
      })}
    </Suspense>
  );
}

function TabLink({
  to,
  active,
  icon,
  label,
}: {
  to: string;
  active: boolean;
  icon: import("@/components/Icons").IconName;
  label: string;
}) {
  return (
    <Link
      to={to}
      viewTransition
      className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-1.5 ${
        active
          ? "border-primary-500 text-primary-600"
          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
      }`}
    >
      <Icon name={icon} size={16} />
      {label}
    </Link>
  );
}
