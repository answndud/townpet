import type { ReactNode } from "react";
import Link from "next/link";

type PostListItemShellProps = {
  href: string;
  title: ReactNode;
  meta?: ReactNode;
  sideContent?: ReactNode;
  topContent?: ReactNode;
  titleSuffix?: ReactNode;
  excerpt?: ReactNode;
  bottomContent?: ReactNode;
  articleClassName?: string;
  titleLinkClassName?: string;
  excerptClassName?: string;
  sideClassName?: string;
  metaClassName?: string;
  prefetch?: boolean;
  onTitleClick?: () => void;
  testId?: string;
  variant?: "default" | "feed";
};

export function PostListItemShell({
  href,
  title,
  meta,
  sideContent,
  topContent,
  titleSuffix,
  excerpt,
  bottomContent,
  articleClassName,
  titleLinkClassName,
  excerptClassName,
  sideClassName,
  metaClassName,
  prefetch,
  onTitleClick,
  testId,
  variant = "default",
}: PostListItemShellProps) {
  const isFeed = variant === "feed";

  return (
    <article
      data-testid={testId}
      className={
        articleClassName ??
        (isFeed
          ? "group flex min-w-0 items-center gap-2 border-b border-[#e4e7ec] px-4 py-2 transition-colors hover:bg-[#f8f9ff]"
          : "grid gap-3 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1fr)_196px] md:items-start")
      }
    >
      <div className={isFeed ? "flex min-w-0 w-full flex-1 items-center gap-2 sm:w-auto" : "min-w-0"}>
        {isFeed && topContent ? <div className="min-w-0 shrink-0">{topContent}</div> : null}
        {!isFeed ? topContent : null}
        <Link
          href={href}
          prefetch={prefetch}
          className={
            titleLinkClassName ??
            "tp-text-card-title flex min-w-0 items-center gap-1 text-[#10284a] transition hover:text-[#2f5da4]"
          }
          onClick={onTitleClick}
        >
          {title}
          {titleSuffix}
        </Link>
        {excerpt ? (
          <p className={excerptClassName ?? "mt-1 truncate text-[13px] text-[#4c6488]"}>{excerpt}</p>
        ) : null}
        {!isFeed ? bottomContent : null}
      </div>
      {sideContent !== undefined ? (
        <div className={sideClassName ?? "text-xs text-[#4f678d]"}>{sideContent}</div>
      ) : null}
      {meta ? (
        <div className={metaClassName ?? (isFeed ? "min-w-0 shrink-0 text-right text-[11px] text-[#667085]" : "text-xs text-[#4f678d] md:text-right")}>{meta}</div>
      ) : null}
      {isFeed && bottomContent ? <div className="hidden">{bottomContent}</div> : null}
    </article>
  );
}
