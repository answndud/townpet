import { describe, expect, it } from "vitest";

import {
  buildLostFoundCtaClickEvent,
  buildLostFoundKakaoShareClickedEvent,
  buildLostFoundLandingViewEvent,
  buildLostFoundShareActionEvent,
  buildLostFoundSharePanelOpenedEvent,
  buildLostFoundSightingCreatedEvent,
  buildLostFoundSightingModeSelectedEvent,
  buildLostFoundSightingSubmitAttemptedEvent,
} from "@/lib/lost-found-acquisition-events";
import { acquisitionEventSchema } from "@/lib/validations/acquisition-events";

describe("lost found acquisition event builders", () => {
  it("builds schema-valid landing and CTA events", () => {
    expect(acquisitionEventSchema.safeParse(buildLostFoundLandingViewEvent()).success).toBe(true);
    expect(
      acquisitionEventSchema.safeParse(
        buildLostFoundCtaClickEvent("lost_found_create", "hero"),
      ).success,
    ).toBe(true);
  });

  it("builds schema-valid share funnel events", () => {
    expect(
      acquisitionEventSchema.safeParse(buildLostFoundSharePanelOpenedEvent("post-1")).success,
    ).toBe(true);
    expect(
      acquisitionEventSchema.safeParse(
        buildLostFoundShareActionEvent("post-1", "KAKAO_TEXT_COPY"),
      ).success,
    ).toBe(true);
    expect(
      acquisitionEventSchema.safeParse(
        buildLostFoundShareActionEvent("post-1", "KAKAO_SHARE"),
      ).success,
    ).toBe(true);
    expect(
      acquisitionEventSchema.safeParse(buildLostFoundKakaoShareClickedEvent("post-1")).success,
    ).toBe(true);
    expect(
      acquisitionEventSchema.safeParse(
        buildLostFoundShareActionEvent("post-1", "POSTER_DOWNLOAD"),
      ).success,
    ).toBe(true);
  });

  it("builds schema-valid sighting comment events", () => {
    expect(
      acquisitionEventSchema.safeParse(buildLostFoundSightingModeSelectedEvent("post-1")).success,
    ).toBe(true);
    expect(
      acquisitionEventSchema.safeParse(
        buildLostFoundSightingSubmitAttemptedEvent("post-1"),
      ).success,
    ).toBe(true);
    expect(
      acquisitionEventSchema.safeParse(buildLostFoundSightingCreatedEvent("post-1")).success,
    ).toBe(true);
  });
});
