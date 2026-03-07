import { z } from "zod";

import {
  FEED_AUDIENCE_SOURCE_VALUES,
  FEED_PERSONALIZATION_EVENT_VALUES,
  FEED_PERSONALIZATION_SURFACE_VALUES,
} from "@/lib/feed-personalization-metrics";

const metricDimensionSchema = z
  .string()
  .trim()
  .max(64)
  .regex(/^[A-Za-z0-9_:-]+$/)
  .optional();

const postIdSchema = z.string().trim().min(1).max(64).optional();

export const feedPersonalizationMetricSchema = z
  .object({
    surface: z.enum(FEED_PERSONALIZATION_SURFACE_VALUES),
    event: z.enum(FEED_PERSONALIZATION_EVENT_VALUES),
    audienceKey: metricDimensionSchema,
    breedCode: metricDimensionSchema,
    audienceSource: z.enum(FEED_AUDIENCE_SOURCE_VALUES),
    postId: postIdSchema,
  })
  .superRefine((value, ctx) => {
    if (
      (value.event === "POST_CLICK" || value.event === "POST_DWELL") &&
      !value.postId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["postId"],
        message: "게시글 개인화 이벤트에는 postId가 필요합니다.",
      });
    }
  });

export const adminFeedPersonalizationQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(30).optional(),
});

export type FeedPersonalizationMetricInput = z.infer<
  typeof feedPersonalizationMetricSchema
>;
