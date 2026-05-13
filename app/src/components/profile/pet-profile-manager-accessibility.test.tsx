import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { PetProfileManager } from "@/components/profile/pet-profile-manager";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("@/server/actions/pet", () => ({
  createPetAction: vi.fn(),
  deletePetAction: vi.fn(),
  updatePetAction: vi.fn(),
}));

vi.mock("@/components/ui/image-upload-field", () => ({
  ImageUploadField: () => <div data-testid="image-upload-field" />,
}));

const emptyBreedCatalog = {
  DOG: [],
  CAT: [],
  BIRD: [],
  REPTILE: [],
  SMALL_PET: [],
  AQUATIC: [],
  AMPHIBIAN: [],
  ARTHROPOD: [],
  SPECIAL_OTHER: [],
};

describe("PetProfileManager accessibility", () => {
  it("keeps pet profile actions mobile-safe", () => {
    const html = renderToStaticMarkup(
      <PetProfileManager
        pets={[
          {
            id: "pet-1",
            name: "초코",
            species: "DOG",
            breedCode: null,
            breedLabel: null,
            sizeClass: "UNKNOWN",
            lifeStage: "UNKNOWN",
            weightKg: null,
            birthYear: null,
            imageUrl: null,
            bio: null,
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
          },
        ]}
        breedCatalogBySpecies={emptyBreedCatalog}
      />,
    );

    expect(html).toContain("min-h-10");
    expect(html).toContain("등록");
    expect(html).toContain("수정");
    expect(html).toContain("삭제");
  });
});
