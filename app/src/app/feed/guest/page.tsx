import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { buildGuestFeedRedirectHref } from "@/lib/posts/guest-feed-route";

export const metadata: Metadata = {
  title: "피드",
  description: "커뮤니티 게시글을 최신순/인기순으로 확인하세요.",
  alternates: {
    canonical: "/feed",
  },
  openGraph: {
    title: "TownPet 피드",
    description: "커뮤니티 게시글을 최신순/인기순으로 확인하세요.",
    url: "/feed",
  },
};

type GuestFeedPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GuestFeedPage({ searchParams }: GuestFeedPageProps) {
  const resolvedParams = (await searchParams) ?? {};
  redirect(buildGuestFeedRedirectHref(resolvedParams));
}
