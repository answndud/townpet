import Link from "next/link";

type EmptyStateProps = {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
};

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: EmptyStateProps) {
  return (
    <div className="flex items-start gap-4 px-4 py-8 text-left sm:px-8 sm:py-10">
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
      <div>
        <p className="tp-eyebrow">현재 상태</p>
        <h2 className="mt-2 text-lg font-semibold text-[#1d3660]">{title}</h2>
        <p className="mt-2 max-w-[520px] text-sm leading-6 text-[#5a7397]">
          {description}
        </p>
        {actionHref && actionLabel ? (
          <Link
            href={actionHref}
            className="tp-btn-primary tp-btn-md mt-5 inline-flex items-center justify-center"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
