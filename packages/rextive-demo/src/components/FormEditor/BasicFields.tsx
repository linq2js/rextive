/**
 * Basic form fields using focus operator
 */
import { rx, useScope } from "rextive/react";
import { focus } from "rextive/op";
import { useFormContext } from "../../store/formStore";

export function BasicFields() {
  const { formData } = useFormContext();

  // Create focused signals for each field (managed by useScope for cleanup)
  const { title, status } = useScope("basicFields", () => ({
    title: formData.pipe(focus("title")),
    status: formData.pipe(focus("status")),
  }));

  return (
    <div className="basic-fields">
      <div className="form-field">
        <label>Title *</label>
        {rx(() => (
          <input
            type="text"
            value={title()}
            onChange={(e) => title.set(e.target.value)}
            placeholder="Enter title..."
          />
        ))}
      </div>

      <div className="form-field">
        <label>Status</label>
        {rx(() => (
          <select
            value={status()}
            onChange={(e) =>
              status.set(e.target.value as "draft" | "submitted" | "archived")
            }
          >
            <option value="draft">📝 Draft</option>
            <option value="submitted">✅ Submitted</option>
            <option value="archived">📦 Archived</option>
          </select>
        ))}
      </div>
    </div>
  );
}

