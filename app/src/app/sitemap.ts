import type { MetadataRoute } from "next";
import { PostScope, PostStatus } from "@prisma/client";

import { hasBreedLoungeRoute } from "@/lib/pet-profile";
import { listCampaignPaths } from "@/lib/campaign-pages";
import { listGuidePaths } from "@/lib/guide-pages";
import { getSiteOrigin } from "@/lib/site-url";
import { listTownLandingPaths } from "@/lib/town-landing";
import { isPrismaDatabaseUnavailableError } from "@/server/prisma-database-error";
import { listEffectiveBreedCatalogGroupedBySpecies } from "@/server/queries/breed-catalog.queries";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import {
  countPublicSitemapPosts,
  listPublicSitemapPosts,
  SITEMAP_POST_PAGE_SIZE,
} from "@/server/queries/sitemap.queries";

async function getPublicSitemapPostWhere() {
  const loginRequiredTypes = await getGuestReadLoginRequiredPostTypes();
  return {
    status: PostStatus.ACTIVE,
    scope: PostScope.GLOBAL,
    type: {
      notIn: loginRequiredTypes,
    },
  } as const;
}

export async function generateSitemaps() {
  const where = await getPublicSitemapPostWhere();
  const totalCount = await countPublicSitemapPosts(where);
  const totalPages = Math.max(1, Math.ceil(totalCount / SITEMAP_POST_PAGE_SIZE));

  return Array.from({ length: totalPages }, (_, id) => ({ id }));
}

export default async function sitemap({
  id,
}: {
  id: Promise<number | string>;
}): Promise<MetadataRoute.Sitemap> {
  const siteOrigin = getSiteOrigin();
  const resolvedId = Math.max(0, Number(await id) || 0);
  const where = await getPublicSitemapPostWhere();
  const posts = await listPublicSitemapPosts({ where, page: resolvedId });

  const staticRoutes: MetadataRoute.Sitemap =
    resolvedId === 0
      ? [
          {
            url: `${siteOrigin}/`,
            changeFrequency: "hourly",
            priority: 1,
          },
          {
            url: `${siteOrigin}/feed`,
            changeFrequency: "hourly",
            priority: 0.9,
          },
          {
            url: `${siteOrigin}/search`,
            changeFrequency: "daily",
            priority: 0.7,
          },
          {
            url: `${siteOrigin}/boards/adoption`,
            changeFrequency: "daily",
            priority: 0.6,
          },
          ...listCampaignPaths().map((path) => ({
            url: `${siteOrigin}${path}`,
            changeFrequency: "weekly" as const,
            priority: 0.75,
          })),
          ...listGuidePaths().map((path) => ({
            url: `${siteOrigin}${path}`,
            changeFrequency: "monthly" as const,
            priority: 0.65,
          })),
          ...listTownLandingPaths().map((path) => ({
            url: `${siteOrigin}${path}`,
            changeFrequency: "daily" as const,
            priority: 0.7,
          })),
          {
            url: `${siteOrigin}/terms`,
            changeFrequency: "yearly",
            priority: 0.2,
          },
          {
            url: `${siteOrigin}/privacy`,
            changeFrequency: "yearly",
            priority: 0.2,
          },
          {
            url: `${siteOrigin}/commercial`,
            changeFrequency: "yearly",
            priority: 0.2,
          },
        ]
      : [];

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteOrigin}/posts/${post.id}`,
    lastModified: post.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const breedRoutes: MetadataRoute.Sitemap =
    resolvedId === 0
      ? Array.from(
          new Set(
            Object.values(
              await listEffectiveBreedCatalogGroupedBySpecies().catch((error) => {
                if (isPrismaDatabaseUnavailableError(error)) {
                  return {};
                }
                throw error;
              }),
            )
              .flat()
              .map((entry) => entry.code)
              .filter((breedCode) => hasBreedLoungeRoute(breedCode)),
          ),
        ).map((breedCode) => ({
          url: `${siteOrigin}/lounges/breeds/${breedCode}`,
          changeFrequency: "daily",
          priority: 0.6,
        }))
      : [];

  return [...staticRoutes, ...breedRoutes, ...postRoutes];
}
