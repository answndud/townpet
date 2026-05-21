import { z } from "zod";

import {
  ACQUISITION_EVENT_VALUES,
  ACQUISITION_SURFACE_VALUES,
  ACQUISITION_TARGET_TYPE_VALUES,
} from "@/lib/acquisition-events";

const acquisitionDimensionSchema = z
  .string()
  .trim()
  .min(1)
  .max(96)
  .regex(/^[\p{Letter}\p{Number}\s_:./?&=%+-]+$/u)
  .optional();

export const acquisitionEventSchema = z.object({
  event: z.enum(ACQUISITION_EVENT_VALUES),
  surface: z.enum(ACQUISITION_SURFACE_VALUES),
  targetType: z.enum(ACQUISITION_TARGET_TYPE_VALUES).optional(),
  targetId: acquisitionDimensionSchema,
  source: acquisitionDimensionSchema,
});

export type AcquisitionEventPayload = z.infer<typeof acquisitionEventSchema>;
