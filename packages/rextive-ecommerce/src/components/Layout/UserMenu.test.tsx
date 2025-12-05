import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/utils";
import { signal } from "rextive";
import { mockLogic } from "rextive/test";
import { UserMenu } from "./UserMenu";
import { authLogic } from "@/logic/authLogic";

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
  const $auth = mockLogic(authLogic);

  beforeEach(() => {
    $auth.default({
      user: signal(null),
      isRestoring: signal(false),
      logout: vi.fn(),
      openLoginModal: vi.fn(),
    });
  });

  afterEach(() => {
    $auth.clear();
  });

  it("should show Sign In button when not authenticated", () => {
    $auth.provide({ user: signal(null), isRestoring: signal(false) });

    render(<UserMenu />);

    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("should show loading state while restoring session", () => {
    $auth.provide({ user: signal(null), isRestoring: signal(true) });

    render(<UserMenu />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should show user name when authenticated", () => {
    $auth.provide({ user: signal(mockUser), isRestoring: signal(false) });

    render(<UserMenu />);

    expect(screen.getByText("Emily")).toBeInTheDocument();
    expect(screen.getByText("Welcome back!")).toBeInTheDocument();
  });

  it("should call openLoginModal when Sign In is clicked", () => {
    const mock = $auth.provide({
      user: signal(null),
      isRestoring: signal(false),
      openLoginModal: vi.fn(),
    });

    render(<UserMenu />);

    fireEvent.click(screen.getByText("Sign In"));

    expect(mock.openLoginModal).toHaveBeenCalledTimes(1);
  });

  it("should call logout when logout button is clicked", () => {
    const mock = $auth.provide({
      user: signal(mockUser),
      isRestoring: signal(false),
      logout: vi.fn(),
    });

    render(<UserMenu />);

    // Find logout button by title
    const logoutButton = screen.getByTitle("Logout");
    fireEvent.click(logoutButton);

    expect(mock.logout).toHaveBeenCalledTimes(1);
  });
});
