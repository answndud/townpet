import type { Metadata } from "next";
import { GuestFeedPageClient } from "@/components/posts/guest-feed-page-client";

export const dynamic = "force-static";

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

export default function GuestFeedPage() {
  return <GuestFeedPageClient />;
}
