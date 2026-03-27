import Link from "next/link";
import { UserRole } from "@prisma/client";

type AdminSectionLink = {
  href: string;
  label: string;
  description: string;
  adminOnly?: boolean;
};

export const ADMIN_SECTION_LINKS: readonly AdminSectionLink[] = [
  { href: "/admin", label: "관리자 홈", description: "운영 화면 진입과 빠른 점검" },
  {
    href: "/admin/ops",
    label: "Ops 대시보드",
    description: "헬스, 검색, 신고, 인증 상태 확인",
    adminOnly: true,
  },
  { href: "/admin/reports", label: "신고 큐", description: "신고 접수와 처리 상태 관리" },
  {
    href: "/admin/moderation/direct",
    label: "직접 모더레이션",
    description: "신고 없이 사용자/콘텐츠 직접 제재",
  },
  {
    href: "/admin/auth-audits",
    label: "인증 로그",
    description: "로그인/가입/비밀번호 변경 추적",
    adminOnly: true,
  },
  {
    href: "/admin/policies",
    label: "권한 정책",
    description: "신규 사용자/정책 운영값 조정",
    adminOnly: true,
  },
  {
    href: "/admin/personalization",
    label: "개인화 지표",
    description: "CTR과 audience 반응 확인",
    adminOnly: true,
  },
  {
    href: "/admin/moderation-logs",
    label: "모더레이션 로그",
    description: "운영 액션 로그와 병원 후기 신호 확인",
  },
  {
    href: "/admin/hospital-review-flags",
    label: "병원 후기 의심 신호",
    description: "위장 후기 가능성이 있는 신호 검토",
  },
  {
    href: "/admin/breeds",
    label: "품종 사전",
    description: "품종 catalog와 override 관리",
    adminOnly: true,
  },
] as const;

export function getAdminSectionLinks(role: UserRole) {
  return ADMIN_SECTION_LINKS.filter((item) => !item.adminOnly || role === UserRole.ADMIN);
}

type AdminSectionNavProps = {
  variant?: "inline" | "grid";
  role: UserRole;
};

export function AdminSectionNav({ variant = "inline", role }: AdminSectionNavProps) {
  const links = getAdminSectionLinks(role);

  if (variant === "grid") {
    return (
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="tp-card rounded-2xl p-4 transition hover:-translate-y-[1px] hover:border-[#b9cfee] hover:bg-[#f8fbff]"
          >
            <p className="text-sm font-semibold text-[#163462]">{item.label}</p>
            <p className="mt-1 text-xs text-[#5a7398]">{item.description}</p>
          </Link>
        ))}
      </section>
    );
  }

  return (
    <div className="flex flex-wrap gap-3 text-xs text-[#5a7398]">
      {links.map((item) => (
        <Link key={item.href} href={item.href}>
          {item.label}
        </Link>
      ))}
    </div>
  );
}
