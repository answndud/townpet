type CommunityOption = {
  id: string;
  slug: string;
  labelKo: string;
};

type TaxonomyGroup = {
  key: string;
  label: string;
  items: CommunityOption[];
};

const GROUP_DEFINITIONS: Array<{
  key: string;
  label: string;
  matcher: (community: CommunityOption) => boolean;
}> = [
  {
    key: "dogs-cats",
    label: "강아지 & 고양이",
    matcher: (community) => {
      const slug = community.slug.toLowerCase();
      const label = community.labelKo;
      return (
        slug === "dogs" ||
        slug === "dog" ||
        slug === "cats" ||
        slug === "cat" ||
        label.includes("강아지") ||
        label.includes("고양이")
      );
    },
  },
  {
    key: "birds",
    label: "조류",
    matcher: (community) => {
      const slug = community.slug.toLowerCase();
      const label = community.labelKo;
      return (
        slug.includes("parrot") ||
        slug.includes("bird") ||
        slug.includes("avian") ||
        label.includes("앵무") ||
        label.includes("조류") ||
        label.includes("새")
      );
    },
  },
  {
    key: "reptiles-amphibians",
    label: "파충류 & 양서류",
    matcher: (community) => {
      const slug = community.slug.toLowerCase();
      const label = community.labelKo;
      return (
        slug.includes("rept") ||
        slug.includes("lizard") ||
        slug.includes("gecko") ||
        slug.includes("snake") ||
        slug.includes("turtle") ||
        slug.includes("amphib") ||
        label.includes("파충") ||
        label.includes("도마뱀") ||
        label.includes("뱀") ||
        label.includes("거북") ||
        label.includes("양서") ||
        label.includes("개구리")
      );
    },
  },
  {
    key: "small-pets",
    label: "소동물",
    matcher: (community) => {
      const slug = community.slug.toLowerCase();
      const label = community.labelKo;
      return (
        slug.includes("small") ||
        slug.includes("hamster") ||
        slug.includes("rabbit") ||
        slug.includes("guinea") ||
        slug.includes("ferret") ||
        slug.includes("sugar") ||
        slug.includes("hedgehog") ||
        label.includes("소동물") ||
        label.includes("햄스터") ||
        label.includes("토끼") ||
        label.includes("기니") ||
        label.includes("페럿") ||
        label.includes("슈가") ||
        label.includes("고슴도치")
      );
    },
  },
  {
    key: "aquatic",
    label: "어류 / 수조",
    matcher: (community) => {
      const slug = community.slug.toLowerCase();
      const label = community.labelKo;
      return (
        slug.includes("fish") ||
        slug.includes("aqu") ||
        slug.includes("fresh") ||
        slug.includes("marine") ||
        label.includes("어류") ||
        label.includes("수조") ||
        label.includes("담수") ||
        label.includes("해수") ||
        label.includes("수초")
      );
    },
  },
];

export function groupPetTypeCommunities(communities: CommunityOption[]): TaxonomyGroup[] {
  const grouped: TaxonomyGroup[] = GROUP_DEFINITIONS.map((definition) => ({
    key: definition.key,
    label: definition.label,
    items: [],
  }));
  const unmatched: CommunityOption[] = [];

  for (const community of communities) {
    const definitionIndex = GROUP_DEFINITIONS.findIndex((definition) => definition.matcher(community));
    if (definitionIndex >= 0) {
      grouped[definitionIndex].items.push(community);
      continue;
    }
    unmatched.push(community);
  }

  const nonEmptyGroups = grouped
    .map((group) => ({
      ...group,
      items: [...group.items].sort((a, b) => a.labelKo.localeCompare(b.labelKo, "ko")),
    }))
    .filter((group) => group.items.length > 0);

  if (unmatched.length > 0) {
    nonEmptyGroups.push({
      key: "others",
      label: "기타",
      items: unmatched.sort((a, b) => a.labelKo.localeCompare(b.labelKo, "ko")),
    });
  }

  return nonEmptyGroups;
}
