import { afterEach, describe, expect, it, vi } from "vitest";

import {
  emitNotificationUnreadSync,
  subscribeNotificationUnreadSync,
} from "@/lib/notification-unread-sync";

const originalWindow = globalThis.window;
const originalLocalStorage = globalThis.localStorage;

afterEach(() => {
  if (typeof originalWindow === "undefined") {
    // @ts-expect-error test cleanup for node env
    delete globalThis.window;
  } else {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
      writable: true,
    });
  }

  if (typeof originalLocalStorage === "undefined") {
    // @ts-expect-error test cleanup for node env
    delete globalThis.localStorage;
  } else {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: originalLocalStorage,
      writable: true,
    });
  }
});

describe("notification-unread-sync", () => {
  it("does not throw when window is unavailable", () => {
    // @ts-expect-error node env fallback coverage
    delete globalThis.window;

    expect(() => {
      const unsubscribe = subscribeNotificationUnreadSync(() => undefined);
      emitNotificationUnreadSync({ delta: -1 });
      unsubscribe();
    }).not.toThrow();
  });

  it("delivers local unread sync payloads", () => {
    const fakeWindow = new EventTarget();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: fakeWindow,
      writable: true,
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        setItem: vi.fn(),
      },
      writable: true,
    });

    const listener = vi.fn();
    const unsubscribe = subscribeNotificationUnreadSync(listener);

    emitNotificationUnreadSync({ delta: -1, markReadIds: ["noti-1"] });

    expect(listener).toHaveBeenCalledWith({
      delta: -1,
      markReadIds: ["noti-1"],
    });

    unsubscribe();
  });

  it("broadcasts unread payloads through storage events", () => {
    const fakeWindow = new EventTarget();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: fakeWindow,
      writable: true,
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        setItem: vi.fn(),
      },
      writable: true,
    });

    const listener = vi.fn();
    const unsubscribe = subscribeNotificationUnreadSync(listener);

    const storageEvent = new Event("storage") as StorageEvent;
    Object.defineProperties(storageEvent, {
      key: {
        configurable: true,
        value: "townpet:notification-unread-sync",
      },
      newValue: {
        configurable: true,
        value: JSON.stringify({ resetTo: 0, archiveIds: ["noti-9"], timestamp: Date.now() }),
      },
    });

    fakeWindow.dispatchEvent(storageEvent);

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        resetTo: 0,
        archiveIds: ["noti-9"],
      }),
    );

    unsubscribe();
  });
});
