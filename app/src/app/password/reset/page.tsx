import { AuthPageLayout } from "@/components/auth/auth-page-layout";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

type PasswordResetPageProps = {
  searchParams?: Promise<{ token?: string }>;
};

export default async function PasswordResetPage({ searchParams }: PasswordResetPageProps) {
  const resolvedSearchParams = await searchParams;
  const initialToken = resolvedSearchParams?.token ?? null;

  return (
    <AuthPageLayout
      eyebrow="보안"
      title="비밀번호 재설정"
      description="등록된 이메일로 재설정 토큰을 발급한 뒤 새 비밀번호를 설정합니다."
      form={<ResetPasswordForm initialToken={initialToken} />}
      primaryFooterLink={{ href: "/login", label: "로그인으로 돌아가기" }}
      secondaryFooterLinks={[{ href: "/", label: "홈으로 돌아가기" }]}
    />
  );
}
