import { beforeEach, describe, expect, it, vi } from "vitest";

import { canAccessInternalDiagnostics } from "@/server/internal-diagnostics-access";
import { getClientIp } from "@/server/request-context";

vi.mock("@/server/request-context", () => ({
  getClientIp: vi.fn(),
}));

const mockGetClientIp = vi.mocked(getClientIp);

describe("internal diagnostics access", () => {
  beforeEach(() => {
    mockGetClientIp.mockReset();
    mockGetClientIp.mockReturnValue("anonymous");
  });

  it("allows requests with a matching internal token", () => {
    const request = new Request("https://townpet.dev/api/health", {
      headers: {
        "x-health-token": "health-secret",
      },
    });

    expect(
      canAccessInternalDiagnostics(request, {
        configuredToken: "health-secret",
        isProduction: true,
      }),
    ).toBe(true);
  });

  it("allows localhost requests without a token only in non-production", () => {
    const request = new Request("http://localhost:3000/api/health");

    expect(
      canAccessInternalDiagnostics(request, {
        configuredToken: "",
        isProduction: false,
      }),
    ).toBe(true);
  });

  it("rejects non-local requests without a token even in non-production", () => {
    const request = new Request("https://preview.townpet.dev/api/health");

    expect(
      canAccessInternalDiagnostics(request, {
        configuredToken: "",
        isProduction: false,
      }),
    ).toBe(false);
  });

  it("rejects localhost requests without a token when the client ip is not loopback", () => {
    mockGetClientIp.mockReturnValue("203.0.113.10");
    const request = new Request("http://localhost:3000/api/health", {
      headers: {
        "x-forwarded-for": "203.0.113.10",
      },
    });

    expect(
      canAccessInternalDiagnostics(request, {
        configuredToken: "",
        isProduction: false,
      }),
    ).toBe(false);
  });
});
