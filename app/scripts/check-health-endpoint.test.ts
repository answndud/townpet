import { describe, expect, it } from "vitest";

import {
  buildHealthEndpointUrl,
  buildHealthHeaders,
  normalizeBaseUrl,
} from "./check-health-endpoint";

describe("health endpoint helper", () => {
  it("normalizes trailing slashes before appending the health path", () => {
    expect(normalizeBaseUrl("https://townpet.vercel.app/")).toBe(
      "https://townpet.vercel.app",
    );
    expect(buildHealthEndpointUrl("https://townpet.vercel.app///")).toBe(
      "https://townpet.vercel.app/api/health",
    );
  });

  it("only adds the internal health token header when a token is provided", () => {
    expect(buildHealthHeaders("")).toEqual({
      accept: "application/json",
      "cache-control": "no-cache",
    });

    expect(buildHealthHeaders("secret-token")).toEqual({
      accept: "application/json",
      "cache-control": "no-cache",
      "x-health-token": "secret-token",
    });
  });
});
