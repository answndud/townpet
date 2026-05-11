import { redirect } from "next/navigation";

import { createNoIndexPageMetadata } from "@/lib/page-metadata";

export const metadata = createNoIndexPageMetadata({
  title: "저장한 글",
  description: "저장한 TownPet 게시글을 북마크 화면에서 확인합니다.",
  path: "/saved",
});

type SavedPageProps = {
  searchParams?: Promise<{
    type?: string;
    q?: string;
    page?: string;
  }>;
};

export default async function SavedPage({ searchParams }: SavedPageProps) {
  const resolvedParams = (await searchParams) ?? {};
  const params = new URLSearchParams();

  if (resolvedParams.type) {
    params.set("type", resolvedParams.type);
  }
  if (resolvedParams.q) {
    params.set("q", resolvedParams.q);
  }
  if (resolvedParams.page) {
    params.set("page", resolvedParams.page);
  }

  const serialized = params.toString();
  redirect(serialized ? `/bookmarks?${serialized}` : "/bookmarks");
}
