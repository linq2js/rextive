import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { blox } from "./index";
import { signal } from "./signal";
import { rx } from "./rx";

describe("blox.slot and blox.fill", () => {
  describe("basic functionality", () => {
    it("should create a slot and fill it with content", () => {
      const Component = blox(() => {
        const [Slot, result] = blox.slot(() => {
          blox.fill(<div data-testid="slot-content">Hello</div>);
          return 42;
        });

        return (
          <div>
            {Slot}
            <span data-testid="result">{result}</span>
          </div>
        );
      });

      render(<Component />);
      expect(screen.getByTestId("slot-content")).toHaveTextContent("Hello");
      expect(screen.getByTestId("result")).toHaveTextContent("42");
    });

    it("should return null when slot is not filled", () => {
      const Component = blox(() => {
        const [Slot, result] = blox.slot(() => {
          // Don't fill
          return "no-content";
        });

        return (
          <div>
            <span data-testid="slot">{Slot === null ? "empty" : "filled"}</span>
            <span data-testid="result">{result}</span>
          </div>
        );
      });

      render(<Component />);
      expect(screen.getByTestId("slot")).toHaveTextContent("empty");
      expect(screen.getByTestId("result")).toHaveTextContent("no-content");
    });

    it("should handle conditional fills", () => {
      const Component = blox<{ condition: boolean }>((props) => {
        // Slot is created once, so we check initial condition
        const [Slot, value] = blox.slot(() => {
          if (props.condition) {
            blox.fill(<span data-testid="true-branch">True</span>);
            return "yes";
          } else {
            blox.fill(<span data-testid="false-branch">False</span>);
            return "no";
          }
        });

        return (
          <div>
            {Slot}
            <span data-testid="value">{value}</span>
          </div>
        );
      });

      // Test with true
      const { unmount } = render(<Component condition={true} />);
      expect(screen.getByTestId("true-branch")).toHaveTextContent("True");
      expect(screen.getByTestId("value")).toHaveTextContent("yes");
      unmount();

      // Test with false
      render(<Component condition={false} />);
      expect(screen.getByTestId("false-branch")).toHaveTextContent("False");
      expect(screen.getByTestId("value")).toHaveTextContent("no");
    });
  });

  describe("mode: replace (default)", () => {
    it("should replace previous fill with latest", () => {
      const Component = blox(() => {
        const [Slot] = blox.slot(() => {
          blox.fill(<span>First</span>);
          blox.fill(<span>Second</span>);
          blox.fill(<span data-testid="final">Third</span>);
        });

        return <div>{Slot}</div>;
      });

      render(<Component />);
      expect(screen.getByTestId("final")).toHaveTextContent("Third");
      expect(screen.queryByText("First")).not.toBeInTheDocument();
      expect(screen.queryByText("Second")).not.toBeInTheDocument();
    });

    it("should allow overwriting in replace mode", () => {
      const Component = blox<{ value: number }>((props) => {
        const [Slot] = blox.slot(() => {
          blox.fill(<span>Initial</span>);
          // props is evaluated once at slot creation
          if (props.value > 5) {
            blox.fill(<span data-testid="high">High</span>);
          }
        }, { mode: "replace" });

        return <div>{Slot}</div>;
      });

      // Test with low value
      const { unmount } = render(<Component value={3} />);
      expect(screen.getByText("Initial")).toBeInTheDocument();
      unmount();

      // Test with high value - new component instance
      render(<Component value={10} />);
      expect(screen.getByTestId("high")).toHaveTextContent("High");
      expect(screen.queryByText("Initial")).not.toBeInTheDocument();
    });
  });

  describe("mode: once", () => {
    it("should throw error on multiple fills in once mode", () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = vi.fn();

      const Component = blox(() => {
        const [Slot] = blox.slot(() => {
          blox.fill(<span>First</span>);
          blox.fill(<span>Second</span>); // Should throw
        }, { mode: "once" });

        return <div>{Slot}</div>;
      });

      expect(() => render(<Component />)).toThrow(
        'Slot mode is "once" but fill() was called multiple times'
      );

      console.error = originalError;
    });

    it("should allow single fill in once mode", () => {
      const Component = blox(() => {
        const [Slot, count] = blox.slot(() => {
          blox.fill(<span data-testid="content">Single Fill</span>);
          return 1;
        }, { mode: "once" });

        return (
          <div>
            {Slot}
            <span data-testid="count">{count}</span>
          </div>
        );
      });

      render(<Component />);
      expect(screen.getByTestId("content")).toHaveTextContent("Single Fill");
      expect(screen.getByTestId("count")).toHaveTextContent("1");
    });
  });

  describe("mode: append", () => {
    it("should collect all fills in append mode", () => {
      const Component = blox(() => {
        const [Slot, count] = blox.slot(() => {
          blox.fill(<span key="1" data-testid="item-1">First</span>);
          blox.fill(<span key="2" data-testid="item-2">Second</span>);
          blox.fill(<span key="3" data-testid="item-3">Third</span>);
          return 3;
        }, { mode: "append" });

        return (
          <div>
            {Slot}
            <span data-testid="count">{count}</span>
          </div>
        );
      });

      render(<Component />);
      expect(screen.getByTestId("item-1")).toHaveTextContent("First");
      expect(screen.getByTestId("item-2")).toHaveTextContent("Second");
      expect(screen.getByTestId("item-3")).toHaveTextContent("Third");
      expect(screen.getByTestId("count")).toHaveTextContent("3");
    });

    it("should render all items in array with append mode", () => {
      const Component = blox(() => {
        const items = ["apple", "banana", "cherry"];
        
        const [ItemList, total] = blox.slot(() => {
          items.forEach((item) => {
            blox.fill(<li key={item} data-testid={`item-${item}`}>{item}</li>);
          });
          return items.length;
        }, { mode: "append" });

        return (
          <div>
            <ul>{ItemList}</ul>
            <span data-testid="total">{total}</span>
          </div>
        );
      });

      render(<Component />);
      expect(screen.getByTestId("item-apple")).toHaveTextContent("apple");
      expect(screen.getByTestId("item-banana")).toHaveTextContent("banana");
      expect(screen.getByTestId("item-cherry")).toHaveTextContent("cherry");
      expect(screen.getByTestId("total")).toHaveTextContent("3");
    });
  });

  describe("reactive content with rx()", () => {
    it("should support reactive content using rx()", async () => {
      const Component = blox(() => {
        const count = signal(0);

        const [Counter, initialValue] = blox.slot(() => {
          blox.fill(
            rx(() => (
              <div data-testid="counter">Count: {count()}</div>
            ))
          );
          return count();
        });

        return (
          <div>
            {Counter}
            <button
              data-testid="increment"
              onClick={() => count.set(count() + 1)}
            >
              Increment
            </button>
            <span data-testid="initial">{initialValue}</span>
          </div>
        );
      });

      render(<Component />);
      expect(screen.getByTestId("counter")).toHaveTextContent("Count: 0");
      expect(screen.getByTestId("initial")).toHaveTextContent("0");

      screen.getByTestId("increment").click();
      await screen.findByText("Count: 1");
    });

    it("should support reactive list rendering", async () => {
      const Component = blox(() => {
        const items = signal(["apple", "banana"]);

        const [ItemList, count] = blox.slot(() => {
          blox.fill(
            rx(() => (
              <ul data-testid="list">
                {items().map((item, i) => (
                  <li key={i} data-testid={`item-${i}`}>
                    {item}
                  </li>
                ))}
              </ul>
            ))
          );
          return items().length;
        });

        return (
          <div>
            {ItemList}
            <span data-testid="count">{count}</span>
            <button
              data-testid="add"
              onClick={() => items.set([...items(), "cherry"])}
            >
              Add
            </button>
          </div>
        );
      });

      render(<Component />);
      expect(screen.getByTestId("item-0")).toHaveTextContent("apple");
      expect(screen.getByTestId("item-1")).toHaveTextContent("banana");
      expect(screen.getByTestId("count")).toHaveTextContent("2");

      screen.getByTestId("add").click();
      await screen.findByTestId("item-2");
      expect(screen.getByTestId("item-2")).toHaveTextContent("cherry");
    });
  });

  describe("error handling", () => {
    it("should throw error when fill() is called outside slot", () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = vi.fn();

      const Component = blox(() => {
        blox.fill(<div>Invalid</div>); // Should throw
        return <div>Test</div>;
      });

      expect(() => render(<Component />)).toThrow(
        "blox.fill() must be called inside a blox.slot() callback"
      );

      console.error = originalError;
    });

    it("should work even outside blox (self-contained)", () => {
      // slot() creates its own dispatcher, so it works anywhere
      const Component = () => {
        const [Slot, value] = blox.slot(() => {
          blox.fill(<div data-testid="content">Standalone</div>);
          return 42;
        });
        return (
          <div>
            {Slot}
            <span data-testid="value">{value}</span>
          </div>
        );
      };

      render(<Component />);
      expect(screen.getByTestId("content")).toHaveTextContent("Standalone");
      expect(screen.getByTestId("value")).toHaveTextContent("42");
    });
  });

  describe("complex scenarios", () => {
    it("should handle nested logic with multiple slots", () => {
      const Component = blox<{ showHeader: boolean; showFooter: boolean }>(
        (props) => {
          // Slots are created once at component mount
          const [Header] = blox.slot(() => {
            if (props.showHeader) {
              blox.fill(<header data-testid="header">Header</header>);
            }
          });

          const [Footer] = blox.slot(() => {
            if (props.showFooter) {
              blox.fill(<footer data-testid="footer">Footer</footer>);
            }
          });

          return (
            <div>
              {Header}
              <main data-testid="main">Content</main>
              {Footer}
            </div>
          );
        }
      );

      // Test different combinations by mounting new instances
      let result = render(<Component showHeader={true} showFooter={false} />);
      expect(screen.getByTestId("header")).toBeInTheDocument();
      expect(screen.queryByTestId("footer")).not.toBeInTheDocument();
      result.unmount();

      result = render(<Component showHeader={false} showFooter={true} />);
      expect(screen.queryByTestId("header")).not.toBeInTheDocument();
      expect(screen.getByTestId("footer")).toBeInTheDocument();
      result.unmount();

      result = render(<Component showHeader={true} showFooter={true} />);
      expect(screen.getByTestId("header")).toBeInTheDocument();
      expect(screen.getByTestId("footer")).toBeInTheDocument();
    });

    it("should work with computed values and conditional rendering", () => {
      const Component = blox<{ items: string[] }>((props) => {
        // Slot is created once at mount with initial props
        const [ItemView, stats] = blox.slot(() => {
          const count = props.items.length;
          const isEmpty = count === 0;

          if (isEmpty) {
            blox.fill(<p data-testid="empty">No items</p>);
          } else {
            blox.fill(
              <ul data-testid="list">
                {props.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            );
          }

          return { count, isEmpty };
        });

        return (
          <div>
            {ItemView}
            <span data-testid="count">Count: {stats.count}</span>
            <span data-testid="isEmpty">
              Empty: {stats.isEmpty ? "yes" : "no"}
            </span>
          </div>
        );
      });

      // Test with empty items
      let result = render(<Component items={[]} />);
      expect(screen.getByTestId("empty")).toHaveTextContent("No items");
      expect(screen.getByTestId("count")).toHaveTextContent("Count: 0");
      expect(screen.getByTestId("isEmpty")).toHaveTextContent("Empty: yes");
      result.unmount();

      // Test with items - new instance
      result = render(<Component items={["a", "b", "c"]} />);
      expect(screen.getByTestId("list")).toBeInTheDocument();
      expect(screen.getByTestId("count")).toHaveTextContent("Count: 3");
      expect(screen.getByTestId("isEmpty")).toHaveTextContent("Empty: no");
    });
  });
});

