import { redirect } from "next/navigation";

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
