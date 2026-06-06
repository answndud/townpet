import { describe, expect, it } from "vitest";

import { buildLoginRedirectPath, resolveSafeRedirectPath } from "@/lib/redirect-path";

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

describe("buildLoginRedirectPath", () => {
  it("builds login hrefs that preserve safe relative next paths", () => {
    expect(buildLoginRedirectPath("/onboarding")).toBe("/login?next=%2Fonboarding");
    expect(buildLoginRedirectPath("/feed?type=FREE_POST")).toBe(
      "/login?next=%2Ffeed%3Ftype%3DFREE_POST",
    );
  });

  it("falls back to root for unsafe next paths", () => {
    expect(buildLoginRedirectPath("https://evil.example")).toBe("/login?next=%2F");
    expect(buildLoginRedirectPath("//evil.example")).toBe("/login?next=%2F");
  });
});
