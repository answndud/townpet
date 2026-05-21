import { describe, expect, it } from "vitest";

import {
  getTownLandingBySlug,
  getTownLandingSection,
  listTownLandingPaths,
  TOWN_LANDING,
} from "@/lib/town-landing";

describe("town landing config", () => {
  it("defines the initial Mapo town hub and priority sections", () => {
    expect(TOWN_LANDING.slug).toBe("mapo");
    expect(TOWN_LANDING.href).toBe("/towns/mapo");
    expect(TOWN_LANDING.sections.map((section) => section.slug)).toEqual([
      "hospitals",
      "walks",
      "lost",
      "used-market",
    ]);
  });

  it("resolves town and section paths for route and sitemap use", () => {
    expect(getTownLandingBySlug("mapo")?.label).toBe("서울 마포구");
    expect(getTownLandingSection("mapo", "lost")?.section.href).toBe("/towns/mapo/lost");
    expect(getTownLandingSection("mapo", "unknown")).toBeNull();
    expect(listTownLandingPaths()).toEqual([
      "/towns/mapo",
      "/towns/mapo/hospitals",
      "/towns/mapo/walks",
      "/towns/mapo/lost",
      "/towns/mapo/used-market",
    ]);
  });
});
