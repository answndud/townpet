import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PostType } from "@prisma/client";

type SearchPageProps = {
  searchParams?: Promise<{
    q?: string;
    type?: string;
    searchIn?: string;
  }>;
};

export const metadata: Metadata = {
  title: "검색",
  description: "피드 하단 검색에서 제목/내용 기준으로 게시글을 찾으세요.",
  alternates: {
    canonical: "/feed",
  },
  openGraph: {
    title: "TownPet 피드 검색",
    description: "피드 하단 검색에서 제목/내용 기준으로 게시글을 찾으세요.",
    url: "/feed",
  },
};

function normalizeSearchIn(value?: string) {
  if (value === "TITLE" || value === "CONTENT" || value === "AUTHOR") {
    return value;
  }
  return null;
}

function normalizePostType(value?: string) {
  return Object.values(PostType).includes(value as PostType) ? value : null;
}

export function buildFeedSearchRedirectPath(
  basePath: "/feed" | "/feed/guest",
  params: Awaited<NonNullable<SearchPageProps["searchParams"]>>,
) {
  const searchParams = new URLSearchParams();
  const query = params.q?.trim().replace(/\s+/g, " ");
  const type = normalizePostType(params.type);
  const searchIn = normalizeSearchIn(params.searchIn);

  if (query) {
    searchParams.set("q", query);
  }
  if (type) {
    searchParams.set("type", type);
  }
  if (searchIn) {
    searchParams.set("searchIn", searchIn);
  }

  const serialized = searchParams.toString();
  return serialized ? `${basePath}?${serialized}` : basePath;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedParams = (await searchParams) ?? {};
  redirect(buildFeedSearchRedirectPath("/feed", resolvedParams));
}
