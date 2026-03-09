import { afterEach, describe, expect, it, vi } from "vitest";

import { emitViewerShellSync, subscribeViewerShellSync } from "@/lib/viewer-shell-sync";

const originalWindow = globalThis.window;

afterEach(() => {
  if (typeof originalWindow === "undefined") {
    // @ts-expect-error test cleanup for node env
    delete globalThis.window;
    return;
  }

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: originalWindow,
    writable: true,
  });
});

describe("viewer-shell-sync", () => {
  it("does not throw when window is unavailable", () => {
    // @ts-expect-error node env fallback coverage
    delete globalThis.window;

    expect(() => {
      const unsubscribe = subscribeViewerShellSync(() => undefined);
      emitViewerShellSync({ reason: "no-window" });
      unsubscribe();
    }).not.toThrow();
  });

  it("delivers sync payloads to subscribers", () => {
    const fakeWindow = new EventTarget();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: fakeWindow,
      writable: true,
    });

    const listener = vi.fn();
    const unsubscribe = subscribeViewerShellSync(listener);

    emitViewerShellSync({ reason: "preferred-pet-types-updated" });

    expect(listener).toHaveBeenCalledWith({
      reason: "preferred-pet-types-updated",
    });

    unsubscribe();
  });
});
