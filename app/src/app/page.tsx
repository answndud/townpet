import { redirect } from "next/navigation";
import { createPublicPageMetadata } from "@/lib/page-metadata";

// TownPet opens on the public feed so visitors can read real community content immediately.
// Keep /feed/guest as the canonical, addressable guest-feed URL for sharing and legacy links.
export const dynamic = "force-dynamic";
export const metadata = createPublicPageMetadata({
  title: "전체 피드",
  description: "TownPet의 공개 커뮤니티 전체 피드를 확인합니다.",
  path: "/",
});

export default function HomePage() {
  redirect("/feed/guest");
}
