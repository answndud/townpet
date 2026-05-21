export type TownLandingSectionSlug = "hospitals" | "walks" | "lost" | "used-market";

export type TownLandingSection = {
  slug: TownLandingSectionSlug;
  title: string;
  shortTitle: string;
  description: string;
  href: string;
  feedHref: string;
  emptyState: string;
  checklist: string[];
};

export type TownLanding = {
  slug: string;
  label: string;
  district: string;
  headline: string;
  description: string;
  href: string;
  sections: TownLandingSection[];
};

export const TOWN_LANDINGS: TownLanding[] = [];

export function getTownLandingBySlug(slug: string) {
  return TOWN_LANDINGS.find((town) => town.slug === slug) ?? null;
}

export function getTownLandingSection(slug: string, sectionSlug: string) {
  const town = getTownLandingBySlug(slug);
  if (!town) {
    return null;
  }
  const section = town.sections.find((item) => item.slug === sectionSlug);
  return section ? { town, section } : null;
}

export function listTownLandingPaths() {
  return TOWN_LANDINGS.flatMap((town) => [
    town.href,
    ...town.sections.map((section) => section.href),
  ]);
}
