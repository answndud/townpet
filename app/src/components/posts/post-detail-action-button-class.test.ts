import { describe, expect, it } from "vitest";

import {
  POST_DETAIL_ACTION_BUTTON_CLASS_NAME,
  POST_DETAIL_ACTION_DANGER_BUTTON_CLASS_NAME,
} from "@/components/posts/post-detail-action-button-class";

describe("post detail action button classes", () => {
  it("keeps edit action as a compact text action", () => {
    expect(POST_DETAIL_ACTION_BUTTON_CLASS_NAME).toContain("inline-flex");
    expect(POST_DETAIL_ACTION_BUTTON_CLASS_NAME).toContain("min-h-10");
    expect(POST_DETAIL_ACTION_BUTTON_CLASS_NAME).toContain("items-center");
    expect(POST_DETAIL_ACTION_BUTTON_CLASS_NAME).toContain("justify-center");
    expect(POST_DETAIL_ACTION_BUTTON_CLASS_NAME).toContain("hover:underline-offset-4");
    expect(POST_DETAIL_ACTION_BUTTON_CLASS_NAME).not.toContain("tp-btn-soft");
    expect(POST_DETAIL_ACTION_BUTTON_CLASS_NAME).not.toContain("rounded-lg");
    expect(POST_DETAIL_ACTION_BUTTON_CLASS_NAME).not.toContain("border");
  });

  it("keeps delete action as a compact danger text action", () => {
    expect(POST_DETAIL_ACTION_DANGER_BUTTON_CLASS_NAME).toContain("inline-flex");
    expect(POST_DETAIL_ACTION_DANGER_BUTTON_CLASS_NAME).toContain("min-h-10");
    expect(POST_DETAIL_ACTION_DANGER_BUTTON_CLASS_NAME).toContain("text-rose-700");
    expect(POST_DETAIL_ACTION_DANGER_BUTTON_CLASS_NAME).toContain("hover:underline-offset-4");
    expect(POST_DETAIL_ACTION_DANGER_BUTTON_CLASS_NAME).not.toContain("tp-btn-soft");
    expect(POST_DETAIL_ACTION_DANGER_BUTTON_CLASS_NAME).not.toContain("rounded-lg");
    expect(POST_DETAIL_ACTION_DANGER_BUTTON_CLASS_NAME).not.toContain("border-rose-300");
  });
});
