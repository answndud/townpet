import { describe, expect, it } from "vitest";

import { resolveSafeRedirectPath } from "@/lib/redirect-path";

describe("resolveSafeRedirectPath", () => {
  it("keeps single-slash relative paths with query and hash", () => {
    expect(resolveSafeRedirectPath("/posts/abc?tab=comments#comment-1", "/feed")).toBe(
      "/posts/abc?tab=comments#comment-1",
    );
  });

  it("falls back when value is empty or not relative", () => {
    expect(resolveSafeRedirectPath(undefined, "/feed")).toBe("/feed");
    expect(resolveSafeRedirectPath("https://evil.example", "/feed")).toBe("/feed");
    expect(resolveSafeRedirectPath("javascript:alert(1)", "/feed")).toBe("/feed");
  });

  it("rejects protocol-relative and backslash-based paths", () => {
    expect(resolveSafeRedirectPath("//evil.example", "/feed")).toBe("/feed");
    expect(resolveSafeRedirectPath("/\\evil.example", "/feed")).toBe("/feed");
    expect(resolveSafeRedirectPath("/posts\\evil", "/feed")).toBe("/feed");
  });

  it("rejects control characters and normalizes surrounding whitespace", () => {
    expect(resolveSafeRedirectPath(" /feed?tab=latest ", "/login")).toBe("/feed?tab=latest");
    expect(resolveSafeRedirectPath("/feed\nx", "/login")).toBe("/login");
  });
});
