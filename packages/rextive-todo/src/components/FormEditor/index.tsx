/**
 * FormEditor - Complex form editor demo using focus operator
 */
import { rx, useScope } from "rextive/react";
import { disposable } from "rextive";
import { focus } from "rextive/op";
import { FormContextProvider, useFormContext } from "../../store/formStore";
import { defaultFormModel, defaultFormConfig } from "../../types/form";
import { BasicFields } from "./BasicFields";
import { SettingsSection } from "./SettingsSection";
import { TagsEditor } from "./TagsEditor";
import { ContactsEditor } from "./ContactsEditor";
import "./FormEditor.css";

function FormEditorContent() {
  const { formConfig } = useFormContext();

  // Focus on config options
  const config = useScope(() => {
    console.log("FormEditorContent scope created");
    return disposable({
      enableDescription: formConfig.pipe(focus("enableDescription")),
      enableEffectiveDate: formConfig.pipe(focus("enableEffectiveDate")),
      enableBudget: formConfig.pipe(focus("enableBudget")),
      enableMetadata: formConfig.pipe(focus("enableMetadata")),
    });
  });

  return (
    <div className="form-editor">
      {/* Form Fields - Full Width */}
      <div className="form-fields-grid">
        {/* Row 1: Basic Info + Optional Fields */}
        <section className="form-section">
          <h4 className="form-section-title">📋 Basic Information</h4>
          <BasicFields />
        </section>

        <div className="optional-fields-group">
          {/* Optional: Description */}
          <div className="optional-field-toggle">
            {rx(() => (
              <label className="config-toggle">
                <input
                  type="checkbox"
                  checked={config.enableDescription()}
                  onChange={(e) =>
                    config.enableDescription.set(e.target.checked)
                  }
                />
                <span className="toggle-slider" />
                <span className="toggle-label">📝 Description</span>
              </label>
            ))}
            {rx(() =>
              config.enableDescription() ? <DescriptionField /> : null
            )}
          </div>

          {/* Optional: Effective Date */}
          <div className="optional-field-toggle">
            {rx(() => (
              <label className="config-toggle">
                <input
                  type="checkbox"
                  checked={config.enableEffectiveDate()}
                  onChange={(e) =>
                    config.enableEffectiveDate.set(e.target.checked)
                  }
                />
                <span className="toggle-slider" />
                <span className="toggle-label">📅 Effective Date</span>
              </label>
            ))}
            {rx(() =>
              config.enableEffectiveDate() ? <EffectiveDateField /> : null
            )}
          </div>

          {/* Optional: Budget */}
          <div className="optional-field-toggle">
            {rx(() => (
              <label className="config-toggle">
                <input
                  type="checkbox"
                  checked={config.enableBudget()}
                  onChange={(e) => config.enableBudget.set(e.target.checked)}
                />
                <span className="toggle-slider" />
                <span className="toggle-label">💰 Budget</span>
              </label>
            ))}
            {rx(() => (config.enableBudget() ? <BudgetField /> : null))}
          </div>
        </div>

        {/* Row 2: Tags + Settings */}
        <section className="form-section">
          <h4 className="form-section-title">🏷️ Tags</h4>
          <TagsEditor />
        </section>

        <section className="form-section">
          <h4 className="form-section-title">⚙️ Settings</h4>
          <SettingsSection />
        </section>

        {/* Row 3: Contacts - Full Width */}
        <section className="form-section form-section-full">
          <h4 className="form-section-title">👥 Contacts</h4>
          <ContactsEditor />
        </section>
      </div>
    </div>
  );
}

// Optional field components using focus
function DescriptionField() {
  const { formData } = useFormContext();
  const { description } = useScope(() =>
    disposable({
      description: formData.pipe(focus("description", () => "")),
    })
  );

  return (
    <div className="optional-field">
      {rx(() => (
        <textarea
          value={description()}
          onChange={(e) => description.set(e.target.value)}
          placeholder="Enter description..."
          rows={3}
        />
      ))}
    </div>
  );
}

function EffectiveDateField() {
  const { formData } = useFormContext();
  const { effectiveDate } = useScope(() =>
    disposable({
      effectiveDate: formData.pipe(focus("effectiveDate", () => "")),
    })
  );

  return (
    <div className="optional-field">
      {rx(() => (
        <input
          type="date"
          value={effectiveDate()}
          onChange={(e) => effectiveDate.set(e.target.value)}
        />
      ))}
    </div>
  );
}

function BudgetField() {
  const { formData } = useFormContext();
  const { budget } = useScope(() =>
    disposable({
      budget: formData.pipe(focus("budget", () => 0)),
    })
  );

  return (
    <div className="optional-field">
      {rx(() => (
        <div className="budget-input">
          <span className="currency">$</span>
          <input
            type="number"
            value={budget()}
            onChange={(e) => budget.set(Number(e.target.value) || 0)}
            placeholder="0"
            min={0}
            step={100}
          />
        </div>
      ))}
    </div>
  );
}

// Main export with provider wrapper
export function FormEditor() {
  return (
    <div className="form-editor-card">
      <h3 className="form-editor-title">📝 Complex Form Editor Demo</h3>
      <p className="form-editor-subtitle">
        Using <code>focus</code> operator with <code>provider</code> pattern
      </p>
      <FormContextProvider
        value={{ formData: defaultFormModel, formConfig: defaultFormConfig }}
      >
        <FormEditorContent />
      </FormContextProvider>
    </div>
  );
}
