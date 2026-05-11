"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";

import type { PostCreateFormState } from "@/components/posts/post-create-form-state";
import {
  careTypeOptions,
  marketConditionOptions,
  marketListingTypeOptions,
} from "@/components/posts/post-create-form-options";

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
      <div className="grid gap-4 p-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

export function MarketListingFields({
  formState,
  setFormState,
}: StructuredFieldsProps) {
  return (
    <StructuredFieldSection title="마켓 거래 정보">
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
