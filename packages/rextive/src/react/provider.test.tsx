import React from "react";
import { screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { provider } from "./provider";
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { rx } from "./rx";
import { signal } from "../signal";
import { disposable } from "../disposable";
import "@testing-library/jest-dom";
import { Mutable } from "../types";
import { wrappers } from "../test/strictModeTests";

// Run all tests in both normal and StrictMode
describe.each(wrappers)("provider ($mode mode)", ({ Wrapper, render }) => {
  describe("basic functionality", () => {
    it("should create a provider and hook", () => {
      const [useTheme, ThemeProvider] = provider<
        { theme: Mutable<string> },
        string
      >({
        name: "Theme",
        create: (value) => {
          const theme = signal(value);
          return disposable({ theme });
        },
        update: (context, value) => {
          context.theme.set(value);
        },
      });

      expect(typeof useTheme).toBe("function");
      expect(typeof ThemeProvider).toBe("function");
    });

    it("should provide and consume context signal", () => {
      const [useCount, CountProvider] = provider<
        { count: Mutable<number> },
        number
      >({
        name: "Count",
        create: (value) => {
          const count = signal(value);
          return disposable({ count });
        },
        update: (context, value) => {
          context.count.set(value);
        },
      });

      function Consumer() {
        const { count } = useCount();
        return <div data-testid="count">{rx(count)}</div>;
      }

      render(
        <CountProvider value={42}>
          <Consumer />
        </CountProvider>
      );

      expect(screen.getByTestId("count")).toHaveTextContent("42");
    });

    it("should throw error when hook is used outside provider", () => {
      const [useTheme] = provider<{ theme: Mutable<string> }, string>({
        name: "Theme",
        create: (value) => {
          const theme = signal(value);
          return disposable({ theme });
        },
        update: (context, value) => {
          context.theme.set(value);
        },
      });

      function Consumer() {
        const { theme } = useTheme();
        return <div>{rx(theme)}</div>;
      }

      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => render(<Consumer />)).toThrow(
        "Theme context not found. Make sure you're using the component within <ThemeProvider>."
      );

      spy.mockRestore();
    });

    it("should update when value prop changes", async () => {
      const [useCount, CountProvider] = provider<
        { count: Mutable<number> },
        number
      >({
        name: "Count",
        create: (value) => {
          const count = signal(value);
          return disposable({ count });
        },
        update: (context, value) => {
          context.count.set(value);
        },
      });

      function Consumer() {
        const { count } = useCount();
        return <div data-testid="count">{rx(count)}</div>;
      }

      function WrapperComponent() {
        const [count, setCount] = useState(0);
        return (
          <CountProvider value={count}>
            <Consumer />
            <button onClick={() => setCount((c) => c + 1)}>Increment</button>
          </CountProvider>
        );
      }

      render(<WrapperComponent />);

      expect(screen.getByTestId("count")).toHaveTextContent("0");

      act(() => {
        screen.getByRole("button").click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("1");
      });
    });
  });

  describe("equality options", () => {
    it("should accept predefined equality string", () => {
      const [useUser, UserProvider] = provider<
        { user: Mutable<{ name: string }> },
        { name: string }
      >({
        name: "User",
        create: (value) => {
          const user = signal(value, "shallow");
          return disposable({ user });
        },
        update: (context, value) => {
          context.user.set(value);
        },
      });

      function Consumer() {
        const { user } = useUser();
        return <div data-testid="name">{rx(user, (u) => u.name)}</div>;
      }

      render(
        <UserProvider value={{ name: "Alice" }}>
          <Consumer />
        </UserProvider>
      );

      expect(screen.getByTestId("name")).toHaveTextContent("Alice");
    });

    it("should accept custom equality function", () => {
      const customEquals = (
        a: { id: number; name: string },
        b: { id: number; name: string }
      ) => a.id === b.id;

      const [useItem, ItemProvider] = provider<
        { item: Mutable<{ id: number; name: string }> },
        { id: number; name: string }
      >({
        name: "Item",
        create: (value) => {
          const item = signal(value, { equals: customEquals });
          return disposable({ item });
        },
        update: (context, value) => {
          context.item.set(value);
        },
      });

      function Consumer() {
        const { item } = useItem();
        return <div data-testid="item">{rx(item, (i) => i.name)}</div>;
      }

      render(
        <ItemProvider value={{ id: 1, name: "New Item" }}>
          <Consumer />
        </ItemProvider>
      );

      expect(screen.getByTestId("item")).toHaveTextContent("New Item");
    });

    it("should accept full options object", () => {
      const [useData, DataProvider] = provider<
        { data: Mutable<{ count: number }> },
        { count: number }
      >({
        name: "Data",
        create: (value) => {
          const data = signal(value, {
            equals: "shallow",
            name: "customDataSignal",
          });
          return disposable({ data });
        },
        update: (context, value) => {
          context.data.set(value);
        },
      });

      function Consumer() {
        const { data } = useData();
        return <div data-testid="count">{rx(data, (d) => d.count)}</div>;
      }

      render(
        <DataProvider value={{ count: 5 }}>
          <Consumer />
        </DataProvider>
      );

      expect(screen.getByTestId("count")).toHaveTextContent("5");
    });
  });

  describe("nested providers", () => {
    it("should support nested providers of same type", () => {
      const [useTheme, ThemeProvider] = provider<
        { theme: Mutable<string> },
        string
      >({
        name: "Theme",
        create: (value) => {
          const theme = signal(value);
          return disposable({ theme });
        },
        update: (context, value) => {
          context.theme.set(value);
        },
      });

      function Inner() {
        const { theme } = useTheme();
        return <div data-testid="inner">{rx(theme)}</div>;
      }

      function Outer() {
        const { theme } = useTheme();
        return (
          <div>
            <div data-testid="outer">{rx(theme)}</div>
            <ThemeProvider value="dark">
              <Inner />
            </ThemeProvider>
          </div>
        );
      }

      render(
        <ThemeProvider value="light">
          <Outer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("outer")).toHaveTextContent("light");
      expect(screen.getByTestId("inner")).toHaveTextContent("dark");
    });

    it("should support multiple different providers", () => {
      const [useTheme, ThemeProvider] = provider<
        { theme: Mutable<string> },
        string
      >({
        name: "Theme",
        create: (value) => {
          const theme = signal(value);
          return disposable({ theme });
        },
        update: (context, value) => {
          context.theme.set(value);
        },
      });

      const [useUser, UserProvider] = provider<
        { user: Mutable<{ name: string }> },
        { name: string }
      >({
        name: "User",
        create: (value) => {
          const user = signal(value);
          return disposable({ user });
        },
        update: (context, value) => {
          context.user.set(value);
        },
      });

      function Consumer() {
        const { theme } = useTheme();
        const { user } = useUser();
        return (
          <div>
            <div data-testid="theme">{rx(theme)}</div>
            <div data-testid="user">{rx(user, (u) => u.name)}</div>
          </div>
        );
      }

      render(
        <ThemeProvider value="dark">
          <UserProvider value={{ name: "Alice" }}>
            <Consumer />
          </UserProvider>
        </ThemeProvider>
      );

      expect(screen.getByTestId("theme")).toHaveTextContent("dark");
      expect(screen.getByTestId("user")).toHaveTextContent("Alice");
    });
  });

  describe("type safety", () => {
    it("should enforce correct value type", () => {
      const [, CountProvider] = provider<{ count: Mutable<number> }, number>({
        name: "Count",
        create: (value) => {
          const count = signal(value);
          return disposable({ count });
        },
        update: (context, value) => {
          context.count.set(value);
        },
      });

      // This should compile
      render(<CountProvider value={42}>Content</CountProvider>);
    });

    it("should return correct context types", () => {
      const [useUser] = provider<
        { user: Mutable<{ name: string; age: number }> },
        { name: string; age: number }
      >({
        name: "User",
        create: (value) => {
          const user = signal(value);
          return disposable({ user });
        },
        update: (context, value) => {
          context.user.set(value);
        },
      });

      function Consumer() {
        const { user } = useUser();
        // Signal is in the context
        const userData = user();
        const name: string = userData.name;
        const age: number = userData.age;

        return (
          <div>
            {name} - {age}
          </div>
        );
      }

      // Test would fail to compile if types were wrong
      expect(Consumer).toBeDefined();
    });
  });

  describe("complex values", () => {
    it("should handle objects with methods", () => {
      type Counter = {
        count: number;
        increment: () => void;
        decrement: () => void;
      };

      const [useCounter, CounterProvider] = provider<
        { counter: Mutable<Counter> },
        Counter
      >({
        name: "Counter",
        create: (value) => {
          const counter = signal(value);
          return disposable({ counter });
        },
        update: (context, value) => {
          context.counter.set(value);
        },
      });

      function Consumer() {
        const { counter } = useCounter();
        return (
          <div>
            <div data-testid="count">{rx(counter, (c) => c.count)}</div>
            <button onClick={() => counter().increment()}>+</button>
          </div>
        );
      }

      const increment = vi.fn();
      render(
        <CounterProvider value={{ count: 5, increment, decrement: vi.fn() }}>
          <Consumer />
        </CounterProvider>
      );

      expect(screen.getByTestId("count")).toHaveTextContent("5");

      act(() => {
        screen.getByRole("button").click();
      });

      expect(increment).toHaveBeenCalledTimes(1);
    });

    it("should handle arrays", () => {
      const [useItems, ItemsProvider] = provider<
        { items: Mutable<string[]> },
        string[]
      >({
        name: "Items",
        create: (value) => {
          const items = signal(value);
          return disposable({ items });
        },
        update: (context, value) => {
          context.items.set(value);
        },
      });

      function Consumer() {
        const { items } = useItems();
        return rx(items, (itemList) => (
          <ul>
            {itemList.map((item, i) => (
              <li key={i} data-testid={`item-${i}`}>
                {item}
              </li>
            ))}
          </ul>
        ));
      }

      render(
        <ItemsProvider value={["Apple", "Banana", "Cherry"]}>
          <Consumer />
        </ItemsProvider>
      );

      expect(screen.getByTestId("item-0")).toHaveTextContent("Apple");
      expect(screen.getByTestId("item-1")).toHaveTextContent("Banana");
      expect(screen.getByTestId("item-2")).toHaveTextContent("Cherry");
    });

    it("should handle null and undefined in union types", () => {
      const [useOptional, OptionalProvider] = provider<
        { value: Mutable<string | null> },
        string | null
      >({
        name: "Optional",
        create: (value) => {
          const val = signal(value);
          return disposable({ value: val });
        },
        update: (context, value) => {
          context.value.set(value);
        },
      });

      function Consumer() {
        const { value } = useOptional();
        return <div data-testid="value">{rx(value, (v) => v ?? "empty")}</div>;
      }

      const { rerender } = render(
        <Wrapper>
          <OptionalProvider value={null}>
            <Consumer />
          </OptionalProvider>
        </Wrapper>
      );

      expect(screen.getByTestId("value")).toHaveTextContent("empty");

      rerender(
        <Wrapper>
          <OptionalProvider value="Hello">
            <Consumer />
          </OptionalProvider>
        </Wrapper>
      );

      expect(screen.getByTestId("value")).toHaveTextContent("Hello");
    });
  });

  describe("error messages", () => {
    it("should include provider name in error message", () => {
      const [useCustomName] = provider<{ value: Mutable<number> }, number>({
        name: "CustomName",
        create: (value) => {
          const val = signal(value);
          return disposable({ value: val });
        },
        update: (context, value) => {
          context.value.set(value);
        },
      });

      function Consumer() {
        useCustomName();
        return null;
      }

      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => render(<Consumer />)).toThrow(/CustomName/);

      spy.mockRestore();
    });

    it("should provide helpful error message", () => {
      const [useMyContext] = provider<{ value: Mutable<number> }, number>({
        name: "MyContext",
        create: (value) => {
          const val = signal(value);
          return disposable({ value: val });
        },
        update: (context, value) => {
          context.value.set(value);
        },
      });

      function Consumer() {
        useMyContext();
        return null;
      }

      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => render(<Consumer />)).toThrow(
        /Make sure you're using the component within/
      );

      spy.mockRestore();
    });
  });

  describe("performance", () => {
    it("should not re-create context on re-renders", () => {
      const contexts: any[] = [];

      const [useCount, CountProvider] = provider<
        { count: Mutable<number> },
        number
      >({
        name: "Count",
        create: (value) => {
          const count = signal(value);
          const ctx = disposable({ count });
          contexts.push(ctx);
          return ctx;
        },
        update: (context, value) => {
          context.count.set(value);
        },
      });

      function Consumer() {
        const { count } = useCount();
        return <div data-testid="count">{rx(count)}</div>;
      }

      function WrapperComponent() {
        const [count, setCount] = useState(0);
        return (
          <>
            <CountProvider value={count}>
              <Consumer />
            </CountProvider>
            <button onClick={() => setCount((c) => c + 1)}>Increment</button>
          </>
        );
      }

      render(<WrapperComponent />);

      // In StrictMode, create is called twice but only one context is kept
      // So we check that after clicking, no new context is created
      const initialCount = contexts.length;

      act(() => {
        screen.getByRole("button").click();
      });

      // Should not create new context on update
      expect(contexts.length).toBe(initialCount);
    });
  });

  describe("raw provider", () => {
    it("should pass value directly without wrapping in signal", () => {
      type StoreType = { count: number; increment: () => void };

      const [useStore, StoreProvider] = provider<StoreType>({
        name: "Store",
        raw: true,
      });

      const store: StoreType = {
        count: 42,
        increment: vi.fn(),
      };

      function Consumer() {
        const s = useStore();
        return (
          <div>
            <div data-testid="count">{s.count}</div>
            <button onClick={s.increment}>+</button>
          </div>
        );
      }

      render(
        <StoreProvider value={store}>
          <Consumer />
        </StoreProvider>
      );

      expect(screen.getByTestId("count")).toHaveTextContent("42");

      act(() => {
        screen.getByRole("button").click();
      });

      expect(store.increment).toHaveBeenCalledTimes(1);
    });

    it("should work with logic instances", () => {
      type LogicInstance = {
        value: ReturnType<typeof signal<number>>;
        double: () => number;
      };

      const [useLogic, LogicProvider] = provider<LogicInstance>({
        name: "Logic",
        raw: true,
      });

      function Consumer() {
        const $logic = useLogic();
        return (
          <div>
            <div data-testid="value">{rx($logic.value)}</div>
            <div data-testid="double">{$logic.double()}</div>
          </div>
        );
      }

      const logicInstance: LogicInstance = {
        value: signal(5),
        double: function () {
          return this.value() * 2;
        },
      };

      render(
        <LogicProvider value={logicInstance}>
          <Consumer />
        </LogicProvider>
      );

      expect(screen.getByTestId("value")).toHaveTextContent("5");
      expect(screen.getByTestId("double")).toHaveTextContent("10");
    });

    it("should throw error when hook used outside provider", () => {
      const [useStore] = provider<{ data: string }>({
        name: "Store",
        raw: true,
      });

      function Consumer() {
        const s = useStore();
        return <div>{s.data}</div>;
      }

      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => render(<Consumer />)).toThrow(
        "Store context not found. Make sure you're using the component within <StoreProvider>."
      );

      spy.mockRestore();
    });
  });

  describe("simple provider (no factory)", () => {
    it("should create a signal from value automatically", () => {
      const [useTheme, ThemeProvider] = provider<"dark" | "light">({
        name: "Theme",
      });

      function Consumer() {
        const theme = useTheme();
        return <div data-testid="theme">{rx(theme)}</div>;
      }

      render(
        <ThemeProvider value="dark">
          <Consumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    });

    it("should auto-update signal when value prop changes", async () => {
      const [useCount, CountProvider] = provider<number>({
        name: "Count",
      });

      function Consumer() {
        const count = useCount();
        return <div data-testid="count">{rx(count)}</div>;
      }

      function WrapperComponent() {
        const [count, setCount] = useState(0);
        return (
          <CountProvider value={count}>
            <Consumer />
            <button onClick={() => setCount((c) => c + 1)}>Increment</button>
          </CountProvider>
        );
      }

      render(<WrapperComponent />);

      expect(screen.getByTestId("count")).toHaveTextContent("0");

      act(() => {
        screen.getByRole("button").click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("1");
      });
    });

    it("should allow setting value from consumer", async () => {
      const [useTheme, ThemeProvider] = provider<"dark" | "light">({
        name: "Theme",
      });

      function Consumer() {
        const theme = useTheme();
        return (
          <div>
            <div data-testid="theme">{rx(theme)}</div>
            <button onClick={() => theme.set("light")}>Toggle</button>
          </div>
        );
      }

      render(
        <ThemeProvider value="dark">
          <Consumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("theme")).toHaveTextContent("dark");

      act(() => {
        screen.getByRole("button").click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("theme")).toHaveTextContent("light");
      });
    });

    it("should handle objects as value", () => {
      const [useUser, UserProvider] = provider<{ name: string; age: number }>({
        name: "User",
      });

      function Consumer() {
        const user = useUser();
        return (
          <div>
            <div data-testid="name">{rx(user, (u) => u.name)}</div>
            <div data-testid="age">{rx(user, (u) => u.age)}</div>
          </div>
        );
      }

      render(
        <UserProvider value={{ name: "Alice", age: 30 }}>
          <Consumer />
        </UserProvider>
      );

      expect(screen.getByTestId("name")).toHaveTextContent("Alice");
      expect(screen.getByTestId("age")).toHaveTextContent("30");
    });

    it("should handle arrays as value", () => {
      const [useItems, ItemsProvider] = provider<string[]>({
        name: "Items",
      });

      function Consumer() {
        const items = useItems();
        return rx(items, (list) => (
          <ul>
            {list.map((item, i) => (
              <li key={i} data-testid={`item-${i}`}>
                {item}
              </li>
            ))}
          </ul>
        ));
      }

      render(
        <ItemsProvider value={["Apple", "Banana"]}>
          <Consumer />
        </ItemsProvider>
      );

      expect(screen.getByTestId("item-0")).toHaveTextContent("Apple");
      expect(screen.getByTestId("item-1")).toHaveTextContent("Banana");
    });

    it("should handle null/undefined in union types", () => {
      const [useOptional, OptionalProvider] = provider<string | null>({
        name: "Optional",
      });

      function Consumer() {
        const value = useOptional();
        return <div data-testid="value">{rx(value, (v) => v ?? "empty")}</div>;
      }

      render(
        <OptionalProvider value={null}>
          <Consumer />
        </OptionalProvider>
      );

      expect(screen.getByTestId("value")).toHaveTextContent("empty");
    });

    it("should throw error when hook used outside provider", () => {
      const [useTheme] = provider<"dark" | "light">({
        name: "Theme",
      });

      function Consumer() {
        const theme = useTheme();
        return <div>{rx(theme)}</div>;
      }

      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => render(<Consumer />)).toThrow(
        "Theme context not found. Make sure you're using the component within <ThemeProvider>."
      );

      spy.mockRestore();
    });

    it("should support nested providers of same type", () => {
      const [useTheme, ThemeProvider] = provider<"dark" | "light">({
        name: "Theme",
      });

      function Inner() {
        const theme = useTheme();
        return <div data-testid="inner">{rx(theme)}</div>;
      }

      function Outer() {
        const theme = useTheme();
        return (
          <div>
            <div data-testid="outer">{rx(theme)}</div>
            <ThemeProvider value="dark">
              <Inner />
            </ThemeProvider>
          </div>
        );
      }

      render(
        <ThemeProvider value="light">
          <Outer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("outer")).toHaveTextContent("light");
      expect(screen.getByTestId("inner")).toHaveTextContent("dark");
    });
  });

  describe("multiple signals in context", () => {
    it("should support multiple signals", () => {
      interface ThemeStore {
        theme: ReturnType<typeof signal<string>>;
        fontSize: ReturnType<typeof signal<number>>;
      }

      const [useTheme, ThemeProvider] = provider<
        ThemeStore,
        { theme: string; fontSize: number }
      >({
        name: "Theme",
        create: (value) => {
          const theme = signal(value.theme);
          const fontSize = signal(value.fontSize);
          return disposable({ theme, fontSize });
        },
        update: (context, value) => {
          context.theme.set(value.theme);
          context.fontSize.set(value.fontSize);
        },
      });

      function Consumer() {
        const { theme, fontSize } = useTheme();
        return (
          <div>
            <div data-testid="theme">{rx(theme)}</div>
            <div data-testid="fontSize">{rx(fontSize)}</div>
          </div>
        );
      }

      render(
        <ThemeProvider value={{ theme: "dark", fontSize: 16 }}>
          <Consumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("theme")).toHaveTextContent("dark");
      expect(screen.getByTestId("fontSize")).toHaveTextContent("16");
    });

    it("should support signals with methods", () => {
      interface Store {
        count: ReturnType<typeof signal<number>>;
        increment: () => void;
        decrement: () => void;
      }

      const [useStore, StoreProvider] = provider<Store, number>({
        name: "Store",
        create: (value) => {
          const count = signal(value);
          const increment = () => count.set((x) => x + 1);
          const decrement = () => count.set((x) => x - 1);
          return disposable({ count, increment, decrement });
        },
        update: (context, value) => {
          context.count.set(value);
        },
      });

      function Consumer() {
        const { count, increment, decrement } = useStore();
        return (
          <div>
            <div data-testid="count">{rx(count)}</div>
            <button data-testid="inc" onClick={increment}>
              +
            </button>
            <button data-testid="dec" onClick={decrement}>
              -
            </button>
          </div>
        );
      }

      render(
        <StoreProvider value={0}>
          <Consumer />
        </StoreProvider>
      );

      expect(screen.getByTestId("count")).toHaveTextContent("0");

      act(() => {
        screen.getByTestId("inc").click();
      });

      expect(screen.getByTestId("count")).toHaveTextContent("1");

      act(() => {
        screen.getByTestId("dec").click();
      });

      expect(screen.getByTestId("count")).toHaveTextContent("0");
    });
  });
});
