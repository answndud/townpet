import { PostType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  buildLostFoundMetadataDescription,
  buildLostFoundPosterUrl,
  buildLostFoundShareChecklist,
  buildLostFoundShareText,
  buildLostFoundShareTitle,
} from "@/lib/lost-found-share";

const lostFoundPost = {
  id: "post-1",
  type: PostType.LOST_FOUND,
  title: "반포동에서 고양이를 봤어요",
  content: "노란 목줄을 하고 있었고 사람을 크게 피하지 않았습니다.",
  lostFoundAlert: {
    alertType: "FOUND",
    petType: "고양이",
    breed: "치즈태비, 노란 목줄",
    lastSeenAt: "2026-05-21T09:30:00.000Z",
    lastSeenLocation: "서초구 반포동 산책로 입구",
  },
};

describe("lost-found share helpers", () => {
  it("builds intent-based share title and copy without exposing private contact prompts", () => {
    expect(buildLostFoundShareTitle(lostFoundPost)).toBe("[TownPet] 우리 동네 목격/보호 고양이 제보 요청");

    const text = buildLostFoundShareText(lostFoundPost);

    expect(text).toContain("동물: 고양이");
    expect(text).toContain("특징: 치즈태비, 노란 목줄");
    expect(text).toContain("위치: 서초구 반포동 산책로 입구");
    expect(text).toContain("/posts/post-1/guest");
    expect(text).toContain("위치와 시간을 함께 남겨 주세요.");
    expect(text).toContain("전화번호");
    expect(text).toContain("오픈채팅");
  });

  it("builds poster and metadata text for public sharing", () => {
    expect(buildLostFoundPosterUrl("post-1")).toContain("/api/posts/post-1/lost-found-share.svg");
    expect(buildLostFoundMetadataDescription(lostFoundPost)).toContain("목격/보호 · 고양이");
  });

  it("builds a public sharing checklist for urgent distribution", () => {
    expect(buildLostFoundShareChecklist(lostFoundPost)).toEqual([
      "목격/보호 고양이 사진과 특징 확인",
      "마지막 확인 시간과 위치를 함께 공유",
      "목격자는 게시글 댓글로 위치와 시간을 제보",
      "개인 연락처와 집 주소 전체는 공개하지 않기",
    ]);
  });
});
