"use client";

import { useEffect, useMemo, useState } from "react";

export type PostDetailMediaItem = {
  url: string;
  order?: number | null;
};

export function extractPostDetailAttachmentName(url: string, fallbackIndex: number) {
  try {
    const parsed =
      url.startsWith("http://") || url.startsWith("https://")
        ? new URL(url)
        : new URL(url, "https://townpet.local");
    const name = decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() ?? "").trim();
    return (name.length > 0 ? name : `첨부 이미지 ${fallbackIndex + 1}`).normalize("NFC");
  } catch {
    const name = decodeURIComponent(url.split("?")[0]?.split("/").filter(Boolean).pop() ?? "").trim();
    return (name.length > 0 ? name : `첨부 이미지 ${fallbackIndex + 1}`).normalize("NFC");
  }
}

export function getPostDetailMediaGridClassName(imageCount: number) {
  if (imageCount <= 1) {
    return "grid-cols-1";
  }
  if (imageCount === 2) {
    return "grid-cols-1 sm:grid-cols-2";
  }
  return "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3";
}

export function getWrappedPostDetailMediaIndex(currentIndex: number, delta: -1 | 1, totalCount: number) {
  if (totalCount <= 0) {
    return 0;
  }

  return (currentIndex + delta + totalCount) % totalCount;
}

type PostDetailMediaGalleryProps = {
  images: PostDetailMediaItem[];
};

export function PostDetailMediaGallery({ images }: PostDetailMediaGalleryProps) {
  const orderedImages = useMemo(
    () => [...images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [images],
  );
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    if (activeIndex === null || typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeIndex]);

  useEffect(() => {
    if (activeIndex === null || typeof window === "undefined") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setActiveIndex(null);
        return;
      }

      if (orderedImages.length <= 1) {
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveIndex((current) =>
          current === null
            ? current
            : getWrappedPostDetailMediaIndex(current, 1, orderedImages.length),
        );
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveIndex((current) =>
          current === null
            ? current
            : getWrappedPostDetailMediaIndex(current, -1, orderedImages.length),
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, orderedImages.length]);

  if (orderedImages.length === 0) {
    return null;
  }

  const normalizedActiveIndex =
    activeIndex === null ? null : Math.min(activeIndex, orderedImages.length - 1);
  const activeImage = normalizedActiveIndex === null ? null : orderedImages[normalizedActiveIndex];
  const activeImageName =
    normalizedActiveIndex === null || !activeImage
      ? null
      : extractPostDetailAttachmentName(activeImage.url, normalizedActiveIndex);
  const activeImagePosition = normalizedActiveIndex === null ? null : normalizedActiveIndex + 1;

  return (
    <>
      <section className="tp-border-soft mt-6 border-t pt-4 sm:mt-7 sm:pt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="tp-text-section-title tp-text-heading text-[13px]">첨부 이미지</h2>
            <p className="tp-text-subtle mt-1 text-[11px]">
              썸네일을 눌러 크게 보고, 원본 이미지는 새 탭으로 열 수 있습니다.
            </p>
          </div>
          <span className="tp-text-label text-[11px]">{orderedImages.length}장</span>
        </div>

        <div className={`mt-3 grid gap-3 ${getPostDetailMediaGridClassName(orderedImages.length)}`}>
          {orderedImages.map((image, index) => {
            const fileName = extractPostDetailAttachmentName(image.url, index);

            return (
              <button
                key={`${image.url}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className="tp-border-soft group overflow-hidden rounded-2xl border bg-white text-left transition hover:border-[#bfd4f2] hover:shadow-[0_12px_28px_rgba(18,47,90,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-2"
                aria-label={`${fileName} 크게 보기`}
              >
                <div className="aspect-[4/3] overflow-hidden bg-[#f4f8ff]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- remote/local mixed upload URLs make plain img the safest preview path here. */}
                  <img
                    src={image.url}
                    alt={fileName}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                  />
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <span className="tp-text-primary truncate text-[12px] font-medium">{fileName}</span>
                  <span className="tp-text-link shrink-0 text-[11px] font-semibold">확대 보기</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {activeImage && activeImageName && activeImagePosition !== null ? (
        <div
          className="fixed inset-0 z-[90] bg-[rgba(6,16,32,0.82)] px-3 py-4 sm:px-6 sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-label={`${activeImageName} 이미지 크게 보기`}
          onClick={() => setActiveIndex(null)}
        >
          <div
            className="mx-auto flex h-full w-full max-w-5xl flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 text-white">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold sm:text-[15px]">{activeImageName}</p>
                <p className="mt-1 text-[11px] text-white/70 sm:text-[12px]">
                  {activeImagePosition} / {orderedImages.length}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveIndex(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(6,16,32,0.82)]"
                aria-label="이미지 닫기"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M5 5 15 15" strokeLinecap="round" />
                  <path d="M15 5 5 15" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="relative mt-4 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(8,20,39,0.74)] p-2 sm:p-4">
              {orderedImages.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setActiveIndex((current) =>
                      current === null
                        ? current
                        : getWrappedPostDetailMediaIndex(current, -1, orderedImages.length),
                    )
                  }
                  className="absolute left-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-[#071426]/35 text-white transition hover:bg-[#071426]/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(8,20,39,0.74)] sm:left-4"
                  aria-label="이전 이미지"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M12.5 4.5 7 10l5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ) : null}

              {/* eslint-disable-next-line @next/next/no-img-element -- remote/local mixed upload URLs make plain img the safest preview path here. */}
              <img
                src={activeImage.url}
                alt={activeImageName}
                decoding="async"
                className="max-h-full max-w-full rounded-[18px] object-contain"
              />

              {orderedImages.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setActiveIndex((current) =>
                      current === null
                        ? current
                        : getWrappedPostDetailMediaIndex(current, 1, orderedImages.length),
                    )
                  }
                  className="absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-[#071426]/35 text-white transition hover:bg-[#071426]/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(8,20,39,0.74)] sm:right-4"
                  aria-label="다음 이미지"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M7.5 4.5 13 10l-5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ) : null}
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <a
                href={activeImage.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center gap-1 rounded-full border border-white/18 bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-white/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(6,16,32,0.82)]"
              >
                원본 새 탭으로 열기
              </a>
              <p className="text-[11px] text-white/65">
                ESC로 닫기, 좌우 방향키로 다음 이미지를 볼 수 있습니다.
              </p>
            </div>

            {orderedImages.length > 1 ? (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {orderedImages.map((image, index) => {
                  const thumbName = extractPostDetailAttachmentName(image.url, index);
                  const isActive = index === normalizedActiveIndex;
                  return (
                    <button
                      key={`${image.url}-${index}-thumb`}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className={`overflow-hidden rounded-2xl border transition ${
                        isActive
                          ? "border-white/80 shadow-[0_0_0_1px_rgba(255,255,255,0.75)]"
                          : "border-white/12 opacity-80 hover:border-white/30 hover:opacity-100"
                      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(6,16,32,0.82)]`}
                      aria-label={`${thumbName} 선택`}
                      aria-pressed={isActive}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- remote/local mixed upload URLs make plain img the safest preview path here. */}
                      <img
                        src={image.url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-14 w-20 object-cover sm:h-16 sm:w-24"
                      />
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
