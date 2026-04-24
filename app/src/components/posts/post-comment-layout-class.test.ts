import { describe, expect, it } from "vitest";

import {
  POST_COMMENT_FORM_FIELD_CLASS_NAME,
  POST_COMMENT_FORM_MUTED_CLASS_NAME,
  POST_COMMENT_FORM_PANEL_CLASS_NAME,
  POST_COMMENT_REPLY_GUIDE_CLASS_NAME,
  POST_COMMENT_SECTION_STATE_CLASS_NAME,
  POST_COMMENT_THREAD_CARD_CLASS_NAME,
  POST_COMMENT_THREAD_FOOTER_CLASS_NAME,
} from "@/components/posts/post-comment-layout-class";

describe("post comment layout classes", () => {
  it("keeps the thread card aligned by relying on outer layout gap while using the brighter card surface", () => {
    expect(POST_COMMENT_THREAD_CARD_CLASS_NAME).toContain("tp-card");
    expect(POST_COMMENT_THREAD_CARD_CLASS_NAME).toContain("w-full");
    expect(POST_COMMENT_THREAD_CARD_CLASS_NAME).toContain("p-4");
    expect(POST_COMMENT_THREAD_CARD_CLASS_NAME).not.toContain("tp-surface-page-soft");
    expect(POST_COMMENT_THREAD_CARD_CLASS_NAME).not.toContain("mt-6");
    expect(POST_COMMENT_THREAD_CARD_CLASS_NAME).not.toContain("sm:mt-8");
  });

  it("keeps comment loading states free of extra top margin without forcing a tinted surface", () => {
    expect(POST_COMMENT_SECTION_STATE_CLASS_NAME).toContain("rounded-lg");
    expect(POST_COMMENT_SECTION_STATE_CLASS_NAME).toContain("py-2.5");
    expect(POST_COMMENT_SECTION_STATE_CLASS_NAME).not.toContain("tp-surface-page-soft");
    expect(POST_COMMENT_SECTION_STATE_CLASS_NAME).not.toContain("mt-5");
  });

  it("uses dedicated bright page-soft classes for comment composer surfaces", () => {
    expect(POST_COMMENT_FORM_PANEL_CLASS_NAME).toContain("tp-form-panel");
    expect(POST_COMMENT_FORM_PANEL_CLASS_NAME).toContain("tp-form-panel-page-soft");
    expect(POST_COMMENT_FORM_FIELD_CLASS_NAME).toBe("tp-form-field-page-soft");
    expect(POST_COMMENT_FORM_MUTED_CLASS_NAME).toContain("tp-form-panel-muted");
    expect(POST_COMMENT_FORM_MUTED_CLASS_NAME).toContain("tp-form-field-page-soft");
  });

  it("keeps mobile-first footer and reply guide spacing while restoring desktop alignment with sm classes", () => {
    expect(POST_COMMENT_THREAD_FOOTER_CLASS_NAME).toContain("flex-col");
    expect(POST_COMMENT_THREAD_FOOTER_CLASS_NAME).toContain("items-start");
    expect(POST_COMMENT_THREAD_FOOTER_CLASS_NAME).toContain("sm:flex-row");
    expect(POST_COMMENT_THREAD_FOOTER_CLASS_NAME).toContain("sm:justify-between");
    expect(POST_COMMENT_REPLY_GUIDE_CLASS_NAME).toContain("ml-4");
    expect(POST_COMMENT_REPLY_GUIDE_CLASS_NAME).toContain("pl-3");
    expect(POST_COMMENT_REPLY_GUIDE_CLASS_NAME).toContain("sm:ml-7");
    expect(POST_COMMENT_REPLY_GUIDE_CLASS_NAME).toContain("sm:pl-4");
  });
});
