import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@/test/utils";
import { logic, signal } from "rextive";
import { UserMenu } from "./UserMenu";
import { authLogic } from "@/logic/auth";

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

describe("UserMenu", () => {
  afterEach(() => {
    logic.clear();
  });

  const setupAuthLogic = (overrides = {}) => {
    const instance = {
      user: signal(null),
      isRestoring: signal(false),
      logout: vi.fn(),
      openLoginModal: vi.fn(),
      ...overrides,
    };
    // Use type assertion for partial mock
    logic.provide(authLogic as any, () => instance);
    return instance;
  };

  it("should show Sign In button when not authenticated", () => {
    setupAuthLogic({ user: signal(null), isRestoring: signal(false) });

    render(<UserMenu />);

    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("should show loading state while restoring session", () => {
    setupAuthLogic({ user: signal(null), isRestoring: signal(true) });

    render(<UserMenu />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should show user name when authenticated", () => {
    setupAuthLogic({ user: signal(mockUser), isRestoring: signal(false) });

    render(<UserMenu />);

    expect(screen.getByText("Emily")).toBeInTheDocument();
    expect(screen.getByText("Welcome back!")).toBeInTheDocument();
  });

  it("should call openLoginModal when Sign In is clicked", () => {
    const auth = setupAuthLogic({
      user: signal(null),
      isRestoring: signal(false),
    });

    render(<UserMenu />);

    fireEvent.click(screen.getByText("Sign In"));

    expect(auth.openLoginModal).toHaveBeenCalledTimes(1);
  });

  it("should call logout when logout button is clicked", () => {
    const auth = setupAuthLogic({
      user: signal(mockUser),
      isRestoring: signal(false),
    });

    render(<UserMenu />);

    // Find logout button by title
    const logoutButton = screen.getByTitle("Logout");
    fireEvent.click(logoutButton);

    expect(auth.logout).toHaveBeenCalledTimes(1);
  });
});
