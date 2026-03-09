import { describe, expect, it } from "vitest";

import { buildPostDetailMetadata, type PostMetadataRecord } from "@/lib/post-page-metadata";

const basePost: PostMetadataRecord = {
  id: "c1234567890abcdefghijklmn",
  type: "FREE_BOARD",
  scope: "GLOBAL",
  status: "ACTIVE",
  title: "산책 메이트를 찾습니다",
  content: "이번 주말에 같이 산책하실 분을 찾습니다.",
  createdAt: new Date("2026-03-08T01:00:00.000Z"),
  updatedAt: new Date("2026-03-08T02:00:00.000Z"),
  images: [{ url: "/uploads/post-cover.png" }],
};

describe("buildPostDetailMetadata", () => {
  it("returns noindex metadata when the post does not exist", () => {
    const metadata = buildPostDetailMetadata(null, []);

    expect(metadata.title).toBe("게시글을 찾을 수 없습니다");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("returns noindex metadata when published dates are unavailable", () => {
    const metadata = buildPostDetailMetadata(
      {
        ...basePost,
        createdAt: null,
        updatedAt: null,
      },
      [],
    );

    expect(metadata.title).toBe(basePost.title);
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.openGraph).toBeUndefined();
  });

  it("marks login-required guest-inaccessible posts as noindex", () => {
    const metadata = buildPostDetailMetadata(
      {
        ...basePost,
        type: "MARKET_LISTING",
      },
      ["MARKET_LISTING"],
    );

    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.alternates?.canonical).toBe(`/posts/${basePost.id}`);
  });

  it("builds article metadata for guest-readable active posts", () => {
    const metadata = buildPostDetailMetadata(basePost, []);

    expect(metadata.title).toBe(basePost.title);
    expect(metadata.description).toContain("주말");
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.openGraph).toMatchObject({
      type: "article",
      title: basePost.title,
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: basePost.title,
    });
  });
});
