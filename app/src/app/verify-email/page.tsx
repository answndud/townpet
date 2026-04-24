import { AuthPageLayout } from "@/components/auth/auth-page-layout";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";

type VerifyEmailPageProps = {
  searchParams?: Promise<{ token?: string; email?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const resolvedSearchParams = await searchParams;
  const initialToken = resolvedSearchParams?.token ?? null;
  const initialEmail = resolvedSearchParams?.email ?? null;

  return (
    <AuthPageLayout
      eyebrow="이메일 인증"
      title="이메일 인증"
      description="인증을 완료해야 로그인할 수 있습니다. 메일을 받지 못했다면 같은 화면에서 다시 요청할 수 있습니다."
      form={<VerifyEmailForm initialToken={initialToken} initialEmail={initialEmail} />}
      primaryFooterLink={{ href: "/login", label: "로그인으로 돌아가기" }}
      secondaryFooterLinks={[{ href: "/", label: "홈으로 돌아가기" }]}
    />
  );
}
