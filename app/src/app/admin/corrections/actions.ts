"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireModerator } from "@/server/auth";
import { updateInformationCorrectionRequest } from "@/server/services/correction-request.service";

export async function updateCorrectionRequestAction(formData: FormData) {
  const user = await requireModerator();
  const requestId = String(formData.get("requestId") ?? "");
  const status = String(formData.get("status") ?? "");
  const resolution = String(formData.get("resolution") ?? "");

  await updateInformationCorrectionRequest({
    requestId,
    moderatorId: user.id,
    input: {
      status,
      resolution,
    },
  });

  revalidatePath("/admin/corrections");
  redirect("/admin/corrections?updated=1");
}
