import { describe, it, expect, vi } from "vitest";
import { createSignalContext } from "./createSignalContext";
import { emitter } from "./utils/emitter";
import { signal } from "./signal";

describe("createSignalContext", () => {
  it("should provide abortController lazily", () => {
    const deps = {};
    const onCleanup = emitter();
    const onDepChange = vi.fn();

    const context = createSignalContext(deps, onCleanup, onDepChange);

    // Access abortController - triggers lazy initialization
    const controller = context.abortController;
    expect(controller).toBeInstanceOf(AbortController);
    expect(controller.signal.aborted).toBe(false);

    // Should return same instance
    expect(context.abortController).toBe(controller);
  });

  it("should provide trackedDeps lazily", () => {
    const deps = {};
    const onCleanup = emitter();
    const onDepChange = vi.fn();

    const context = createSignalContext(deps, onCleanup, onDepChange);

    // Access trackedDeps - triggers lazy initialization
    const tracked = context.trackedDeps;
    expect(tracked).toBeInstanceOf(Set);
    expect(tracked.size).toBe(0);

    // Should return same instance
    expect(context.trackedDeps).toBe(tracked);
  });

  it("should provide abortSignal from lazy abortController", () => {
    const deps = {};
    const onCleanup = emitter();
    const onDepChange = vi.fn();

    const context = createSignalContext(deps, onCleanup, onDepChange);

    // Access abortSignal - triggers lazy initialization of abortController
    const abortSignal = context.abortSignal;
    expect(abortSignal).toBeInstanceOf(AbortSignal);
    expect(abortSignal.aborted).toBe(false);
  });

  it("should register cleanup functions", () => {
    const deps = {};
    const onCleanup = emitter();
    const onDepChange = vi.fn();
    const cleanupFn = vi.fn();

    const context = createSignalContext(deps, onCleanup, onDepChange);

    // Register cleanup
    context.cleanup(cleanupFn);

    // Emit cleanup
    onCleanup.emit();

    expect(cleanupFn).toHaveBeenCalledTimes(1);
  });

  it("should dispose internal resources", () => {
    const deps = {};
    const onCleanup = emitter();
    const onDepChange = vi.fn();

    const context = createSignalContext(deps, onCleanup, onDepChange);

    // Access resources to initialize them
    const controller = context.abortController;
    const tracked = context.trackedDeps;

    expect(controller.signal.aborted).toBe(false);
    expect(tracked.size).toBe(0);

    // Dispose
    context.dispose();

    // AbortController should be aborted
    expect(controller.signal.aborted).toBe(true);
  });

  it("should track dependencies via deps proxy", () => {
    const dep1 = signal(1);
    const dep2 = signal(2);
    const deps = { dep1, dep2 };
    const onCleanup = emitter();
    const onDepChange = vi.fn();

    const context = createSignalContext(deps, onCleanup, onDepChange);

    // Access deps - creates proxy
    const depsProxy = context.deps;

    // Access a dependency
    const value1 = depsProxy.dep1;
    expect(value1).toBe(1);

    // Should track the dependency
    expect(context.trackedDeps.has(dep1)).toBe(true);
    expect(context.trackedDeps.has(dep2)).toBe(false);

    // Access second dependency
    const value2 = depsProxy.dep2;
    expect(value2).toBe(2);
    expect(context.trackedDeps.has(dep2)).toBe(true);

    // Change a tracked dependency
    dep1.set(10);

    // onDepChange should be called
    expect(onDepChange).toHaveBeenCalled();
  });

  it("should not re-track already tracked dependencies", () => {
    const dep1 = signal(1);
    const deps = { dep1 };
    const onCleanup = emitter();
    const onDepChange = vi.fn();

    const context = createSignalContext(deps, onCleanup, onDepChange);

    // Access dependency multiple times
    context.deps.dep1;
    context.deps.dep1;
    context.deps.dep1;

    // Should only be tracked once
    expect(context.trackedDeps.size).toBe(1);
  });

  it("should return same deps proxy on multiple accesses", () => {
    const deps = { dep: signal(1) };
    const onCleanup = emitter();
    const onDepChange = vi.fn();

    const context = createSignalContext(deps, onCleanup, onDepChange);

    const proxy1 = context.deps;
    const proxy2 = context.deps;

    expect(proxy1).toBe(proxy2);
  });

  it("should clear tracked deps on dispose", () => {
    const dep = signal(1);
    const deps = { dep };
    const onCleanup = emitter();
    const onDepChange = vi.fn();

    const context = createSignalContext(deps, onCleanup, onDepChange);

    // Track a dependency
    context.deps.dep;
    expect(context.trackedDeps.size).toBe(1);

    // Dispose
    context.dispose();

    // Can still access trackedDeps, but it's been cleared internally
    // (new Set created on next access)
    const newTracked = context.trackedDeps;
    expect(newTracked.size).toBe(0);
  });
});

