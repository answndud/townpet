import { redirect } from "next/navigation";

import { AuthPageLayout } from "@/components/auth/auth-page-layout";
import { SetPasswordForm } from "@/components/auth/set-password-form";
import { auth } from "@/lib/auth";
import {
  buildPasswordManagementUnavailableHref,
  canManagePassword,
} from "@/lib/password-management";
import { getPasswordSetupCopy } from "@/lib/password-setup";
import { redirectToProfileIfNicknameMissing } from "@/server/nickname-guard";
import { getUserPasswordStatusById } from "@/server/queries/user.queries";

export default async function PasswordSetupPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  redirectToProfileIfNicknameMissing({
    isAuthenticated: true,
    nickname: session.user?.nickname,
  });

  const passwordStatus = await getUserPasswordStatusById(session.user.id);
  if (!passwordStatus) {
    redirect("/login");
  }

  const passwordManagementAllowed = canManagePassword({
    authProvider: session.user.authProvider,
    hasPassword: passwordStatus.hasPassword,
    linkedAccountProviders: passwordStatus.linkedAccountProviders,
  });
  if (!passwordManagementAllowed) {
    redirect(buildPasswordManagementUnavailableHref());
  }

  const copy = getPasswordSetupCopy(passwordStatus.hasPassword);

  return (
    <AuthPageLayout
      eyebrow="보안"
      title={copy.pageTitle}
      description={copy.pageDescription}
      form={<SetPasswordForm hasPassword={passwordStatus.hasPassword} />}
      primaryFooterLink={{ href: "/profile", label: "프로필로 돌아가기" }}
      secondaryFooterLinks={[{ href: "/", label: "홈으로 돌아가기" }]}
    />
  );
}
