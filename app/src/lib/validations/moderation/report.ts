import { ReportReason, ReportTarget } from "@prisma/client";
import { z } from "zod";

import { REPORT_DESCRIPTION_MAX_LENGTH } from "@/lib/input-limits";
import { optionalTrimmedString } from "@/lib/validations/text";

export const reportCreateSchema = z.object({
  targetType: z.enum([ReportTarget.POST, ReportTarget.COMMENT]),
  targetId: z.string().cuid(),
  reason: z.nativeEnum(ReportReason),
  description: optionalTrimmedString({ max: REPORT_DESCRIPTION_MAX_LENGTH }),
});

export type ReportCreateInput = z.infer<typeof reportCreateSchema>;
