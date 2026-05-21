import type { Metadata } from "next";
import { GuestFeedPageClient } from "@/components/posts/guest-feed-page-client";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "공개 동네 반려생활 피드",
  description: "병원 후기, 산책코스, 분실/목격 제보와 질문 글을 로그인 없이 확인하세요.",
  alternates: {
    canonical: "/feed",
  },
  openGraph: {
    title: "TownPet 공개 동네 반려생활 피드",
    description: "병원 후기, 산책코스, 분실/목격 제보와 질문 글을 로그인 없이 확인하세요.",
    url: "/feed",
  },
};

export default function GuestFeedPage() {
  return <GuestFeedPageClient />;
}
