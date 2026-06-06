import { describe, expect, it } from "vitest";

import {
  buildBrowserTargets,
  filterBrowserTargets,
  parseBrowserTargetFilter,
} from "./measure-browser-performance";

describe("browser performance target selection", () => {
  it("keeps default browser targets when PERF_BROWSER_TARGETS is empty", () => {
    const targets = buildBrowserTargets({});

    expect(targets.map((target) => target.label)).toEqual(["home", "login", "guest_feed"]);
  });

  it("adds and selects public post detail when PERF_POST_PATH and PERF_BROWSER_TARGETS are set", () => {
    const targets = buildBrowserTargets({
      PERF_POST_PATH: "/posts/post-1/guest",
      PERF_BROWSER_TARGETS: "post_detail",
    });

    expect(targets).toEqual([
      {
        label: "post_detail",
        path: "/posts/post-1/guest",
      },
    ]);
  });

  it("deduplicates comma-separated browser target labels while preserving order", () => {
    expect(parseBrowserTargetFilter("guest_feed, post_detail,guest_feed")).toEqual([
      "guest_feed",
      "post_detail",
    ]);
  });

  it("rejects unknown browser target labels", () => {
    expect(() =>
      filterBrowserTargets([{ label: "home", path: "/" }], "home,missing"),
    ).toThrow("PERF_BROWSER_TARGETS contains unknown target(s): missing");
  });
});
