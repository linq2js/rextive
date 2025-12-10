/**
 * @file parentAuthLogic.ts
 * @description Global logic for parent authentication.
 * 
 * Manages the parent password system that protects access to the parent dashboard.
 * Parents can set up a password, login, logout, and change their password.
 * 
 * Sessions are stored in sessionStorage (cleared when browser closes).
 * 
 * @example
 * ```ts
 * const $auth = parentAuthLogic();
 * 
 * // Check if password is set up
 * if (!wait($auth.isSetup())) {
 *   // Show setup form
 *   await $auth.setup("1234");
 * }
 * 
 * // Login
 * const success = await $auth.login("1234");
 * 
 * // Check if authenticated
 * if ($auth.isAuthenticated()) {
 *   // Show parent dashboard
 * }
 * 
 * // Logout
 * $auth.logout();
 * ```
 */
import { logic, signal, task } from "rextive";
import { parentAuthRepository } from "@/infrastructure/repositories";

/** sessionStorage key for auth session */
const SESSION_KEY = "parent_session";

export const parentAuthLogic = logic("parentAuthLogic", () => {
  // ============================================================================
  // SESSION HELPERS
  // Sessions persist until browser is closed (sessionStorage)
  // ============================================================================

  /**
   * Checks if there's an existing session in storage.
   */
  function hasSession(): boolean {
    return sessionStorage.getItem(SESSION_KEY) === "true";
  }

  /**
   * Saves a session marker to storage.
   */
  function saveSession() {
    sessionStorage.setItem(SESSION_KEY, "true");
  }

  /**
   * Clears the session marker from storage.
   */
  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  // ============================================================================
  // STATE: IS SETUP
  // ============================================================================

  /** Refresh trigger for setup status */
  const [onRefresh, refresh] = signal<void>().tuple;

  /**
   * Async signal that checks if parent password has been set up.
   * Re-fetches when refresh is triggered (e.g., after setup).
   */
  const isSetup = signal({ onRefresh }, async ({ deps }) => {
    void deps.onRefresh; // Access to establish dependency
    return parentAuthRepository.isSetup();
  }, { name: "parentAuth.isSetup" });

  /**
   * Task-wrapped version for sync access to setup status.
   * Defaults to false (not set up).
   */
  const isSetupTask = isSetup.pipe(task(false));

  // ============================================================================
  // STATE: IS AUTHENTICATED
  // ============================================================================

  /**
   * Mutable signal tracking whether the parent is currently logged in.
   * Starts as false, restored from session after isSetup loads.
   */
  const isAuthenticated = signal(false, { name: "parentAuth.isAuthenticated" });

  /**
   * Effect: Restore session when setup status loads.
   * If password is set up AND there's a session, mark as authenticated.
   */
  isSetup.on(() => {
    const setupStatus = isSetupTask().value;
    if (setupStatus && hasSession()) {
      isAuthenticated.set(true);
    }
  });

  // ============================================================================
  // ACTION: SETUP PASSWORD
  // ============================================================================

  /** Tracks the state of the setup action */
  const setupState = signal<Promise<void>>();

  /**
   * Sets up the parent password for the first time.
   * Automatically logs in after successful setup.
   * 
   * @param password - Password to set (should be validated beforehand)
   */
  async function setup(password: string) {
    const promise = (async () => {
    await parentAuthRepository.setup(password);
      refresh(); // Update isSetup status
    isAuthenticated.set(true);
    saveSession();
    })();
    setupState.set(promise);
    return promise;
  }

  // ============================================================================
  // ACTION: LOGIN
  // ============================================================================

  /** Tracks the state of the login action */
  const loginState = signal<Promise<boolean>>();

  /**
   * Attempts to authenticate with the given password.
   * 
   * @param password - Password to verify
   * @returns Promise resolving to true if successful, false otherwise
   */
  async function login(password: string): Promise<boolean> {
    const promise = (async () => {
    const success = await parentAuthRepository.authenticate(password);
    if (success) {
      isAuthenticated.set(true);
      saveSession();
    }
    return success;
    })();
    loginState.set(promise);
    return promise;
  }

  // ============================================================================
  // ACTION: LOGOUT
  // ============================================================================

  /**
   * Logs out the parent.
   * Clears authentication state and session storage.
   */
  function logout() {
    isAuthenticated.set(false);
    clearSession();
  }

  // ============================================================================
  // ACTION: CHANGE PASSWORD
  // ============================================================================

  /** Tracks the state of the change password action */
  const changePasswordState = signal<Promise<boolean>>();

  /**
   * Changes the parent password.
   * Requires current password for verification.
   * 
   * @param currentPassword - Current password for verification
   * @param newPassword - New password to set
   * @returns Promise resolving to true if successful, false if current password wrong
   */
  async function changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    const promise = parentAuthRepository.changePassword(currentPassword, newPassword);
    changePasswordState.set(promise);
    return promise;
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  return {
    // State
    isSetup,
    isSetupTask,
    isAuthenticated,
    
    // Actions with state tracking
    setup: Object.assign(setup, { state: setupState }),
    login: Object.assign(login, { state: loginState }),
    logout,
    changePassword: Object.assign(changePassword, { state: changePasswordState }),
  };
});
