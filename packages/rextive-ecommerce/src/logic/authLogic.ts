import { signal, logic, type ActionContext } from "rextive";
import { authApi } from "@/api/client";
import type { User, LoginCredentials } from "@/api/types";
import { persistLogic } from "./persistLogic";

/**
 * Auth logic - handles user authentication with JWT tokens.
 *
 * Uses `logic()` for:
 * - Automatic signal disposal
 * - Singleton management
 * - Testability via logic.provide() and logic.clear()
 */
export const authLogic = logic("authLogic", () => {
  const { persist } = persistLogic();

  // Core state (signals)
  const token = signal<string | null>(null, {
    name: "auth.token",
    use: [persist("token")], // Auto-loads from localStorage, auto-saves on change
  });
  const user = signal<User | null>(null, { name: "auth.user" });
  const loginModalOpen = signal(false, { name: "auth.loginModalOpen" });
  const isRestoring = signal(false, { name: "auth.isRestoring" });

  // Computed: is authenticated
  const isAuthenticated = user.to((user) => user !== null, {
    name: "auth.isAuthenticated",
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGIN ACTION - mutation pattern with signal.action
  // ═══════════════════════════════════════════════════════════════════════════
  const loginAction = signal.action(
    async (ctx: ActionContext<LoginCredentials>) => {
      const userData = await authApi.login(ctx.payload);

      signal.batch(() => {
        user.set(userData);
        token.set(userData.accessToken);
        loginModalOpen.set(false);
      });

      return userData;
    },
    {
      name: "auth.login",
      onError: (error) => {
        console.error("Login failed:", error);
      },
    }
  );

  // Login helper that dispatches and returns promise
  const login = (credentials: LoginCredentials) => {
    return loginAction.dispatch(credentials);
  };

  const logout = () => {
    signal.batch(() => {
      user.set(null);
      token.set(null);
    });
  };

  const openLoginModal = () => {
    loginModalOpen.set(true);
  };

  const closeLoginModal = () => {
    loginModalOpen.set(false);
  };

  // Try to restore session on init
  const restoreSession = async () => {
    const savedToken = token();
    if (!savedToken) return;

    isRestoring.set(true);
    try {
      const userData = await authApi.getCurrentUser(savedToken);
      user.set(userData);
    } catch {
      // Token invalid or expired, clear it
      token.set(null);
    } finally {
      isRestoring.set(false);
    }
  };

  // Auto-restore on creation (if we have a token from persistor)
  if (token()) {
    restoreSession();
  }

  return {
    // ═══════════════════════════════════════════════════════════════════════════
    // SIGNALS (for UI reactivity and computed signals)
    // ═══════════════════════════════════════════════════════════════════════════

    /** Current logged-in user data (null if not authenticated) */
    user,
    /** JWT access token (auto-persisted to localStorage) */
    token,
    /** Whether login modal is currently shown */
    loginModalOpen,
    /** Whether session restoration from token is in progress */
    isRestoring,
    /** Computed: true when user is authenticated */
    isAuthenticated,

    // ═══════════════════════════════════════════════════════════════════════════
    // LOGIN RESULT (for UI state)
    // ═══════════════════════════════════════════════════════════════════════════

    /** Login result signal - use task.from(loginResult()) in UI for loading/error/value */
    loginResult: loginAction.result,

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Authenticate with username/password credentials */
    login,
    /** Clear user session and token */
    logout,
    /** Show the login modal */
    openLoginModal,
    /** Hide the login modal */
    closeLoginModal,
  };
});
