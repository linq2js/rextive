import { describe, expect, it } from "vitest";
import { signal } from "./signal";
import yup from "yup";
import { validate } from "./validate";

describe("yup", () => {
  it("should validate with yup using schema object", () => {
    const schema = yup.object({
      name: yup.string(),
    });
    const person = signal({ name: "John" });

    // Pass the schema object (not schema.isValid) because isValid is not bound
    // and returns a Promise<boolean>
    const validated = person.to(validate(schema));

    const result = validated();
    expect(result).toBeTruthy();
    // Note: yup's isValid returns Promise<boolean>, so result is a Promise
    expect(result.success).toBe(true);
    expect(result.value).toBe(person());
    expect("result" in result && result.result).toBeInstanceOf(Promise);
  });

  it("should validate with yup using validateSync", () => {
    const schema = yup.object({
      name: yup.string().required(),
    });
    const person = signal({ name: "John" });

    // Use validateSync for synchronous validation (throws on invalid)
    const validated = person.to(validate(schema.validateSync.bind(schema)));

    const result = validated();
    expect(result.success).toBe(true);
    expect(result.value).toBe(person());
  });

  it("should catch yup validation errors", () => {
    const schema = yup.object({
      name: yup.string().required(),
    });
    const person = signal({ name: "" }); // Invalid: empty string

    // validateSync throws on invalid input
    const validated = person.to(validate(schema.validateSync.bind(schema)));

    const result = validated();
    expect(result.success).toBe(false);
    expect(result.value).toBe(person());
    expect("error" in result).toBe(true);
  });
});
