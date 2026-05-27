import { describe, expect, it } from "vitest";

import {
  extractPublicFeedItems,
  selectSmokeTargetsByType,
} from "./check-public-detail-visual-smoke";

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
});
