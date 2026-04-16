import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

import {
  isAdminProtectedPath,
  isGuestSearchPath,
  isGuestPostDetailPath,
  isPrefetchRequest,
  isNicknameRequiredProfilePath,
  middleware,
  resolveCspHeaders,
} from "../middleware";
import { getToken } from "next-auth/jwt";

const getTokenMock = vi.mocked(getToken);

beforeEach(() => {
  getTokenMock.mockReset();
  delete process.env.AUTH_SECRET;
  delete process.env.NEXTAUTH_SECRET;
});

describe("resolveCspHeaders", () => {
  it("uses static fallback CSP with strict report-only policy in production", () => {
    const result = resolveCspHeaders({ nodeEnv: "production", nonce: "nonce-a" });

    expect(result.csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(result.csp).not.toContain("'nonce-nonce-a'");
    expect(result.cspReportOnly).toContain("script-src 'self' 'nonce-nonce-a'");
    expect(result.cspReportOnly).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  it("enforces strict nonce CSP in production when the flag is enabled", () => {
    const result = resolveCspHeaders({
      nodeEnv: "production",
      cspEnforceStrict: "1",
      nonce: "nonce-b",
    });

    expect(result.csp).toContain("script-src 'self' 'nonce-nonce-b' 'strict-dynamic'");
    expect(result.csp).not.toContain("'unsafe-inline'");
    expect(result.csp).toContain("style-src 'self' 'nonce-nonce-b' 'unsafe-hashes'");
    expect(result.csp).toContain("'sha256-zlqnbDt84zf1iSefLU/ImC54isoprH/MRiVZGskwexk='");
    expect(result.csp).toContain("'sha256-32t0bJPIyxns/QqsW8RE3JGUERKnHL5RygHBgJvEanc='");
    expect(result.cspReportOnly).toBeNull();
  });

  it("keeps development CSP without report-only", () => {
    const result = resolveCspHeaders({ nodeEnv: "development", nonce: "nonce-c" });

    expect(result.csp).toContain("'unsafe-eval'");
    expect(result.csp).toContain("'nonce-nonce-c'");
    expect(result.cspReportOnly).toBeNull();
  });
});

describe("isGuestPostDetailPath", () => {
  const postId = "c1234567890abcdefghijklmn";

  it("returns true for post detail id path", () => {
    expect(isGuestPostDetailPath(`/posts/${postId}`)).toBe(true);
  });

  it("returns true for guest detail path", () => {
    expect(isGuestPostDetailPath(`/posts/${postId}/guest`)).toBe(true);
  });

  it("returns false for new post path", () => {
    expect(isGuestPostDetailPath("/posts/new")).toBe(false);
  });

  it("returns false for edit path", () => {
    expect(isGuestPostDetailPath(`/posts/${postId}/edit`)).toBe(false);
  });

  it("returns false for non-id path", () => {
    expect(isGuestPostDetailPath("/posts/not-an-id")).toBe(false);
  });
});

describe("isGuestSearchPath", () => {
  it("returns true for search root path", () => {
    expect(isGuestSearchPath("/search")).toBe(true);
  });

  it("returns true for guest search rewrite path", () => {
    expect(isGuestSearchPath("/search/guest")).toBe(true);
  });

  it("returns false for unrelated path", () => {
    expect(isGuestSearchPath("/feed")).toBe(false);
  });
});

describe("isAdminProtectedPath", () => {
  it("returns true for admin page path", () => {
    expect(isAdminProtectedPath("/admin/reports")).toBe(true);
  });

  it("returns true for admin api path", () => {
    expect(isAdminProtectedPath("/api/admin/auth-audits")).toBe(true);
  });

  it("returns false for unrelated path", () => {
    expect(isAdminProtectedPath("/main")).toBe(false);
  });
});

describe("isNicknameRequiredProfilePath", () => {
  it("allows profile path", () => {
    expect(isNicknameRequiredProfilePath("/profile")).toBe(true);
  });

  it("allows profile sub-path", () => {
    expect(isNicknameRequiredProfilePath("/profile/security")).toBe(true);
  });

  it("allows api path", () => {
    expect(isNicknameRequiredProfilePath("/api/auth/session")).toBe(true);
  });

  it("blocks feed path", () => {
    expect(isNicknameRequiredProfilePath("/feed")).toBe(false);
  });
});

describe("isPrefetchRequest", () => {
  it("returns true when purpose header is prefetch", () => {
    const headers = new Headers({ purpose: "prefetch" });
    expect(isPrefetchRequest(headers)).toBe(true);
  });

  it("returns true when next-router-prefetch header is set", () => {
    const headers = new Headers({ "next-router-prefetch": "1" });
    expect(isPrefetchRequest(headers)).toBe(true);
  });

  it("returns false for normal request headers", () => {
    const headers = new Headers();
    expect(isPrefetchRequest(headers)).toBe(false);
  });
});

describe("middleware admin path protection", () => {
  it("returns not found for anonymous admin page access", async () => {
    const request = new NextRequest("https://townpet.test/admin/reports");

    const response = await middleware(request);

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
  });

  it("attempts session resolution for admin paths when a session cookie exists", async () => {
    process.env.AUTH_SECRET = "test-auth-secret";
    getTokenMock.mockResolvedValue(null);
    const request = new NextRequest("https://townpet.test/admin/reports", {
      headers: {
        cookie: "townpet.session-token=fake-session",
      },
    });

    const response = await middleware(request);

    expect(getTokenMock).toHaveBeenCalledOnce();
    expect(response.status).toBe(404);
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
  });
});

describe("middleware guest feed rewrite", () => {
  it("uses static CSP for guest feed shell rewrites", async () => {
    process.env.CSP_ENFORCE_STRICT = "1";

    const request = new NextRequest("https://townpet.test/feed");
    const response = await middleware(request);

    expect(response.headers.get("cache-control")).toBe(
      "public, s-maxage=60, stale-while-revalidate=300",
    );
    expect(response.headers.get("content-security-policy")).toContain("script-src 'self' 'unsafe-inline'");
    expect(response.headers.get("content-security-policy")).not.toContain("'strict-dynamic'");
    expect(response.headers.get("x-nonce")).toBeNull();
    expect(response.headers.get("x-csp-nonce")).toBeNull();
  });

  it("keeps static CSP on the rewritten /feed/guest shell path", async () => {
    process.env.CSP_ENFORCE_STRICT = "1";

    const request = new NextRequest("https://townpet.test/feed/guest");
    const response = await middleware(request);

    expect(response.headers.get("content-security-policy")).toContain(
      "script-src 'self' 'unsafe-inline'",
    );
    expect(response.headers.get("content-security-policy")).not.toContain("'strict-dynamic'");
    expect(response.headers.get("x-nonce")).toBeNull();
    expect(response.headers.get("x-csp-nonce")).toBeNull();
  });
});
