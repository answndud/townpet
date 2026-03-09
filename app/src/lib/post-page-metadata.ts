import type { Metadata } from "next";
import type { PostScope, PostStatus, PostType } from "@prisma/client";

import { canGuestReadPost } from "@/lib/post-access";
import { toAbsoluteUrl } from "@/lib/site-url";

type PostImageMetadata = {
  url: string;
};

export type PostMetadataRecord = {
  id: string;
  type: PostType;
  scope: PostScope;
  status: PostStatus;
  title: string;
  content: string;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  images: PostImageMetadata[];
};

export function buildExcerpt(text: string, maxLength = 160) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength)}...`;
}

export function ensureDate(value: unknown) {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return new Date(parsed);
    }
  }
  return null;
}

export function buildPostDetailMetadata(
  post: PostMetadataRecord | null,
  loginRequiredTypes: PostType[],
): Metadata {
  if (!post) {
    return {
      title: "게시글을 찾을 수 없습니다",
      robots: { index: false, follow: false },
    };
  }

  const guestReadable = canGuestReadPost({
    scope: post.scope,
    type: post.type,
    loginRequiredTypes,
  });
  const isIndexable = post.status === "ACTIVE" && guestReadable;
  const description = buildExcerpt(post.content);
  const url = toAbsoluteUrl(`/posts/${post.id}`);
  const imageUrl = post.images[0]?.url ? toAbsoluteUrl(post.images[0].url) : undefined;
  const createdAt = ensureDate(post.createdAt);
  const updatedAt = ensureDate(post.updatedAt) ?? createdAt;

  if (!createdAt || !updatedAt) {
    return {
      title: post.title,
      robots: { index: false, follow: false },
    };
  }

  return {
    title: post.title,
    description,
    alternates: {
      canonical: `/posts/${post.id}`,
    },
    robots: {
      index: isIndexable,
      follow: isIndexable,
    },
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description,
      publishedTime: createdAt.toISOString(),
      modifiedTime: updatedAt.toISOString(),
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: post.title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}
