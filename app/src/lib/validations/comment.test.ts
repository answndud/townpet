import { describe, expect, it } from "vitest";
import { CommentKind } from "@prisma/client";

import { commentCreateSchema, commentUpdateSchema } from "@/lib/validations/comment";

describe("comment validations", () => {
  it("accepts valid comment content", () => {
    const result = commentCreateSchema.safeParse({ content: "댓글 테스트" });
    expect(result.success).toBe(true);
  });

  it("rejects empty comment content", () => {
    const result = commentCreateSchema.safeParse({ content: "" });
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only comment content", () => {
    const result = commentCreateSchema.safeParse({ content: "   \n  " });
    expect(result.success).toBe(false);
  });

  it("normalizes composed unicode comment content", () => {
    const result = commentCreateSchema.safeParse({ content: "한글 댓글" });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.content).toBe("한글 댓글");
  });

  it("accepts update payload", () => {
    const result = commentUpdateSchema.safeParse({ content: "수정" });
    expect(result.success).toBe(true);
  });

  it("accepts structured lost-found sighting payloads", () => {
    const result = commentCreateSchema.safeParse({
      kind: CommentKind.LOST_FOUND_SIGHTING,
      content: "북문 쪽으로 이동했습니다.",
      sightingLocation: "중앙공원 북문",
      sightingSeenAt: "2026-05-21T10:30:00.000Z",
      isPrivateSighting: true,
    });

    expect(result.success).toBe(true);
  });

  it("requires sighting location and time for lost-found sightings", () => {
    const result = commentCreateSchema.safeParse({
      kind: CommentKind.LOST_FOUND_SIGHTING,
      content: "목격했습니다.",
    });

    expect(result.success).toBe(false);
  });
});
