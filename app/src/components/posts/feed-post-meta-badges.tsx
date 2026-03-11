type FeedPostMetaBadgesProps = {
  label: string;
  chipClass: string;
  status: "ACTIVE" | "HIDDEN" | "DELETED";
  className?: string;
};

export function FeedPostMetaBadges({
  label,
  chipClass,
  status,
  className,
}: FeedPostMetaBadgesProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-1 text-[10px] sm:text-[11px] ${className ?? "mb-1 justify-end"}`}
    >
      <span
        className={`tp-chip-base max-w-full ${chipClass}`}
      >
        {label}
      </span>
      {status === "HIDDEN" ? (
        <span className="tp-chip-base border-rose-300 bg-rose-50 text-rose-700">
          숨김
        </span>
      ) : null}
    </div>
  );
}
