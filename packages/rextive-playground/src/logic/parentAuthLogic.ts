// Global logic for parent authentication
import { logic, signal } from "rextive";
import { parentAuthRepository } from "@/infrastructure/repositories";

const SESSION_KEY = "parent_session";

export const parentAuthLogic = logic("parentAuthLogic", () => {
  const isSetup = signal<boolean | null>(null, { name: "parentAuth.isSetup" });
  const isAuthenticated = signal(false, { name: "parentAuth.isAuthenticated" });
  const isLoading = signal(true, { name: "parentAuth.isLoading" });

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

  // Initialize on creation
  parentAuthRepository.isSetup().then((result) => {
    isSetup.set(result);
    // Restore session if exists and password is set up
    if (result && hasSession()) {
      isAuthenticated.set(true);
    }
    isLoading.set(false);
  });

  async function setup(password: string) {
    await parentAuthRepository.setup(password);
    isSetup.set(true);
    isAuthenticated.set(true);
    saveSession();
  }

  async function login(password: string): Promise<boolean> {
    const success = await parentAuthRepository.authenticate(password);
    if (success) {
      isAuthenticated.set(true);
      saveSession();
    }
    return success;
  }

  function logout() {
    isAuthenticated.set(false);
    clearSession();
  }

  return {
    isSetup,
    isAuthenticated,
    isLoading,
    setup,
    login,
    logout,
  };
});

