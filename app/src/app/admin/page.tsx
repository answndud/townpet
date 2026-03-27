import { AdminSectionNav } from "@/components/admin/admin-section-nav";
import { requireModeratorPageUser } from "@/server/admin-page-access";

export default async function AdminHomePage() {
  const user = await requireModeratorPageUser();

  return (
    <div className="tp-page-bg min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="tp-hero p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#3f5f90]">운영 관리</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#10284a] sm:text-3xl">
            관리자 홈
          </h1>
          <p className="mt-2 text-sm text-[#4f678d]">
            필요한 운영 화면으로 바로 이동하고 오늘 확인할 항목을 빠르게 정리합니다.
          </p>
          <p className="mt-3 text-xs text-[#5a7398]">
            현재 계정: {user.nickname ?? user.email ?? user.id}
          </p>
        </header>

        <section className="tp-card p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-[#10284a]">관리자 메뉴</h2>
          <p className="mt-1 text-xs text-[#5a7398]">
            신고 처리, 직접 제재, 인증 감사, 권한 정책, 검색/운영 지표를 여기서 이동합니다.
          </p>
          <div className="mt-4">
            <AdminSectionNav variant="grid" role={user.role} />
          </div>
        </section>
      </main>
    </div>
  );
}
