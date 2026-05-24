import { describe, expect, it } from "vitest";

import {
  formatOperatorContentPublicSmoke,
  runOperatorContentPublicSmoke,
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

describe("operator content public smoke", () => {
  it("passes when operator content appears in feed, detail, search, and home preview", async () => {
    const fetcher = async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/api/feed/guest")) {
        return jsonResponse({
          ok: true,
          view: "feed",
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
      if (url.includes("/search/guest")) {
        return htmlResponse("반려생활 정보는 이렇게 모읍니다");
      }
      if (url.includes("/api/home/feed")) {
        return jsonResponse({
          ok: true,
          latest: [{ id: "post-1", title: "반려생활 정보는 이렇게 모읍니다" }],
          best: [],
        });
      }

      return new Response("not found", { status: 404 });
    };

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
    ]);
    expect(formatOperatorContentPublicSmoke(result)).toContain("status: PASS");
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
      if (url.includes("/search/guest")) {
        return htmlResponse("야간 산책 전 확인할 것");
      }
      if (url.includes("/api/home/feed")) {
        return jsonResponse({
          ok: true,
          data: {
            latest: [{ id: "post-1", title: "야간 산책 전 확인할 것" }],
            best: [],
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
});
