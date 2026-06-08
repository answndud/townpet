"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import { isPublicAcquisitionHeaderPath } from "@/components/navigation/app-shell-header-class";

const AppShellInteractiveHeader = dynamic(
  () =>
    import("@/components/navigation/app-shell-interactive-header").then(
      (module) => module.AppShellInteractiveHeader,
    ),
);

function PublicAcquisitionHeader() {
  return (
    <header className="border-b border-[#d8e4f6] bg-[#f4f8ffeb]">
      <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between gap-3 px-4 py-2 sm:px-6 sm:py-2.5 lg:px-10">
        <Link
          href="/"
          prefetch={false}
          className="inline-flex items-center"
          aria-label="TownPet 홈으로 이동"
        >
          <Image
            src="/townpet-logo.svg"
            alt="TownPet"
            width={274}
            height={72}
            priority
            className="h-[34px] w-auto sm:h-[38px]"
          />
        </Link>
        <nav className="flex items-center gap-1.5" aria-label="공개 안내 페이지 주요 이동">
          <Link
            href="/feed/guest"
            prefetch={false}
            className="inline-flex min-h-9 items-center px-2 text-xs font-semibold text-[#315484] transition hover:text-[#1f4f8f] hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e89d8]/25"
          >
            게시판
          </Link>
          <Link
            href="/login"
            prefetch={false}
            data-testid="header-login-link-home"
            className="inline-flex min-h-9 items-center px-2 text-xs font-semibold text-[#315484] transition hover:text-[#1f4f8f] hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e89d8]/25"
          >
            로그인
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function AppShellHeader() {
  const pathname = usePathname();

  if (isPublicAcquisitionHeaderPath(pathname)) {
    return <PublicAcquisitionHeader />;
  }

  return <AppShellInteractiveHeader />;
}
