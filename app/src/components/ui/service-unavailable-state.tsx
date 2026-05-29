import Link from "next/link";

type ServiceUnavailableStateProps = {
  eyebrow?: string;
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

const SERVICE_UNAVAILABLE_PRIMARY_ACTION_CLASS_NAME =
  "inline-flex min-h-10 items-center justify-center rounded-md bg-[#3567b5] px-3 text-xs font-semibold text-[#fbfdff] transition hover:bg-[#2f5da4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-1";

const SERVICE_UNAVAILABLE_TEXT_ACTION_CLASS_NAME =
  "tp-text-muted inline-flex min-h-10 items-center justify-center px-1.5 text-xs font-semibold transition hover:text-[#2f5da4] hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-1";

export function ServiceUnavailableState({
  eyebrow = "일시 지연",
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: ServiceUnavailableStateProps) {
  return (
    <section className="rounded-xl border border-[#d9e5f7] bg-white px-4 py-8 sm:px-8 sm:py-10">
      <div className="flex max-w-[720px] items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#d8c69a] bg-[#fff8e5] text-[#7a5b14]">
          <svg
            aria-hidden="true"
            viewBox="0 0 48 48"
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M24 9v17" />
            <path d="M24 34h.01" />
            <path d="M8 39 24 7l16 32H8Z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="tp-eyebrow text-[#7a5b14]">{eyebrow}</p>
          <h2 className="mt-2 text-lg font-semibold text-[#1d3660]">{title}</h2>
          <p className="mt-2 max-w-[560px] text-sm leading-6 text-[#5a7397]">
            {description}
          </p>
          {(primaryHref && primaryLabel) || (secondaryHref && secondaryLabel) ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {primaryHref && primaryLabel ? (
                <Link
                  href={primaryHref}
                  className={SERVICE_UNAVAILABLE_PRIMARY_ACTION_CLASS_NAME}
                >
                  {primaryLabel}
                </Link>
              ) : null}
              {secondaryHref && secondaryLabel ? (
                <Link
                  href={secondaryHref}
                  className={SERVICE_UNAVAILABLE_TEXT_ACTION_CLASS_NAME}
                >
                  {secondaryLabel}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
