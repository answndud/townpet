import { z } from "zod";

export const webVitalsSummaryQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional(),
  limit: z.coerce.number().int().min(100).max(50_000).optional(),
});

export type WebVitalsSummaryQueryInput = z.infer<typeof webVitalsSummaryQuerySchema>;
