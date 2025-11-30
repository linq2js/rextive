/**
 * Tags editor - dynamic list using focus operator
 */
import { useState } from "react";
import { rx } from "rextive/react";
import { focus } from "rextive/op";
import { useFormContext } from "../../store/formStore";

export function TagsEditor() {
  const { formData } = useFormContext();
  const [newTag, setNewTag] = useState("");

  // Focus on tags array
  const tags = formData.pipe(focus("tags"));

  const addTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !tags().includes(trimmed)) {
      tags.set((prev) => [...prev, trimmed]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    tags.set((prev) => prev.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="tags-editor">
      <div className="tags-input-row">
        <input
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          placeholder="Add a tag..."
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
        />
        <button type="button" onClick={addTag} className="btn-add">
          + Add
        </button>
      </div>

      <div className="tags-list">
        {rx(() =>
          tags().map((tag) => (
            <span key={tag} className="tag">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="tag-remove"
              >
                ×
              </button>
            </span>
          ))
        )}
        {rx(() => tags().length === 0 && (
          <span className="tags-empty">No tags added</span>
        ))}
      </div>
    </div>
  );
}

