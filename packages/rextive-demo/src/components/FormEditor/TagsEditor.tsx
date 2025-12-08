/**
 * Tags editor - dynamic list using focus operator
 */
import { useState } from "react";
import { rx, useScope, disposable } from "rextive/react";
import { focus } from "rextive/op";
import { useFormContext } from "../../store/formStore";
import { Button } from "../Button";

export function TagsEditor() {
  const { formData } = useFormContext();
  const [newTag, setNewTag] = useState("");

  // Focus on tags array - must be in useScope to avoid signal leak on re-render
  const scope = useScope(() =>
    disposable({
      tags: formData.pipe(focus("tags")),
    })
  );

  const addTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !scope.tags().includes(trimmed)) {
      scope.tags.set((prev) => [...prev, trimmed]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    scope.tags.set((prev) => prev.filter((t) => t !== tagToRemove));
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
        <Button variant="primary" size="sm" onClick={addTag}>
          + Add
        </Button>
      </div>

      <div className="tags-list">
        {rx(() =>
          scope.tags().map((tag) => (
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
        {rx(() =>
          scope.tags().length === 0 && (
            <span className="tags-empty">No tags added</span>
          )
        )}
      </div>
    </div>
  );
}

