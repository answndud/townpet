import { describe, expect, it } from "vitest";

import {
  buildTownLanding,
  buildTownSlug,
  getTownLandingBySlug,
  getTownLandingSection,
  listTownLandingPaths,
  parseTownSlug,
  TOWN_LANDINGS,
} from "@/lib/town-landing";

describe("town landing config", () => {
  it("keeps town landing disabled until an initial region is explicitly chosen", () => {
    expect(TOWN_LANDINGS).toEqual([]);
    expect(listTownLandingPaths()).toEqual([]);
  });

  it("does not resolve old fixed-region town paths", () => {
    expect(getTownLandingBySlug("old-town")).toBeNull();
  });

  it("builds dynamic town slugs and section links from selected regions", () => {
    const slug = buildTownSlug("서울특별시", "강남구");
    expect(slug).toBe("서울특별시--강남구");
    expect(parseTownSlug(encodeURIComponent(slug))).toEqual({
      city: "서울특별시",
      district: "강남구",
    });

    const town = buildTownLanding({
      city: "서울특별시",
      district: "강남구",
      counts: { hospitals: 2, lost: 1 },
    });
    expect(town?.href).toBe("/towns/%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C--%EA%B0%95%EB%82%A8%EA%B5%AC");
    expect(getTownLandingSection(town!, "hospitals")?.section.count).toBe(2);
    expect(getTownLandingSection(town!, "unknown")).toBeNull();
  });
});
