import { prisma } from "@/lib/prisma";
import {
  buildNeighborhoodRegionKey,
  getNeighborhoodCityVariants,
  isDisplayableNeighborhoodRegion,
  normalizeNeighborhoodCity,
  normalizeNeighborhoodDistrict,
} from "@/lib/neighborhood-region";

export async function listNeighborhoods() {
  return prisma.neighborhood.findMany({
    orderBy: [{ city: "asc" }, { district: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      city: true,
      district: true,
    },
  });
}

type SearchNeighborhoodsParams = {
  q?: string;
  city?: string;
  district?: string;
  limit?: number;
};

export function toNeighborhoodRegionKey(city: string, district: string) {
  return buildNeighborhoodRegionKey(city, district);
}

export function parseNeighborhoodRegionKey(value: string) {
  const [city, district] = value.split("::");
  if (!city || !district) {
    return null;
  }

  const normalizedCity = normalizeNeighborhoodCity(city);
  const normalizedDistrict = normalizeNeighborhoodDistrict(district);
  if (!normalizedCity || !normalizedDistrict) {
    return null;
  }

  return {
    city: normalizedCity,
    district: normalizedDistrict,
  };
}

export async function searchNeighborhoods({
  q,
  city,
  district,
  limit = 200,
}: SearchNeighborhoodsParams) {
  const trimmedQ = q?.trim();
  const trimmedCity = city?.trim();
  const trimmedDistrict = district?.trim();

  return prisma.neighborhood.findMany({
    where: {
      city: trimmedCity || undefined,
      district: trimmedDistrict || undefined,
      OR: trimmedQ
        ? [
            { name: { contains: trimmedQ } },
            { district: { contains: trimmedQ } },
            { city: { contains: trimmedQ } },
          ]
        : undefined,
    },
    orderBy: [{ city: "asc" }, { district: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      city: true,
      district: true,
    },
    take: Math.min(Math.max(limit, 1), 300),
  });
}

export async function searchNeighborhoodRegions({
  q,
  city,
  district,
  limit = 200,
}: SearchNeighborhoodsParams) {
  const trimmedQ = q?.trim();
  const trimmedCity = city?.trim();
  const trimmedDistrict = district?.trim();

  const cityVariants = trimmedCity ? getNeighborhoodCityVariants(trimmedCity) : null;

  const rows = await prisma.neighborhood.groupBy({
    by: ["city", "district"],
    where: {
      city: cityVariants ? { in: cityVariants } : undefined,
      district: trimmedDistrict || undefined,
      OR: trimmedQ
        ? [
            { city: { contains: trimmedQ } },
            { district: { contains: trimmedQ } },
          ]
        : undefined,
    },
    orderBy: [{ city: "asc" }, { district: "asc" }],
    take: Math.min(Math.max(limit, 1), 300),
  });

  const regions = new Map<string, { id: string; name: string; city: string; district: string }>();
  for (const row of rows) {
    if (!isDisplayableNeighborhoodRegion(row.city, row.district)) {
      continue;
    }
    const city = normalizeNeighborhoodCity(row.city);
    const district = normalizeNeighborhoodDistrict(row.district);
    const key = toNeighborhoodRegionKey(city, district);

    if (!regions.has(key)) {
      regions.set(key, {
        id: key,
        name: district,
        city,
        district,
      });
    }
  }

  return Array.from(regions.values()).sort((a, b) => {
    const cityCompare = a.city.localeCompare(b.city, "ko");
    if (cityCompare !== 0) {
      return cityCompare;
    }
    return a.district.localeCompare(b.district, "ko");
  });
}

export async function listNeighborhoodCities() {
  const rows = await prisma.neighborhood.groupBy({
    by: ["city"],
    orderBy: [{ city: "asc" }],
  });

  return Array.from(
    new Set(rows.map((row) => normalizeNeighborhoodCity(row.city)).filter((city) => city.length > 0)),
  ).sort((a, b) => a.localeCompare(b, "ko"));
}

export async function listNeighborhoodDistricts(city?: string) {
  const trimmedCity = city?.trim();
  if (!trimmedCity) {
    return [] as string[];
  }

  const cityVariants = getNeighborhoodCityVariants(trimmedCity);

  const rows = await prisma.neighborhood.groupBy({
    by: ["district"],
    where: { city: { in: cityVariants } },
    orderBy: [{ district: "asc" }],
  });

  return rows
    .map((row) => normalizeNeighborhoodDistrict(row.district))
    .filter((district) => isDisplayableNeighborhoodRegion(trimmedCity, district))
    .sort((a, b) => a.localeCompare(b, "ko"));
}
