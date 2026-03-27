import Link from "next/link";

const LEGAL_LINKS = [
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침" },
  { href: "/commercial", label: "광고·제휴 고지" },
] as const;

export function AppShellFooter() {
  return (
    <footer className="border-t border-[#d8e4f6] bg-white/70 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-3 px-4 py-5 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#10284a]">TownPet</p>
            <p className="mt-1 text-xs leading-5 text-[#5a7398]">
              반려생활 커뮤니티의 공개 고지와 운영 정보를 한곳에 모았습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="tp-btn-soft tp-btn-xs inline-flex">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <p className="text-[11px] leading-5 text-[#6c7f9b]">
          서비스 내 문의/신고 경로는 운영팀과 모더레이션 검토에 사용됩니다. 광고/제휴 콘텐츠는
          별도 라벨로 표시됩니다.
        </p>
      </div>
    </footer>
  );
}

