import type { ReactNode } from "react";
import Link from "next/link";

type PostListItemShellProps = {
  href: string;
  title: ReactNode;
  meta?: ReactNode;
  topContent?: ReactNode;
  titleSuffix?: ReactNode;
  excerpt?: ReactNode;
  bottomContent?: ReactNode;
  articleClassName?: string;
  titleLinkClassName?: string;
  excerptClassName?: string;
  metaClassName?: string;
  prefetch?: boolean;
  onTitleClick?: () => void;
  testId?: string;
};

export function PostListItemShell({
  href,
  title,
  meta,
  topContent,
  titleSuffix,
  excerpt,
  bottomContent,
  articleClassName,
  titleLinkClassName,
  excerptClassName,
  metaClassName,
  prefetch,
  onTitleClick,
  testId,
}: PostListItemShellProps) {
  return (
    <article
      data-testid={testId}
      className={
        articleClassName ??
        "grid gap-3 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1fr)_196px] md:items-start"
      }
    >
      <div className="min-w-0">
        {topContent}
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
        {bottomContent}
      </div>
      {meta ? (
        <div className={metaClassName ?? "text-xs text-[#4f678d] md:text-right"}>{meta}</div>
      ) : null}
    </article>
  );
}
