import { z } from "zod";
import { CommentKind } from "@prisma/client";

import { COMMENT_CONTENT_MAX_LENGTH } from "@/lib/input-limits";
import {
  buildLostFoundPublicPrivacyMessage,
  detectLostFoundPublicPrivacySignals,
} from "@/lib/lost-found-privacy-policy";
import { trimmedRequiredString } from "@/lib/validations/text";

export const commentCreateSchema = z
  .object({
    content: trimmedRequiredString({ max: COMMENT_CONTENT_MAX_LENGTH }),
    kind: z.nativeEnum(CommentKind).default(CommentKind.GENERAL),
    sightingLocation: z.string().trim().max(160).optional(),
    sightingSeenAt: z.coerce.date().optional(),
    sightingImageUrl: z.string().trim().url().max(500).optional(),
    isPrivateSighting: z.coerce.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.kind !== CommentKind.LOST_FOUND_SIGHTING) {
      return;
    }

    if (!value.sightingLocation?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sightingLocation"],
        message: "목격 위치를 입력해 주세요.",
      });
    }

    if (!value.sightingSeenAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sightingSeenAt"],
        message: "목격 시간을 입력해 주세요.",
      });
    }

    if (value.isPrivateSighting) {
      return;
    }

    const privacyMessage = buildLostFoundPublicPrivacyMessage(
      detectLostFoundPublicPrivacySignals(`${value.sightingLocation ?? ""}\n${value.content}`),
    );
    if (!privacyMessage) {
      return;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["sightingLocation"],
      message: `${privacyMessage} 민감한 단서는 '보호자에게만 공개'를 선택해 주세요.`,
    });
  });

export const commentUpdateSchema = z.object({
  content: trimmedRequiredString({ max: COMMENT_CONTENT_MAX_LENGTH }),
});

export type CommentCreateInput = z.infer<typeof commentCreateSchema>;
export type CommentUpdateInput = z.infer<typeof commentUpdateSchema>;
