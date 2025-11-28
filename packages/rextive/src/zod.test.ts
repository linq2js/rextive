import { describe, expect, it } from "vitest";
import { z } from "zod";
import { signal } from "./signal";
import { validate } from "./validate";

describe("zod", () => {
  it("should validate with zod", () => {
    const schema = z.object({
      name: z.string(),
    });
    const person = signal({ name: "John" });
    const validated = person.to(validate(schema.safeParse));
    expect(validated().success).toBe(true);
    expect(validated().value).toBe(person());
  });
});
