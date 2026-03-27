"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/server/auth";
import { recordAdminPolicyUpdated } from "@/server/moderation-action-log";
import {
  updateFeedPersonalizationPolicy,
  updateForbiddenKeywordPolicy,
  updateGuestPostPolicy,
  updateGuestReadPolicy,
  updateNewUserSafetyPolicy,
} from "@/server/services/policy.service";
import { ServiceError } from "@/server/services/service-error";

type PolicyActionResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export async function updateGuestReadPolicyAction(
  input: unknown,
): Promise<PolicyActionResult> {
  try {
    const user = await requireAdmin();
    const audit = await updateGuestReadPolicy({ input });
    await recordAdminPolicyUpdated({ actorId: user.id, ...audit });
    revalidatePath("/feed");
    revalidatePath("/admin/policies");
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message };
    }

    return {
      ok: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    };
  }
}

export async function updateForbiddenKeywordPolicyAction(
  input: unknown,
): Promise<PolicyActionResult> {
  try {
    const user = await requireAdmin();
    const audit = await updateForbiddenKeywordPolicy({ input });
    await recordAdminPolicyUpdated({ actorId: user.id, ...audit });
    revalidatePath("/feed");
    revalidatePath("/posts/[id]", "page");
    revalidatePath("/admin/policies");
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message };
    }

    return {
      ok: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    };
  }
}

export async function updateNewUserSafetyPolicyAction(
  input: unknown,
): Promise<PolicyActionResult> {
  try {
    const user = await requireAdmin();
    const audit = await updateNewUserSafetyPolicy({ input });
    await recordAdminPolicyUpdated({ actorId: user.id, ...audit });
    revalidatePath("/admin/policies");
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message };
    }

    return {
      ok: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    };
  }
}

export async function updateGuestPostPolicyAction(
  input: unknown,
): Promise<PolicyActionResult> {
  try {
    const user = await requireAdmin();
    const audit = await updateGuestPostPolicy({ input });
    await recordAdminPolicyUpdated({ actorId: user.id, ...audit });
    revalidatePath("/posts/new");
    revalidatePath("/admin/policies");
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message };
    }

    return {
      ok: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    };
  }
}

export async function updateFeedPersonalizationPolicyAction(
  input: unknown,
): Promise<PolicyActionResult> {
  try {
    const user = await requireAdmin();
    const audit = await updateFeedPersonalizationPolicy({ input });
    await recordAdminPolicyUpdated({ actorId: user.id, ...audit });
    revalidatePath("/feed");
    revalidatePath("/admin/policies");
    revalidatePath("/admin/personalization");
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message };
    }

    return {
      ok: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    };
  }
}
