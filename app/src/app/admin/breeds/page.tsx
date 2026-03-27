import Link from "next/link";

import { BreedCatalogManager } from "@/components/admin/breed-catalog-manager";
import { requireAdminPageUser } from "@/server/admin-page-access";
import {
  listBreedCatalogAdminEntries,
  listEffectiveBreedCatalogGroupedBySpecies,
} from "@/server/queries/breed-catalog.queries";

export default async function AdminBreedsPage() {
  await requireAdminPageUser();

  const [effectiveCatalogBySpecies, adminEntries] = await Promise.all([
    listEffectiveBreedCatalogGroupedBySpecies(),
    listBreedCatalogAdminEntries(),
  ]);

  return (
    <div className="tp-page-bg min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="tp-hero p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#3f5f90]">운영 관리</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#10284a] sm:text-3xl">
            품종 사전 관리
          </h1>
          <p className="mt-2 text-sm text-[#4f678d]">
            반려동물 프로필과 품종 기반 개인화에 사용하는 breed catalog를 운영에서 직접 보정합니다.
          </p>
        </header>

        <section className="tp-card p-5 sm:p-6">
          <div className="grid gap-3 text-xs text-[#5a7398] sm:grid-cols-3">
            <div className="rounded-lg border border-[#dbe6f6] bg-[#f8fbff] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#5b78a1]">유효 entry</p>
              <p className="mt-2 text-2xl font-bold text-[#10284a]">
                {Object.values(effectiveCatalogBySpecies).reduce(
                  (sum, entries) => sum + entries.length,
                  0,
                )}
              </p>
              <p className="mt-1">현재 사용자 폼에 노출되는 총 품종 수</p>
            </div>
            <div className="rounded-lg border border-[#dbe6f6] bg-[#f8fbff] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#5b78a1]">DB override/custom</p>
              <p className="mt-2 text-2xl font-bold text-[#10284a]">{adminEntries.length}</p>
              <p className="mt-1">운영이 직접 저장한 breed catalog row 수</p>
            </div>
            <div className="rounded-lg border border-[#dbe6f6] bg-[#f8fbff] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#5b78a1]">비활성 row</p>
              <p className="mt-2 text-2xl font-bold text-[#10284a]">
                {adminEntries.filter((entry) => !entry.isActive).length}
              </p>
              <p className="mt-1">default/custom 항목을 숨기기 위한 override 포함</p>
            </div>
          </div>
        </section>

        <BreedCatalogManager
          effectiveCatalogBySpecies={effectiveCatalogBySpecies}
          adminEntries={adminEntries}
        />

        <div className="flex flex-wrap items-center gap-3 text-xs text-[#5a7398]">
          <Link href="/admin/policies">정책 설정</Link>
          <Link href="/admin/reports">신고 큐</Link>
          <Link href="/admin/auth-audits">인증 로그</Link>
          <Link href="/admin/personalization">개인화 지표</Link>
          <Link href="/feed">피드로 이동</Link>
        </div>
      </main>
    </div>
  );
}
