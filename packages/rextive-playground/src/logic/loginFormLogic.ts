/**
 * @file loginFormLogic.ts
 * @description Local logic for the parent login form.
 * 
 * This is a LOCAL logic factory - each form instance gets its own state.
 * Handles password input and authentication submission.
 * 
 * @example
 * ```ts
 * const $form = useScope(loginFormLogic);
 * 
 * // Update password
 * $form.state.set(patch({ password: "1234" }));
 * 
 * // Submit login
 * await $form.submit();
 * 
 * // Check for errors
 * if ($form.state().error) {
 *   // Show error message
 * }
 * ```
 */
import { signal } from "rextive";
import { patch } from "rextive/helpers";
import { parentAuthLogic } from "./parentAuthLogic";

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

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Attempts to authenticate with the entered password.
   * Updates error state if authentication fails.
   */
  async function submit() {
    // Set loading state and clear any previous error
    state.set(patch<LoginFormState>({ loading: true, error: "" }));

    try {
      const success = await $auth.login(state().password);
      
      if (!success) {
        // Authentication failed - show error
        state.set(patch<LoginFormState>({ error: "Incorrect password", loading: false }));
      }
      // If successful, parentAuthLogic will update isAuthenticated
      // and the UI will react accordingly
    } catch {
      // Unexpected error
      state.set(patch<LoginFormState>({ error: "Authentication failed", loading: false }));
    }
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  return {
    /** Form state signal */
    state,
    /** Submit login attempt */
    submit,
  };
}
