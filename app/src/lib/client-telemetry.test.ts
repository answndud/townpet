import { afterEach, describe, expect, it, vi } from "vitest";

import { isClientTelemetryEnabled } from "@/lib/client-telemetry";

describe("client telemetry flag", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is disabled by default for solo operations", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_CLIENT_TELEMETRY", "");

    expect(isClientTelemetryEnabled()).toBe(false);
  });

  it("is enabled only by explicit opt-in", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_CLIENT_TELEMETRY", "1");

    expect(isClientTelemetryEnabled()).toBe(true);
  });
});
