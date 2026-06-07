import { describe, expect, it } from "vitest";

import { verifyGuestAuthorBackfill } from "./verify-guest-author-backfill";

function createFakePrisma(options: {
  hasPostLegacy: boolean;
  hasCommentLegacy: boolean;
  postRemaining?: number;
  commentRemaining?: number;
  guestAuthors?: number;
  guestPosts?: number;
  guestComments?: number;
}) {
  const legacyColumnResults = [
    [{ exists: options.hasPostLegacy }],
    [{ exists: options.hasCommentLegacy }],
  ];
  const remainingResults = [
    [{ count: options.postRemaining ?? 0 }],
    [{ count: options.commentRemaining ?? 0 }],
  ];

  return {
    $queryRawUnsafe: async <T = unknown>() => {
      if (legacyColumnResults.length > 0) {
        return legacyColumnResults.shift() as T;
      }
      return (remainingResults.shift() ?? [{ count: 0 }]) as T;
    },
    guestAuthor: {
      count: async () => options.guestAuthors ?? 0,
    },
    post: {
      count: async () => options.guestPosts ?? 0,
    },
    comment: {
      count: async () => options.guestComments ?? 0,
    },
    $disconnect: async () => {},
  };
}

describe("verify guest author backfill", () => {
  it("reports complete when legacy columns are already dropped", async () => {
    const payload = await verifyGuestAuthorBackfill(
      createFakePrisma({
        hasPostLegacy: false,
        hasCommentLegacy: false,
        guestAuthors: 10,
        guestPosts: 7,
        guestComments: 3,
      }),
    );

    expect(payload).toEqual({
      postRemaining: 0,
      commentRemaining: 0,
      guestAuthors: 10,
      guestPosts: 7,
      guestComments: 3,
      legacyColumnsPresent: false,
      complete: true,
    });
  });

  it("reports incomplete when legacy backfill rows remain", async () => {
    const payload = await verifyGuestAuthorBackfill(
      createFakePrisma({
        hasPostLegacy: true,
        hasCommentLegacy: true,
        postRemaining: 2,
        commentRemaining: 1,
      }),
    );

    expect(payload).toMatchObject({
      postRemaining: 2,
      commentRemaining: 1,
      legacyColumnsPresent: true,
      complete: false,
    });
  });
});
