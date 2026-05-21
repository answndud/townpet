import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { buildFeedSearchRedirectPath } from "@/lib/feed-search-redirect";

type SearchPageProps = {
  searchParams?: Promise<{
    q?: string;
    type?: string;
    searchIn?: string;
  }>;
};

export const metadata: Metadata = {
  title: "동네 반려생활 검색",
  description: "병원, 산책, 분실, 입양, 중고거래 글을 제목과 내용 기준으로 찾으세요.",
  alternates: {
    canonical: "/feed",
  },
  openGraph: {
    title: "TownPet 동네 반려생활 검색",
    description: "병원, 산책, 분실, 입양, 중고거래 글을 제목과 내용 기준으로 찾으세요.",
    url: "/feed",
  },
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedParams = (await searchParams) ?? {};
  redirect(buildFeedSearchRedirectPath("/feed", resolvedParams));
}
