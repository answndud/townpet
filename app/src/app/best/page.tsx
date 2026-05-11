import { redirect } from "next/navigation";

import { createNoIndexPageMetadata } from "@/lib/page-metadata";

export const metadata = createNoIndexPageMetadata({
  title: "베스트글",
  description: "TownPet 베스트글 피드로 이동합니다.",
  path: "/best",
});

export default function BestAliasPage() {
  redirect("/feed?mode=BEST");
}
