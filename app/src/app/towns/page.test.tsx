import { describe, expect, it } from "vitest";

import TownPage, {
  generateMetadata as generateTownMetadata,
  generateStaticParams as generateTownStaticParams,
} from "@/app/towns/[townSlug]/page";
import TownSectionPage, {
  generateMetadata as generateTownSectionMetadata,
  generateStaticParams as generateTownSectionStaticParams,
} from "@/app/towns/[townSlug]/[sectionSlug]/page";

describe("town landing pages", () => {
  it("does not prerender a fixed town while the launch region is undecided", () => {
    expect(generateTownStaticParams()).toEqual([]);
    expect(generateTownSectionStaticParams()).toEqual([]);
  });

  it("returns noindex metadata for old fixed-region town paths", async () => {
    await expect(
      generateTownMetadata({ params: Promise.resolve({ townSlug: "old-town" }) }),
    ).resolves.toMatchObject({
      title: "지역 허브를 찾을 수 없습니다",
      robots: { index: false, follow: false },
    });

    await expect(
      generateTownSectionMetadata({
        params: Promise.resolve({ townSlug: "old-town", sectionSlug: "lost" }),
      }),
    ).resolves.toMatchObject({
      title: "지역 정보를 찾을 수 없습니다",
      robots: { index: false, follow: false },
    });
  });

  it("renders not-found for old fixed-region town pages", async () => {
    await expect(TownPage({ params: Promise.resolve({ townSlug: "old-town" }) })).rejects.toThrow();

    await expect(
      TownSectionPage({
        params: Promise.resolve({ townSlug: "old-town", sectionSlug: "hospitals" }),
      }),
    ).rejects.toThrow();
  });
});
