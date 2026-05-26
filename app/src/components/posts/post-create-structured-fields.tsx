"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";

import type { PostCreateFormState } from "@/components/posts/post-create-form-state";
import {
  careTypeOptions,
  hospitalExplanationOptions,
  hospitalPriceLevelOptions,
  hospitalVisitPurposeOptions,
  lostFoundAlertTypeOptions,
  marketConditionOptions,
  marketListingTypeOptions,
} from "@/components/posts/post-create-form-options";
import { MARKET_SAFETY_CHECKLIST } from "@/lib/market-safety-policy";
import {
  ADOPTION_AGE_LABEL_SUGGESTIONS,
  ADOPTION_ANIMAL_TYPE_SUGGESTIONS,
  ADOPTION_BREED_SUGGESTIONS,
  HOSPITAL_TREATMENT_TYPE_SUGGESTIONS,
  STRUCTURED_REGION_SUGGESTIONS,
  VOLUNTEER_TYPE_SUGGESTIONS,
} from "@/lib/structured-field-normalization";

type StructuredFieldSectionProps = {
  title: string;
  children: ReactNode;
};

type StructuredFieldsProps = {
  formState: PostCreateFormState;
  setFormState: Dispatch<SetStateAction<PostCreateFormState>>;
};

export function StructuredFieldSection({
  title,
  children,
}: StructuredFieldSectionProps) {
  return (
    <section className="tp-card overflow-hidden">
      <div className="tp-form-section-bar">
        <p className="tp-form-section-title">{title}</p>
      </div>
      <div className="grid gap-3 p-3 sm:p-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

export function HospitalReviewFields({
  formState,
  setFormState,
}: StructuredFieldsProps) {
  return (
    <StructuredFieldSection title="병원 후기 정보">
      <label className="tp-form-label">
        병원명
        <input
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.hospitalReview.hospitalName}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              hospitalReview: {
                ...prev.hospitalReview,
                hospitalName: event.target.value,
              },
            }))
          }
          placeholder="예: 서초동 24시 동물병원"
        />
      </label>

      <label className="tp-form-label">
        방문 목적
        <select
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.hospitalReview.visitPurpose}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              hospitalReview: {
                ...prev.hospitalReview,
                visitPurpose: event.target.value,
              },
            }))
          }
        >
          <option value="">선택 안함</option>
          {hospitalVisitPurposeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="tp-form-label">
        동물 종류
        <input
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.hospitalReview.animalType}
          list="adoption-animal-type-options"
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              hospitalReview: {
                ...prev.hospitalReview,
                animalType: event.target.value,
              },
            }))
          }
          placeholder="예: 강아지"
        />
      </label>

      <label className="tp-form-label">
        진료 항목
        <input
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.hospitalReview.treatmentType}
          list="hospital-treatment-type-options"
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              hospitalReview: {
                ...prev.hospitalReview,
                treatmentType: event.target.value,
              },
            }))
          }
          placeholder="예: 피부염 검사"
        />
      </label>

      <label className="tp-form-label">
        비용(원, 선택)
        <input
          type="number"
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.hospitalReview.totalCost}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              hospitalReview: {
                ...prev.hospitalReview,
                totalCost: event.target.value,
              },
            }))
          }
          placeholder="예: 35000"
          min={0}
        />
      </label>

      <label className="tp-form-label">
        대기시간(분)
        <input
          type="number"
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.hospitalReview.waitTime}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              hospitalReview: {
                ...prev.hospitalReview,
                waitTime: event.target.value,
              },
            }))
          }
          placeholder="예: 20"
          min={0}
        />
      </label>

      <label className="tp-form-label">
        설명 충분성
        <select
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.hospitalReview.explanationSatisfaction}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              hospitalReview: {
                ...prev.hospitalReview,
                explanationSatisfaction: event.target.value,
              },
            }))
          }
        >
          {hospitalExplanationOptions.map((option) => (
            <option key={option.value || "empty"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="tp-form-label">
        가격 체감
        <select
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.hospitalReview.priceLevel}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              hospitalReview: {
                ...prev.hospitalReview,
                priceLevel: event.target.value,
              },
            }))
          }
        >
          {hospitalPriceLevelOptions.map((option) => (
            <option key={option.value || "empty"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-2 md:col-span-2 md:grid-cols-3">
        {[
          ["hasParking", "주차 가능"],
          ["hasNightCare", "야간진료 경험"],
          ["wouldRevisit", "재방문 의향"],
        ].map(([key, label]) => (
          <label key={key} className="tp-form-label">
            {label}
            <select
              className="tp-input-soft px-3 py-2 text-sm"
              value={
                formState.hospitalReview[
                  key as "hasParking" | "hasNightCare" | "wouldRevisit"
                ]
              }
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  hospitalReview: {
                    ...prev.hospitalReview,
                    [key]: event.target.value,
                  },
                }))
              }
            >
              <option value="">선택 안함</option>
              <option value="true">예</option>
              <option value="false">아니오</option>
            </select>
          </label>
        ))}
      </div>

      <label className="tp-form-label">
        종합 만족도
        <select
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.hospitalReview.rating}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              hospitalReview: {
                ...prev.hospitalReview,
                rating: event.target.value,
              },
            }))
          }
        >
          <option value="">선택 안함</option>
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value}점
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-1.5 border-t border-[#e3ecf8] pt-2 md:col-span-2">
        <p className="tp-text-heading text-[12px] font-semibold">작성 기준</p>
        <div className="tp-text-subtle grid gap-1 text-[12px] leading-5 sm:grid-cols-2">
          <p className="flex gap-1.5">
            <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-[#9fb7d9]" aria-hidden="true" />
            <span>대기, 설명, 비용, 재방문 의향처럼 직접 겪은 내용만 적어 주세요.</span>
          </p>
          <p className="flex gap-1.5 text-[#8a4b32]">
            <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-[#c99a81]" aria-hidden="true" />
            <span>진단 단정, 과잉진료 단정, 직원 실명과 연락처는 검토될 수 있습니다.</span>
          </p>
        </div>
      </div>
    </StructuredFieldSection>
  );
}

export function PlaceReviewFields({
  formState,
  setFormState,
}: StructuredFieldsProps) {
  return (
    <StructuredFieldSection title="장소 후기 정보">
      <label className="tp-form-label">
        장소명
        <input
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.placeReview.placeName}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              placeReview: {
                ...prev.placeReview,
                placeName: event.target.value,
              },
            }))
          }
          placeholder="예: 반포동 펫카페"
        />
      </label>

      <label className="tp-form-label">
        장소 유형
        <input
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.placeReview.placeType}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              placeReview: {
                ...prev.placeReview,
                placeType: event.target.value,
              },
            }))
          }
          placeholder="예: 카페"
        />
      </label>

      <label className="tp-form-label">
        주소
        <input
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.placeReview.address}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              placeReview: {
                ...prev.placeReview,
                address: event.target.value,
              },
            }))
          }
          placeholder="예: 서초구 반포동"
        />
      </label>

      <label className="tp-form-label">
        동반 가능 여부
        <select
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.placeReview.isPetAllowed}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              placeReview: {
                ...prev.placeReview,
                isPetAllowed: event.target.value,
              },
            }))
          }
        >
          <option value="">선택 안함</option>
          <option value="true">가능</option>
          <option value="false">불가</option>
        </select>
      </label>

      <label className="tp-form-label">
        만족도
        <select
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.placeReview.rating}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              placeReview: {
                ...prev.placeReview,
                rating: event.target.value,
              },
            }))
          }
        >
          <option value="">선택 안함</option>
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value}점
            </option>
          ))}
        </select>
      </label>
    </StructuredFieldSection>
  );
}

export function WalkRouteFields({
  formState,
  setFormState,
}: StructuredFieldsProps) {
  return (
    <StructuredFieldSection title="산책 코스 정보">
      <label className="tp-form-label">
        코스 이름
        <input
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.walkRoute.routeName}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              walkRoute: {
                ...prev.walkRoute,
                routeName: event.target.value,
              },
            }))
          }
          placeholder="예: 양재천 산책 코스"
        />
      </label>

      <label className="tp-form-label">
        거리(km)
        <input
          type="number"
          step="0.1"
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.walkRoute.distance}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              walkRoute: {
                ...prev.walkRoute,
                distance: event.target.value,
              },
            }))
          }
          placeholder="예: 2.5"
          min={0}
        />
      </label>

      <label className="tp-form-label">
        소요시간(분)
        <input
          type="number"
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.walkRoute.duration}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              walkRoute: {
                ...prev.walkRoute,
                duration: event.target.value,
              },
            }))
          }
          placeholder="예: 40"
          min={0}
        />
      </label>

      <label className="tp-form-label">
        난이도
        <select
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.walkRoute.difficulty}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              walkRoute: {
                ...prev.walkRoute,
                difficulty: event.target.value,
              },
            }))
          }
        >
          <option value="">선택 안함</option>
          <option value="EASY">쉬움</option>
          <option value="MODERATE">보통</option>
          <option value="HARD">어려움</option>
        </select>
      </label>

      <label className="tp-form-label">
        대형견 적합
        <select
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.walkRoute.largeDogFriendly}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              walkRoute: {
                ...prev.walkRoute,
                largeDogFriendly: event.target.value,
              },
            }))
          }
        >
          <option value="">선택 안함</option>
          <option value="true">적합</option>
          <option value="false">주의 필요</option>
        </select>
      </label>

      <label className="tp-form-label">
        혼잡 시간
        <input
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.walkRoute.crowdedTime}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              walkRoute: {
                ...prev.walkRoute,
                crowdedTime: event.target.value,
              },
            }))
          }
          placeholder="예: 평일 18-20시, 주말 오후"
        />
      </label>

      <label className="tp-form-label">
        목줄 필수 구간
        <input
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.walkRoute.leashRequiredNote}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              walkRoute: {
                ...prev.walkRoute,
                leashRequiredNote: event.target.value,
              },
            }))
          }
          placeholder="예: 자전거도로 옆 구간"
        />
      </label>

      <label className="tp-form-label">
        안전 태그(콤마)
        <input
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.walkRoute.safetyTags}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              walkRoute: {
                ...prev.walkRoute,
                safetyTags: event.target.value,
              },
            }))
          }
          placeholder="예: 차량주의, 야간조명"
        />
      </label>

      <label className="tp-form-label md:col-span-2">
        위험/공사 구간
        <input
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.walkRoute.cautionNote}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              walkRoute: {
                ...prev.walkRoute,
                cautionNote: event.target.value,
              },
            }))
          }
          placeholder="예: 공사 펜스, 차량 진입로, 미끄러운 데크"
        />
      </label>

      <div className="tp-form-label">
        편의 시설
        <div className="tp-text-muted flex flex-wrap gap-3 text-xs">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="accent-[#3567b5]"
              checked={formState.walkRoute.hasStreetLights === "true"}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  walkRoute: {
                    ...prev.walkRoute,
                    hasStreetLights: event.target.checked ? "true" : "false",
                  },
                }))
              }
            />
            가로등
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="accent-[#3567b5]"
              checked={formState.walkRoute.hasRestroom === "true"}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  walkRoute: {
                    ...prev.walkRoute,
                    hasRestroom: event.target.checked ? "true" : "false",
                  },
                }))
              }
            />
            화장실
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="accent-[#3567b5]"
              checked={formState.walkRoute.hasParkingLot === "true"}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  walkRoute: {
                    ...prev.walkRoute,
                    hasParkingLot: event.target.checked ? "true" : "false",
                  },
                }))
              }
            />
            주차장
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="accent-[#3567b5]"
              checked={formState.walkRoute.hasWasteBags === "true"}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  walkRoute: {
                    ...prev.walkRoute,
                    hasWasteBags: event.target.checked ? "true" : "false",
                  },
                }))
              }
            />
            배변봉투함
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="accent-[#3567b5]"
              checked={formState.walkRoute.hasWaterStation === "true"}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  walkRoute: {
                    ...prev.walkRoute,
                    hasWaterStation: event.target.checked ? "true" : "false",
                  },
                }))
              }
            />
            물 마실 곳
          </label>
        </div>
      </div>
      <div className="grid gap-1.5 border-t border-[#e3ecf8] pt-2 md:col-span-2">
        <p className="tp-text-heading text-[12px] font-semibold">작성 기준</p>
        <div className="tp-text-subtle grid gap-1 text-[12px] leading-5 sm:grid-cols-2">
          <p className="flex gap-1.5">
            <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-[#9fb7d9]" aria-hidden="true" />
            <span>코스 이름보다 혼잡 시간, 목줄 구간, 대형견 적합 여부를 우선 적어 주세요.</span>
          </p>
          <p className="flex gap-1.5">
            <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-[#9fb7d9]" aria-hidden="true" />
            <span>배변봉투함, 물 마실 곳, 위험 구간이 있으면 함께 남겨 주세요.</span>
          </p>
        </div>
      </div>
    </StructuredFieldSection>
  );
}

export function MarketListingFields({
  formState,
  setFormState,
}: StructuredFieldsProps) {
  return (
    <StructuredFieldSection title="거래 정보">
      <label className="tp-form-label">
        거래 유형
        <select
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.marketListing.listingType}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              marketListing: {
                ...prev.marketListing,
                listingType: event.target.value,
              },
            }))
          }
        >
          {marketListingTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="tp-form-label">
        가격(원)
        <input
          type="number"
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.marketListing.price}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              marketListing: {
                ...prev.marketListing,
                price: event.target.value,
              },
            }))
          }
          placeholder="나눔은 0"
          min={0}
          required
        />
      </label>

      <label className="tp-form-label">
        상품 상태
        <select
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.marketListing.condition}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              marketListing: {
                ...prev.marketListing,
                condition: event.target.value,
              },
            }))
          }
        >
          {marketConditionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="tp-form-label">
        보증금(원)
        <input
          type="number"
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.marketListing.depositAmount}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              marketListing: {
                ...prev.marketListing,
                depositAmount: event.target.value,
              },
            }))
          }
          placeholder="대여 글일 때 선택"
          min={0}
        />
      </label>

      <label className="tp-form-label md:col-span-2">
        대여/거래 기간
        <input
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.marketListing.rentalPeriod}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              marketListing: {
                ...prev.marketListing,
                rentalPeriod: event.target.value,
              },
            }))
          }
          placeholder="예: 2주 대여, 이번 주말 직거래"
        />
      </label>
      <div className="grid gap-1.5 border-t border-[#e3ecf8] pt-2 md:col-span-2">
        <p className="tp-text-heading text-[12px] font-semibold">반려용품 거래 체크</p>
        <ul className="tp-text-subtle grid gap-1 text-[12px] leading-5 sm:grid-cols-2">
          {MARKET_SAFETY_CHECKLIST.map((item) => (
            <li key={item} className="flex gap-1.5">
              <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-[#9fb7d9]" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="text-[12px] leading-5 text-[#8a4b32]">
          동물 생체 판매, 유통기한이 지난 사료·간식, 동물 의약품 거래는 등록할 수 없습니다.
        </p>
      </div>
    </StructuredFieldSection>
  );
}

export function CareRequestFields({
  formState,
  setFormState,
}: StructuredFieldsProps) {
  return (
    <StructuredFieldSection title="돌봄 요청 정보">
      <label className="tp-form-label">
        요청 유형
        <select
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.careRequest.careType}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              careRequest: {
                ...prev.careRequest,
                careType: event.target.value,
              },
            }))
          }
        >
          {careTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="tp-form-label">
        시작 시간
        <input
          type="datetime-local"
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.careRequest.startsAt}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              careRequest: {
                ...prev.careRequest,
                startsAt: event.target.value,
              },
            }))
          }
          required
        />
      </label>

      <label className="tp-form-label">
        종료 시간
        <input
          type="datetime-local"
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.careRequest.endsAt}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              careRequest: {
                ...prev.careRequest,
                endsAt: event.target.value,
              },
            }))
          }
        />
      </label>

      <label className="tp-form-label">
        보상(원)
        <input
          type="number"
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.careRequest.rewardAmount}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              careRequest: {
                ...prev.careRequest,
                rewardAmount: event.target.value,
              },
            }))
          }
          placeholder="선택"
          min={0}
        />
      </label>

      <label className="tp-form-label md:col-span-2">
        위치 힌트
        <input
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.careRequest.locationNote}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              careRequest: {
                ...prev.careRequest,
                locationNote: event.target.value,
              },
            }))
          }
          placeholder="예: 아파트 단지명, 큰 길 기준 위치"
        />
      </label>

      <label className="tp-form-label md:col-span-2">
        반려동물 정보
        <input
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.careRequest.petNote}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              careRequest: {
                ...prev.careRequest,
                petNote: event.target.value,
              },
            }))
          }
          placeholder="예: 5kg 소형견, 낯선 사람에게 겁이 많음"
        />
      </label>

      <label className="tp-form-label md:col-span-2">
        요청사항
        <textarea
          className="tp-input-soft min-h-24 px-3 py-2 text-sm"
          value={formState.careRequest.requirements}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              careRequest: {
                ...prev.careRequest,
                requirements: event.target.value,
              },
            }))
          }
          placeholder="필요한 도움과 주의사항을 적어 주세요."
        />
      </label>

      <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#315b9a] md:col-span-2">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-[#b9cbe6]"
          checked={formState.careRequest.isUrgent === "true"}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              careRequest: {
                ...prev.careRequest,
                isUrgent: event.target.checked ? "true" : "false",
              },
            }))
          }
        />
        긴급 요청
      </label>
    </StructuredFieldSection>
  );
}

export function LostFoundFields({
  formState,
  setFormState,
}: StructuredFieldsProps) {
  return (
    <StructuredFieldSection title="분실/목격 핵심 정보">
      <label className="tp-form-label">
        제보 유형
        <select
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.lostFound.alertType}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              lostFound: {
                ...prev.lostFound,
                alertType: event.target.value,
              },
            }))
          }
          required
        >
          {lostFoundAlertTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="tp-form-label">
        동물 종류
        <input
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.lostFound.petType}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              lostFound: {
                ...prev.lostFound,
                petType: event.target.value,
              },
            }))
          }
          placeholder="예: 강아지, 고양이"
          required
        />
      </label>

      <label className="tp-form-label">
        품종/색상/특징
        <input
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.lostFound.breed}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              lostFound: {
                ...prev.lostFound,
                breed: event.target.value,
              },
            }))
          }
          placeholder="예: 갈색 푸들, 빨간 목줄"
        />
      </label>

      <label className="tp-form-label">
        마지막 확인 시간
        <input
          type="datetime-local"
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.lostFound.lastSeenAt}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              lostFound: {
                ...prev.lostFound,
                lastSeenAt: event.target.value,
              },
            }))
          }
          required
        />
      </label>

      <label className="tp-form-label md:col-span-2">
        마지막 확인 위치
        <input
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.lostFound.lastSeenLocation}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              lostFound: {
                ...prev.lostFound,
                lastSeenLocation: event.target.value,
              },
            }))
          }
          placeholder="예: 반포동 산책로 입구, OO공원 북문 근처"
          required
        />
      </label>
      <div className="grid gap-1.5 border-t border-[#e3ecf8] pt-2 md:col-span-2">
        <p className="tp-text-heading text-[12px] font-semibold">위치 공개 기준</p>
        <div className="tp-text-subtle grid gap-1 text-[12px] leading-5 sm:grid-cols-2">
          <p className="flex gap-1.5">
            <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-[#9fb7d9]" aria-hidden="true" />
            <span>공개 글에는 전화번호, 오픈채팅, 이메일, 도로명·번지 주소를 적지 마세요.</span>
          </p>
          <p className="flex gap-1.5">
            <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-[#9fb7d9]" aria-hidden="true" />
            <span>연락이 필요한 단서는 댓글의 보호자 공개 제보로 남깁니다.</span>
          </p>
        </div>
      </div>
    </StructuredFieldSection>
  );
}

export function AdoptionListingFields({
  formState,
  setFormState,
}: StructuredFieldsProps) {
  return (
    <StructuredFieldSection title="입양 정보">
      <label className="tp-form-label">
        보호소명
        <input
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.adoptionListing.shelterName}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              adoptionListing: {
                ...prev.adoptionListing,
                shelterName: event.target.value,
              },
            }))
          }
          placeholder="예: 서울시 동물보호센터"
        />
      </label>

      <label className="tp-form-label">
        지역
        <input
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.adoptionListing.region}
          list="structured-region-options"
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              adoptionListing: {
                ...prev.adoptionListing,
                region: event.target.value,
              },
            }))
          }
          placeholder="예: 서울 서초구"
        />
      </label>

      <label className="tp-form-label">
        동물 종류
        <input
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.adoptionListing.animalType}
          list="adoption-animal-type-options"
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              adoptionListing: {
                ...prev.adoptionListing,
                animalType: event.target.value,
              },
            }))
          }
          placeholder="예: 강아지"
        />
      </label>

      <label className="tp-form-label">
        품종
        <input
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.adoptionListing.breed}
          list="adoption-breed-options"
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              adoptionListing: {
                ...prev.adoptionListing,
                breed: event.target.value,
              },
            }))
          }
          placeholder="예: 믹스견"
        />
      </label>

      <label className="tp-form-label">
        나이/추정 개월수
        <input
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.adoptionListing.ageLabel}
          list="adoption-age-label-options"
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              adoptionListing: {
                ...prev.adoptionListing,
                ageLabel: event.target.value,
              },
            }))
          }
          placeholder="예: 2살 추정"
        />
      </label>

      <label className="tp-form-label">
        성별
        <select
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.adoptionListing.sex}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              adoptionListing: {
                ...prev.adoptionListing,
                sex: event.target.value,
              },
            }))
          }
        >
          <option value="">선택 안함</option>
          <option value="MALE">수컷</option>
          <option value="FEMALE">암컷</option>
          <option value="UNKNOWN">미상</option>
        </select>
      </label>

      <label className="tp-form-label">
        중성화
        <select
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.adoptionListing.isNeutered}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              adoptionListing: {
                ...prev.adoptionListing,
                isNeutered: event.target.value,
              },
            }))
          }
        >
          <option value="">선택 안함</option>
          <option value="true">완료</option>
          <option value="false">미완료</option>
        </select>
      </label>

      <label className="tp-form-label">
        예방접종
        <select
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.adoptionListing.isVaccinated}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              adoptionListing: {
                ...prev.adoptionListing,
                isVaccinated: event.target.value,
              },
            }))
          }
        >
          <option value="">선택 안함</option>
          <option value="true">완료</option>
          <option value="false">미완료</option>
        </select>
      </label>

      <label className="tp-form-label">
        체형/크기
        <input
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.adoptionListing.sizeLabel}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              adoptionListing: {
                ...prev.adoptionListing,
                sizeLabel: event.target.value,
              },
            }))
          }
          placeholder="예: 중형견"
        />
      </label>

      <label className="tp-form-label">
        진행 상태
        <select
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.adoptionListing.status}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              adoptionListing: {
                ...prev.adoptionListing,
                status: event.target.value,
              },
            }))
          }
        >
          <option value="OPEN">입양 가능</option>
          <option value="RESERVED">상담 중</option>
          <option value="ADOPTED">입양 완료</option>
          <option value="CLOSED">마감</option>
        </select>
      </label>
    </StructuredFieldSection>
  );
}

export function VolunteerRecruitmentFields({
  formState,
  setFormState,
}: StructuredFieldsProps) {
  return (
    <StructuredFieldSection title="봉사 모집 정보">
      <label className="tp-form-label">
        보호소명
        <input
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.volunteerRecruitment.shelterName}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              volunteerRecruitment: {
                ...prev.volunteerRecruitment,
                shelterName: event.target.value,
              },
            }))
          }
          placeholder="예: 서초 유기동물 보호소"
        />
      </label>

      <label className="tp-form-label">
        지역
        <input
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.volunteerRecruitment.region}
          list="structured-region-options"
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              volunteerRecruitment: {
                ...prev.volunteerRecruitment,
                region: event.target.value,
              },
            }))
          }
          placeholder="예: 서울 서초구"
        />
      </label>

      <label className="tp-form-label">
        봉사 일정
        <input
          type="datetime-local"
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.volunteerRecruitment.volunteerDate}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              volunteerRecruitment: {
                ...prev.volunteerRecruitment,
                volunteerDate: event.target.value,
              },
            }))
          }
        />
      </label>

      <label className="tp-form-label">
        봉사 유형
        <input
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.volunteerRecruitment.volunteerType}
          list="volunteer-type-options"
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              volunteerRecruitment: {
                ...prev.volunteerRecruitment,
                volunteerType: event.target.value,
              },
            }))
          }
          placeholder="예: 산책, 청소, 사진 촬영"
        />
      </label>

      <label className="tp-form-label">
        모집 인원
        <input
          type="number"
          min={1}
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.volunteerRecruitment.capacity}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              volunteerRecruitment: {
                ...prev.volunteerRecruitment,
                capacity: event.target.value,
              },
            }))
          }
          placeholder="예: 10"
        />
      </label>

      <label className="tp-form-label">
        모집 상태
        <select
          className="tp-input-soft px-3 py-2 text-sm"
          value={formState.volunteerRecruitment.status}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              volunteerRecruitment: {
                ...prev.volunteerRecruitment,
                status: event.target.value,
              },
            }))
          }
        >
          <option value="OPEN">모집 중</option>
          <option value="FULL">정원 마감</option>
          <option value="CLOSED">모집 종료</option>
          <option value="CANCELLED">취소</option>
        </select>
      </label>
    </StructuredFieldSection>
  );
}

export function StructuredFieldDatalists() {
  return (
    <>
      <datalist id="hospital-treatment-type-options">
        {HOSPITAL_TREATMENT_TYPE_SUGGESTIONS.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      <datalist id="structured-region-options">
        {STRUCTURED_REGION_SUGGESTIONS.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      <datalist id="adoption-animal-type-options">
        {ADOPTION_ANIMAL_TYPE_SUGGESTIONS.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      <datalist id="adoption-breed-options">
        {ADOPTION_BREED_SUGGESTIONS.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      <datalist id="adoption-age-label-options">
        {ADOPTION_AGE_LABEL_SUGGESTIONS.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      <datalist id="volunteer-type-options">
        {VOLUNTEER_TYPE_SUGGESTIONS.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
    </>
  );
}
