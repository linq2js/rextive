import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { disposable } from "../disposable";
import { signal } from "../signal";
import { wait } from "../wait";
import { loadable } from "../utils/loadable";
import { useScope } from "./useScope";
import { rx } from "./rx";
import { Mutable, Signal, Computed } from "../types";

describe("examples", () => {
  it("form validation", async () => {
    // Mock database of existing usernames for validation
    const existingUsernames = ["testuser", "testuser2", "admin"];

    // Factory function that creates form fields and validation
    const createForm = () => {
      // Create reactive signals for form fields
      const fields = {
        name: signal(""),
        username: signal(""),
      } as const;

      // Create computed signals for field validation
      // Each error signal derives from its corresponding field signal
      const errors = {
        // Sync validation: name field
        name: fields.name.to((value) => {
          if (value.length === 0) {
            return "Name is required";
          }
          return undefined;
        }),

        // Async validation: username field
        // Uses safe() to handle abortion if user changes input during validation
        username: fields.username.to(async (value, { safe }) => {
          if (value.length === 0) {
            return "Username is required";
          }

          // Simulate async validation (e.g., API call to check username availability)
          // safe() ensures this never resolves if the signal is aborted
          await safe(wait.delay(10));

          if (existingUsernames.includes(value)) {
            return "Username already exists";
          }

          return undefined;
        }),
      } as const;

      return {
        fields,
        errors,
        dispose: disposable([fields, errors]).dispose,
      };
    };

    /**
     * Reusable field component that handles both sync and async validation
     *
     * Key pattern: Uses rx(() => ...) with loadable() for:
     * - Reading signal values directly with field()
     * - Access to loading/error/success states via loadable()
     */
    const Field = ({
      testKey,
      field,
      validation,
    }: {
      testKey: string;
      field: Mutable<string>;
      validation: Signal<void | string | Promise<string | void>>;
    }) => {
      return rx(() => {
        const fieldValue = field();
        const validationState = loadable(validation());

        return (
          <>
            <input
              data-testid={`${testKey}-field`}
              type="text"
              value={fieldValue}
              onChange={(e) => field.set(e.currentTarget.value)}
            />
            {validationState.loading ? (
              <div data-testid={`${testKey}-loading`}>Checking...</div>
            ) : validationState.value || validationState.error ? (
              <div data-testid={`${testKey}-error`}>
                {String(validationState.value || validationState.error)}
              </div>
            ) : null}
          </>
        );
      });
    };

    // Form component using useScope for automatic cleanup
    const Form = () => {
      const { fields, errors } = useScope(createForm);

      return (
        <>
          {/* Sync validation field */}
          <Field testKey="name" field={fields.name} validation={errors.name} />
          {/* Async validation field */}
          <Field
            testKey="username"
            field={fields.username}
            validation={errors.username}
          />
        </>
      );
    };

    // === TEST: Initial state ===
    render(<Form />);

    // Name field should be empty with validation error
    expect(screen.getByTestId("name-field")).toHaveAttribute("type", "text");
    expect(screen.getByTestId("name-field")).toHaveValue("");
    expect(screen.getByTestId("name-error")).toHaveTextContent(
      "Name is required"
    );

    // === TEST: Sync validation clears error when valid ===
    const nameField = screen.getByTestId("name-field");
    fireEvent.change(nameField, { target: { value: "John" } });
    expect(screen.queryByTestId("name-error")).toBeNull();

    // === TEST: Async validation with loading state ===
    expect(screen.getByTestId("username-field")).toHaveAttribute(
      "type",
      "text"
    );
    expect(screen.getByTestId("username-field")).toHaveValue("");

    // Type a username that exists in the database
    const usernameField = screen.getByTestId("username-field");
    fireEvent.change(usernameField, { target: { value: "admin" } });

    // Should show loading state while async validation is running
    expect(screen.getByTestId("username-loading")).toHaveTextContent(
      "Checking..."
    );

    // Wait for async validation to complete
    await waitFor(() => {
      expect(screen.queryByTestId("username-loading")).toBeNull();
    });

    // Should show error for existing username
    expect(screen.getByTestId("username-error")).toHaveTextContent(
      "Username already exists"
    );
  });

  it("error handling with refresh (async signal)", async () => {
    // Mock Math.random to control error behavior
    let shouldError = true;
    vi.spyOn(Math, "random").mockImplementation(() => {
      // Return > 0.5 to trigger error when shouldError is true
      return shouldError ? 0.8 : 0.3;
    });

    // Factory function that creates the maybe-error signal
    const createMaybeErrorSignal = () => {
      const maybeError = signal(async ({ safe }) => {
        // Simulate async operation
        await safe(wait.delay(1000));

        const random = Math.random() * 100;

        if (random > 50) {
          throw new Error("Something went wrong");
        }

        return random;
      });

      return {
        maybeError,
        dispose: maybeError.dispose,
      };
    };

    /**
     * Error Demo Component (Async)
     *
     * Demonstrates:
     * - Using loadable() for loading/error/success states
     * - Refresh button to retry the operation
     *
     * Note: For async signals, use loadable() to handle Promise states.
     * signal.error() and signal.tryGet() check the signal's internal state,
     * which is the Promise itself for async signals.
     */
    const ErrorDemo = () => {
      const { maybeError } = useScope(createMaybeErrorSignal);

      return rx(() => {
        const state = loadable(maybeError);

        return (
          <div>
            {state.loading && <div data-testid="loading">Loading...</div>}

            {state.error ? (
              <div data-testid="error" style={{ color: "red" }}>
                ⚠️ {String(state.error)}
              </div>
            ) : null}

            {state.status === "success" && (
              <div data-testid="value">Value: {state.value.toFixed(2)}</div>
            )}

            <button
              data-testid="refresh-btn"
              onClick={() => maybeError.refresh()}
            >
              Refresh
            </button>
          </div>
        );
      });
    };

    // === TEST: Initial loading state ===
    render(<ErrorDemo />);
    expect(screen.getByTestId("loading")).toHaveTextContent("Loading...");

    // === TEST: Error state after async completes ===
    await waitFor(() => {
      expect(screen.queryByTestId("loading")).toBeNull();
    });

    // Should show error (Math.random returns 0.8 * 100 = 80 > 50)
    expect(screen.getByTestId("error")).toHaveTextContent(
      "Something went wrong"
    );

    // === TEST: Refresh and success ===
    shouldError = false; // Make next call succeed

    // Click refresh button
    fireEvent.click(screen.getByTestId("refresh-btn"));

    // Should show loading again
    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("Loading...");
    });

    // Wait for success
    await waitFor(() => {
      expect(screen.queryByTestId("loading")).toBeNull();
    });

    // Should show value (Math.random returns 0.3 * 100 = 30 < 50)
    expect(screen.getByTestId("value")).toHaveTextContent("Value: 30.00");

    // Restore Math.random
    vi.mocked(Math.random).mockRestore();
  });

  it("error handling with sync signal (signal.error and signal.tryGet)", () => {
    // Factory function that creates a sync signal that may throw
    const createSyncErrorSignal = () => {
      const trigger = signal(0);
      const maybeError = signal({ trigger }, ({ deps }) => {
        if (deps.trigger > 50) {
          throw new Error("Value too high!");
        }
        return deps.trigger * 2;
      });

      return {
        trigger,
        maybeError,
        dispose: disposable([trigger, maybeError]).dispose,
      };
    };

    /**
     * Error Demo Component (Sync)
     *
     * Demonstrates:
     * - Using signal.error() to check error state
     * - Using signal.tryGet() for safe value access without throwing
     * - Both methods properly track the signal for reactivity
     */
    const SyncErrorDemo = () => {
      const { trigger, maybeError } = useScope(createSyncErrorSignal);

      return rx(() => {
        const err = maybeError.error();
        const value = maybeError.tryGet();

        return (
          <div>
            <input
              data-testid="input"
              type="number"
              value={trigger()}
              onChange={(e) => trigger.set(Number(e.target.value))}
            />

            {err ? (
              <div data-testid="error" style={{ color: "red" }}>
                ⚠️ {String(err)}
              </div>
            ) : (
              <div data-testid="value">Value: {value}</div>
            )}

            <div data-testid="has-error">{err ? "Has Error" : "No Error"}</div>
            <div data-testid="try-get-result">
              {value !== undefined ? `TryGet: ${value}` : "TryGet: undefined"}
            </div>
          </div>
        );
      });
    };

    // === TEST: Initial state (no error) ===
    render(<SyncErrorDemo />);
    expect(screen.getByTestId("value")).toHaveTextContent("Value: 0");
    expect(screen.getByTestId("has-error")).toHaveTextContent("No Error");
    expect(screen.getByTestId("try-get-result")).toHaveTextContent("TryGet: 0");

    // === TEST: Valid value ===
    fireEvent.change(screen.getByTestId("input"), { target: { value: "25" } });
    expect(screen.getByTestId("value")).toHaveTextContent("Value: 50");
    expect(screen.getByTestId("has-error")).toHaveTextContent("No Error");
    expect(screen.getByTestId("try-get-result")).toHaveTextContent(
      "TryGet: 50"
    );

    // === TEST: Error state ===
    fireEvent.change(screen.getByTestId("input"), { target: { value: "60" } });
    expect(screen.getByTestId("error")).toHaveTextContent("Value too high!");
    expect(screen.getByTestId("has-error")).toHaveTextContent("Has Error");
    expect(screen.getByTestId("try-get-result")).toHaveTextContent(
      "TryGet: undefined"
    );

    // === TEST: Recovery from error ===
    fireEvent.change(screen.getByTestId("input"), { target: { value: "10" } });
    expect(screen.getByTestId("value")).toHaveTextContent("Value: 20");
    expect(screen.getByTestId("has-error")).toHaveTextContent("No Error");
    expect(screen.getByTestId("try-get-result")).toHaveTextContent(
      "TryGet: 20"
    );
  });
});
