/**
 * @file setupPasswordFormLogic.ts
 * @description Local logic for the parent password setup form.
 * 
 * This is a LOCAL logic factory - each form instance gets its own state.
 * Handles password setup for first-time parents, including validation
 * for minimum length and password confirmation matching.
 * 
 * @example
 * ```ts
 * const $form = useScope(setupPasswordFormLogic);
 * 
 * // Update form fields
 * $form.state.set(patch({ password: "1234", confirm: "1234" }));
 * 
 * // Submit to set up password
 * await $form.submit();
 * ```
 */
import { signal } from "rextive";
import { patch } from "rextive/helpers";
import { parentAuthLogic } from "./parentAuth.logic";

/**
 * Setup form state interface.
 */
interface SetupFormState {
  /** Password input value */
  password: string;
  /** Password confirmation input value */
  confirm: string;
  /** Error message (empty if no error) */
  error: string;
  /** Whether form is submitting */
  loading: boolean;
}

/**
 * Creates a logic instance for the password setup form.
 * 
 * @returns Form logic object with state and submit action
 */
export function setupPasswordFormLogic() {
  // ============================================================================
  // DEPENDENCIES
  // ============================================================================

  const $auth = parentAuthLogic();

  // ============================================================================
  // STATE
  // ============================================================================

  /**
   * Form state signal.
   * Tracks password, confirmation, loading state, and errors.
   */
  const state = signal<SetupFormState>(
    {
      password: "",
      confirm: "",
      error: "",
      loading: false,
    },
    { name: "setupPasswordForm.state" }
  );

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Validates and submits the password setup.
   * 
   * Validation rules:
   * - Password must be at least 4 characters
   * - Password and confirm must match
   */
  async function submit() {
    const { password, confirm } = state();

    // Validation: Minimum length
    if (password.length < 4) {
      state.set(patch("error", "Password must be at least 4 characters"));
      return;
    }

    // Validation: Passwords must match
    if (password !== confirm) {
      state.set(patch("error", "Passwords do not match"));
      return;
    }

    // Set loading state and clear any previous error
    state.set(patch<SetupFormState>({ loading: true, error: "" }));

    try {
      // Set up the password via auth logic
      await $auth.setup(password);
      // Success: parentAuthLogic will update isSetup and isAuthenticated
    } catch {
      // Unexpected error
      state.set(
        patch<SetupFormState>({
          error: "Failed to set up password",
          loading: false,
        })
      );
    }
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  return {
    /** Form state signal */
    state,
    /** Submit password setup */
    submit,
  };
}
