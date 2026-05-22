import { CorrectionRequestStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const CORRECTION_REQUEST_LIST_LIMIT_DEFAULT = 100;
export const CORRECTION_REQUEST_LIST_LIMIT_MAX = 200;

type ListCorrectionRequestOptions = {
  status?: CorrectionRequestStatus | "ALL" | null;
  query?: string | null;
  limit?: number;
};

export async function listInformationCorrectionRequests({
  status,
  query,
  limit,
}: ListCorrectionRequestOptions = {}) {
  const trimmedQuery = query?.trim();
  const safeLimit = Math.min(
    Math.max(limit ?? CORRECTION_REQUEST_LIST_LIMIT_DEFAULT, 1),
    CORRECTION_REQUEST_LIST_LIMIT_MAX,
  );

  const where: Prisma.InformationCorrectionRequestWhereInput = {
    ...(status && status !== "ALL" ? { status } : {}),
    ...(trimmedQuery
      ? {
          OR: [
            { targetName: { contains: trimmedQuery, mode: "insensitive" } },
            { organizationName: { contains: trimmedQuery, mode: "insensitive" } },
            { requesterName: { contains: trimmedQuery, mode: "insensitive" } },
            { requesterEmail: { contains: trimmedQuery, mode: "insensitive" } },
            { requestedChange: { contains: trimmedQuery, mode: "insensitive" } },
            { postId: { contains: trimmedQuery, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  return prisma.informationCorrectionRequest.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }, { id: "desc" }],
    take: safeLimit,
    include: {
      post: { select: { id: true, title: true, type: true, status: true } },
      requester: { select: { id: true, email: true, nickname: true } },
      resolver: { select: { id: true, email: true, nickname: true } },
    },
  });
}
