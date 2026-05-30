import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { recordWebVitalSample } from "@/server/services/web-vitals.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    webVitalSample: {
      create: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  webVitalSample?: {
    create: ReturnType<typeof vi.fn>;
  };
};

describe("web vitals service", () => {
  beforeEach(() => {
    mockPrisma.webVitalSample = mockPrisma.webVitalSample ?? { create: vi.fn() };
    mockPrisma.webVitalSample.create.mockReset();
  });

  it("records compact route-level web vital samples", async () => {
    mockPrisma.webVitalSample?.create.mockResolvedValue({});

    const result = await recordWebVitalSample({
      metric: "LCP",
      value: 1234,
      rating: "GOOD",
      route: "/feed/guest",
      navigationType: "navigate",
      deviceType: "mobile",
      connectionType: "4g",
    });

    expect(result).toEqual({ ok: true, recorded: true });
    expect(mockPrisma.webVitalSample?.create).toHaveBeenCalledWith({
      data: {
        metric: "LCP",
        value: 1234,
        rating: "GOOD",
        route: "/feed/guest",
        navigationType: "navigate",
        deviceType: "mobile",
        connectionType: "4g",
      },
    });
  });

  it("returns schema sync required when delegate is unavailable", async () => {
    const original = mockPrisma.webVitalSample;
    delete mockPrisma.webVitalSample;

    const result = await recordWebVitalSample({
      metric: "TTFB",
      value: 120,
      rating: "GOOD",
      route: "/",
    });

    expect(result).toEqual({ ok: false, reason: "SCHEMA_SYNC_REQUIRED" });
    mockPrisma.webVitalSample = original;
  });

  it("returns schema sync required when table is missing", async () => {
    mockPrisma.webVitalSample?.create.mockRejectedValue(
      new Error("The table `public.WebVitalSample` does not exist"),
    );

    const result = await recordWebVitalSample({
      metric: "FCP",
      value: 900,
      rating: "GOOD",
      route: "/login",
    });

    expect(result).toEqual({ ok: false, reason: "SCHEMA_SYNC_REQUIRED" });
  });
});
