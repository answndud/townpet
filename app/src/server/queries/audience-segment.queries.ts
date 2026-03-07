import { prisma } from "@/lib/prisma";
import {
  buildAudienceSegmentLabel,
  extractAudienceSegmentBreedLabel,
  getPetLifeStageLabel,
  getPetSizeClassLabel,
  getPetSpeciesLabel,
  normalizePetBreedCode,
} from "@/lib/pet-profile";

export async function listAudienceSegmentsByUserId(userId: string) {
  const items = await prisma.userAudienceSegment.findMany({
    where: { userId },
    orderBy: [{ confidenceScore: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
    take: 12,
  });

  return items.map((item) => {
    const breedCode = normalizePetBreedCode(item.breedCode);
    const breedLabel = extractAudienceSegmentBreedLabel(item.interestTags);
    const sizeLabel = getPetSizeClassLabel(item.sizeClass);
    const lifeStageLabel = getPetLifeStageLabel(item.lifeStage);

    return {
      id: item.id,
      species: item.species,
      speciesLabel: getPetSpeciesLabel(item.species),
      breedCode,
      breedLabel,
      sizeClass: item.sizeClass,
      sizeLabel,
      lifeStage: item.lifeStage,
      lifeStageLabel,
      confidenceScore: item.confidenceScore,
      interestTags: item.interestTags,
      label: buildAudienceSegmentLabel({
        species: item.species,
        breedCode,
        breedLabel,
        interestTags: item.interestTags,
        sizeClass: item.sizeClass,
        lifeStage: item.lifeStage,
      }),
    };
  });
}
