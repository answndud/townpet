type FoundingMemberBadgeProps = {
  compact?: boolean;
};

export function FoundingMemberBadge({ compact = false }: FoundingMemberBadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md border border-[#adc8ec] bg-[#edf5ff] font-semibold text-[#2f5da4] ${
        compact ? "px-1.5 py-[1px] text-[10px]" : "px-2 py-1 text-[11px]"
      }`}
    >
      창립 멤버
    </span>
  );
}
