import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { buildFeedSearchRedirectPath } from "@/app/search/page";

type GuestSearchPageProps = {
  searchParams?: Promise<{
    q?: string;
    type?: string;
    searchIn?: string;
  }>;
};

export const metadata: Metadata = {
  title: "검색",
  description: "공개 피드 하단 검색에서 제목/내용 기준으로 게시글을 찾으세요.",
  alternates: {
    canonical: "/feed",
  },
  openGraph: {
    title: "TownPet 공개 피드 검색",
    description: "공개 피드 하단 검색에서 제목/내용 기준으로 게시글을 찾으세요.",
    url: "/feed",
  },
};

export default async function GuestSearchPage({ searchParams }: GuestSearchPageProps) {
  const resolvedParams = (await searchParams) ?? {};
  redirect(buildFeedSearchRedirectPath("/feed/guest", resolvedParams));
}
