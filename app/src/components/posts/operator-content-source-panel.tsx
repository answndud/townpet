import Link from "next/link";

import { formatKoreanIsoDate } from "@/lib/date-format";

type OperatorContentSourcePanelProps = {
  postId?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  lastVerifiedAt?: string | Date | null;
};

export function formatOperatorVerifiedDate(value?: string | Date | null) {
  if (!value) {
    return null;
  }
  return formatKoreanIsoDate(value) || null;
}

export function buildOperatorContentMetaLabel({
  sourceName,
  lastVerifiedAt,
}: {
  sourceName?: string | null;
  lastVerifiedAt?: string | Date | null;
}) {
  const verifiedLabel = formatOperatorVerifiedDate(lastVerifiedAt);
  const sourceLabel = sourceName?.trim() || null;

  if (sourceLabel && verifiedLabel) {
    return `${sourceLabel} · ${verifiedLabel} 확인`;
  }

  if (sourceLabel) {
    return sourceLabel;
  }

  if (verifiedLabel) {
    return `${verifiedLabel} 확인`;
  }

  return "운영팀 확인";
}

export function OperatorContentBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md border border-[#b8cff0] bg-[#edf5ff] font-semibold text-[#2f5da4] ${
        compact ? "px-1.5 py-[1px] text-[10px]" : "px-2 py-1 text-[11px]"
      }`}
    >
      운영자 정리
    </span>
  );
}

export function OperatorContentSourcePanel({
  postId,
  sourceName,
  sourceUrl,
  lastVerifiedAt,
}: OperatorContentSourcePanelProps) {
  const verifiedLabel = formatOperatorVerifiedDate(lastVerifiedAt);
  const correctionHref = postId
    ? `/corrections/new?postId=${encodeURIComponent(postId)}&targetType=POST`
    : "/corrections/new?targetType=POST";
  const correctionLinkClassName =
    "inline-flex min-h-9 shrink-0 items-center justify-center text-[11px] font-semibold text-[#2f5da4] underline-offset-4 transition hover:text-[#1f4f8f] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-2";

  return (
    <section className="mt-4 border-y border-[#d8e6f7] bg-[#f8fbff] px-3 py-3 text-xs text-[#4f678d] sm:px-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <OperatorContentBadge />
            <span className="font-semibold text-[#17345f]">
              공개 자료와 운영팀 확인 내용을 분리해 표시합니다.
            </span>
          </div>
          <p className="mt-1 leading-5">
            사용자 경험담이 아니라 운영팀이 정리한 정보입니다. 방문, 신청, 연락 전에는 출처에서
            최신 상태를 한 번 더 확인해 주세요.
          </p>
        </div>
        <Link
          href={correctionHref}
          className={`${correctionLinkClassName} hidden sm:inline-flex`}
        >
          이 정보 정정 요청
        </Link>
      </div>
      {sourceName || sourceUrl || verifiedLabel ? (
        <dl className="mt-3 grid gap-2 sm:grid-cols-3">
          {sourceName ? (
            <div>
              <dt className="font-semibold text-[#355988]">출처</dt>
              <dd className="mt-0.5 truncate text-[#17345f]">{sourceName}</dd>
            </div>
          ) : null}
          {sourceUrl ? (
            <div>
              <dt className="font-semibold text-[#355988]">원문</dt>
              <dd className="mt-0.5 min-w-0">
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate rounded-sm text-[#2f5da4] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0]"
                >
                  출처 열기
                </a>
              </dd>
            </div>
          ) : null}
          {verifiedLabel ? (
            <div>
              <dt className="font-semibold text-[#355988]">최종 확인</dt>
              <dd className="mt-0.5 text-[#17345f]">{verifiedLabel}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      <Link
        href={correctionHref}
        className={`${correctionLinkClassName} mt-3 sm:hidden`}
      >
        이 정보 정정 요청
      </Link>
    </section>
  );
}
