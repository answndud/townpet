import type { MetadataRoute } from "next";

import { getSiteOrigin } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteOrigin = getSiteOrigin();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/login",
          "/register",
          "/onboarding",
          "/password/",
          "/profile",
          "/notifications",
          "/bookmarks",
          "/saved",
          "/my-posts",
          "/users/",
        ],
      },
    ],
    sitemap: `${siteOrigin}/sitemap/0.xml`,
    host: siteOrigin,
  };
}
