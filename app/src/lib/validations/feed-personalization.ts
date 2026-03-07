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

export const feedPersonalizationMetricSchema = z.object({
  surface: z.enum(FEED_PERSONALIZATION_SURFACE_VALUES),
  event: z.enum(FEED_PERSONALIZATION_EVENT_VALUES),
  audienceKey: metricDimensionSchema,
  breedCode: metricDimensionSchema,
  audienceSource: z.enum(FEED_AUDIENCE_SOURCE_VALUES),
});

export const adminFeedPersonalizationQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(30).optional(),
});

export type FeedPersonalizationMetricInput = z.infer<
  typeof feedPersonalizationMetricSchema
>;
