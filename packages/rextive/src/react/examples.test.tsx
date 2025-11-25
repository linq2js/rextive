import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { rx } from "./rx";
import { disposable } from "../disposable";
import { signal } from "../signal";
import { wait } from "../wait";
import { useScope } from "./useScope";
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
     * Reusable field renderer that handles both sync and async validation
     *
     * @param key - Field identifier for test IDs
     * @param field - Mutable signal for field value
     * @param error - Signal that computes validation errors (sync or async)
     * @param isAsyncValidation - Whether this field uses async validation
     *
     * Key pattern: Uses rx() with two parameters:
     * - First param (values): Awaited/unwrapped values of signals
     * - Second param (loadables): Access to loading/error/success states for async signals
     */
    const renderField = (
      key: string,
      field: MutableSignal<string>,
      error: Signal<void | string | Promise<string | void>>,
      isAsyncValidation: boolean
    ) => {
      return rx({ field, error }, (awaited, loadables) => {
        // Render the input field
        const inputPart = (
          <input
            data-testid={`${key}-field`}
            type="text"
            value={awaited.field}
            onChange={(e) => field.set(e.currentTarget.value)}
          />
        );
        // Render the error message
        let errorPart: React.ReactNode = null;

        if (isAsyncValidation) {
          // For async validation, check loadable status
          if (loadables.error.status === "loading") {
            errorPart = <div data-testid={`${key}-loading`}>Checking...</div>;
          } else if (
            loadables.error.status === "success" &&
            loadables.error.value
          ) {
            errorPart = (
              <span data-testid={`${key}-error`}>
                {String(loadables.error.value)}
              </span>
            );
          }
        } else if (awaited.error) {
          // For sync validation, just use the awaited value
          errorPart = <span data-testid={`${key}-error`}>{awaited.error}</span>;
        }

        return (
          <>
            {inputPart}
            {errorPart}
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
          {renderField("name", fields.name, errors.name, false)}
          {/* Async validation field */}
          {renderField("username", fields.username, errors.username, true)}
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
