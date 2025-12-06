import { describe, it, expect, beforeEach, vi } from "vitest";
import { logic, task } from "rextive";
import { authLogic } from "./authLogic";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(global, "localStorage", { value: localStorageMock });

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock user data
const mockUser = {
  id: 1,
  username: "emilys",
  email: "emily@example.com",
  firstName: "Emily",
  lastName: "Smith",
  gender: "female",
  image: "https://example.com/avatar.jpg",
  accessToken: "test-token",
  refreshToken: "test-refresh-token",
};

describe("authLogic", () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null);
    mockFetch.mockReset();
    logic.clear();
  });

  it("should start with no user", () => {
    const auth = authLogic.create();

    expect(auth.user()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
  });

  it("should login successfully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUser),
    });

    const auth = authLogic.create();

    await auth.login({ username: "emilys", password: "emilyspass" });

    expect(auth.user()).toEqual(mockUser);
    expect(auth.token()).toBe("test-token");
    expect(auth.isAuthenticated()).toBe(true);
  });

  it("should set login error on failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: "Invalid credentials" }),
    });

    const auth = authLogic.create();

    await expect(
      auth.login({ username: "wrong", password: "wrong" })
    ).rejects.toThrow();

    expect(auth.user()).toBeNull();

    // Use task.from() to check error state
    const state = task.from(auth.loginResult());
    expect(state.error).toBeInstanceOf(Error);
    expect((state.error as Error).message).toBe("Invalid credentials");
  });

  it("should logout and clear state", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUser),
    });

    const auth = authLogic.create();

    await auth.login({ username: "emilys", password: "emilyspass" });
    expect(auth.user()).not.toBeNull();

    auth.logout();

    expect(auth.user()).toBeNull();
    expect(auth.token()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
  });

  it("should open and close login modal", () => {
    const auth = authLogic.create();

    expect(auth.loginModalOpen()).toBe(false);

    auth.openLoginModal();
    expect(auth.loginModalOpen()).toBe(true);

    auth.closeLoginModal();
    expect(auth.loginModalOpen()).toBe(false);
  });

  it("should have no error initially", () => {
    const auth = authLogic.create();

    // Before any login attempt, loginResult has no error
    const state = task.from(auth.loginResult());
    expect(state.error).toBeUndefined();
  });

  it("should show loading state during login", async () => {
    let resolveLogin: (value: unknown) => void;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });

    mockFetch.mockReturnValueOnce({
      ok: true,
      json: () => loginPromise,
    });

    const auth = authLogic.create();

    const loginCall = auth.login({ username: "emilys", password: "pass" });

    // Use task.from() to check loading state
    const loadingState = task.from(auth.loginResult());
    expect(loadingState.loading).toBe(true);

    resolveLogin!(mockUser);
    await loginCall;

    // After completion, loading is false
    const doneState = task.from(auth.loginResult());
    expect(doneState.loading).toBe(false);
  });

  it("should close modal after successful login", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUser),
    });

    const auth = authLogic.create();

    auth.openLoginModal();
    expect(auth.loginModalOpen()).toBe(true);

    await auth.login({ username: "emilys", password: "pass" });

    expect(auth.loginModalOpen()).toBe(false);
  });
});
