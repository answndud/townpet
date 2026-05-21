import { describe, expect, it } from "vitest";

import {
  getTownLandingBySlug,
  getTownLandingSection,
  listTownLandingPaths,
  TOWN_LANDINGS,
} from "@/lib/town-landing";

describe("town landing config", () => {
  it("keeps town landing disabled until an initial region is explicitly chosen", () => {
    expect(TOWN_LANDINGS).toEqual([]);
    expect(listTownLandingPaths()).toEqual([]);
  });

  it("does not resolve old fixed-region town paths", () => {
    expect(getTownLandingBySlug("old-town")).toBeNull();
    expect(getTownLandingSection("old-town", "lost")).toBeNull();
  });
});
