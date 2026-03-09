import { afterEach, describe, expect, it, vi } from "vitest";

import {
  emitPostCommentCountSync,
  subscribePostCommentCountSync,
} from "@/lib/post-comment-count-sync";

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

describe("post comment count sync", () => {
  it("delivers payloads to window listeners", () => {
    const fakeWindow = new EventTarget();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: fakeWindow,
      writable: true,
    });

    const listener = vi.fn();
    const unsubscribe = subscribePostCommentCountSync(listener);

    emitPostCommentCountSync({ postId: "post-1", count: 12 });

    expect(listener).toHaveBeenCalledWith({ postId: "post-1", count: 12 });
    unsubscribe();
  });

  it("fails closed without window", () => {
    // @ts-expect-error node env fallback coverage
    delete globalThis.window;

    const unsubscribe = subscribePostCommentCountSync(() => undefined);

    expect(() => emitPostCommentCountSync({ postId: "post-2", count: 3 })).not.toThrow();
    expect(() => unsubscribe()).not.toThrow();
  });
});
