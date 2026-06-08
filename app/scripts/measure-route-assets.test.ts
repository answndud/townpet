import { describe, expect, it } from "vitest";

import {
  buildAssetTargets,
  calculateDocumentIncludedTransferBytes,
  filterAssetTargets,
  parseAssetTargetFilter,
} from "./measure-route-assets";

describe("route asset target selection", () => {
  it("keeps default asset targets when PERF_ASSET_TARGETS is empty", () => {
    const targets = buildAssetTargets({});

    expect(targets).toEqual([
      { label: "home", path: "/" },
      { label: "login", path: "/login" },
      { label: "guest_feed", path: "/feed/guest", visibleSelector: "#feed-list" },
      { label: "static_probe", path: "/perf-static-baseline.txt" },
    ]);
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

  it("builds public guest post detail path from PERF_POST_ID", () => {
    const targets = buildAssetTargets({
      PERF_POST_ID: "post 1",
      PERF_ASSET_TARGETS: "post_detail",
    });

    expect(targets).toEqual([
      {
        label: "post_detail",
        path: "/posts/post%201/guest",
      },
    ]);
  });

  it("adds normalized asset extra paths that can be selected by label", () => {
    const targets = buildAssetTargets({
      PERF_ASSET_EXTRA_PATHS: "login, /feed/guest",
      PERF_ASSET_TARGETS: "extra_1,extra_2",
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

  it("adds document bytes to resource transfer for document-inclusive totals", () => {
    expect(
      calculateDocumentIncludedTransferBytes({
        documentBytes: 76_542,
        totalTransferBytes: 193_402,
      }),
    ).toBe(269_944);
  });
});
