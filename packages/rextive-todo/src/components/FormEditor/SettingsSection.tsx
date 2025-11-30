/**
 * Settings section using focus operator for nested object
 */
import { rx, useScope } from "rextive/react";
import { focus } from "rextive/op";
import { disposable } from "rextive";
import { useFormContext } from "../../store/formStore";

export function SettingsSection() {
  const { formData } = useFormContext();

  // Focus on nested settings properties
  const { enableNotifications, notificationEmail, visibility } = useScope(() =>
    disposable({
      enableNotifications: formData.pipe(focus("settings.enableNotifications")),
      notificationEmail: formData.pipe(
        focus("settings.notificationEmail", () => "")
      ),
      visibility: formData.pipe(focus("settings.visibility")),
    })
  );

  return (
    <div className="settings-section">
      {/* Enable Notifications - Switch */}
      <div className="settings-toggle-row">
        {rx(() => (
          <label className="config-toggle">
            <input
              type="checkbox"
              checked={enableNotifications()}
              onChange={(e) => enableNotifications.set(e.target.checked)}
            />
            <span className="toggle-slider" />
            <span className="toggle-label">🔔 Enable Notifications</span>
          </label>
        ))}
      </div>

      {rx(() =>
        enableNotifications() ? (
          <div className="settings-expanded-field">
            <div className="form-field">
              <label>Notification Email</label>
              <input
                type="email"
                value={notificationEmail()}
                onChange={(e) => notificationEmail.set(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
          </div>
        ) : null
      )}

      {/* Visibility */}
      <div className="form-field">
        <label>Visibility</label>
        {rx(() => (
          <select
            value={visibility()}
            onChange={(e) =>
              visibility.set(e.target.value as "private" | "team" | "public")
            }
          >
            <option value="private">🔒 Private</option>
            <option value="team">👥 Team</option>
            <option value="public">🌍 Public</option>
          </select>
        ))}
      </div>
    </div>
  );
}
