import type { Prisma } from "@prisma/client";

export function buildPublicDemoContentExclusion(): Prisma.PostWhereInput {
  return { isDemoContent: false };
}
