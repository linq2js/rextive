import { signal, logic } from "rextive";
import { authApi } from "@/api/client";
import type { User, LoginCredentials } from "@/api/types";

// Helper to get/set token from localStorage
const tokenStorage = {
  get: (): string | null => {
    try {
      return localStorage.getItem("auth_token");
    } catch {
      return null;
    }
  },
  set: (token: string | null) => {
    try {
      if (token) {
        localStorage.setItem("auth_token", token);
      } else {
        localStorage.removeItem("auth_token");
      }
    } catch {
      // Ignore storage errors
    }
  },
};

/**
 * Auth logic - handles user authentication with JWT tokens.
 *
 * Uses `logic()` for:
 * - Automatic signal disposal
 * - Singleton management
 * - Testability via logic.provide() and logic.clear()
 */
export const authLogic = logic("authLogic", () => {
  // Load initial token from storage
  const initialToken = tokenStorage.get();

  // Core state (signals)
  const token = signal<string | null>(initialToken, {
    name: "auth.token",
    onChange: tokenStorage.set, // Auto-save on change
  });
  const user = signal<User | null>(null, { name: "auth.user" });
  const loginModalOpen = signal(false, { name: "auth.loginModalOpen" });
  const loginError = signal<string | null>(null, { name: "auth.loginError" });
  const isLoggingIn = signal(false, { name: "auth.isLoggingIn" });
  const isRestoring = signal(false, { name: "auth.isRestoring" });

  // Computed: is authenticated
  const isAuthenticated = user.to((user) => user !== null, {
    name: "auth.isAuthenticated",
  });

  // Actions
  const login = async (credentials: LoginCredentials) => {
    loginError.set(null);
    isLoggingIn.set(true);

    try {
      const userData = await authApi.login(credentials);
      signal.batch(() => {
        user.set(userData);
        token.set(userData.accessToken);
        loginModalOpen.set(false);
      });
    } catch (err) {
      loginError.set(err instanceof Error ? err.message : "Login failed");
      throw err;
    } finally {
      isLoggingIn.set(false);
    }
  };

  const logout = () => {
    signal.batch(() => {
      user.set(null);
      token.set(null);
    });
  };

  const openLoginModal = () => {
    loginError.set(null);
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

  // Auto-restore on creation (if we have a token)
  if (initialToken) {
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
    /** Error message from last login attempt (null on success) */
    loginError,
    /** Whether a login request is in progress */
    isLoggingIn,
    /** Whether session restoration from token is in progress */
    isRestoring,
    /** Computed: true when user is authenticated */
    isAuthenticated,

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
