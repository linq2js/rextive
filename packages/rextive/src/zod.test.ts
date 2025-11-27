import { describe, expect, it } from "vitest";
import { z } from "zod";
import { signal } from "./signal";

describe("zod", () => {
  it("should validate with zod", () => {
    const schema = z.object({
      name: z.string(),
    });
    const person = signal({ name: "John" });
    const validated = person.to((p) => schema.safeParse(p));
    expect(validated().success).toBe(true);
  });
});
