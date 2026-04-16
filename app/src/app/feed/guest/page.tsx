import type { Metadata } from "next";
import { GuestFeedPageClient } from "@/components/posts/guest-feed-page-client";
import { fetchGuestFeedInitialData } from "@/server/services/posts/guest-feed-page-fetch.service";

type GuestFeedPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function toQueryString(params: Record<string, string | string[] | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item.length > 0) {
          searchParams.append(key, item);
        }
      }
      continue;
    }

    if (typeof value === "string" && value.length > 0) {
      searchParams.set(key, value);
    }
  }

  return searchParams.toString();
}

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

export default async function GuestFeedPage({ searchParams }: GuestFeedPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const initialQueryString = toQueryString(resolvedSearchParams);
  const initialData = await fetchGuestFeedInitialData(initialQueryString);

  return <GuestFeedPageClient initialData={initialData} initialQueryString={initialQueryString} />;
}
