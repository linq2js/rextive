import { describe, it, expect } from "vitest";
import { signal } from "../signal";
import { focus, lens, type Lens } from "./index";

describe("focus.lens", () => {
  describe("basic usage with signal", () => {
    it("should read value from signal at path", () => {
      const form = signal({
        user: { name: "John", age: 30 },
      });

      const [getName] = focus.lens(form, "user.name");
      expect(getName()).toBe("John");
    });

    it("should write value to signal at path", () => {
      const form = signal({
        user: { name: "John", age: 30 },
      });

      const [, setName] = focus.lens(form, "user.name");
      setName("Jane");

      expect(form().user.name).toBe("Jane");
    });

    it("should support updater function", () => {
      const form = signal({
        user: { name: "john", age: 30 },
      });

      const [getName, setName] = focus.lens(form, "user.name");
      setName((prev) => prev.toUpperCase());

      expect(getName()).toBe("JOHN");
    });

    it("should handle nested paths", () => {
      const form = signal({
        contacts: [
          { firstName: "John", lastName: "Doe" },
          { firstName: "Jane", lastName: "Smith" },
        ],
      });

      const [getFirstName, setFirstName] = focus.lens(
        form,
        "contacts.0.firstName"
      );
      expect(getFirstName()).toBe("John");

      setFirstName("Johnny");
      expect(form().contacts[0].firstName).toBe("Johnny");
    });
  });

  describe("fallback", () => {
    it("should use fallback when value is undefined", () => {
      const form = signal<{ user?: { nickname?: string } }>({ user: {} });

      const [getNickname] = focus.lens(
        form,
        "user.nickname" as any,
        () => "Anonymous"
      );

      expect(getNickname()).toBe("Anonymous");
    });

    it("should use fallback when value is null", () => {
      const form = signal<{ user: { nickname: string | null } }>({
        user: { nickname: null },
      });

      const [getNickname] = focus.lens(
        form,
        "user.nickname" as any,
        () => "Anonymous"
      );

      expect(getNickname()).toBe("Anonymous");
    });

    it("should memoize fallback", () => {
      let callCount = 0;
      const form = signal<{ value?: number }>({});

      const [getValue] = focus.lens(form, "value" as any, () => {
        callCount++;
        return 42;
      });

      getValue();
      getValue();
      getValue();

      expect(callCount).toBe(1);
    });
  });

  describe("composable lens from lens", () => {
    it("should create lens from another lens", () => {
      const form = signal({
        user: { name: "John", address: { city: "NYC" } },
      });

      // First lens: get user
      const userLens = focus.lens(form, "user");

      // Second lens: get address from user lens
      const addressLens = focus.lens(userLens, "address");

      // Third lens: get city from address lens
      const [getCity, setCity] = focus.lens(addressLens, "city");

      expect(getCity()).toBe("NYC");

      setCity("LA");
      expect(form().user.address.city).toBe("LA");
    });

    it("should support deep composition", () => {
      const form = signal({
        contacts: [
          {
            firstName: "John",
            addresses: [{ street: "123 Main St", city: "NYC" }],
          },
        ],
      });

      const contactsLens = focus.lens(form, "contacts");
      const firstContactLens = focus.lens(contactsLens, "0");
      const addressesLens = focus.lens(firstContactLens, "addresses");
      const firstAddressLens = focus.lens(addressesLens, "0");
      const [getStreet, setStreet] = focus.lens(firstAddressLens, "street");

      expect(getStreet()).toBe("123 Main St");

      setStreet("456 Oak Ave");
      expect(form().contacts[0].addresses[0].street).toBe("456 Oak Ave");
    });

    it("should support updater with composed lens", () => {
      const form = signal({
        user: { score: 10 },
      });

      const userLens = focus.lens(form, "user");
      const [getScore, setScore] = focus.lens(userLens, "score");

      setScore((prev) => prev + 5);
      expect(getScore()).toBe(15);
    });
  });

  describe("standalone lens function", () => {
    it("should work as standalone import", () => {
      const form = signal({ value: 42 });

      // Using standalone lens function
      const [getValue, setValue] = lens(form, "value");

      expect(getValue()).toBe(42);
      setValue(100);
      expect(getValue()).toBe(100);
    });
  });

  describe("type safety", () => {
    it("should infer correct types for getter and setter", () => {
      const form = signal({
        count: 42,
        name: "test",
        nested: { value: true },
      });

      const [getCount, setCount] = focus.lens(form, "count");
      const count: number = getCount();
      setCount(100);
      setCount((prev) => prev + 1);

      const [getName, setName] = focus.lens(form, "name");
      const name: string = getName();
      setName("updated");
      setName((prev) => prev.toUpperCase());

      const [getValue, setValue] = focus.lens(form, "nested.value");
      const value: boolean = getValue();
      setValue(false);
      setValue((prev) => !prev);

      expect(count).toBe(42);
      expect(name).toBe("test");
      expect(value).toBe(true);
    });
  });
});

