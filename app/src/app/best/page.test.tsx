import { describe, expect, it, vi } from "vitest";

import BestAliasPage from "@/app/best/page";

const { mockRedirect, redirectError } = vi.hoisted(() => {
  const redirectError = new Error("NEXT_REDIRECT");
  const mockRedirect = vi.fn((url: string) => {
    void url;
    throw redirectError;
  });

  return { mockRedirect, redirectError };
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

describe("BestAliasPage", () => {
  it("redirects public popular feed aliases to the guest canonical feed", () => {
    expect(() => BestAliasPage()).toThrow(redirectError);

    expect(mockRedirect).toHaveBeenCalledWith("/feed/guest?mode=BEST");
  });
});
