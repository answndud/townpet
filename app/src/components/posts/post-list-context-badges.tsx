type PostListContextBadgesProps = {
  label: string;
  chipClass: string;
  locationLabel?: string | null;
  status?: "ACTIVE" | "HIDDEN" | "DELETED";
  className?: string;
};

export function PostListContextBadges({
  label,
  chipClass,
  locationLabel,
  status,
  className,
}: PostListContextBadgesProps) {
  return (
    <div className={`mb-2 flex flex-wrap items-center gap-1.5 ${className ?? ""}`.trim()}>
      <span className={`tp-chip-base ${chipClass}`}>{label}</span>
      {locationLabel ? <span className="tp-chip-base tp-chip-muted">{locationLabel}</span> : null}
      {status === "HIDDEN" ? (
        <span className="tp-chip-base border-rose-300 bg-rose-50 text-rose-700">숨김</span>
      ) : null}
    </div>
  );
}
