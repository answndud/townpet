import { describe, expect, it, vi } from "vitest";

import {
  buildPublicDetailVisualSmokeMarkdown,
  extractPublicFeedItems,
  main,
  parseSmokeTypes,
  publicDetailSmokePassed,
  resolvePublicDetailVisualSmokeConfig,
  runPublicDetailVisualSmoke,
  selectSmokeTargetsByType,
  type SmokeResult,
} from "./check-public-detail-visual-smoke";

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function createFeedFetcher() {
  return async () =>
    jsonResponse({
      data: {
        feed: {
          items: [
            {
              id: "post-free",
              title: "자유 게시글",
              type: "FREE_BOARD",
              isOperatorContent: true,
              operatorSourceName: "TownPet 운영 기준",
            },
          ],
        },
      },
    });
}

function createSmokeResult(params: Partial<SmokeResult> = {}): SmokeResult {
  return {
    targetType: "FREE_BOARD",
    targetTitle: "자유 게시글",
    profile: "desktop",
    url: "https://townpet.example/posts/post-free/guest",
    screenshot: "/tmp/FREE_BOARD-desktop.png",
    titleVisible: true,
    hasCommentSection: true,
    hasReportEntry: true,
    hasOperatorSource: true,
    noHorizontalOverflow: true,
    ...params,
  };
}

describe("public detail visual smoke", () => {
  it("extracts public feed items from jsonOk-wrapped guest feed payload", () => {
    expect(
      extractPublicFeedItems({
        data: {
          feed: {
            items: [
              {
                id: "post-1",
                title: "야간 산책 전 확인할 것",
                isOperatorContent: true,
                operatorSourceName: "TownPet 산책코스 작성 기준",
              },
              {
                id: "post-2",
                title: "id 없는 글은 제외되지 않는 정상 글",
              },
            ],
          },
        },
      }),
    ).toEqual([
      {
        id: "post-1",
        title: "야간 산책 전 확인할 것",
        type: "UNKNOWN",
        isOperatorContent: true,
        operatorSourceName: "TownPet 산책코스 작성 기준",
      },
      {
        id: "post-2",
        title: "id 없는 글은 제외되지 않는 정상 글",
        type: "UNKNOWN",
        isOperatorContent: false,
        operatorSourceName: null,
      },
    ]);
  });

  it("ignores malformed feed items without id or title", () => {
    expect(
      extractPublicFeedItems({
        feed: {
          items: [
            { id: "post-1" },
            { title: "제목만 있는 글" },
            { id: "post-2", title: "정상 글" },
          ],
        },
      }),
    ).toEqual([
      {
        id: "post-2",
        title: "정상 글",
        type: "UNKNOWN",
        isOperatorContent: false,
        operatorSourceName: null,
      },
    ]);
  });

  it("selects one smoke target per requested public post type", () => {
    const items = extractPublicFeedItems({
      data: {
        feed: {
          items: [
            {
              id: "post-free",
              title: "자유 게시글",
              type: "FREE_BOARD",
            },
            {
              id: "post-walk",
              title: "산책 게시글",
              type: "WALK_ROUTE",
              isOperatorContent: true,
            },
          ],
        },
      },
    });

    expect(selectSmokeTargetsByType(items, ["WALK_ROUTE", "FREE_BOARD", "LOST_FOUND"])).toEqual([
      {
        type: "WALK_ROUTE",
        target: {
          id: "post-walk",
          title: "산책 게시글",
          type: "WALK_ROUTE",
          isOperatorContent: true,
          operatorSourceName: null,
        },
      },
      {
        type: "FREE_BOARD",
        target: {
          id: "post-free",
          title: "자유 게시글",
          type: "FREE_BOARD",
          isOperatorContent: false,
          operatorSourceName: null,
        },
      },
      {
        type: "LOST_FOUND",
        target: null,
      },
    ]);
  });

  it("keeps protected auth/local detail types out of the public default smoke set", () => {
    expect(parseSmokeTypes(undefined)).toEqual([
      "FREE_BOARD",
      "WALK_ROUTE",
      "LOST_FOUND",
      "MARKET_LISTING",
    ]);
  });

  it("resolves env config with deterministic report output directory", () => {
    expect(
      resolvePublicDetailVisualSmokeConfig({
        env: {
          NODE_ENV: "test",
          OPS_BASE_URL: "https://townpet.example///",
          PUBLIC_DETAIL_SMOKE_TYPES: "FREE_BOARD,WALK_ROUTE",
        },
        now: new Date("2026-01-02T03:04:05.000Z"),
        repoRoot: "/repo",
      }),
    ).toEqual({
      generatedAt: "2026-01-02T03:04:05.000Z",
      repoRoot: "/repo",
      baseUrl: "https://townpet.example",
      types: ["FREE_BOARD", "WALK_ROUTE"],
      outputDir: "/repo/docs/reports/public-detail-visual-smoke-2026-01-02T03-04-05-000Z",
    });
  });

  it("runs public detail visual smoke with injected browser, inspector, and report writer", async () => {
    const close = vi.fn().mockResolvedValue(undefined);
    const writeFile = vi.fn().mockResolvedValue(undefined);
    const inspectDetail = vi.fn(async ({ profile }: { profile: SmokeResult["profile"] }) =>
      createSmokeResult({ profile }),
    );

    const result = await runPublicDetailVisualSmoke({
      env: {
        NODE_ENV: "test",
        OPS_BASE_URL: "https://townpet.example",
        PUBLIC_DETAIL_SMOKE_TYPES: "FREE_BOARD",
      },
      now: new Date("2026-01-02T03:04:05.000Z"),
      repoRoot: "/repo",
      fetcher: createFeedFetcher() as typeof fetch,
      launchBrowser: async () => ({ close }) as never,
      inspectDetail: inspectDetail as never,
      writeFile: writeFile as never,
    });

    expect(result.exitCode).toBe(0);
    expect(result.results).toHaveLength(2);
    expect(result.output).toContain("FREE_BOARD/desktop: title=true");
    expect(inspectDetail).toHaveBeenCalledTimes(2);
    expect(writeFile).toHaveBeenCalledWith(
      "/repo/docs/reports/public-detail-visual-smoke-2026-01-02T03-04-05-000Z/README.md",
      expect.stringContaining("# Public Detail Visual Smoke"),
      "utf8",
    );
    expect(close).toHaveBeenCalledOnce();
  });

  it("returns a failed exit code when a visual assertion fails", async () => {
    const result = await runPublicDetailVisualSmoke({
      env: {
        NODE_ENV: "test",
        OPS_BASE_URL: "https://townpet.example",
        PUBLIC_DETAIL_SMOKE_TYPES: "FREE_BOARD",
      },
      repoRoot: "/repo",
      fetcher: createFeedFetcher() as typeof fetch,
      launchBrowser: async () => ({ close: vi.fn().mockResolvedValue(undefined) }) as never,
      inspectDetail: (async ({ profile }: { profile: SmokeResult["profile"] }) =>
        createSmokeResult({ profile, hasReportEntry: false })) as never,
      writeFile: vi.fn().mockResolvedValue(undefined) as never,
    });

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("report=false");
  });

  it("prints CLI output through main on pass", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const output = await main({
      env: {
        NODE_ENV: "test",
        OPS_BASE_URL: "https://townpet.example",
        PUBLIC_DETAIL_SMOKE_TYPES: "FREE_BOARD",
      },
      repoRoot: "/repo",
      fetcher: createFeedFetcher() as typeof fetch,
      launchBrowser: async () => ({ close: vi.fn().mockResolvedValue(undefined) }) as never,
      inspectDetail: (async ({ profile }: { profile: SmokeResult["profile"] }) =>
        createSmokeResult({ profile })) as never,
      writeFile: vi.fn().mockResolvedValue(undefined) as never,
    });

    expect(output).toContain("Public detail visual smoke written");
    expect(log).toHaveBeenCalledWith(output);
  });

  it("builds markdown with blocked target rows", () => {
    const markdown = buildPublicDetailVisualSmokeMarkdown({
      generatedAt: "2026-01-02T03:04:05.000Z",
      baseUrl: "https://townpet.example",
      targetEntries: [{ type: "LOST_FOUND", target: null }],
      results: [],
    });

    expect(markdown).toContain("blockedTypes: `LOST_FOUND`");
    expect(markdown).toContain("| LOST_FOUND | no public feed item | - | BLOCKED");
  });

  it("fails the smoke result when any requested type has no public target", () => {
    expect(
      publicDetailSmokePassed({
        targetEntries: [
          {
            type: "FREE_BOARD",
            target: {
              id: "post-free",
              title: "자유 게시글",
              type: "FREE_BOARD",
              isOperatorContent: false,
              operatorSourceName: null,
            },
          },
          { type: "HOSPITAL_REVIEW", target: null },
        ],
        results: [
          {
            targetType: "FREE_BOARD",
            targetTitle: "자유 게시글",
            profile: "desktop",
            url: "https://townpet.vercel.app/posts/post-free/guest",
            screenshot: "/tmp/free.png",
            titleVisible: true,
            hasCommentSection: true,
            hasReportEntry: true,
            hasOperatorSource: true,
            noHorizontalOverflow: true,
          },
        ],
      }),
    ).toBe(false);
  });
});
