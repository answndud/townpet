import { describe, expect, it } from "vitest";

import {
  buildAssetTargets,
  filterAssetTargets,
  parseAssetTargetFilter,
} from "./measure-route-assets";

describe("route asset target selection", () => {
  it("keeps default asset targets when PERF_ASSET_TARGETS is empty", () => {
    const targets = buildAssetTargets({});

    expect(targets.map((target) => target.label)).toEqual(["home", "login", "guest_feed"]);
  });

  it("adds and selects public post detail when PERF_POST_PATH and PERF_ASSET_TARGETS are set", () => {
    const targets = buildAssetTargets({
      PERF_POST_PATH: "/posts/post-1/guest",
      PERF_ASSET_TARGETS: "post_detail",
    });

    expect(targets).toEqual([
      {
        label: "post_detail",
        path: "/posts/post-1/guest",
      },
    ]);
  });

  it("deduplicates comma-separated asset target labels while preserving order", () => {
    expect(parseAssetTargetFilter("guest_feed, post_detail,guest_feed")).toEqual([
      "guest_feed",
      "post_detail",
    ]);
  });

  it("rejects unknown asset target labels", () => {
    expect(() => filterAssetTargets([{ label: "home", path: "/" }], "home,missing")).toThrow(
      "PERF_ASSET_TARGETS contains unknown target(s): missing",
    );
  });
});
