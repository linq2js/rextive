import { describe, it, expect, beforeEach, vi } from "vitest";
import { logic } from "rextive";
import { searchBarLogic } from "./SearchBar";

// Mock productsLogic
vi.mock("@/logic/productsLogic", () => ({
  productsLogic: vi.fn(() => ({
    setSearch: vi.fn(),
  })),
}));

describe("searchBarLogic", () => {
  beforeEach(() => {
    logic.clear();
  });

  it("should initialize with empty input", () => {
    const search = searchBarLogic.create();

    expect(search.input()).toBe("");
  });

  it("should update input value", () => {
    const search = searchBarLogic.create();

    search.input.set("laptop");

    expect(search.input()).toBe("laptop");
  });

  it("should clear input", () => {
    const search = searchBarLogic.create();
    search.input.set("laptop");

    search.clear();

    expect(search.input()).toBe("");
  });

  it("should allow multiple updates", () => {
    const search = searchBarLogic.create();

    search.input.set("l");
    search.input.set("la");
    search.input.set("laptop");

    expect(search.input()).toBe("laptop");
  });
});

