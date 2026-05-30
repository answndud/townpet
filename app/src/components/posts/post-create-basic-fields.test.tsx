import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PostScope, PostType } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { PostCreateBasicFields } from "@/components/posts/post-create-basic-fields";
import { postTypeOptions, reviewCategoryOptions } from "@/components/posts/post-create-form-options";
import { createInitialPostCreateFormState } from "@/components/posts/post-create-form-state";
import { listPostCreateTemplatesByType } from "@/lib/post-create-templates";
import { REVIEW_CATEGORY } from "@/lib/review-category";

const baseProps = {
  formState: createInitialPostCreateFormState(""),
  setFormState: vi.fn(),
  titleInputRef: createRef<HTMLInputElement>(),
  isAuthenticated: true,
  isFormInteractive: true,
  canUseLocalScope: true,
  showNeighborhood: false,
  showReviewCategory: false,
  showCommunitySelector: true,
  showAnimalTagsInput: false,
  isFreeBoardType: true,
  postTypeOptions,
  reviewCategoryOptions,
  neighborhoodOptions: [{ value: "neighborhood-1", label: "서울 잠원동" }],
  communityOptions: [{ value: "community-1", label: "강아지" }],
  onTitleChange: vi.fn(),
};

describe("post create basic fields", () => {
  it("renders title, type, and community controls", () => {
    const html = renderToStaticMarkup(<PostCreateBasicFields {...baseProps} />);

    expect(html).toContain("글 정보");
    expect(html).toContain("제목");
    expect(html).toContain("분류");
    expect(html).toContain("관련 동물");
    expect(html).toContain("강아지");
  });

  it("renders conditional review, local, and animal tag controls", () => {
    const html = renderToStaticMarkup(
      <PostCreateBasicFields
        {...baseProps}
        formState={{
          ...createInitialPostCreateFormState("neighborhood-1"),
          type: PostType.PRODUCT_REVIEW,
          scope: PostScope.LOCAL,
          reviewCategory: REVIEW_CATEGORY.PLACE,
        }}
        showNeighborhood
        showReviewCategory
        showAnimalTagsInput
      />,
    );

    expect(html).toContain("후기 유형");
    expect(html).toContain("동네");
    expect(html).toContain("서울 잠원동");
    expect(html).toContain("동물 태그");
  });

  it("renders guest identity inputs for unauthenticated authors", () => {
    const html = renderToStaticMarkup(
      <PostCreateBasicFields
        {...baseProps}
        isAuthenticated={false}
      />,
    );

    expect(html).toContain("비회원 닉네임");
    expect(html).toContain("글 비밀번호");
  });

  it("renders local setup guidance when local scope is unavailable", () => {
    const html = renderToStaticMarkup(
      <PostCreateBasicFields
        {...baseProps}
        showNeighborhood
        canUseLocalScope={false}
      />,
    );

    expect(html).toContain("동네를 먼저 설정해 주세요.");
    expect(html).toContain("/profile");
  });

  it("renders compact writing template buttons", () => {
    const html = renderToStaticMarkup(
      <PostCreateBasicFields
        {...baseProps}
        templates={listPostCreateTemplatesByType(PostType.WALK_ROUTE, "서울 강남구")}
        onApplyTemplate={vi.fn()}
      />,
    );

    expect(html).toContain("작성 템플릿");
    expect(html).toContain("제목, 본문 뼈대, 구조화 필드를 불러온 뒤 필요한 부분만 고쳐 쓰세요.");
    expect(html).toContain("py-2.5");
    expect(html).toContain("산책코스");
  });
});
