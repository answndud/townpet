import { afterEach, describe, expect, it, vi } from "vitest";

import {
  formatOperatorContentPublicSmoke,
  main,
  resolveOperatorContentPublicSmokeConfig,
  runOperatorContentPublicSmoke,
  runOperatorContentPublicSmokeCli,
} from "./check-operator-content-public-smoke";

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function htmlResponse(html: string) {
  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html" },
  });
}

function createPassingFetcher() {
  return async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("/api/feed/guest")) {
      return jsonResponse({
        ok: true,
        feed: {
          items: [
            {
              id: "post-1",
              title: "반려생활 정보는 이렇게 모읍니다",
              isOperatorContent: true,
              operatorSourceName: "TownPet 운영 기준",
              operatorSourceUrl: "https://townpet.vercel.app/campaigns/neighborhood-map",
              operatorLastVerifiedAt: "2026-05-24T00:00:00.000Z",
            },
          ],
        },
      });
    }
    if (url.includes("/posts/post-1/guest")) {
      return htmlResponse("운영자 정리 TownPet 운영 기준 반려생활 정보는 이렇게 모읍니다");
    }
    if (url.includes("/feed/guest")) {
      return htmlResponse("TownPet");
    }
    if (url.includes("/api/search/guest")) {
      return jsonResponse({
        ok: true,
        data: {
          items: [{ id: "post-1", title: "반려생활 정보는 이렇게 모읍니다" }],
        },
      });
    }
    if (url.includes("/search/guest")) {
      return htmlResponse("TownPet 반려생활 정보는 이렇게 모읍니다");
    }
    if (url.includes("/api/home/feed")) {
      return jsonResponse({
        ok: true,
        latest: [{ id: "post-1", title: "반려생활 정보는 이렇게 모읍니다" }],
        featured: [],
      });
    }

    return new Response("not found", { status: 404 });
  };
}

describe("operator content public smoke", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes when operator content appears in feed, detail, search, and home preview", async () => {
    const fetcher = createPassingFetcher();

    const result = await runOperatorContentPublicSmoke({
      baseUrl: "https://townpet.example",
      fetcher: fetcher as typeof fetch,
    });

    expect(result.status).toBe("PASS");
    expect(result.operatorItems).toHaveLength(1);
    expect(result.checks.map((check) => check.status)).toEqual([
      "PASS",
      "PASS",
      "PASS",
      "PASS",
      "PASS",
      "PASS",
    ]);
    expect(formatOperatorContentPublicSmoke(result)).toContain("status: PASS");
  });

  it("resolves CLI env, output, and pass exit code without using the network", async () => {
    const config = resolveOperatorContentPublicSmokeConfig({
      NODE_ENV: "test",
      OPS_BASE_URL: "https://townpet.example///",
      OPERATOR_CONTENT_SMOKE_MIN_COUNT: "1",
    });
    const cliResult = await runOperatorContentPublicSmokeCli({
      env: {
        NODE_ENV: "test",
        OPS_BASE_URL: "https://townpet.example///",
        OPERATOR_CONTENT_SMOKE_MIN_COUNT: "1",
      },
      fetcher: createPassingFetcher() as typeof fetch,
    });

    expect(config).toEqual({ baseUrl: "https://townpet.example///", minCount: 1 });
    expect(cliResult.exitCode).toBe(0);
    expect(cliResult.output).toContain("status: PASS");
    expect(cliResult.output).toContain("baseUrl: https://townpet.example");
  });

  it("returns a blocked exit code instead of exiting inside the testable CLI runner", async () => {
    const fetcher = async () =>
      jsonResponse({
        ok: true,
        feed: { items: [] },
      });

    const cliResult = await runOperatorContentPublicSmokeCli({
      env: { NODE_ENV: "test" },
      fetcher: fetcher as typeof fetch,
    });

    expect(cliResult.exitCode).toBe(1);
    expect(cliResult.output).toContain("status: BLOCKED");
  });

  it("prints CLI output through main on pass", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const output = await main({
      env: { NODE_ENV: "test", OPS_BASE_URL: "https://townpet.example" },
      fetcher: createPassingFetcher() as typeof fetch,
    });

    expect(output).toContain("Operator content public smoke");
    expect(log).toHaveBeenCalledWith(output);
  });

  it("blocks when no operator content has been posted yet", async () => {
    const fetcher = async () =>
      jsonResponse({
        ok: true,
        view: "feed",
        feed: { items: [] },
      });

    const result = await runOperatorContentPublicSmoke({
      baseUrl: "https://townpet.example",
      fetcher: fetcher as typeof fetch,
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.operatorItems).toHaveLength(0);
    expect(result.checks).toEqual([
      {
        key: "api_feed_guest_operator_items",
        status: "BLOCKED",
        detail: "found=0, required=1",
      },
    ]);
  });

  it("supports jsonOk-wrapped API payloads", async () => {
    const fetcher = async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/api/feed/guest")) {
        return jsonResponse({
          ok: true,
          data: {
            view: "feed",
            feed: {
              items: [
                {
                  id: "post-1",
                  title: "야간 산책 전 확인할 것",
                  isOperatorContent: true,
                  operatorSourceName: "TownPet 산책코스 작성 기준",
                  operatorSourceUrl: "https://townpet.vercel.app/posts/new?type=WALK_ROUTE",
                  operatorLastVerifiedAt: "2026-05-24T00:00:00.000Z",
                },
              ],
            },
          },
        });
      }
      if (url.includes("/posts/post-1/guest")) {
        return htmlResponse("운영자 정리 TownPet 산책코스 작성 기준 야간 산책 전 확인할 것");
      }
      if (url.includes("/feed/guest")) {
        return htmlResponse("TownPet");
      }
      if (url.includes("/api/search/guest")) {
        return jsonResponse({
          ok: true,
          data: {
            items: [{ id: "post-1", title: "야간 산책 전 확인할 것" }],
          },
        });
      }
      if (url.includes("/search/guest")) {
        return htmlResponse("TownPet 야간 산책 전 확인할 것");
      }
      if (url.includes("/api/home/feed")) {
        return jsonResponse({
          ok: true,
          data: {
            latest: [{ id: "post-1", title: "야간 산책 전 확인할 것" }],
            featured: [],
          },
        });
      }

      return new Response("not found", { status: 404 });
    };

    const result = await runOperatorContentPublicSmoke({
      baseUrl: "https://townpet.example",
      fetcher: fetcher as typeof fetch,
    });

    expect(result.status).toBe("PASS");
    expect(result.operatorItems[0].title).toBe("야간 산책 전 확인할 것");
  });

  it("blocks when the legacy search shell is reachable but the search API misses the operator item", async () => {
    const fetcher = async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/api/feed/guest")) {
        return jsonResponse({
          ok: true,
          feed: {
            items: [
              {
                id: "post-1",
                title: "분실동물 공개 제보 예시와 위치 기준",
                isOperatorContent: true,
                operatorSourceName: "TownPet 분실동물 작성 기준",
                operatorSourceUrl: "https://townpet.vercel.app/posts/new?type=LOST_FOUND",
                operatorLastVerifiedAt: "2026-05-24T00:00:00.000Z",
              },
            ],
          },
        });
      }
      if (url.includes("/posts/post-1/guest")) {
        return htmlResponse("운영자 정리 TownPet 분실동물 작성 기준 분실동물 공개 제보 예시와 위치 기준");
      }
      if (url.includes("/feed/guest")) {
        return htmlResponse("TownPet");
      }
      if (url.includes("/api/search/guest")) {
        return jsonResponse({
          ok: true,
          data: {
            items: [],
          },
        });
      }
      if (url.includes("/search/guest")) {
        return htmlResponse("TownPet 분실동물 공개 제보 예시와 위치 기준");
      }
      if (url.includes("/api/home/feed")) {
        return jsonResponse({
          ok: true,
          latest: [{ id: "post-1", title: "분실동물 공개 제보 예시와 위치 기준" }],
          featured: [],
        });
      }

      return new Response("not found", { status: 404 });
    };

    const result = await runOperatorContentPublicSmoke({
      baseUrl: "https://townpet.example",
      fetcher: fetcher as typeof fetch,
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.checks).toContainEqual({
      key: "search_guest_result",
      status: "BLOCKED",
      detail: "query=분실동물 공개 제보 예시와 위치 기준",
    });
    expect(result.checks).toContainEqual({
      key: "search_guest_legacy_redirect",
      status: "PASS",
      detail: "legacy search page converges to feed shell",
    });
  });
});
