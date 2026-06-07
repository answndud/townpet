import { PostStatus } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import {
  bumpPostIntegrityNotificationCaches,
  formatPostIntegrityRepairOutput,
  parseOptionalPositiveInteger,
  parseRepairScope,
} from "./repair-post-integrity";

describe("post integrity repair CLI wrapper", () => {
  it("parses optional positive integer limits", () => {
    expect(parseOptionalPositiveInteger(undefined, "LIMIT")).toBeUndefined();
    expect(parseOptionalPositiveInteger("", "LIMIT")).toBeUndefined();
    expect(parseOptionalPositiveInteger("7.9", "LIMIT")).toBe(7);
    expect(() => parseOptionalPositiveInteger("0", "LIMIT")).toThrow(
      "LIMIT must be a positive number when provided.",
    );
  });

  it("parses repair scope values", () => {
    expect(parseRepairScope(undefined)).toBe("ALL");
    expect(parseRepairScope("all")).toBe("ALL");
    expect(parseRepairScope("active")).toBe(PostStatus.ACTIVE);
    expect(parseRepairScope("hidden")).toBe(PostStatus.HIDDEN);
    expect(parseRepairScope("deleted")).toBe(PostStatus.DELETED);
    expect(() => parseRepairScope("archived")).toThrow(
      "POST_COUNT_REPAIR_SCOPE must be one of ALL, ACTIVE, HIDDEN, DELETED.",
    );
  });

  it("formats repair output with dry-run counters", () => {
    expect(
      formatPostIntegrityRepairOutput({
        dryRun: true,
        recountScope: "ALL",
        deletedPostRepair: {
          scannedPosts: 2,
          repairedPosts: 1,
          activeCommentsSoftDeleted: 3,
          commentReactionsRemoved: 4,
          postReactionsRemoved: 5,
          bookmarksRemoved: 6,
          notificationsArchived: 7,
          affectedNotificationUserIds: ["user-1"],
        },
        invalidNotificationRepair: {
          scannedNotifications: 8,
          archivedNotifications: 9,
          affectedUserIds: ["user-2"],
        },
        countRecount: {
          scannedPosts: 10,
          updatedPosts: 11,
          unchangedPosts: 12,
          updatedCommentCounts: 13,
          updatedLikeCounts: 14,
          updatedDislikeCounts: 15,
        },
      }),
    ).toBe(
      [
        "Post integrity repair",
        "- dryRun: yes",
        "- deletedPosts.scanned: 2",
        "- deletedPosts.repaired: 1",
        "- deletedPosts.activeCommentsSoftDeleted: 3",
        "- deletedPosts.commentReactionsRemoved: 4",
        "- deletedPosts.postReactionsRemoved: 5",
        "- deletedPosts.bookmarksRemoved: 6",
        "- deletedPosts.notificationsArchived: 7",
        "- invalidNotifications.scanned: 8",
        "- invalidNotifications.archived: 9",
        "- recount.scope: ALL",
        "- recount.scannedPosts: 10",
        "- recount.updatedPosts: 11",
        "- recount.unchangedPosts: 12",
        "- recount.updatedCommentCounts: 13",
        "- recount.updatedLikeCounts: 14",
        "- recount.updatedDislikeCounts: 15",
      ].join("\n"),
    );
  });

  it("dedupes notification cache bump user ids", async () => {
    const bumpUnread = vi.fn().mockResolvedValue(undefined);
    const bumpList = vi.fn().mockResolvedValue(undefined);

    await bumpPostIntegrityNotificationCaches(bumpUnread, bumpList, [
      "user-1",
      "",
      "user-1",
      "user-2",
      "   ",
    ]);

    expect(bumpUnread).toHaveBeenCalledTimes(2);
    expect(bumpUnread).toHaveBeenNthCalledWith(1, "user-1");
    expect(bumpUnread).toHaveBeenNthCalledWith(2, "user-2");
    expect(bumpList).toHaveBeenCalledTimes(2);
    expect(bumpList).toHaveBeenNthCalledWith(1, "user-1");
    expect(bumpList).toHaveBeenNthCalledWith(2, "user-2");
  });
});
