import type { ReactNode } from "react";
import Link from "next/link";

type LegalLink = {
  href: string;
  label: string;
};

type LegalDocumentPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  updatedAt: string;
  relatedLinks: LegalLink[];
  children: ReactNode;
};

export function LegalDocumentPage({
  eyebrow,
  title,
  description,
  updatedAt,
  relatedLinks,
  children,
}: LegalDocumentPageProps) {
  return (
    <div className="tp-page-bg min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[980px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="tp-hero p-5 sm:p-6">
          <p className="tp-eyebrow">{eyebrow}</p>
          <h1 className="tp-text-page-title mt-2 text-[#10284a]">{title}</h1>
          <p className="mt-2 text-sm text-[#4f678d]">{description}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            {relatedLinks.map((link) => (
              <Link key={`${link.href}:${link.label}`} href={link.href} className="tp-filter-pill">
                {link.label}
              </Link>
            ))}
          </div>
          <p className="mt-4 text-xs text-[#5a7398]">최종 개정일 {updatedAt}</p>
        </header>

        <section className="tp-card p-5 sm:p-6">{children}</section>

        <section className="tp-soft-card p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#3f5f90]">안내</p>
          <p className="mt-2 text-sm leading-6 text-[#4f678d]">
            문의나 신고는 서비스 내 문의/신고 기능을 우선 사용해 주세요. 운영팀이 확인할 수
            있도록 접수 경로를 통일하는 편이 가장 빠릅니다.
          </p>
        </section>
      </main>
    </div>
  );
}

