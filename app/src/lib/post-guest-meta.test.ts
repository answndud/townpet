import { describe, expect, it } from "vitest";

import { getGuestPostMeta } from "@/lib/post-guest-meta";

describe("getGuestPostMeta", () => {
  it("detects guest posts from top-level guest fields", () => {
    expect(
      getGuestPostMeta({
        guestAuthorId: "guest-1",
        guestDisplayName: "비회원",
      }),
    ).toEqual({
      isGuestPost: true,
      guestAuthorName: "비회원",
      guestPublicName: "비회원",
    });
  });

  it("detects guest posts from nested guest author fields", () => {
    expect(
      getGuestPostMeta({
        guestAuthor: {
          displayName: "익명",
        },
      }),
    ).toEqual({
      isGuestPost: true,
      guestAuthorName: "익명",
      guestPublicName: "익명",
    });
  });

  it("does not mark member-authored posts as guest posts", () => {
    expect(
      getGuestPostMeta({
        guestAuthorId: null,
        guestDisplayName: null,
        guestAuthor: null,
      }),
    ).toEqual({
      isGuestPost: false,
      guestAuthorName: "",
      guestPublicName: null,
    });
  });
});
