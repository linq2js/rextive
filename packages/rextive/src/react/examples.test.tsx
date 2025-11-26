import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { disposable } from "../disposable";
import { signal } from "../signal";
import { wait } from "../wait";
import { loadable } from "../utils/loadable";
import { useScope } from "./useScope";
import { rx } from "./rx";
import { MutableSignal, Signal } from "../types";

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
      field: MutableSignal<string>;
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
});
