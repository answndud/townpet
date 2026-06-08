import { redirect } from "next/navigation";

import { createNoIndexPageMetadata } from "@/lib/page-metadata";

export const metadata = createNoIndexPageMetadata({
  title: "분실/목격 제보 작성",
  description: "분실동물과 목격 제보에 필요한 핵심 정보를 구조화해 작성합니다.",
  path: "/lost/new",
});

export default async function NewLostFoundPage() {
  redirect("/posts/new?type=LOST_FOUND&template=lost_pet");
}
