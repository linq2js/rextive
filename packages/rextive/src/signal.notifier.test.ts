import { describe, it, expect, vi } from "vitest";
import { signal } from "./signal";

describe("signal() - Notifier Pattern (Empty Signal)", () => {
  describe("basic behavior", () => {
    it("should create signal with undefined initial value", () => {
      const notifier = signal<string>();
      expect(notifier()).toBe(undefined);
    });

    it("should have auto-generated name starting with #notifier", () => {
      const notifier = signal<string>();
      expect(notifier.displayName).toMatch(/^#notifier-/);
    });

    it("should trigger on every set, even with same value", () => {
      const notifier = signal<string>();
      const listener = vi.fn();

      notifier.on(listener);

      notifier.set("action1");
      expect(listener).toHaveBeenCalledTimes(1);

      notifier.set("action1"); // Same value
      expect(listener).toHaveBeenCalledTimes(2);

      notifier.set("action1"); // Same value again
      expect(listener).toHaveBeenCalledTimes(3);
    });

    it("should update value on each set", () => {
      const notifier = signal<number>();

      expect(notifier()).toBe(undefined);

      notifier.set(1);
      expect(notifier()).toBe(1);

      notifier.set(2);
      expect(notifier()).toBe(2);

      notifier.set(2); // Same value - still updates
      expect(notifier()).toBe(2);
    });
  });

  describe("action dispatching pattern", () => {
    type Action =
      | { type: "login"; username: string }
      | { type: "logout" }
      | { type: "refresh" };

    it("should work as action dispatcher", () => {
      const action = signal<Action>();
      const actions: Action[] = [];

      action.on(() => {
        const a = action();
        if (a) actions.push(a);
      });

      action.set({ type: "login", username: "admin" });
      action.set({ type: "refresh" });
      action.set({ type: "refresh" }); // Same action type again
      action.set({ type: "logout" });

      expect(actions).toHaveLength(4);
      expect(actions[0]).toEqual({ type: "login", username: "admin" });
      expect(actions[1]).toEqual({ type: "refresh" });
      expect(actions[2]).toEqual({ type: "refresh" }); // Duplicate captured
      expect(actions[3]).toEqual({ type: "logout" });
    });

    it("should trigger even with identical object references", () => {
      const action = signal<Action>();
      const listener = vi.fn();
      action.on(listener);

      const loginAction: Action = { type: "login", username: "user1" };

      action.set(loginAction);
      action.set(loginAction); // Same reference
      action.set(loginAction); // Same reference again

      expect(listener).toHaveBeenCalledTimes(3);
    });
  });

  describe("event bus pattern", () => {
    it("should work as event emitter", () => {
      const onClick = signal<{ x: number; y: number }>();
      const clicks: { x: number; y: number }[] = [];

      onClick.on(() => {
        const event = onClick();
        if (event) clicks.push(event);
      });

      onClick.set({ x: 10, y: 20 });
      onClick.set({ x: 10, y: 20 }); // Same position - still triggers
      onClick.set({ x: 30, y: 40 });

      expect(clicks).toHaveLength(3);
    });

    it("should work with primitive event types", () => {
      const onKeyPress = signal<string>();
      const keys: string[] = [];

      onKeyPress.on(() => {
        const key = onKeyPress();
        if (key) keys.push(key);
      });

      onKeyPress.set("a");
      onKeyPress.set("a"); // Same key
      onKeyPress.set("b");
      onKeyPress.set("a"); // Back to 'a'

      expect(keys).toEqual(["a", "a", "b", "a"]);
    });
  });

  describe("integration with operators", () => {
    it("should work with refreshOn operator", async () => {
      const { refreshOn } = await import("./op/on");

      const refreshTrigger = signal<void>();
      let computeCount = 0;

      const data = signal({ dep: signal(0) }, () => {
        computeCount++;
        return computeCount;
      });

      data.pipe(refreshOn(refreshTrigger));

      // Initial compute
      data();
      expect(computeCount).toBe(1);

      // Trigger refresh
      refreshTrigger.set(undefined as void);
      await Promise.resolve();
      data();
      expect(computeCount).toBe(2);

      // Trigger again (same value - void)
      refreshTrigger.set(undefined as void);
      await Promise.resolve();
      data();
      expect(computeCount).toBe(3);

      data.dispose();
    });

    it("should work with staleOn operator", async () => {
      const { staleOn } = await import("./op/on");

      const invalidate = signal<void>();
      let computeCount = 0;

      const data = signal({ dep: signal(0) }, () => {
        computeCount++;
        return computeCount;
      });

      data.pipe(staleOn(invalidate));

      // Initial compute
      data();
      expect(computeCount).toBe(1);

      // Mark stale
      invalidate.set(undefined as void);
      data();
      expect(computeCount).toBe(2);

      // Mark stale again (same value - void)
      invalidate.set(undefined as void);
      data();
      expect(computeCount).toBe(3);

      data.dispose();
    });
  });

  describe("comparison with regular signal", () => {
    it("regular signal does NOT trigger on same value", () => {
      const regular = signal("initial");
      const listener = vi.fn();

      regular.on(listener);

      regular.set("new");
      expect(listener).toHaveBeenCalledTimes(1);

      regular.set("new"); // Same value - NO trigger
      expect(listener).toHaveBeenCalledTimes(1);

      regular.set("another");
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it("empty signal (notifier) triggers on every set", () => {
      const notifier = signal<string>();
      const listener = vi.fn();

      notifier.on(listener);

      notifier.set("new");
      expect(listener).toHaveBeenCalledTimes(1);

      notifier.set("new"); // Same value - STILL triggers
      expect(listener).toHaveBeenCalledTimes(2);

      notifier.set("another");
      expect(listener).toHaveBeenCalledTimes(3);
    });
  });

  describe("type safety", () => {
    it("should enforce type on set()", () => {
      type MyAction = "start" | "stop" | "pause";
      const action = signal<MyAction>();

      // These should compile
      action.set("start");
      action.set("stop");
      action.set("pause");

      // Reading returns T | undefined
      const current: MyAction | undefined = action();
      expect(["start", "stop", "pause", undefined]).toContain(current);
    });

    it("should work with complex union types", () => {
      type Event =
        | { type: "click"; x: number; y: number }
        | { type: "scroll"; delta: number }
        | { type: "resize"; width: number; height: number };

      const event = signal<Event>();
      const events: Event[] = [];

      event.on(() => {
        const e = event();
        if (e) events.push(e);
      });

      event.set({ type: "click", x: 10, y: 20 });
      event.set({ type: "scroll", delta: -100 });
      event.set({ type: "resize", width: 1920, height: 1080 });

      expect(events).toHaveLength(3);
      expect(events[0].type).toBe("click");
      expect(events[1].type).toBe("scroll");
      expect(events[2].type).toBe("resize");
    });
  });

  describe("cleanup", () => {
    it("should properly dispose", () => {
      const notifier = signal<string>();
      const listener = vi.fn();

      notifier.on(listener);

      notifier.set("test");
      expect(listener).toHaveBeenCalledTimes(1);

      notifier.dispose();

      // After dispose, set should throw
      expect(() => notifier.set("after")).toThrow();
    });

    it("should unsubscribe properly", () => {
      const notifier = signal<string>();
      const listener = vi.fn();

      const unsubscribe = notifier.on(listener);

      notifier.set("test1");
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      notifier.set("test2");
      expect(listener).toHaveBeenCalledTimes(1); // Not called again
    });
  });
});
