// Local logic for login form
import { signal } from "rextive";
import { parentAuthLogic } from "./parentAuthLogic";

interface LoginFormState {
  password: string;
  error: string;
  loading: boolean;
}

export function loginFormLogic() {
  const $auth = parentAuthLogic();

  const state = signal<LoginFormState>(
    {
      password: "",
      error: "",
      loading: false,
    },
    { name: "loginForm.state" }
  );

  async function submit() {
    state.set((s) => ({ ...s, loading: true, error: "" }));

    try {
      const success = await $auth.login(state().password);
      if (!success) {
        state.set((s) => ({
          ...s,
          error: "Incorrect password",
          loading: false,
        }));
      }
    } catch {
      state.set((s) => ({
        ...s,
        error: "Authentication failed",
        loading: false,
      }));
    }
  }

  return {
    state,
    submit,
  };
}
