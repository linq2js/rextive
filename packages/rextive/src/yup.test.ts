import { describe, expect, it } from "vitest";
import { signal } from "./signal";
import yup from "yup";

describe("yup", () => {
  it("should validate with yup", () => {
    const schema = yup.object({
      name: yup.string(),
    });
    const person = signal({ name: "John" });
    const validated = person.to((p) => schema.isValid(p));
    expect(validated()).toBeTruthy();
  });
});
