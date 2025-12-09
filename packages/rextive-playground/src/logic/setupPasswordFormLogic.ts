// Local logic for setup password form
import { signal } from "rextive";
import { patch } from "rextive/helpers";
import { parentAuthLogic } from "./parentAuthLogic";

interface SetupFormState {
  password: string;
  confirm: string;
  error: string;
  loading: boolean;
}

export function setupPasswordFormLogic() {
  const $auth = parentAuthLogic();

  const state = signal<SetupFormState>(
    {
      password: "",
      confirm: "",
      error: "",
      loading: false,
    },
    { name: "setupPasswordForm.state" }
  );

  async function submit() {
    const { password, confirm } = state();

    if (password.length < 4) {
      state.set(patch("error", "Password must be at least 4 characters"));
      return;
    }

    if (password !== confirm) {
      state.set(patch("error", "Passwords do not match"));
      return;
    }

    state.set(patch<SetupFormState>({ loading: true, error: "" }));

    try {
      await $auth.setup(password);
    } catch {
      state.set(
        patch<SetupFormState>({
          error: "Failed to set up password",
          loading: false,
        })
      );
    }
  }

  return {
    state,
    submit,
  };
}
