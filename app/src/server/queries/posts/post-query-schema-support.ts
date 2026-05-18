import { Prisma } from "@prisma/client";

export function isUnknownGuestAuthorIncludeError(error: unknown) {
  return error instanceof Error && error.message.includes("Unknown field `guestAuthor`");
}

export function isUnknownGuestPostColumnError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message;
  return (
    message.includes("guestDisplayName") ||
    message.includes("guestIpDisplay") ||
    message.includes("guestIpLabel") ||
    message.includes("guestPasswordHash") ||
    message.includes("guestIpHash") ||
    message.includes("guestFingerprintHash")
  );
}

export function isUnknownReviewCategoryFieldError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes("Unknown argument `reviewCategory`");
}

export function isMissingReviewCategoryColumnError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022") {
    const meta = error.meta as { column?: unknown } | undefined;
    const columnName = typeof meta?.column === "string" ? meta.column : "";
    if (columnName.includes("Post.reviewCategory")) {
      return true;
    }
  }

  return (
    error instanceof Error &&
    error.message.includes("Post.reviewCategory") &&
    error.message.includes("does not exist")
  );
}

export function isUnsupportedReviewCategoryFilterError(error: unknown) {
  return isUnknownReviewCategoryFieldError(error) || isMissingReviewCategoryColumnError(error);
}

export function isMissingCommunityBoardSchemaError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code === "P2021") {
    const meta = error.meta as { table?: unknown } | undefined;
    const tableName = typeof meta?.table === "string" ? meta.table : "";
    return tableName.includes("Community") || tableName.includes("CommunityCategory");
  }

  if (error.code === "P2022") {
    const meta = error.meta as { column?: unknown } | undefined;
    const columnName = typeof meta?.column === "string" ? meta.column : "";
    return (
      columnName.includes("Post.boardScope") ||
      // Legacy column name for petTypeId is kept in DB via @map("communityId").
      columnName.includes("Post.communityId") ||
      columnName.includes("Post.commonBoardType") ||
      columnName.includes("Post.animalTags")
    );
  }

  return false;
}
