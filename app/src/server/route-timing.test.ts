import { describe, expect, it } from "vitest";

import { buildServerTimingHeader, createRouteTimingTracker } from "@/server/route-timing";

describe("route timing helpers", () => {
  it("formats server timing phases with a total entry", () => {
    expect(buildServerTimingHeader({ db: 12.34, cache: 0 }, 13.4)).toBe(
      "db;dur=12.3, cache;dur=0.0, total;dur=13.4",
    );
  });

  it("measures async phases without leaking implementation details", async () => {
    let now = 100;
    const tracker = createRouteTimingTracker(() => now);

    const result = await tracker.measure("query", async () => {
      now += 42;
      return "ok";
    });
    now += 8;

    expect(result).toBe("ok");
    expect(tracker.summary()).toEqual({
      totalMs: 50,
      phases: { query: 42 },
    });
  });
});
