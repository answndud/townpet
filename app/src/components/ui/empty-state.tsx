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
    <div className="px-6 py-14 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#cbdcf5] bg-[radial-gradient(circle_at_top,#ffffff,transparent_65%),linear-gradient(180deg,#f9fbff_0%,#eef5ff_100%)] shadow-[0_10px_24px_rgba(53,103,181,0.10)]">
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
      <h2 className="text-lg font-semibold text-[#1d3660]">{title}</h2>
      <p className="mx-auto mt-2 max-w-[520px] text-sm text-[#5a7397]">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-4 inline-flex h-10 items-center justify-center border border-[#3567b5] bg-[#3567b5] px-4 text-sm font-semibold text-white transition hover:bg-[#2f5da4]"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
