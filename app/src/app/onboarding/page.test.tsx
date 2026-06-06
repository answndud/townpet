import { beforeEach, describe, expect, it, vi } from "vitest";

import OnboardingPage from "@/app/onboarding/page";
import { auth } from "@/lib/auth";
import { getUserWithNeighborhoods } from "@/server/queries/user.queries";

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

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/queries/user.queries", () => ({
  getUserWithNeighborhoods: vi.fn(),
}));

const mockAuth = vi.mocked(auth);
const mockGetUserWithNeighborhoods = vi.mocked(getUserWithNeighborhoods);

describe("OnboardingPage", () => {
  beforeEach(() => {
    mockRedirect.mockClear();
    mockAuth.mockReset();
    mockGetUserWithNeighborhoods.mockReset();
  });

  it("preserves onboarding as next path when unauthenticated users are redirected to login", async () => {
    mockAuth.mockResolvedValue(null as never);

    await expect(OnboardingPage()).rejects.toThrow(redirectError);

    expect(mockRedirect).toHaveBeenCalledWith("/login?next=%2Fonboarding");
    expect(mockGetUserWithNeighborhoods).not.toHaveBeenCalled();
  });

  it("preserves onboarding as next path when the session has no email", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } } as never);

    await expect(OnboardingPage()).rejects.toThrow(redirectError);

    expect(mockRedirect).toHaveBeenCalledWith("/login?next=%2Fonboarding");
    expect(mockGetUserWithNeighborhoods).not.toHaveBeenCalled();
  });

  it("preserves onboarding as next path when the session user no longer exists", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "user@townpet.dev" },
    } as never);
    mockGetUserWithNeighborhoods.mockResolvedValue(null);

    await expect(OnboardingPage()).rejects.toThrow(redirectError);

    expect(mockGetUserWithNeighborhoods).toHaveBeenCalledWith("user-1");
    expect(mockRedirect).toHaveBeenCalledWith("/login?next=%2Fonboarding");
  });
});
