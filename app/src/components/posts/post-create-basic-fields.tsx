"use client";

import { PostType } from "@prisma/client";
import type { Dispatch, RefObject, SetStateAction } from "react";
import Link from "next/link";

import type { PostCreateFormState } from "@/components/posts/post-create-form-state";
import type { ReviewCategory } from "@/lib/review-category";
import { POST_TITLE_MAX_LENGTH } from "@/lib/input-limits";

type SelectOption<T extends string> = {
  value: T;
  label: string;
};

type PostCreateBasicFieldsProps = {
  formState: PostCreateFormState;
  setFormState: Dispatch<SetStateAction<PostCreateFormState>>;
  titleInputRef: RefObject<HTMLInputElement | null>;
  isAuthenticated: boolean;
  isFormInteractive: boolean;
  canUseLocalScope: boolean;
  showNeighborhood: boolean;
  showReviewCategory: boolean;
  showCommunitySelector: boolean;
  showAnimalTagsInput: boolean;
  isFreeBoardType: boolean;
  postTypeOptions: ReadonlyArray<SelectOption<PostType>>;
  reviewCategoryOptions: ReadonlyArray<SelectOption<ReviewCategory>>;
  neighborhoodOptions: ReadonlyArray<SelectOption<string>>;
  communityOptions: ReadonlyArray<SelectOption<string>>;
  onTitleChange: (value: string) => void;
};

export function PostCreateBasicFields({
  formState,
  setFormState,
  titleInputRef,
  isAuthenticated,
  isFormInteractive,
  canUseLocalScope,
  showNeighborhood,
  showReviewCategory,
  showCommunitySelector,
  showAnimalTagsInput,
  isFreeBoardType,
  postTypeOptions,
  reviewCategoryOptions,
  neighborhoodOptions,
  communityOptions,
  onTitleChange,
}: PostCreateBasicFieldsProps) {
  return (
    <section className="tp-card overflow-hidden">
      <div className="tp-form-section-bar">
        <p className="tp-form-section-title">
          글 정보
        </p>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-2">
        <label className="tp-form-label">
          제목
          <input
            ref={titleInputRef}
            className="tp-input-soft min-h-11 px-3 py-2 text-sm"
            defaultValue={formState.title}
            onChange={(event) => {
              onTitleChange(event.target.value);
            }}
            disabled={!isFormInteractive}
            maxLength={POST_TITLE_MAX_LENGTH}
            placeholder="제목을 입력해 주세요"
            required
          />
        </label>

        <label className="tp-form-label">
          분류
          <select
            className="tp-input-soft min-h-11 px-3 py-2 text-sm"
            value={formState.type}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                type: event.target.value as PostType,
              }))
            }
          >
            {postTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {showReviewCategory ? (
          <label className="tp-form-label">
            리뷰 카테고리
            <select
              className="tp-input-soft min-h-11 px-3 py-2 text-sm"
              value={formState.reviewCategory}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  reviewCategory: event.target.value as ReviewCategory,
                }))
              }
            >
              {reviewCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {showNeighborhood ? (
          <label className="tp-form-label">
            동네
            <select
              className={`tp-input-soft min-h-11 px-3 py-2 text-sm transition ${
                showNeighborhood
                  ? ""
                  : "tp-btn-disabled cursor-not-allowed"
              }`}
              value={formState.neighborhoodId}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  neighborhoodId: event.target.value,
                }))
              }
              disabled={!showNeighborhood || !canUseLocalScope}
              required={showNeighborhood && canUseLocalScope}
            >
              <option value="">선택</option>
              {neighborhoodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {!canUseLocalScope ? (
              <span className="tp-form-note flex items-center gap-2">
                <span>동네를 먼저 설정해 주세요.</span>
                <Link href="/profile" className="tp-text-link font-semibold underline underline-offset-2">
                  설정 페이지로 이동
                </Link>
              </span>
            ) : null}
          </label>
        ) : null}

        {showCommunitySelector ? (
          <label className="tp-form-label">
            관련 동물
            <select
              className="tp-input-soft min-h-11 px-3 py-2 text-sm"
              value={formState.petTypeId}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  petTypeId: event.target.value,
                }))
              }
              required={!isFreeBoardType}
            >
              <option value="">{isFreeBoardType ? "선택 안함" : "선택"}</option>
              {communityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {showAnimalTagsInput ? (
          <label className="tp-form-label md:col-span-2">
            동물 태그
            <input
              className="tp-input-soft min-h-11 px-3 py-2 text-sm"
              value={formState.animalTagsInput}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  animalTagsInput: event.target.value,
                }))
              }
              placeholder="예: 강아지, 고양이"
              required
            />
            <span className="tp-form-note">
              공용 보드 글의 노출 향상을 위해 동물 태그를 쉼표로 구분해 입력해 주세요.
            </span>
          </label>
        ) : null}
      </div>
      {!isAuthenticated ? (
        <div className="tp-border-soft tp-surface-soft grid gap-3 border-t p-4 md:grid-cols-2">
          <label className="tp-form-label">
            비회원 닉네임
            <input
              className="tp-input-soft min-h-11 bg-white px-3 py-2 text-sm"
              value={formState.guestDisplayName}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, guestDisplayName: event.target.value }))
              }
              placeholder="닉네임"
              minLength={2}
              maxLength={24}
              required
            />
          </label>
          <label className="tp-form-label">
            글 비밀번호
            <input
              type="password"
              className="tp-input-soft min-h-11 bg-white px-3 py-2 text-sm"
              value={formState.guestPassword}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, guestPassword: event.target.value }))
              }
              placeholder="수정/삭제용 비밀번호"
              minLength={4}
              maxLength={32}
              required
            />
          </label>
        </div>
      ) : null}
    </section>
  );
}
