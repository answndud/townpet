"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  CareApplicationStatus,
  CareFeedbackIssueType,
  CareFeedbackOutcome,
  CareRequestStatus,
  LostFoundStatus,
  MarketStatus,
} from "@prisma/client";

import {
  PostDetailInfoItem,
  PostDetailInfoSection,
} from "@/components/posts/post-detail-info-section";
import {
  adoptionStatusLabel,
  animalSexLabel,
  authorMarketStatusOptions,
  careApplicationStatusLabel,
  careFeedbackAuthorRoleLabel,
  careFeedbackIssueLabel,
  careFeedbackOutcomeLabel,
  careStatusLabel,
  careTypeLabel,
  emptyValue,
  formatDetailDateTime,
  hospitalExplanationLabel,
  hospitalPriceLevelLabel,
  lostFoundAlertTypeLabel,
  lostFoundStatusLabel,
  marketConditionLabel,
  marketStatusLabel,
  marketTypeLabel,
  renderBooleanValue,
  renderNumberValue,
  renderTextValue,
  routeDifficultyLabel,
  volunteerStatusLabel,
} from "@/components/posts/post-detail-presenter";
import type { PostDetailItem } from "@/components/posts/post-detail-types";
import { MARKET_SAFETY_CHECKLIST } from "@/lib/market-safety-policy";
import { resolveUserDisplayName } from "@/lib/user-display";

type CareApplicationItem = NonNullable<PostDetailItem["careApplications"]>[number];
type CareFeedbackItem = NonNullable<PostDetailItem["careCompletionFeedbacks"]>[number];

type CareFeedbackInput = {
  outcome: CareFeedbackOutcome;
  issueType: CareFeedbackIssueType;
  wouldRepeat: boolean;
  comment: string;
};

const INFO_PANEL_PRIMARY_ACTION_CLASS =
  "inline-flex min-h-10 items-center justify-center rounded-md border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

const INFO_PANEL_SELECT_CLASS =
  "mt-1 min-h-10 w-full rounded-md border border-[#d5dae3] bg-white px-2 text-xs";

const INFO_PANEL_STATUS_MESSAGE_CLASS = "mt-2 text-xs font-medium";

const STATUS_WORKFLOW_SECTION_CLASS = "col-span-full grid gap-2 border-t border-[#e3ecf8] pt-2";

const CARE_WORKFLOW_SECTION_CLASS = "col-span-full grid gap-2 border-t border-[#dbeee3] pt-2";

type PostDetailInfoPanelsProps = {
  post: PostDetailItem;
  canManageMarketStatus: boolean;
  isMarketStatusPending: boolean;
  marketStatusMessage: string | null;
  onMarketStatusChange: (nextStatus: MarketStatus) => void;
  canManageCareStatus: boolean;
  visibleCareStatusOptions: CareRequestStatus[];
  isCareStatusPending: boolean;
  careStatusMessage: string | null;
  onCareStatusChange: (nextStatus: CareRequestStatus) => void;
  canManageLostFoundStatus: boolean;
  isLostFoundStatusPending: boolean;
  lostFoundStatusMessage: string | null;
  onLostFoundStatusChange: (nextStatus: LostFoundStatus) => void;
  canApplyCareRequest: boolean;
  careApplicationInput: string;
  onCareApplicationInputChange: (value: string) => void;
  isCareApplicationPending: boolean;
  onCreateCareApplication: () => void;
  ownCareApplication: CareApplicationItem | null;
  onCancelCareApplication: (applicationId: string) => void;
  canManageCareApplications: boolean;
  careApplications: CareApplicationItem[];
  onDecideCareApplication: (
    applicationId: string,
    status: "ACCEPTED" | "DECLINED",
  ) => void;
  careApplicationMessage: string | null;
  canCreateCareCompletionFeedback: boolean;
  careFeedbackInput: CareFeedbackInput;
  onCareFeedbackInputChange: Dispatch<SetStateAction<CareFeedbackInput>>;
  isCareFeedbackPending: boolean;
  onCreateCareCompletionFeedback: () => void;
  careCompletionFeedbacks: CareFeedbackItem[];
  careFeedbackMessage: string | null;
};

export function PostDetailInfoPanels({
  post,
  canManageMarketStatus,
  isMarketStatusPending,
  marketStatusMessage,
  onMarketStatusChange,
  canManageCareStatus,
  visibleCareStatusOptions,
  isCareStatusPending,
  careStatusMessage,
  onCareStatusChange,
  canManageLostFoundStatus,
  isLostFoundStatusPending,
  lostFoundStatusMessage,
  onLostFoundStatusChange,
  canApplyCareRequest,
  careApplicationInput,
  onCareApplicationInputChange,
  isCareApplicationPending,
  onCreateCareApplication,
  ownCareApplication,
  onCancelCareApplication,
  canManageCareApplications,
  careApplications,
  onDecideCareApplication,
  careApplicationMessage,
  canCreateCareCompletionFeedback,
  careFeedbackInput,
  onCareFeedbackInputChange,
  isCareFeedbackPending,
  onCreateCareCompletionFeedback,
  careCompletionFeedbacks,
  careFeedbackMessage,
}: PostDetailInfoPanelsProps) {
  return (
    <>
      {post.hospitalReview ? (
        <PostDetailInfoSection title="병원 후기 상세">
          <PostDetailInfoItem label="병원" value={renderTextValue(post.hospitalReview.hospitalName)} />
          <PostDetailInfoItem label="방문 목적" value={renderTextValue(post.hospitalReview.visitPurpose)} />
          <PostDetailInfoItem label="동물 종류" value={renderTextValue(post.hospitalReview.animalType)} />
          <PostDetailInfoItem label="치료" value={renderTextValue(post.hospitalReview.treatmentType)} />
          <PostDetailInfoItem label="평점" value={renderNumberValue(post.hospitalReview.rating, "점")} />
          <PostDetailInfoItem
            label="설명"
            value={renderTextValue(
              post.hospitalReview.explanationSatisfaction
                ? (hospitalExplanationLabel[post.hospitalReview.explanationSatisfaction] ??
                  post.hospitalReview.explanationSatisfaction)
                : null,
            )}
          />
          <PostDetailInfoItem
            label="가격 체감"
            value={renderTextValue(
              post.hospitalReview.priceLevel
                ? (hospitalPriceLevelLabel[post.hospitalReview.priceLevel] ??
                  post.hospitalReview.priceLevel)
                : null,
            )}
          />
          <PostDetailInfoItem
            label="비용"
            value={
              post.hospitalReview.totalCost !== null && post.hospitalReview.totalCost !== undefined
                ? `${post.hospitalReview.totalCost.toLocaleString()}원`
                : emptyValue
            }
          />
          <PostDetailInfoItem label="대기" value={renderNumberValue(post.hospitalReview.waitTime, "분")} />
          <PostDetailInfoItem
            label="주차"
            value={renderBooleanValue(post.hospitalReview.hasParking, "가능", "어려움")}
          />
          <PostDetailInfoItem
            label="야간진료"
            value={renderBooleanValue(post.hospitalReview.hasNightCare, "경험 있음", "해당 없음")}
          />
          <PostDetailInfoItem
            label="재방문"
            value={renderBooleanValue(post.hospitalReview.wouldRevisit, "의향 있음", "의향 낮음")}
          />
          <div className="col-span-full grid gap-1.5 border-t border-[#e3ecf8] pt-2">
            <p className="tp-text-heading text-[12px] font-semibold">후기 확인 기준</p>
            <div className="tp-text-subtle grid gap-1 text-[12px] leading-5 sm:grid-cols-[1fr_auto] sm:items-center">
              <p className="flex gap-1.5">
                <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-[#9fb7d9]" aria-hidden="true" />
                <span>개인 경험 공유입니다. 진단이나 법적 판단은 방문 전 병원에 직접 확인하세요.</span>
              </p>
              <a
                href={`/corrections/new?postId=${post.id}&targetType=HOSPITAL&targetName=${encodeURIComponent(
                  post.hospitalReview.hospitalName ?? "",
                )}`}
                className="w-fit font-semibold text-[#3567b5] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0]"
              >
                정보 정정 요청
              </a>
            </div>
          </div>
        </PostDetailInfoSection>
      ) : null}

      {post.placeReview ? (
        <PostDetailInfoSection title="후기 상세">
          <PostDetailInfoItem label="장소명" value={renderTextValue(post.placeReview.placeName)} />
          <PostDetailInfoItem label="유형" value={renderTextValue(post.placeReview.placeType)} />
          <PostDetailInfoItem label="주소" value={renderTextValue(post.placeReview.address)} />
          <PostDetailInfoItem
            label="반려동물"
            value={renderBooleanValue(post.placeReview.isPetAllowed, "가능", "불가")}
          />
          <PostDetailInfoItem label="평점" value={renderNumberValue(post.placeReview.rating, "점")} />
        </PostDetailInfoSection>
      ) : null}

      {post.walkRoute ? (
        <PostDetailInfoSection title="동네 산책코스 상세">
          <PostDetailInfoItem label="코스명" value={renderTextValue(post.walkRoute.routeName)} />
          <PostDetailInfoItem label="거리" value={renderNumberValue(post.walkRoute.distance, "km")} />
          <PostDetailInfoItem label="시간" value={renderNumberValue(post.walkRoute.duration, "분")} />
          <PostDetailInfoItem
            label="난이도"
            value={renderTextValue(
              post.walkRoute.difficulty
                ? (routeDifficultyLabel[post.walkRoute.difficulty] ?? post.walkRoute.difficulty)
                : null,
            )}
          />
          <PostDetailInfoItem
            label="대형견"
            value={renderBooleanValue(post.walkRoute.largeDogFriendly, "적합", "주의 필요")}
          />
          <PostDetailInfoItem label="혼잡 시간" value={renderTextValue(post.walkRoute.crowdedTime)} />
          <PostDetailInfoItem
            label="목줄 구간"
            span="wide"
            value={renderTextValue(post.walkRoute.leashRequiredNote)}
          />
          <PostDetailInfoItem
            label="편의시설"
            span="wide"
            value={
              [
                post.walkRoute.hasStreetLights ? "가로등" : null,
                post.walkRoute.hasRestroom ? "화장실" : null,
                post.walkRoute.hasParkingLot ? "주차장" : null,
                post.walkRoute.hasWasteBags ? "배변봉투함" : null,
                post.walkRoute.hasWaterStation ? "물 마실 곳" : null,
              ]
                .filter(Boolean)
                .join(" · ") || "정보 없음"
            }
          />
          <PostDetailInfoItem
            label="주의 구간"
            span="full"
            value={renderTextValue(post.walkRoute.cautionNote)}
          />
          <PostDetailInfoItem
            label="안전 태그"
            span="full"
            value={
              post.walkRoute.safetyTags && post.walkRoute.safetyTags.length > 0
                ? post.walkRoute.safetyTags.join(", ")
                : "없음"
            }
          />
        </PostDetailInfoSection>
      ) : null}

      {post.marketListing ? (
        <PostDetailInfoSection title="거래 정보">
          <PostDetailInfoItem
            label="거래 유형"
            value={renderTextValue(
              post.marketListing.listingType
                ? (marketTypeLabel[post.marketListing.listingType] ?? post.marketListing.listingType)
                : null,
            )}
          />
          <PostDetailInfoItem
            label="가격"
            value={
              post.marketListing.price !== null && post.marketListing.price !== undefined
                ? `${post.marketListing.price.toLocaleString()}원`
                : emptyValue
            }
          />
          <PostDetailInfoItem
            label="상품 상태"
            value={renderTextValue(
              post.marketListing.condition
                ? (marketConditionLabel[post.marketListing.condition] ?? post.marketListing.condition)
                : null,
            )}
          />
          <PostDetailInfoItem
            label="거래 상태"
            value={renderTextValue(
              post.marketListing.status
                ? (marketStatusLabel[post.marketListing.status] ?? post.marketListing.status)
                : null,
            )}
          />
          <PostDetailInfoItem
            label="보증금"
            value={
              post.marketListing.depositAmount !== null &&
              post.marketListing.depositAmount !== undefined
                ? `${post.marketListing.depositAmount.toLocaleString()}원`
                : emptyValue
            }
          />
          <PostDetailInfoItem label="기간" value={renderTextValue(post.marketListing.rentalPeriod)} />
          <div className="col-span-full grid gap-1.5 border-t border-[#e3ecf8] pt-2">
            <p className="tp-text-heading text-[12px] font-semibold">거래 전 확인</p>
            <ul className="tp-text-subtle grid gap-1 text-[12px] leading-5 sm:grid-cols-2">
              {MARKET_SAFETY_CHECKLIST.map((item) => (
                <li key={item} className="flex gap-1.5">
                  <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-[#9fb7d9]" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          {canManageMarketStatus ? (
            <div className={STATUS_WORKFLOW_SECTION_CLASS}>
              <p className="text-xs font-semibold text-[#315b9a]">거래 상태 변경</p>
              <div className="flex flex-wrap gap-1.5">
                {authorMarketStatusOptions.map((status) => {
                  const isCurrent = post.marketListing?.status === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      className={`${INFO_PANEL_PRIMARY_ACTION_CLASS} ${
                        isCurrent
                          ? "border-[#3567b5] bg-[#3567b5] text-white"
                          : "border-[#c7d8ef] bg-white text-[#315b9a] hover:border-[#9dbbe6] hover:bg-[#eef5ff]"
                      }`}
                      disabled={isMarketStatusPending || isCurrent}
                      onClick={() => onMarketStatusChange(status)}
                    >
                      {marketStatusLabel[status] ?? status}
                    </button>
                  );
                })}
              </div>
              {marketStatusMessage ? (
                <p className={`${INFO_PANEL_STATUS_MESSAGE_CLASS} text-[#5d779e]`} role="status" aria-live="polite">
                  {marketStatusMessage}
                </p>
              ) : null}
            </div>
          ) : null}
        </PostDetailInfoSection>
      ) : null}

      {post.careRequest ? (
        <PostDetailInfoSection title="돌봄 요청 정보">
          <PostDetailInfoItem
            label="요청 유형"
            value={renderTextValue(
              post.careRequest.careType
                ? (careTypeLabel[post.careRequest.careType] ?? post.careRequest.careType)
                : null,
            )}
          />
          <PostDetailInfoItem
            label="상태"
            value={renderTextValue(
              post.careRequest.status
                ? (careStatusLabel[post.careRequest.status] ?? post.careRequest.status)
                : null,
            )}
          />
          <PostDetailInfoItem
            label="시작"
            value={renderTextValue(formatDetailDateTime(post.careRequest.startsAt))}
          />
          <PostDetailInfoItem
            label="종료"
            value={renderTextValue(formatDetailDateTime(post.careRequest.endsAt))}
          />
          <PostDetailInfoItem
            label="보상"
            value={
              post.careRequest.rewardAmount !== null &&
              post.careRequest.rewardAmount !== undefined
                ? `${post.careRequest.rewardAmount.toLocaleString()}원`
                : emptyValue
            }
          />
          <PostDetailInfoItem
            label="긴급"
            value={renderBooleanValue(post.careRequest.isUrgent, "긴급 요청", "일반 요청")}
          />
          <PostDetailInfoItem
            label="위치 힌트"
            span="wide"
            value={renderTextValue(post.careRequest.locationNote)}
          />
          <PostDetailInfoItem
            label="반려동물"
            span="wide"
            value={renderTextValue(post.careRequest.petNote)}
          />
          <PostDetailInfoItem
            label="요청사항"
            span="full"
            value={renderTextValue(post.careRequest.requirements)}
          />
          {canManageCareStatus ? (
            <div className={CARE_WORKFLOW_SECTION_CLASS}>
              <p className="text-xs font-semibold text-[#21543d]">돌봄 요청 상태 변경</p>
              <div className="flex flex-wrap gap-1.5">
                {visibleCareStatusOptions.map((status) => {
                  const isCurrent = post.careRequest?.status === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      className={`${INFO_PANEL_PRIMARY_ACTION_CLASS} ${
                        isCurrent
                          ? "border-[#2f7b58] bg-[#2f7b58] text-white"
                          : "border-[#b5dcc9] bg-white text-[#21543d] hover:border-[#8cc7ad] hover:bg-[#e9f7ef]"
                      }`}
                      disabled={isCareStatusPending || isCurrent}
                      onClick={() => onCareStatusChange(status)}
                    >
                      {careStatusLabel[status] ?? status}
                    </button>
                  );
                })}
              </div>
              {careStatusMessage ? (
                <p className={`${INFO_PANEL_STATUS_MESSAGE_CLASS} text-[#4b765f]`} role="status" aria-live="polite">
                  {careStatusMessage}
                </p>
              ) : null}
            </div>
          ) : null}
          {canApplyCareRequest ? (
            <div className={CARE_WORKFLOW_SECTION_CLASS}>
              <p className="text-xs font-semibold text-[#21543d]">돌봄 지원</p>
              <textarea
                value={careApplicationInput}
                onChange={(event) => onCareApplicationInputChange(event.target.value)}
                rows={3}
                maxLength={500}
                className="mt-2 min-h-24 w-full rounded-md border border-[#b5dcc9] bg-white px-3 py-2 text-sm text-[#20362b] outline-none transition focus:border-[#2f7b58] focus:ring-2 focus:ring-[#b5dcc9]"
                placeholder="요청자에게 전달할 메시지를 입력하세요."
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-[#6a7f73]">
                  연락처 공유는 정책에 따라 제한될 수 있습니다.
                </span>
                <button
                  type="button"
                  className={`${INFO_PANEL_PRIMARY_ACTION_CLASS} border-[#2f7b58] bg-[#2f7b58] text-white hover:bg-[#246145]`}
                  disabled={isCareApplicationPending}
                  onClick={onCreateCareApplication}
                >
                  지원하기
                </button>
              </div>
            </div>
          ) : null}
          {ownCareApplication ? (
            <div className={CARE_WORKFLOW_SECTION_CLASS}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[#315b9a]">
                  내 지원 상태: {careApplicationStatusLabel[ownCareApplication.status] ?? ownCareApplication.status}
                </p>
                {ownCareApplication.status === CareApplicationStatus.PENDING ? (
                  <button
                    type="button"
                    className={`${INFO_PANEL_PRIMARY_ACTION_CLASS} border-[#c7d8ef] bg-white text-[#315b9a] hover:border-[#9dbbe6] hover:bg-[#eef5ff]`}
                    disabled={isCareApplicationPending}
                    onClick={() => onCancelCareApplication(ownCareApplication.id)}
                  >
                    지원 취소
                  </button>
                ) : null}
              </div>
              {ownCareApplication.message ? (
                <p className="whitespace-pre-wrap border-t border-[#dbeee3] pt-2 text-xs leading-5 text-[#5d779e]">
                  {ownCareApplication.message}
                </p>
              ) : null}
            </div>
          ) : null}
          {canManageCareApplications ? (
            <div className={CARE_WORKFLOW_SECTION_CLASS}>
              <p className="text-xs font-semibold text-[#2f3b4c]">지원자 관리</p>
              {careApplications.length > 0 ? (
                <div className="grid gap-2">
                  {careApplications.map((application) => (
                    <div
                      key={application.id}
                      className="grid gap-2 border-t border-[#e2e8f0] pt-2 first:border-t-0 first:pt-0"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-[#253449]">
                            {resolveUserDisplayName(application.applicant.nickname)}
                          </p>
                          <p className="mt-0.5 text-xs text-[#66758a]">
                            {careApplicationStatusLabel[application.status] ?? application.status}
                          </p>
                        </div>
                        {application.status === CareApplicationStatus.PENDING ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className={`${INFO_PANEL_PRIMARY_ACTION_CLASS} border-[#2f7b58] bg-[#2f7b58] text-white hover:bg-[#246145]`}
                              disabled={isCareApplicationPending}
                              onClick={() =>
                                onDecideCareApplication(
                                  application.id,
                                  CareApplicationStatus.ACCEPTED,
                                )
                              }
                            >
                              수락
                            </button>
                            <button
                              type="button"
                              className={`${INFO_PANEL_PRIMARY_ACTION_CLASS} border-[#d5dae3] bg-white text-[#4f5f75] hover:bg-[#f1f4f8]`}
                              disabled={isCareApplicationPending}
                              onClick={() =>
                                onDecideCareApplication(
                                  application.id,
                                  CareApplicationStatus.DECLINED,
                                )
                              }
                            >
                              거절
                            </button>
                          </div>
                        ) : null}
                      </div>
                      {application.message ? (
                        <p className="whitespace-pre-wrap text-xs leading-5 text-[#4f5f75]">
                          {application.message}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-[#66758a]">아직 지원자가 없습니다.</p>
              )}
            </div>
          ) : null}
          {careApplicationMessage ? (
            <p className="col-span-full mt-1 text-xs font-medium text-[#4b765f]" role="status" aria-live="polite">
              {careApplicationMessage}
            </p>
          ) : null}
          {canCreateCareCompletionFeedback ? (
            <div className={CARE_WORKFLOW_SECTION_CLASS}>
              <p className="text-xs font-semibold text-[#2f3b4c]">완료 피드백</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <label className="text-xs font-semibold text-[#4f5f75]">
                  결과
                  <select
                    value={careFeedbackInput.outcome}
                    onChange={(event) =>
                      onCareFeedbackInputChange((current) => ({
                        ...current,
                        outcome: event.target.value as CareFeedbackOutcome,
                        issueType:
                          event.target.value === CareFeedbackOutcome.ISSUE
                            ? current.issueType
                            : CareFeedbackIssueType.NONE,
                      }))
                    }
                    className={INFO_PANEL_SELECT_CLASS}
                  >
                    {Object.values(CareFeedbackOutcome).map((outcome) => (
                      <option key={outcome} value={outcome}>
                        {careFeedbackOutcomeLabel[outcome]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-[#4f5f75]">
                  이슈 유형
                  <select
                    value={careFeedbackInput.issueType}
                    onChange={(event) =>
                      onCareFeedbackInputChange((current) => ({
                        ...current,
                        issueType: event.target.value as CareFeedbackIssueType,
                      }))
                    }
                    disabled={careFeedbackInput.outcome !== CareFeedbackOutcome.ISSUE}
                    className={`${INFO_PANEL_SELECT_CLASS} disabled:opacity-60`}
                  >
                    {Object.values(CareFeedbackIssueType).map((issueType) => (
                      <option key={issueType} value={issueType}>
                        {careFeedbackIssueLabel[issueType]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-end gap-2 text-xs font-semibold text-[#4f5f75]">
                  <input
                    type="checkbox"
                    checked={careFeedbackInput.wouldRepeat}
                    onChange={(event) =>
                      onCareFeedbackInputChange((current) => ({
                        ...current,
                        wouldRepeat: event.target.checked,
                      }))
                    }
                    className="mb-1 h-5 w-5 rounded border-[#d5dae3]"
                  />
                  다시 매칭하고 싶어요
                </label>
              </div>
              <textarea
                value={careFeedbackInput.comment}
                onChange={(event) =>
                  onCareFeedbackInputChange((current) => ({
                    ...current,
                    comment: event.target.value,
                  }))
                }
                rows={3}
                maxLength={500}
                className="mt-2 min-h-24 w-full rounded-md border border-[#d5dae3] bg-white px-3 py-2 text-sm text-[#253449] outline-none transition focus:border-[#7a91b5] focus:ring-2 focus:ring-[#d8e2f1]"
                placeholder="운영 확인이 필요한 내용이나 간단한 메모를 남겨주세요."
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-[#66758a]">피드백은 공개 프로필에 노출되지 않습니다.</span>
                <button
                  type="button"
                  className={`${INFO_PANEL_PRIMARY_ACTION_CLASS} border-[#2f5da4] bg-[#2f5da4] text-white hover:bg-[#244a83]`}
                  disabled={isCareFeedbackPending}
                  onClick={onCreateCareCompletionFeedback}
                >
                  저장
                </button>
              </div>
            </div>
          ) : null}
          {careCompletionFeedbacks.length > 0 ? (
            <div className={CARE_WORKFLOW_SECTION_CLASS}>
              <p className="text-xs font-semibold text-[#2f3b4c]">비공개 피드백</p>
              <div className="grid gap-2">
                {careCompletionFeedbacks.map((feedback) => (
                  <div key={feedback.id} className="grid gap-2 border-t border-[#e2e8f0] pt-2 first:border-t-0 first:pt-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-[#253449]">
                        {careFeedbackAuthorRoleLabel[feedback.authorRole]} ·{" "}
                        {careFeedbackOutcomeLabel[feedback.outcome]}
                      </p>
                      <p className="text-xs text-[#66758a]">
                        {careFeedbackIssueLabel[feedback.issueType]}
                      </p>
                    </div>
                    {feedback.comment ? (
                      <p className="whitespace-pre-wrap text-xs leading-5 text-[#4f5f75]">
                        {feedback.comment}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {careFeedbackMessage ? (
            <p className="col-span-full mt-1 text-xs font-medium text-[#4b765f]" role="status" aria-live="polite">
              {careFeedbackMessage}
            </p>
          ) : null}
        </PostDetailInfoSection>
      ) : null}

      {post.lostFoundAlert ? (
        <PostDetailInfoSection title="분실/목격 제보 정보">
          <PostDetailInfoItem
            label="제보 유형"
            value={renderTextValue(
              post.lostFoundAlert.alertType
                ? (lostFoundAlertTypeLabel[post.lostFoundAlert.alertType] ??
                  post.lostFoundAlert.alertType)
                : null,
            )}
          />
          <PostDetailInfoItem
            label="상태"
            value={renderTextValue(
              post.lostFoundAlert.status
                ? (lostFoundStatusLabel[post.lostFoundAlert.status] ??
                  post.lostFoundAlert.status)
                : null,
            )}
          />
          <PostDetailInfoItem
            label="마지막 확인"
            value={renderTextValue(formatDetailDateTime(post.lostFoundAlert.lastSeenAt))}
          />
          <PostDetailInfoItem
            label="동물 종류"
            value={renderTextValue(post.lostFoundAlert.petType)}
          />
          <PostDetailInfoItem
            label="품종/특징"
            value={renderTextValue(post.lostFoundAlert.breed)}
          />
          <PostDetailInfoItem
            label="확인 위치"
            span="wide"
            value={renderTextValue(post.lostFoundAlert.lastSeenLocation)}
          />
          <div className="col-span-full grid gap-2 border-t border-[#ead5a5] pt-2">
            <p className="tp-text-heading text-[12px] font-semibold">다음 행동</p>
            <div className="grid gap-2 text-[12px] leading-5 text-[#526d95] sm:grid-cols-2">
              <div className="grid gap-1">
                <p className="font-semibold text-[#10284a]">보호자 또는 공유자</p>
                <p>공개 문구로 주변에 공유하고, 개인 연락처와 상세 주소는 제외합니다.</p>
                <a
                  href="#lost-found-share-tools"
                  className="w-fit font-semibold text-[#3567b5] hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0]"
                >
                  공유 도구
                </a>
              </div>
              <div className="grid gap-1">
                <p className="font-semibold text-[#10284a]">목격자</p>
                <p>위치, 시간, 이동 방향을 댓글의 목격 제보로 남깁니다.</p>
                <a
                  href="#comments"
                  className="w-fit font-semibold text-[#3567b5] hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0]"
                >
                  목격 제보
                </a>
              </div>
            </div>
          </div>
          <div className="col-span-full grid gap-1.5 border-t border-[#ead5a5] pt-2">
            <p className="tp-text-heading text-[12px] font-semibold">제보 확인 기준</p>
            <ul className="tp-text-subtle grid gap-1 text-[12px] leading-5 sm:grid-cols-2">
              <li className="flex gap-1.5">
                <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-[#c9a95a]" aria-hidden="true" />
                <span>허위 제보, 장난 제보, 개인정보 노출은 신고 사유로 선택해 주세요.</span>
              </li>
              <li className="flex gap-1.5">
                <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-[#c9a95a]" aria-hidden="true" />
                <span>민감한 목격 위치와 사진은 댓글의 보호자 공개 제보로 남깁니다.</span>
              </li>
            </ul>
          </div>
          {canManageLostFoundStatus ? (
            <div className={STATUS_WORKFLOW_SECTION_CLASS}>
              <label className="tp-text-label text-[10px] text-[#5a7398]" htmlFor="lost-found-status">
                상태 변경
              </label>
              <select
                id="lost-found-status"
                className={INFO_PANEL_SELECT_CLASS}
                value={post.lostFoundAlert.status ?? LostFoundStatus.ACTIVE}
                onChange={(event) =>
                  onLostFoundStatusChange(event.target.value as LostFoundStatus)
                }
                disabled={isLostFoundStatusPending}
              >
                {Object.values(LostFoundStatus).map((status) => (
                  <option key={status} value={status}>
                    {lostFoundStatusLabel[status] ?? status}
                  </option>
                ))}
              </select>
              {lostFoundStatusMessage ? (
                <p
                  className={`${INFO_PANEL_STATUS_MESSAGE_CLASS} text-[#4b765f]`}
                  role="status"
                  aria-live="polite"
                >
                  {lostFoundStatusMessage}
                </p>
              ) : null}
            </div>
          ) : null}
        </PostDetailInfoSection>
      ) : null}

      {post.adoptionListing ? (
        <PostDetailInfoSection title="유기동물 입양 정보">
          <PostDetailInfoItem label="보호소" value={renderTextValue(post.adoptionListing.shelterName)} />
          <PostDetailInfoItem label="지역" value={renderTextValue(post.adoptionListing.region)} />
          <PostDetailInfoItem
            label="상태"
            value={renderTextValue(
              post.adoptionListing.status
                ? (adoptionStatusLabel[post.adoptionListing.status] ?? post.adoptionListing.status)
                : null,
            )}
          />
          <PostDetailInfoItem label="동물 종류" value={renderTextValue(post.adoptionListing.animalType)} />
          <PostDetailInfoItem label="품종" value={renderTextValue(post.adoptionListing.breed)} />
          <PostDetailInfoItem label="나이" value={renderTextValue(post.adoptionListing.ageLabel)} />
          <PostDetailInfoItem
            label="성별"
            value={renderTextValue(
              post.adoptionListing.sex
                ? (animalSexLabel[post.adoptionListing.sex] ?? post.adoptionListing.sex)
                : null,
            )}
          />
          <PostDetailInfoItem
            label="중성화"
            value={renderBooleanValue(post.adoptionListing.isNeutered, "완료", "미완료")}
          />
          <PostDetailInfoItem
            label="예방접종"
            value={renderBooleanValue(post.adoptionListing.isVaccinated, "완료", "미완료")}
          />
          <PostDetailInfoItem
            label="체형/크기"
            span="full"
            value={renderTextValue(post.adoptionListing.sizeLabel)}
          />
        </PostDetailInfoSection>
      ) : null}

      {post.volunteerRecruitment ? (
        <PostDetailInfoSection title="보호소 봉사 모집 정보">
          <PostDetailInfoItem label="보호소" value={renderTextValue(post.volunteerRecruitment.shelterName)} />
          <PostDetailInfoItem label="지역" value={renderTextValue(post.volunteerRecruitment.region)} />
          <PostDetailInfoItem
            label="모집 상태"
            value={renderTextValue(
              post.volunteerRecruitment.status
                ? (volunteerStatusLabel[post.volunteerRecruitment.status] ??
                  post.volunteerRecruitment.status)
                : null,
            )}
          />
          <PostDetailInfoItem
            label="봉사 일정"
            value={
              post.volunteerRecruitment.volunteerDate
                ? new Date(post.volunteerRecruitment.volunteerDate).toLocaleString("ko-KR")
                : emptyValue
            }
          />
          <PostDetailInfoItem
            label="봉사 유형"
            value={renderTextValue(post.volunteerRecruitment.volunteerType)}
          />
          <PostDetailInfoItem
            label="모집 인원"
            value={renderNumberValue(post.volunteerRecruitment.capacity, "명")}
          />
        </PostDetailInfoSection>
      ) : null}
    </>
  );
}
