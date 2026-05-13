import Link from "next/link";

type EmptyStateProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryActionHref?: string;
  secondaryActionLabel?: string;
};

export function EmptyState({
  eyebrow = "현재 상태",
  title,
  description,
  actionHref,
  actionLabel,
  secondaryActionHref,
  secondaryActionLabel,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col gap-4 px-4 py-8 text-left sm:flex-row sm:items-start sm:px-8 sm:py-10">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#cbdcf5] bg-[#f6faff] sm:h-14 sm:w-14">
        <svg
          aria-hidden="true"
          viewBox="0 0 48 48"
          className="h-8 w-8 text-[#5c78a3]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="10" y="12" width="28" height="24" rx="8" />
          <path d="M17 21h14" />
          <path d="M17 27h8" />
          <circle cx="31" cy="27" r="2.5" fill="currentColor" stroke="none" />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="tp-eyebrow">{eyebrow}</p>
        <h2 className="mt-2 text-lg font-semibold text-[#1d3660] break-keep">{title}</h2>
        <p className="mt-2 max-w-[520px] text-sm leading-6 text-[#5a7397]">
          {description}
        </p>
        {actionHref && actionLabel ? (
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href={actionHref}
              className="tp-btn-primary tp-btn-md inline-flex min-h-10 items-center justify-center"
            >
              {actionLabel}
            </Link>
            {secondaryActionHref && secondaryActionLabel ? (
              <Link
                href={secondaryActionHref}
                className="tp-btn-soft tp-btn-md inline-flex min-h-10 items-center justify-center"
              >
                {secondaryActionLabel}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
