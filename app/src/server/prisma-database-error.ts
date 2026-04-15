import { Prisma } from "@prisma/client";

export function isPrismaDatabaseUnavailableError(error: unknown) {
  return error instanceof Prisma.PrismaClientInitializationError;
}
