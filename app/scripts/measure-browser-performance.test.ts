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

  it("builds public guest post detail path from PERF_POST_ID", () => {
    const targets = buildBrowserTargets({
      PERF_POST_ID: "post 1",
      PERF_BROWSER_TARGETS: "post_detail",
    });

    expect(targets).toEqual([
      {
        label: "post_detail",
        path: "/posts/post%201/guest",
      },
    ]);
  });

  it("adds normalized browser extra paths that can be selected by label", () => {
    const targets = buildBrowserTargets({
      PERF_BROWSER_EXTRA_PATHS: "login, /feed/guest",
      PERF_BROWSER_TARGETS: "extra_1,extra_2",
    });

    expect(targets).toEqual([
      {
        label: "extra_1",
        path: "/login",
      },
      {
        label: "extra_2",
        path: "/feed/guest",
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
