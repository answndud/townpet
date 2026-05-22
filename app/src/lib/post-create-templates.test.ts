import { PostType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  buildPostCreateTemplateHref,
  getPostCreateTemplateById,
  listPostCreateTemplatesByType,
} from "@/lib/post-create-templates";
import { REVIEW_CATEGORY } from "@/lib/review-category";

describe("post create templates", () => {
  it("builds town-aware writing prompts by post type", () => {
    const templates = listPostCreateTemplatesByType(PostType.WALK_ROUTE, "서울 강남구");

    expect(templates).toHaveLength(1);
    expect(templates[0]).toMatchObject({
      id: "walk_route_large_dog",
      title: "서울 강남구 대형견 산책하기 좋은 곳 있나요?",
    });
    expect(templates[0].content).toContain("혼잡한 시간대");
  });

  it("can preselect place review category from a template", () => {
    expect(getPostCreateTemplateById("place_report", "우리 동네")).toMatchObject({
      type: PostType.PRODUCT_REVIEW,
      reviewCategory: REVIEW_CATEGORY.PLACE,
    });
  });

  it("includes pet-market safety prompts in the used market template", () => {
    const template = getPostCreateTemplateById("used_market", "우리 동네");

    expect(template?.content).toContain("개봉 여부/유통기한");
    expect(template?.content).toContain("사이즈/체중 기준");
    expect(template?.content).toContain("거래 희망 장소");
  });

  it("builds deterministic template links", () => {
    expect(
      buildPostCreateTemplateHref({
        templateId: "hospital_review",
        townLabel: "서울 강남구",
        type: PostType.HOSPITAL_REVIEW,
      }),
    ).toBe(
      "/posts/new?type=HOSPITAL_REVIEW&template=hospital_review&town=%EC%84%9C%EC%9A%B8+%EA%B0%95%EB%82%A8%EA%B5%AC",
    );
  });
});
