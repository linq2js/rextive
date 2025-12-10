// Global logic for parent authentication
import { logic, signal, task } from "rextive";
import { parentAuthRepository } from "@/infrastructure/repositories";

const SESSION_KEY = "parent_session";

export const parentAuthLogic = logic("parentAuthLogic", () => {
  // Check for existing session
  function hasSession(): boolean {
    return sessionStorage.getItem(SESSION_KEY) === "true";
  }

  function saveSession() {
    sessionStorage.setItem(SESSION_KEY, "true");
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  // Trigger for re-checking setup status
  const [onRefresh, refresh] = signal<void>().tuple;

  // isSetup - async signal that loads initially
  const isSetup = signal({ onRefresh }, async ({ deps }) => {
    void deps.onRefresh; // Access to establish dependency
    return parentAuthRepository.isSetup();
  }, { name: "parentAuth.isSetup" });

  // Task-wrapped for sync access
  const isSetupTask = isSetup.pipe(task(false));

  // isAuthenticated - mutable signal, restored from session if password is set up
  const isAuthenticated = signal(false, { name: "parentAuth.isAuthenticated" });

  // Once isSetup loads, restore session if applicable
  isSetup.on(() => {
    const setupStatus = isSetupTask().value;
    if (setupStatus && hasSession()) {
      isAuthenticated.set(true);
    }
  });

  // Action state for setup
  const setupState = signal<Promise<void>>();
  async function setup(password: string) {
    const promise = (async () => {
      await parentAuthRepository.setup(password);
      refresh();
      isAuthenticated.set(true);
      saveSession();
    })();
    setupState.set(promise);
    return promise;
  }

  // Action state for login
  const loginState = signal<Promise<boolean>>();
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

  function logout() {
    isAuthenticated.set(false);
    clearSession();
  }

  // Action state for changePassword
  const changePasswordState = signal<Promise<boolean>>();
  async function changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    const promise = parentAuthRepository.changePassword(currentPassword, newPassword);
    changePasswordState.set(promise);
    return promise;
  }

  return {
    isSetup,
    isSetupTask,
    isAuthenticated,
    setup: Object.assign(setup, { state: setupState }),
    login: Object.assign(login, { state: loginState }),
    logout,
    changePassword: Object.assign(changePassword, { state: changePasswordState }),
  };
});
