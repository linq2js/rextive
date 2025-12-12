import { createFileRoute } from "@tanstack/react-router";
import { signal } from "rextive";
import { patch } from "rextive/helpers";
import { rx, useScope, inputValue } from "rextive/react";
import { focus } from "rextive/op";
import { parentAuthLogic } from "@/logic";
import { Icon } from "@/components/Icons";
import { useTranslation } from "@/i18n";

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

    // Validation - errors will be translated in the component
    if (!currentPassword || !newPassword || !confirmPassword) {
      state.set(patch("error", "allFieldsRequired"));
      return;
    }

    if (newPassword.length < 4) {
      state.set(patch("error", "passwordMinLength"));
      return;
    }

    if (newPassword !== confirmPassword) {
      state.set(patch("error", "passwordsDoNotMatch"));
      return;
    }

    state.set(
      patch<ChangePasswordFormState>({
        loading: true,
        error: "",
        success: false,
      })
    );

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
        state.set(
          patch<ChangePasswordFormState>({
            loading: false,
            error: "currentPasswordIncorrect",
          })
        );
      }
    } catch {
      state.set(
        patch<ChangePasswordFormState>({
          loading: false,
          error: "failedToChangePassword",
        })
      );
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
  const { t } = useTranslation();

  // Helper to translate error codes
  const translateError = (error: string) => {
    const errorMap: Record<string, string> = {
      allFieldsRequired: t("parent.allFieldsRequired"),
      passwordMinLength: t("parent.passwordMinLength"),
      passwordsDoNotMatch: t("parent.passwordsDoNotMatch"),
      currentPasswordIncorrect: t("parent.currentPasswordIncorrect"),
      failedToChangePassword: t("parent.failedToChangePassword"),
    };
    return errorMap[error] || error;
  };

  return (
    <div className="space-y-6">
      {/* Change Password Card */}
      <div className="card">
        <h3 className="font-display text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Icon name="lock" size={20} className="text-gray-600" /> {t("parent.changePassword")}
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
              <div className="p-3 rounded-xl bg-green-100 text-green-800 text-center font-medium animate-pop flex items-center justify-center gap-2">
                <Icon name="check" size={18} /> {t("parent.passwordChangedSuccessfully")}
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
                  {t("parent.currentPassword")}
                </label>
                <input
                  type="password"
                  value={get()}
                  onChange={set}
                  className="input"
                  placeholder={t("parent.currentPassword")}
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
                  {t("parent.newPassword")}
                </label>
                <input
                  type="password"
                  value={get()}
                  onChange={set}
                  className="input"
                  placeholder={t("parent.newPassword")}
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
                  {t("parent.confirmNewPassword")}
                </label>
                <input
                  type="password"
                  value={get()}
                  onChange={set}
                  className="input"
                  placeholder={t("parent.confirmNewPassword")}
                  autoComplete="new-password"
                />
              </div>
            );
          })}

          {/* Error Message */}
          {rx(() => {
            const error = $form.state().error;
            return error ? (
              <p className="text-sm text-red-500">{translateError(error)}</p>
            ) : null;
          })}

          {/* Submit Button */}
          {rx(() => (
            <button
              type="submit"
              disabled={$form.state().loading}
              className="btn btn-primary w-full py-3"
            >
              {$form.state().loading ? t("parent.changing") : t("parent.changePassword")}
            </button>
          ))}
        </form>
      </div>

      {/* Security Tips */}
      <div className="card bg-blue-50">
        <h4 className="font-display font-semibold text-gray-800 mb-2">
          {t("parent.securityTips")}
        </h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• {t("parent.securityTip1")}</li>
          <li>• {t("parent.securityTip2")}</li>
          <li>• {t("parent.securityTip3")}</li>
        </ul>
      </div>
    </div>
  );
}
