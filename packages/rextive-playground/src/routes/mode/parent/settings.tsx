import { createFileRoute } from "@tanstack/react-router";
import { signal } from "rextive";
import { patch } from "rextive/helpers";
import { rx, useScope, inputValue } from "rextive/react";
import { focus } from "rextive/op";
import { parentAuthLogic } from "@/logic";

export const Route = createFileRoute("/mode/parent/settings")({
  component: SettingsTab,
});

interface ChangePasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  loading: boolean;
  error: string;
  success: boolean;
}

function changePasswordFormLogic() {
  const $auth = parentAuthLogic();

  const state = signal<ChangePasswordFormState>(
    {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      loading: false,
      error: "",
      success: false,
    },
    { name: "changePassword.state" }
  );

  async function submit() {
    const { currentPassword, newPassword, confirmPassword } = state();

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      state.set(patch("error", "All fields are required"));
      return;
    }

    if (newPassword.length < 4) {
      state.set(patch("error", "New password must be at least 4 characters"));
      return;
    }

    if (newPassword !== confirmPassword) {
      state.set(patch("error", "New passwords do not match"));
      return;
    }

    state.set(patch<ChangePasswordFormState>({ loading: true, error: "", success: false }));

    try {
      const success = await $auth.changePassword(currentPassword, newPassword);

      if (success) {
        state.set({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
          loading: false,
          error: "",
          success: true,
        });
      } else {
        state.set(patch<ChangePasswordFormState>({ loading: false, error: "Current password is incorrect" }));
      }
    } catch {
      state.set(patch<ChangePasswordFormState>({ loading: false, error: "Failed to change password" }));
    }
  }

  function reset() {
    state.set({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      loading: false,
      error: "",
      success: false,
    });
  }

  return { state, submit, reset };
}

function SettingsTab() {
  const $form = useScope(changePasswordFormLogic);

  return (
    <div className="space-y-6">
      {/* Change Password Card */}
      <div className="card">
        <h3 className="font-display text-lg font-semibold text-gray-800 mb-4">
          🔐 Change Password
        </h3>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            $form.submit();
          }}
          className="space-y-4"
        >
          {/* Success Message */}
          {rx(() => {
            const success = $form.state().success;
            return success ? (
              <div className="p-3 rounded-xl bg-green-100 text-green-800 text-center font-medium animate-pop">
                ✅ Password changed successfully!
              </div>
            ) : null;
          })}

          {/* Current Password */}
          {rx(() => {
            const [get, set] = focus
              .lens($form.state, "currentPassword")
              .map(inputValue);
            return (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Current Password
                </label>
                <input
                  type="password"
                  value={get()}
                  onChange={set}
                  className="input"
                  placeholder="Enter current password"
                  autoComplete="current-password"
                />
              </div>
            );
          })}

          {/* New Password */}
          {rx(() => {
            const [get, set] = focus
              .lens($form.state, "newPassword")
              .map(inputValue);
            return (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <input
                  type="password"
                  value={get()}
                  onChange={set}
                  className="input"
                  placeholder="Enter new password"
                  autoComplete="new-password"
                />
              </div>
            );
          })}

          {/* Confirm New Password */}
          {rx(() => {
            const [get, set] = focus
              .lens($form.state, "confirmPassword")
              .map(inputValue);
            return (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={get()}
                  onChange={set}
                  className="input"
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
              </div>
            );
          })}

          {/* Error Message */}
          {rx(() => {
            const error = $form.state().error;
            return error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : null;
          })}

          {/* Submit Button */}
          {rx(() => (
            <button
              type="submit"
              disabled={$form.state().loading}
              className="btn btn-primary w-full py-3"
            >
              {$form.state().loading ? "Changing..." : "Change Password"}
            </button>
          ))}
        </form>
      </div>

      {/* Security Tips */}
      <div className="card bg-blue-50">
        <h4 className="font-display font-semibold text-gray-800 mb-2">
          💡 Security Tips
        </h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Use a password that's easy for you to remember</li>
          <li>• Don't share your password with your kids</li>
          <li>• Change your password if you suspect it's compromised</li>
        </ul>
      </div>
    </div>
  );
}

