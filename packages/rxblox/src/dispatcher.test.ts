import { describe, it, expect } from "vitest";
import {
  dispatcherToken,
  getDispatcher,
  withDispatchers,
  getContextType,
} from "./dispatcher";

describe("dispatcher", () => {
  describe("dispatcherToken", () => {
    it("should create a dispatcher token with a unique symbol key", () => {
      const token1 = dispatcherToken<string>("test");
      const token2 = dispatcherToken<string>("test");

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1.key).not.toBe(token2.key); // Different symbols
    });

    it("should create entries with the dispatcher token", () => {
      const testToken = dispatcherToken<string>("test");
      const entry = testToken("test-value");

      expect(entry).toEqual({
        key: testToken.key,
        value: "test-value",
      });
    });

    it("should create entries with undefined values", () => {
      const testToken = dispatcherToken<string | undefined>("test");
      const entry = testToken(undefined);

      expect(entry).toEqual({
        key: testToken.key,
        value: undefined,
      });
    });

    it("should support different value types", () => {
      const stringToken = dispatcherToken<string>("string");
      const numberToken = dispatcherToken<number>("number");
      const objectToken = dispatcherToken<{ foo: string }>("object");

      const stringEntry = stringToken("hello");
      const numberEntry = numberToken(42);
      const objectEntry = objectToken({ foo: "bar" });

      expect(stringEntry.value).toBe("hello");
      expect(numberEntry.value).toBe(42);
      expect(objectEntry.value).toEqual({ foo: "bar" });
    });
  });

  describe("getDispatcher", () => {
    it("should return undefined when no dispatcher is set", () => {
      const testToken = dispatcherToken<string>("test");
      const result = getDispatcher(testToken);

      expect(result).toBeUndefined();
    });

    it("should return the dispatcher value when set", () => {
      const testToken = dispatcherToken<string>("test");

      withDispatchers([testToken("test-value")], () => {
        const result = getDispatcher(testToken);
        expect(result).toBe("test-value");
      });
    });

    it("should return undefined after context exits", () => {
      const testToken = dispatcherToken<string>("test");

      withDispatchers([testToken("test-value")], () => {
        expect(getDispatcher(testToken)).toBe("test-value");
      });

      expect(getDispatcher(testToken)).toBeUndefined();
    });

    it("should handle different dispatcher tokens independently", () => {
      const token1 = dispatcherToken<string>("token1");
      const token2 = dispatcherToken<number>("token2");

      withDispatchers([token1("string"), token2(42)], () => {
        expect(getDispatcher(token1)).toBe("string");
        expect(getDispatcher(token2)).toBe(42);
      });
    });
  });

  describe("withDispatchers", () => {
    it("should execute function and return result", () => {
      const testToken = dispatcherToken<string>("test");
      const result = withDispatchers([testToken("test-value")], () => {
        return 42;
      });

      expect(result).toBe(42);
    });

    it("should set dispatcher value for single entry", () => {
      const testToken = dispatcherToken<string>("test");

      withDispatchers(testToken("test-value"), () => {
        expect(getDispatcher(testToken)).toBe("test-value");
      });
    });

    it("should set dispatcher values for multiple entries", () => {
      const token1 = dispatcherToken<string>("token1");
      const token2 = dispatcherToken<number>("token2");
      const token3 = dispatcherToken<boolean>("token3");

      withDispatchers([token1("string"), token2(42), token3(true)], () => {
        expect(getDispatcher(token1)).toBe("string");
        expect(getDispatcher(token2)).toBe(42);
        expect(getDispatcher(token3)).toBe(true);
      });
    });

    it("should skip entries with undefined values", () => {
      const token1 = dispatcherToken<string | undefined>("token1");
      const token2 = dispatcherToken<string>("token2");

      withDispatchers([token1(undefined), token2("defined")], () => {
        expect(getDispatcher(token1)).toBeUndefined();
        expect(getDispatcher(token2)).toBe("defined");
      });
    });

    it("should restore previous dispatcher state after execution", () => {
      const testToken = dispatcherToken<string>("test");

      withDispatchers([testToken("outer")], () => {
        expect(getDispatcher(testToken)).toBe("outer");

        withDispatchers([testToken("inner")], () => {
          expect(getDispatcher(testToken)).toBe("inner");
        });

        expect(getDispatcher(testToken)).toBe("outer");
      });

      expect(getDispatcher(testToken)).toBeUndefined();
    });

    it("should restore dispatcher even if function throws", () => {
      const testToken = dispatcherToken<string>("test");

      expect(() => {
        withDispatchers([testToken("test")], () => {
          throw new Error("Test error");
        });
      }).toThrow("Test error");

      expect(getDispatcher(testToken)).toBeUndefined();
    });

    it("should override outer dispatcher values with inner ones", () => {
      const testToken = dispatcherToken<string>("test");

      withDispatchers([testToken("outer")], () => {
        expect(getDispatcher(testToken)).toBe("outer");

        withDispatchers([testToken("inner")], () => {
          expect(getDispatcher(testToken)).toBe("inner");
        });
      });
    });

    it("should preserve outer dispatchers when inner doesn't set them", () => {
      const token1 = dispatcherToken<string>("token1");
      const token2 = dispatcherToken<string>("token2");

      withDispatchers([token1("value1"), token2("value2")], () => {
        expect(getDispatcher(token1)).toBe("value1");
        expect(getDispatcher(token2)).toBe("value2");

        // Only update token1, token2 should still be accessible
        withDispatchers([token1("new-value1")], () => {
          expect(getDispatcher(token1)).toBe("new-value1");
          expect(getDispatcher(token2)).toBe("value2"); // Preserved
        });
      });
    });

    it("should handle empty entries array", () => {
      const testToken = dispatcherToken<string>("test");

      const result = withDispatchers([], () => {
        expect(getDispatcher(testToken)).toBeUndefined();
        return "result";
      });

      expect(result).toBe("result");
    });

    it("should handle deeply nested dispatchers", () => {
      const testToken = dispatcherToken<number>("test");

      withDispatchers([testToken(1)], () => {
        expect(getDispatcher(testToken)).toBe(1);

        withDispatchers([testToken(2)], () => {
          expect(getDispatcher(testToken)).toBe(2);

          withDispatchers([testToken(3)], () => {
            expect(getDispatcher(testToken)).toBe(3);

            withDispatchers([testToken(4)], () => {
              expect(getDispatcher(testToken)).toBe(4);
            });

            expect(getDispatcher(testToken)).toBe(3);
          });

          expect(getDispatcher(testToken)).toBe(2);
        });

        expect(getDispatcher(testToken)).toBe(1);
      });

      expect(getDispatcher(testToken)).toBeUndefined();
    });

    it("should support complex object types as dispatcher values", () => {
      type ComplexType = {
        name: string;
        count: number;
        nested: { value: string };
        fn: () => void;
      };

      const complexToken = dispatcherToken<ComplexType>("complex");
      const mockFn = () => {};

      const value: ComplexType = {
        name: "test",
        count: 42,
        nested: { value: "nested" },
        fn: mockFn,
      };

      withDispatchers([complexToken(value)], () => {
        const result = getDispatcher(complexToken);
        expect(result).toBe(value);
        expect(result?.name).toBe("test");
        expect(result?.count).toBe(42);
        expect(result?.nested.value).toBe("nested");
        expect(result?.fn).toBe(mockFn);
      });
    });

    it("should handle entry with null value", () => {
      const testToken = dispatcherToken<string | null>("test");

      withDispatchers([testToken(null)], () => {
        expect(getDispatcher(testToken)).toBeNull();
      });
    });

    it("should handle entry with zero value", () => {
      const testToken = dispatcherToken<number>("test");

      withDispatchers([testToken(0)], () => {
        expect(getDispatcher(testToken)).toBe(0);
      });
    });

    it("should handle entry with empty string value", () => {
      const testToken = dispatcherToken<string>("test");

      withDispatchers([testToken("")], () => {
        expect(getDispatcher(testToken)).toBe("");
      });
    });

    it("should handle entry with false value", () => {
      const testToken = dispatcherToken<boolean>("test");

      withDispatchers([testToken(false)], () => {
        expect(getDispatcher(testToken)).toBe(false);
      });
    });

    it("should maintain dispatcher isolation between parallel executions", () => {
      const testToken = dispatcherToken<string>("test");
      const results: string[] = [];

      // Simulate two separate execution contexts
      withDispatchers([testToken("context-1")], () => {
        results.push(getDispatcher(testToken)!);
      });

      withDispatchers([testToken("context-2")], () => {
        results.push(getDispatcher(testToken)!);
      });

      expect(results).toEqual(["context-1", "context-2"]);
      expect(getDispatcher(testToken)).toBeUndefined();
    });
  });

  describe("type safety", () => {
    it("should maintain type information through dispatcher token", () => {
      const stringToken = dispatcherToken<string>("string");
      const numberToken = dispatcherToken<number>("number");

      withDispatchers([stringToken("hello"), numberToken(42)], () => {
        const str = getDispatcher(stringToken);
        const num = getDispatcher(numberToken);

        // TypeScript should infer correct types
        expect(typeof str).toBe("string");
        expect(typeof num).toBe("number");
      });
    });

    it("should handle union types correctly", () => {
      const unionToken = dispatcherToken<string | number>("union");

      withDispatchers([unionToken("string")], () => {
        expect(getDispatcher(unionToken)).toBe("string");
      });

      withDispatchers([unionToken(42)], () => {
        expect(getDispatcher(unionToken)).toBe(42);
      });
    });
  });

  describe("edge cases", () => {
    it("should handle dispatcher with same name but different types", () => {
      const token1 = dispatcherToken<string>("sameName");
      const token2 = dispatcherToken<number>("sameName");

      // They should have different symbol keys
      expect(token1.key).not.toBe(token2.key);

      withDispatchers([token1("string"), token2(42)], () => {
        expect(getDispatcher(token1)).toBe("string");
        expect(getDispatcher(token2)).toBe(42);
      });
    });

    it("should handle multiple entries for same dispatcher token (last one wins)", () => {
      const testToken = dispatcherToken<string>("test");

      withDispatchers([testToken("first"), testToken("second")], () => {
        // Last entry should override
        expect(getDispatcher(testToken)).toBe("second");
      });
    });

    it("should handle mix of undefined and defined entries", () => {
      const token1 = dispatcherToken<string | undefined>("token1");
      const token2 = dispatcherToken<string>("token2");
      const token3 = dispatcherToken<string | undefined>("token3");

      withDispatchers(
        [token1(undefined), token2("defined"), token3(undefined)],
        () => {
          expect(getDispatcher(token1)).toBeUndefined();
          expect(getDispatcher(token2)).toBe("defined");
          expect(getDispatcher(token3)).toBeUndefined();
        }
      );
    });

    it("should handle dispatcher override in nested context with undefined", () => {
      const testToken = dispatcherToken<string | undefined>("test");

      withDispatchers([testToken("outer")], () => {
        expect(getDispatcher(testToken)).toBe("outer");

        // Setting undefined should skip, preserving outer value
        withDispatchers([testToken(undefined)], () => {
          expect(getDispatcher(testToken)).toBe("outer");
        });
      });
    });
  });

  describe("getContextType", () => {
    it("should return undefined when no context is set", () => {
      expect(getContextType()).toBeUndefined();
    });

    it("should return the context type when set via withDispatchers", () => {
      const testToken = dispatcherToken<string>("test");

      withDispatchers(
        [testToken("value")],
        () => {
          expect(getContextType()).toBe("blox");
        },
        { contextType: "blox" }
      );
    });

    it("should support all context types", () => {
      const testToken = dispatcherToken<string>("test");

      const contextTypes: Array<
        "blox" | "effect" | "slot" | "signal" | "batch"
      > = ["blox", "effect", "slot", "signal", "batch"];

      for (const contextType of contextTypes) {
        withDispatchers(
          [testToken("value")],
          () => {
            expect(getContextType()).toBe(contextType);
          },
          { contextType }
        );
      }
    });

    it("should inherit context type from parent when not overridden", () => {
      const testToken = dispatcherToken<string>("test");

      withDispatchers(
        [testToken("outer")],
        () => {
          expect(getContextType()).toBe("blox");

          // Inner withDispatchers without contextType option
          withDispatchers([testToken("inner")], () => {
            expect(getContextType()).toBe("blox"); // Should inherit
          });
        },
        { contextType: "blox" }
      );
    });

    it("should override parent context type when explicitly set", () => {
      const testToken = dispatcherToken<string>("test");

      withDispatchers(
        [testToken("outer")],
        () => {
          expect(getContextType()).toBe("blox");

          // Inner withDispatchers with different contextType
          withDispatchers(
            [testToken("inner")],
            () => {
              expect(getContextType()).toBe("slot"); // Should override
            },
            { contextType: "slot" }
          );

          // Back to parent context
          expect(getContextType()).toBe("blox");
        },
        { contextType: "blox" }
      );
    });

    it("should restore context type after withDispatchers completes", () => {
      const testToken = dispatcherToken<string>("test");

      expect(getContextType()).toBeUndefined();

      withDispatchers(
        [testToken("value")],
        () => {
          expect(getContextType()).toBe("effect");
        },
        { contextType: "effect" }
      );

      expect(getContextType()).toBeUndefined();
    });

    it("should work without contextType option (backward compatibility)", () => {
      const testToken = dispatcherToken<string>("test");

      withDispatchers([testToken("value")], () => {
        expect(getContextType()).toBeUndefined();
      });
    });

    it("should allow nested contexts with different types", () => {
      const testToken = dispatcherToken<string>("test");

      withDispatchers(
        [testToken("1")],
        () => {
          expect(getContextType()).toBe("blox");

          withDispatchers(
            [testToken("2")],
            () => {
              expect(getContextType()).toBe("effect");

              withDispatchers(
                [testToken("3")],
                () => {
                  expect(getContextType()).toBe("slot");
                },
                { contextType: "slot" }
              );

              expect(getContextType()).toBe("effect");
            },
            { contextType: "effect" }
          );

          expect(getContextType()).toBe("blox");
        },
        { contextType: "blox" }
      );

      expect(getContextType()).toBeUndefined();
    });
  });

  describe("disabling dispatchers with token()", () => {
    it("should remove dispatcher when called without arguments", () => {
      const testToken = dispatcherToken<string>("test");

      withDispatchers([testToken("outer")], () => {
        expect(getDispatcher(testToken)).toBe("outer");

        // Disable the dispatcher
        withDispatchers([testToken()], () => {
          expect(getDispatcher(testToken)).toBeUndefined();
        });

        // Back to outer value
        expect(getDispatcher(testToken)).toBe("outer");
      });
    });

    it("should distinguish between token() and token(undefined)", () => {
      const testToken = dispatcherToken<string>("test");

      withDispatchers([testToken("outer")], () => {
        expect(getDispatcher(testToken)).toBe("outer");

        // token(undefined) keeps the existing value
        withDispatchers([testToken(undefined)], () => {
          expect(getDispatcher(testToken)).toBe("outer");
        });

        // token() removes the dispatcher
        withDispatchers([testToken()], () => {
          expect(getDispatcher(testToken)).toBeUndefined();
        });
      });
    });

    it("should work with multiple dispatchers", () => {
      const token1 = dispatcherToken<string>("token1");
      const token2 = dispatcherToken<number>("token2");

      withDispatchers([token1("value1"), token2(42)], () => {
        expect(getDispatcher(token1)).toBe("value1");
        expect(getDispatcher(token2)).toBe(42);

        // Disable token1 but keep token2
        withDispatchers([token1(), token2(undefined)], () => {
          expect(getDispatcher(token1)).toBeUndefined();
          expect(getDispatcher(token2)).toBe(42); // kept from parent
        });
      });
    });

    it("should allow re-enabling a disabled dispatcher", () => {
      const testToken = dispatcherToken<string>("test");

      withDispatchers([testToken("initial")], () => {
        expect(getDispatcher(testToken)).toBe("initial");

        // Disable
        withDispatchers([testToken()], () => {
          expect(getDispatcher(testToken)).toBeUndefined();

          // Re-enable with new value
          withDispatchers([testToken("re-enabled")], () => {
            expect(getDispatcher(testToken)).toBe("re-enabled");
          });

          // Still disabled here
          expect(getDispatcher(testToken)).toBeUndefined();
        });

        // Back to initial
        expect(getDispatcher(testToken)).toBe("initial");
      });
    });

    it("should handle nested disable/enable correctly", () => {
      const testToken = dispatcherToken<string>("test");

      withDispatchers([testToken("level1")], () => {
        expect(getDispatcher(testToken)).toBe("level1");

        withDispatchers([testToken()], () => {
          expect(getDispatcher(testToken)).toBeUndefined();

          withDispatchers([testToken("level3")], () => {
            expect(getDispatcher(testToken)).toBe("level3");
          });

          expect(getDispatcher(testToken)).toBeUndefined();
        });

        expect(getDispatcher(testToken)).toBe("level1");
      });
    });

    it("should disable even when there is no parent context", () => {
      const testToken = dispatcherToken<string>("test");

      // No parent context
      expect(getDispatcher(testToken)).toBeUndefined();

      withDispatchers([testToken()], () => {
        // Still undefined, but explicitly disabled
        expect(getDispatcher(testToken)).toBeUndefined();
      });
    });
  });

  describe("shortcut methods: with() and without()", () => {
    it("should provide token.with() as a shortcut", () => {
      const testToken = dispatcherToken<string>("test");

      const result = testToken.with("myValue", () => {
        expect(getDispatcher(testToken)).toBe("myValue");
        return 42;
      });

      expect(result).toBe(42);
      expect(getDispatcher(testToken)).toBeUndefined();
    });

    it("should provide token.without() as a shortcut", () => {
      const testToken = dispatcherToken<string>("test");

      withDispatchers([testToken("outer")], () => {
        expect(getDispatcher(testToken)).toBe("outer");

        const result = testToken.without(() => {
          expect(getDispatcher(testToken)).toBeUndefined();
          return "disabled";
        });

        expect(result).toBe("disabled");
        expect(getDispatcher(testToken)).toBe("outer");
      });
    });

    it("should allow nesting with.with() and without()", () => {
      const testToken = dispatcherToken<string>("test");

      testToken.with("level1", () => {
        expect(getDispatcher(testToken)).toBe("level1");

        testToken.without(() => {
          expect(getDispatcher(testToken)).toBeUndefined();

          testToken.with("level3", () => {
            expect(getDispatcher(testToken)).toBe("level3");
          });

          expect(getDispatcher(testToken)).toBeUndefined();
        });

        expect(getDispatcher(testToken)).toBe("level1");
      });
    });

    it("should work with multiple tokens using shortcuts", () => {
      const token1 = dispatcherToken<string>("token1");
      const token2 = dispatcherToken<number>("token2");

      token1.with("value1", () => {
        expect(getDispatcher(token1)).toBe("value1");

        token2.with(42, () => {
          expect(getDispatcher(token1)).toBe("value1");
          expect(getDispatcher(token2)).toBe(42);
        });

        expect(getDispatcher(token2)).toBeUndefined();
      });
    });

    it("should return the correct type from shortcuts", () => {
      const testToken = dispatcherToken<string>("test");

      // Test that TypeScript infers correct return type
      const stringResult: string = testToken.with("test", () => "hello");
      const numberResult: number = testToken.without(() => 42);
      const objectResult: { foo: string } = testToken.with("test", () => ({
        foo: "bar",
      }));

      expect(stringResult).toBe("hello");
      expect(numberResult).toBe(42);
      expect(objectResult).toEqual({ foo: "bar" });
    });

    it("should work with async functions", async () => {
      const testToken = dispatcherToken<string>("test");

      const result = await testToken.with("async-value", async () => {
        expect(getDispatcher(testToken)).toBe("async-value");
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "async-result";
      });

      expect(result).toBe("async-result");
    });
  });
});
