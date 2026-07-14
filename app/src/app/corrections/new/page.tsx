import type { Metadata } from "next";
import Link from "next/link";
import {
  CorrectionRequesterRole,
  CorrectionRequestTargetType,
} from "@prisma/client";

import {
  AcquisitionEventTracker,
  AcquisitionTrackedLink,
} from "@/components/analytics/acquisition-event-tracker";
import { getSiteOrigin } from "@/lib/site-url";
import { getCorrectionRequestPostContext } from "@/server/queries/correction-request.queries";

const siteOrigin = getSiteOrigin();

export const metadata: Metadata = {
  title: "정보 정정 요청",
  description: "병원, 장소, 게시글 정보의 정정 요청을 접수합니다.",
  alternates: {
    canonical: "/corrections/new",
  },
  robots: {
    index: false,
    follow: true,
  },
  openGraph: {
    title: "TownPet 정보 정정 요청",
    description: "병원, 장소, 게시글 정보의 정정 요청을 접수합니다.",
    url: `${siteOrigin}/corrections/new`,
  },
};

type CorrectionRequestPageProps = {
  searchParams?: Promise<{
    postId?: string;
    targetType?: string;
    targetName?: string;
    submitted?: string;
    error?: string;
  }>;
};

const targetTypeOptions = [
  { value: CorrectionRequestTargetType.HOSPITAL, label: "동물병원 정보" },
  { value: CorrectionRequestTargetType.PLACE, label: "장소/업체 정보" },
  { value: CorrectionRequestTargetType.POST, label: "게시글 내용" },
  { value: CorrectionRequestTargetType.OTHER, label: "기타 정보" },
] as const;

const requesterRoleOptions = [
  { value: CorrectionRequesterRole.BUSINESS_OWNER, label: "사업자/대표자" },
  { value: CorrectionRequesterRole.STAFF, label: "직원/관계자" },
  { value: CorrectionRequesterRole.CUSTOMER, label: "방문자/보호자" },
  { value: CorrectionRequesterRole.PUBLIC_AGENCY, label: "공공기관/보호기관" },
  { value: CorrectionRequesterRole.OTHER, label: "기타" },
] as const;

const errorMessages: Record<string, string> = {
  INVALID_INPUT: "입력값을 다시 확인해 주세요.",
  RATE_LIMITED: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
  POST_NOT_FOUND: "정정 요청 대상 글을 찾을 수 없습니다.",
  INTERNAL_SERVER_ERROR: "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
};

function formatVerifiedDate(value: Date | null) {
  if (!value) {
    return null;
  }
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(value);
}

export default async function CorrectionRequestPage({
  searchParams,
}: CorrectionRequestPageProps) {
  const params = (await searchParams) ?? {};
  const submittedId = params.submitted?.trim();
  const errorCode = params.error?.trim();
  const postContext = await getCorrectionRequestPostContext(params.postId);
  const isOperatorPostContext = Boolean(postContext?.isOperatorContent);
  const initialTargetType = targetTypeOptions.some((item) => item.value === params.targetType)
    ? params.targetType
    : postContext
      ? CorrectionRequestTargetType.POST
      : CorrectionRequestTargetType.HOSPITAL;
  const initialTargetName = params.targetName ?? postContext?.title ?? "";
  const verifiedDate = formatVerifiedDate(postContext?.operatorLastVerifiedAt ?? null);
  const postContextHref = postContext ? `/posts/${postContext.id}` : null;
  const correctionFlowTarget = postContext
    ? {
        targetType: "POST" as const,
        targetId: postContext.id,
        source: isOperatorPostContext ? "operator_content" : "linked_post",
      }
    : {
        targetType: "CTA" as const,
        targetId: initialTargetType,
        source: "public_form",
      };

  return (
    <main className="tp-page-bg min-h-screen">
      <AcquisitionEventTracker
        event={{
          event: "CORRECTION_FLOW_VIEWED",
          surface: "CORRECTION_FLOW",
          ...correctionFlowTarget,
        }}
      />
      <section className="mx-auto grid w-full max-w-[1120px] gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-10">
        <div className="tp-card p-5 sm:p-6">
          <p className="tp-eyebrow">정보 정정 안내</p>
          <h1 className="mt-2 text-2xl font-semibold text-[#10284a] sm:text-3xl">
            정보 정정 요청
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#4f678d]">
            병원, 장소, 게시글 정보가 사실과 다르거나 최신 정보가 아니면 아래 양식으로
            요청해 주세요. 운영자는 임의 삭제보다 근거 확인과 처리 기록을 우선합니다.
          </p>

          {submittedId ? (
            <div className="mt-5 rounded-xl border border-[#b8d7c3] bg-[#f2fbf5] px-4 py-4 text-sm text-[#245338]">
              <p>
                정정 요청이 접수되었습니다. 접수번호는{" "}
                <span className="font-semibold">{submittedId}</span>입니다.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {postContextHref ? (
                  <AcquisitionTrackedLink
                    href={postContextHref}
                    event={{
                      event: "CORRECTION_RECEIPT_CTA_CLICKED",
                      surface: "CORRECTION_FLOW",
                      targetType: "POST",
                      targetId: postContext?.id ?? "linked_post",
                      source: "receipt_linked_post",
                    }}
                    className="rounded-lg border border-[#9ccfac] bg-white px-3 py-2 text-xs font-semibold text-[#245338]"
                  >
                    연결 글
                  </AcquisitionTrackedLink>
                ) : null}
                <AcquisitionTrackedLink
                  href="/posts/new"
                  event={{
                    event: "CORRECTION_RECEIPT_CTA_CLICKED",
                    surface: "CORRECTION_FLOW",
                    targetType: "CTA",
                    targetId: "write_after_correction",
                    source: "receipt",
                  }}
                  className="rounded-lg border border-[#9ccfac] bg-white px-3 py-2 text-xs font-semibold text-[#245338]"
                >
                  첫 글 작성하기
                </AcquisitionTrackedLink>
                <AcquisitionTrackedLink
                  href="/feed"
                  event={{
                    event: "CORRECTION_RECEIPT_CTA_CLICKED",
                    surface: "CORRECTION_FLOW",
                    targetType: "CTA",
                    targetId: "feed_after_correction",
                    source: "receipt",
                  }}
                  className="rounded-lg border border-[#9ccfac] bg-white px-3 py-2 text-xs font-semibold text-[#245338]"
                >
                  관련 글
                </AcquisitionTrackedLink>
              </div>
            </div>
          ) : null}

          {errorCode ? (
            <div className="mt-5 rounded-xl border border-[#f3c7c7] bg-[#fff7f7] px-4 py-3 text-sm text-[#8b3131]">
              {errorMessages[errorCode] ?? "정정 요청을 접수하지 못했습니다."}
            </div>
          ) : null}

          <form action="/api/corrections" method="post" className="mt-6 grid gap-4">
            <input type="hidden" name="postId" value={params.postId ?? ""} />

            {postContext ? (
              <div className="rounded-xl border border-[#dbe6f5] bg-[#f8fbff] px-4 py-3 text-sm text-[#315277]">
                <div className="flex flex-wrap items-center gap-2">
                  {isOperatorPostContext ? (
                    <span className="rounded-full border border-[#c9d8ee] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#315b9a]">
                      운영자 정리 글
                    </span>
                  ) : null}
                  <span className="font-semibold text-[#173963]">{postContext.title}</span>
                </div>
                {isOperatorPostContext ? (
                  <p className="mt-2 text-xs leading-5 text-[#526d96]">
                    이 요청은 운영자 정리 글에 연결됩니다.
                    {postContext.operatorSourceName ? ` 출처: ${postContext.operatorSourceName}.` : ""}
                    {verifiedDate ? ` 최종 확인: ${verifiedDate}.` : ""}
                    {" "}표시된 내용과 다른 사실 또는 보완 근거를 적어 주세요.
                  </p>
                ) : (
                  <p className="mt-2 text-xs leading-5 text-[#526d96]">
                    이 요청은 연결된 게시글과 함께 관리자 검토 큐에 표시됩니다.
                  </p>
                )}
              </div>
            ) : null}

            <label className="grid gap-1.5 text-sm font-semibold text-[#173963]">
              정정 대상
              <select
                name="targetType"
                defaultValue={initialTargetType}
                className="tp-input-soft bg-white px-3 py-2 text-sm"
                required
              >
                {targetTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-[#173963]">
              병원/장소/게시글 이름
              <input
                name="targetName"
                defaultValue={initialTargetName}
                className="tp-input-soft bg-white px-3 py-2 text-sm"
                placeholder="예: 우리동네 24시 동물병원"
                minLength={2}
                maxLength={120}
                required
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-semibold text-[#173963]">
                요청자 구분
                <select
                  name="requesterRole"
                  defaultValue={CorrectionRequesterRole.BUSINESS_OWNER}
                  className="tp-input-soft bg-white px-3 py-2 text-sm"
                  required
                >
                  {requesterRoleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5 text-sm font-semibold text-[#173963]">
                기관/업체명
                <input
                  name="organizationName"
                  className="tp-input-soft bg-white px-3 py-2 text-sm"
                  placeholder="선택 입력"
                  maxLength={120}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-semibold text-[#173963]">
                이름
                <input
                  name="requesterName"
                  className="tp-input-soft bg-white px-3 py-2 text-sm"
                  minLength={2}
                  maxLength={80}
                  required
                />
              </label>

              <label className="grid gap-1.5 text-sm font-semibold text-[#173963]">
                이메일
                <input
                  name="requesterEmail"
                  type="email"
                  className="tp-input-soft bg-white px-3 py-2 text-sm"
                  maxLength={160}
                  required
                />
              </label>
            </div>

            <label className="grid gap-1.5 text-sm font-semibold text-[#173963]">
              연락처
              <input
                name="requesterPhone"
                className="tp-input-soft bg-white px-3 py-2 text-sm"
                placeholder="선택 입력"
                maxLength={40}
              />
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-[#173963]">
              정정이 필요한 내용
              <textarea
                name="requestedChange"
                className="tp-input-soft min-h-36 bg-white px-3 py-2 text-sm leading-6"
                placeholder="현재 표시된 내용, 실제와 다른 부분, 확인 가능한 근거를 함께 적어 주세요."
                minLength={10}
                maxLength={1500}
                required
              />
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-[#173963]">
              근거 URL
              <input
                name="evidenceUrl"
                type="url"
                className="tp-input-soft bg-white px-3 py-2 text-sm"
                placeholder="선택 입력: 공식 홈페이지, 공지, 지자체 페이지 등"
                maxLength={500}
              />
            </label>

            <div className="rounded-xl border border-[#dbe6f5] bg-[#f8fbff] px-3 py-3 text-xs leading-5 text-[#526d96]">
              제출된 연락처는 정정 요청 확인과 처리 결과 안내에만 사용합니다. 후기 본문은
              접수 즉시 임의 삭제하지 않고, 운영자가 근거와 정책을 확인한 뒤 처리합니다.
            </div>

            <button type="submit" className="tp-btn-primary min-h-11 px-5 text-sm font-semibold">
              정정 요청 접수
            </button>
          </form>
        </div>

        <aside className="space-y-3">
          <div className="tp-card p-4">
            <h2 className="text-sm font-semibold text-[#173963]">처리 기준</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-5 text-[#5a7398]">
              <li>운영자는 요청자 주장과 공개 근거를 함께 확인합니다.</li>
              <li>의료 판단, 분쟁 주장, 후기 평가 자체는 임의로 대체하지 않습니다.</li>
              <li>영업시간, 연락처, 위치, 폐업, 명칭처럼 확인 가능한 정보부터 반영합니다.</li>
              <li>허위 요청이나 압박성 삭제 요청은 기각될 수 있습니다.</li>
            </ul>
          </div>
          <Link href="/guides/pet-hospital-review-policy" className="tp-btn-soft inline-flex min-h-10 w-full items-center justify-center px-3 text-sm">
            작성 기준
          </Link>
        </aside>
      </section>
    </main>
  );
}
