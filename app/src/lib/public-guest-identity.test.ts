import { describe, expect, it } from "vitest";

import {
  resolvePublicGuestDisplayName,
  sanitizePublicGuestIdentity,
  sanitizePublicGuestIdentityList,
} from "@/lib/public-guest-identity";

describe("public guest identity", () => {
  it("falls back to generic anonymous label when display name is missing", () => {
    expect(resolvePublicGuestDisplayName("")).toBe("익명");
    expect(resolvePublicGuestDisplayName(undefined)).toBe("익명");
    expect(resolvePublicGuestDisplayName("  익명이름  ")).toBe("익명이름");
  });

  it("strips network-derived guest fields and keeps displayName", () => {
    expect(
      sanitizePublicGuestIdentity({
        guestAuthorId: "guest-1",
        guestDisplayName: "비회원",
        guestIpDisplay: "203.0.113",
        guestIpLabel: "아이피",
        guestAuthor: {
          id: "guest-1",
          displayName: "중첩 이름",
          ipDisplay: "198.51.100",
          ipLabel: "통피",
        },
      }),
    ).toEqual({
      guestAuthorId: "guest-1",
      guestDisplayName: "비회원",
      guestAuthor: {
        id: "guest-1",
        displayName: "중첩 이름",
      },
    });
  });

  it("hydrates top-level guestDisplayName from nested guestAuthor displayName", () => {
    expect(
      sanitizePublicGuestIdentityList([
        {
          id: "post-1",
          guestAuthor: {
            id: "guest-2",
            displayName: "익명",
            ipDisplay: "203.0.113",
            ipLabel: "아이피",
          },
        },
      ]),
    ).toEqual([
      {
        id: "post-1",
        guestDisplayName: "익명",
        guestAuthor: {
          id: "guest-2",
          displayName: "익명",
        },
      },
    ]);
  });
});
