import { z } from "zod";

import { COMMENT_CONTENT_MAX_LENGTH } from "@/lib/input-limits";
import { trimmedRequiredString } from "@/lib/validations/text";

export const commentCreateSchema = z.object({
  content: trimmedRequiredString({ max: COMMENT_CONTENT_MAX_LENGTH }),
});

export const commentUpdateSchema = z.object({
  content: trimmedRequiredString({ max: COMMENT_CONTENT_MAX_LENGTH }),
});

export type CommentCreateInput = z.infer<typeof commentCreateSchema>;
export type CommentUpdateInput = z.infer<typeof commentUpdateSchema>;
