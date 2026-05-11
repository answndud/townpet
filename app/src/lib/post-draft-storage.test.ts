import { describe, expect, it } from "vitest";

import {
  buildPostDraftPayload,
  parsePostDraftPayload,
} from "@/lib/post-draft-storage";

type Draft = {
  title: string;
};

function isDraft(value: unknown): value is Draft {
  return Boolean(value && typeof value === "object" && typeof (value as Draft).title === "string");
}

describe("post draft storage", () => {
  const now = new Date("2026-05-11T00:00:00.000Z");

  it("stores drafts with an explicit expiry", () => {
    const payload = buildPostDraftPayload({ title: "임시 글" }, now);

    expect(payload).toEqual({
      savedAt: "2026-05-11T00:00:00.000Z",
      expiresAt: "2026-05-12T00:00:00.000Z",
      form: { title: "임시 글" },
    });
  });

  it("reads unexpired drafts", () => {
    const payload = buildPostDraftPayload({ title: "임시 글" }, now);

    expect(parsePostDraftPayload(JSON.stringify(payload), isDraft, now)).toMatchObject({
      status: "ready",
      draft: {
        form: { title: "임시 글" },
      },
    });
  });

  it("expires old drafts including legacy payloads without expiresAt", () => {
    const legacy = JSON.stringify({
      savedAt: "2026-05-09T00:00:00.000Z",
      form: { title: "오래된 글" },
    });

    expect(parsePostDraftPayload(legacy, isDraft, now)).toEqual({ status: "expired" });
  });
});
