import { Prisma } from "@prisma/client";

import { buildAudienceSegmentsFromPets } from "@/lib/pet-profile";

export async function syncAudienceSegmentsForUserTx(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  const pets = await tx.pet.findMany({
    where: { userId },
    select: {
      species: true,
      breedCode: true,
      breedLabel: true,
      sizeClass: true,
      lifeStage: true,
    },
  });

  const segments = buildAudienceSegmentsFromPets(pets);

  await tx.userAudienceSegment.deleteMany({
    where: { userId },
  });

  if (segments.length > 0) {
    await tx.userAudienceSegment.createMany({
      data: segments.map((segment) => ({
        userId,
        species: segment.species,
        breedCode: segment.breedCode,
        sizeClass: segment.sizeClass,
        lifeStage: segment.lifeStage,
        interestTags: segment.interestTags,
        confidenceScore: segment.confidenceScore,
      })),
    });
  }

  return segments;
}
