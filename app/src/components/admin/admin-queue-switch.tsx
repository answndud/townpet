import Link from "next/link";

type AdminQueueSwitchProps = {
  reportPendingCount: number;
  reportCriticalCount: number | null;
  correctionActiveCount: number;
  correctionOperatorCount: number;
  current: "reports" | "corrections";
};

export function AdminQueueSwitch({
  reportPendingCount,
  reportCriticalCount,
  correctionActiveCount,
  correctionOperatorCount,
  current,
}: AdminQueueSwitchProps) {
  return (
    <section className="tp-card grid gap-3 p-4 text-xs text-[#4f678d] md:grid-cols-2">
      <Link
        href="/admin/reports?status=PENDING"
        className={`rounded-lg border px-3 py-3 transition hover:bg-[#f8fbff] ${
          current === "reports"
            ? "border-[#3567b5] bg-[#f6f9ff]"
            : "border-[#dbe6f6] bg-white"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#5b78a1]">
            신고 큐
          </span>
          <span className="font-semibold text-[#163462]">{reportPendingCount}건 대기</span>
        </div>
        <p className="mt-1 text-sm font-semibold text-[#10284a]">신고 우선순위 검토</p>
        <p className="mt-1 leading-5">
          {reportCriticalCount === null
            ? "대기 신고를 열어 긴급/높음 우선순위를 확인하고 대상 숨김/제재 처리로 이어갑니다."
            : `긴급 ${reportCriticalCount}건을 먼저 확인하고, 필요하면 대상 숨김/제재 처리로 이어갑니다.`}
        </p>
      </Link>

      <Link
        href="/admin/corrections?status=PENDING"
        className={`rounded-lg border px-3 py-3 transition hover:bg-[#f8fbff] ${
          current === "corrections"
            ? "border-[#3567b5] bg-[#f6f9ff]"
            : "border-[#dbe6f6] bg-white"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#5b78a1]">
            정정 큐
          </span>
          <span className="font-semibold text-[#163462]">{correctionActiveCount}건 진행</span>
        </div>
        <p className="mt-1 text-sm font-semibold text-[#10284a]">정보 정정 요청 검토</p>
        <p className="mt-1 leading-5">
          운영자 콘텐츠 제보 {correctionOperatorCount}건을 source/확인일과 함께 우선 확인합니다.
        </p>
      </Link>
    </section>
  );
}
