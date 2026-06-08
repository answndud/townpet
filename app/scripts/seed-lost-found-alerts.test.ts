import {
  BoardScope,
  CommonBoardType,
  LostFoundStatus,
  LostFoundType,
  PostType,
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import { seedPosts } from "./seed-board-posts";
import {
  SEARCH_SEED_POSTS,
  buildSearchSeedPostCreateData,
  buildSearchSeedPostUpdateData,
} from "./seed-search-cases";

describe("lost-found seed alert coverage", () => {
  it("keeps every board lost-found seed backed by structured alert data", () => {
    const lostFoundSeeds = seedPosts.filter((post) => post.type === PostType.LOST_FOUND);

    expect(lostFoundSeeds.length).toBeGreaterThan(0);
    for (const post of lostFoundSeeds) {
      expect(post.lostFoundAlert).toMatchObject({
        status: LostFoundStatus.ACTIVE,
      });
      expect(Object.values(LostFoundType)).toContain(post.lostFoundAlert?.alertType);
      expect(post.lostFoundAlert?.petType?.trim()).toBeTruthy();
      expect(post.lostFoundAlert?.lastSeenLocation?.trim()).toBeTruthy();
    }
  });

  it("creates and repairs search lost-found seeds with the common board relation", () => {
    const lostFoundSeed = SEARCH_SEED_POSTS.find((post) => post.type === PostType.LOST_FOUND);

    expect(lostFoundSeed).toBeDefined();

    const createData = buildSearchSeedPostCreateData("user-1", lostFoundSeed!);
    const updateData = buildSearchSeedPostUpdateData(lostFoundSeed!);

    expect(createData).toMatchObject({
      authorId: "user-1",
      title: "분실: 서초동 갈색 푸들 제보 부탁",
      type: PostType.LOST_FOUND,
      boardScope: BoardScope.COMMON,
      commonBoardType: CommonBoardType.LOST_FOUND,
      lostFoundAlert: {
        create: {
          alertType: LostFoundType.LOST,
          petType: "강아지",
          lastSeenLocation: "서울 서초구 서초동 산책로 주변",
          status: LostFoundStatus.ACTIVE,
        },
      },
    });
    expect(updateData).toMatchObject({
      type: PostType.LOST_FOUND,
      boardScope: BoardScope.COMMON,
      commonBoardType: CommonBoardType.LOST_FOUND,
      lostFoundAlert: {
        upsert: {
          create: {
            petType: "강아지",
          },
          update: {
            petType: "강아지",
          },
        },
      },
    });
  });
});
