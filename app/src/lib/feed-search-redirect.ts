import { PostType } from "@prisma/client";

type FeedSearchRedirectParams = {
  q?: string;
  type?: string;
  searchIn?: string;
};

function normalizeSearchIn(value?: string) {
  if (value === "TITLE" || value === "CONTENT" || value === "AUTHOR") {
    return value;
  }
  return null;
}

function normalizePostType(value?: string) {
  return Object.values(PostType).includes(value as PostType) ? value : null;
}

export function buildFeedSearchRedirectPath(
  basePath: "/feed" | "/feed/guest",
  params: FeedSearchRedirectParams,
) {
  const searchParams = new URLSearchParams();
  const query = params.q?.trim().replace(/\s+/g, " ");
  const type = normalizePostType(params.type);
  const searchIn = normalizeSearchIn(params.searchIn);

  if (query) {
    searchParams.set("q", query);
  }
  if (type) {
    searchParams.set("type", type);
  }
  if (searchIn) {
    searchParams.set("searchIn", searchIn);
  }

  const serialized = searchParams.toString();
  return serialized ? `${basePath}?${serialized}` : basePath;
}
