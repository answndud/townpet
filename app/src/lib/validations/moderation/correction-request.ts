import {
  CorrectionRequesterRole,
  CorrectionRequestStatus,
  CorrectionRequestTargetType,
} from "@prisma/client";
import { z } from "zod";

import { CORRECTION_REQUEST_CHANGE_MAX_LENGTH } from "@/lib/input-limits";
import {
  optionalTrimmedString,
  trimmedRequiredString,
} from "@/lib/validations/text";

const optionalPostIdSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().cuid().optional(),
);

export const correctionRequestCreateSchema = z.object({
  postId: optionalPostIdSchema,
  targetType: z.nativeEnum(CorrectionRequestTargetType),
  targetName: trimmedRequiredString({ min: 2, max: 120 }),
  requesterRole: z.nativeEnum(CorrectionRequesterRole),
  organizationName: optionalTrimmedString({ max: 120 }),
  requesterName: trimmedRequiredString({ min: 2, max: 80 }),
  requesterEmail: trimmedRequiredString({ max: 160 }).pipe(z.string().email()),
  requesterPhone: optionalTrimmedString({ max: 40 }),
  requestedChange: trimmedRequiredString({
    min: 10,
    max: CORRECTION_REQUEST_CHANGE_MAX_LENGTH,
  }),
  evidenceUrl: optionalTrimmedString({ max: 500 }).pipe(z.string().url().optional()),
});

export const correctionRequestUpdateSchema = z.object({
  status: z.nativeEnum(CorrectionRequestStatus),
  resolution: optionalTrimmedString({ max: 1_000 }),
});

export type CorrectionRequestCreateInput = z.infer<typeof correctionRequestCreateSchema>;
export type CorrectionRequestUpdateInput = z.infer<typeof correctionRequestUpdateSchema>;
