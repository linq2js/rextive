/**
 * @file loginFormLogic.ts
 * @description Local logic for the parent login form.
 *
 * This is a LOCAL logic factory - each form instance gets its own state.
 * Handles password input and authentication submission.
 *
 * Uses focus.lens multi-lens for typed getter/setter access to form fields.
 *
 * @example
 * ```ts
 * const $form = useScope(loginFormLogic);
 *
 * // Update password with typed setter
 * $form.setPassword("1234");
 *
 * // Submit login
 * await $form.submit();
 *
 * // Check for errors with typed getter
 * if ($form.getError()) {
 *   // Show error message
 * }
 * ```
 */
import { signal } from "rextive";
import { focus } from "rextive/op";
import { parentAuthLogic } from "./parentAuth.logic";

/**
 * Login form state interface.
 */
interface LoginFormState {
  /** Password input value */
  password: string;
  /** Error message (empty if no error) */
  error: string;
  /** Whether form is submitting */
  loading: boolean;
}

/**
 * Creates a logic instance for the login form.
 *
 * @returns Form logic object with state and submit action
 */
export function loginFormLogic() {
  // ============================================================================
  // DEPENDENCIES
  // ============================================================================

  const $auth = parentAuthLogic();

  // ============================================================================
  // STATE
  // ============================================================================

  /**
   * Form state signal.
   * Tracks password input, loading state, and error messages.
   */
  const state = signal<LoginFormState>(
    {
      password: "",
      error: "",
      loading: false,
    },
    { name: "loginForm.state" }
  );

  // Create typed accessors for all form fields using multi-lens
  const fields = focus.lens(state, {
    password: "password",
    error: "error",
    loading: "loading",
  });

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Attempts to authenticate with the entered password.
   * Updates error state if authentication fails.
   */
  async function submit() {
    // Set loading state and clear any previous error
    fields.setLoading(true);
    fields.setError("");

    try {
      const success = await $auth.login(fields.getPassword());

      if (!success) {
        // Authentication failed - show error
        fields.setError("Incorrect password");
        fields.setLoading(false);
      }
      // If successful, parentAuthLogic will update isAuthenticated
      // and the UI will react accordingly
    } catch {
      // Unexpected error
      fields.setError("Authentication failed");
      fields.setLoading(false);
    }
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  return {
    /** Form state signal (for full state access) */
    state,
    /** Get password value */
    getPassword: fields.getPassword,
    /** Set password value */
    setPassword: fields.setPassword,
    /** Get error message */
    getError: fields.getError,
    /** Get loading state */
    getLoading: fields.getLoading,
    /** Submit login attempt */
    submit,
  };
}
