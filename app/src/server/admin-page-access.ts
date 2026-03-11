import { notFound } from "next/navigation";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/server/auth";
import { redirectToProfileIfNicknameMissing } from "@/server/nickname-guard";

export async function requireModeratorPageUser() {
  const user = await getCurrentUser();
  if (!user) {
    notFound();
  }

  redirectToProfileIfNicknameMissing({
    isAuthenticated: true,
    nickname: user.nickname,
  });

  if (user.role !== UserRole.ADMIN && user.role !== UserRole.MODERATOR) {
    notFound();
  }

  return user;
}
