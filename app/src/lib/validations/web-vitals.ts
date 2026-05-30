import { z } from "zod";

import { WEB_VITAL_METRICS, WEB_VITAL_RATINGS } from "@/lib/web-vitals";

const compactDimensionSchema = z.string().trim().min(1).max(128);

export const webVitalPayloadSchema = z.object({
  metric: z.enum(WEB_VITAL_METRICS),
  value: z.number().finite().nonnegative().max(120_000),
  rating: z.enum(WEB_VITAL_RATINGS),
  route: compactDimensionSchema.regex(/^\/[A-Za-z0-9가-힣_[\].~/%:-]*$/u),
  navigationType: compactDimensionSchema.optional(),
  deviceType: compactDimensionSchema.optional(),
  connectionType: compactDimensionSchema.optional(),
});

export type WebVitalValidatedPayload = z.infer<typeof webVitalPayloadSchema>;
