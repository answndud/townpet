import Link from "next/link";

type NeighborhoodGateNoticeProps = {
  title?: string;
  description?: string;
  primaryLink?: string;
  primaryLabel?: string;
  secondaryLink?: string;
  secondaryLabel?: string;
};

const NEIGHBORHOOD_GATE_PRIMARY_LINK_CLASS_NAME =
  "tp-text-link inline-flex min-h-10 items-center px-1.5 text-xs font-semibold transition hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-1";

const NEIGHBORHOOD_GATE_TEXT_LINK_CLASS_NAME =
  "tp-text-muted inline-flex min-h-10 items-center px-1.5 text-xs font-semibold transition hover:text-[#2f5da4] hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-1";

export function NeighborhoodGateNotice({
  title = "동네 설정이 필요합니다.",
  description = "동네를 설정해야 로컬 피드와 작성 기능을 사용할 수 있습니다.",
  primaryLink,
  primaryLabel,
  secondaryLink,
  secondaryLabel,
}: NeighborhoodGateNoticeProps) {
  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-[980px] flex-col gap-4 px-4 py-10 sm:px-6">
        <span className="text-xs uppercase tracking-[0.24em] text-[#4e6f9f]">
          접근 안내
        </span>
        <h1 className="text-2xl font-semibold text-[#10284a]">{title}</h1>
        <p className="text-sm text-[#4f678d]">{description}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          {primaryLink && primaryLabel ? (
            <Link
              href={primaryLink}
              className={NEIGHBORHOOD_GATE_PRIMARY_LINK_CLASS_NAME}
            >
              {primaryLabel}
            </Link>
          ) : null}
          {secondaryLink && secondaryLabel ? (
            <Link
              href={secondaryLink}
              className={NEIGHBORHOOD_GATE_TEXT_LINK_CLASS_NAME}
            >
              {secondaryLabel}
            </Link>
          ) : null}
          <Link
            href="/"
            className={NEIGHBORHOOD_GATE_TEXT_LINK_CLASS_NAME}
          >
            홈으로 돌아가기
          </Link>
        </div>
      </main>
    </div>
  );
}
