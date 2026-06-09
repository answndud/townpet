import type { AcquisitionEventInput } from "@/lib/acquisition-events";

type LostFoundCtaSource =
  | "hero"
  | "empty_state"
  | "share_tools"
  | "recent_posts";

type LostFoundCtaTarget =
  | "lost_found_create"
  | "lost_found_feed"
  | "lost_found_first_24h_guide"
  | "lost_found_poster_guide";

type LostFoundShareSource =
  | "panel_open"
  | "LINK_COPY"
  | "KAKAO_TEXT_COPY"
  | "KAKAO_SHARE"
  | "POSTER_OPEN"
  | "POSTER_DOWNLOAD";

type LostFoundSightingSource = "root_form";

export function buildLostFoundLandingViewEvent(): AcquisitionEventInput {
  return {
    surface: "LOST_FLOW",
    event: "LOST_FLOW_VIEWED",
    targetType: "POST_TYPE",
    targetId: "LOST_FOUND",
  };
}

export function buildLostFoundCtaClickEvent(
  targetId: LostFoundCtaTarget,
  source: LostFoundCtaSource,
): AcquisitionEventInput {
  return {
    surface: "LOST_FLOW",
    event: "LOST_FLOW_CTA_CLICKED",
    targetType: "CTA",
    targetId,
    source,
  };
}

export function buildLostFoundSharePanelOpenedEvent(postId: string): AcquisitionEventInput {
  return {
    surface: "SHARE_PANEL",
    event: "LOST_SHARE_PANEL_OPENED",
    targetType: "POST",
    targetId: postId,
    source: "panel_open",
  };
}

export function buildLostFoundShareActionEvent(
  postId: string,
  source: Exclude<LostFoundShareSource, "panel_open">,
): AcquisitionEventInput {
  return {
    surface: "SHARE_PANEL",
    event: "LOST_SHARE_ACTION_CLICKED",
    targetType: "POST",
    targetId: postId,
    source,
  };
}

export function buildLostFoundKakaoShareClickedEvent(postId: string): AcquisitionEventInput {
  return {
    surface: "SHARE_PANEL",
    event: "KAKAO_SHARE_CLICKED",
    targetType: "POST",
    targetId: postId,
    source: "KAKAO_SHARE",
  };
}

export function buildLostFoundSightingModeSelectedEvent(
  postId: string,
  source: LostFoundSightingSource = "root_form",
): AcquisitionEventInput {
  return {
    surface: "LOST_FLOW",
    event: "LOST_SIGHTING_MODE_SELECTED",
    targetType: "POST",
    targetId: postId,
    source,
  };
}

export function buildLostFoundSightingSubmitAttemptedEvent(
  postId: string,
  source: LostFoundSightingSource = "root_form",
): AcquisitionEventInput {
  return {
    surface: "LOST_FLOW",
    event: "LOST_SIGHTING_SUBMIT_ATTEMPTED",
    targetType: "POST",
    targetId: postId,
    source,
  };
}

export function buildLostFoundSightingCreatedEvent(
  postId: string,
  source: LostFoundSightingSource = "root_form",
): AcquisitionEventInput {
  return {
    surface: "LOST_FLOW",
    event: "LOST_SIGHTING_CREATED",
    targetType: "POST",
    targetId: postId,
    source,
  };
}
