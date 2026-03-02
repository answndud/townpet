import Link from "next/link";

export default function NotFound() {
  return (
    <div className="tp-page-bg min-h-screen px-4 py-16">
      <main className="tp-card mx-auto w-full max-w-[720px] p-6 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-[#5b78a1]">404</p>
        <h1 className="mt-2 text-2xl font-bold text-[#10284a]">
          페이지를 찾을 수 없습니다.
        </h1>
        <p className="mt-3 text-sm text-[#5a7398]">
          주소를 확인하거나 피드로 이동해 주세요.
        </p>
        <Link
          href="/feed"
          className="tp-btn-primary mt-5 inline-flex px-4 py-2 text-sm font-semibold"
        >
          피드로 이동
        </Link>
      </main>
    </div>
  );
}
