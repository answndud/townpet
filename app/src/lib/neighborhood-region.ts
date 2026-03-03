const CITY_ALIAS_TO_CANONICAL: Record<string, string> = {
  서울: "서울특별시",
  서울특별시: "서울특별시",
  부산: "부산광역시",
  부산광역시: "부산광역시",
  대구: "대구광역시",
  대구광역시: "대구광역시",
  인천: "인천광역시",
  인천광역시: "인천광역시",
  광주: "광주광역시",
  광주광역시: "광주광역시",
  대전: "대전광역시",
  대전광역시: "대전광역시",
  울산: "울산광역시",
  울산광역시: "울산광역시",
  세종: "세종특별자치시",
  세종특별자치시: "세종특별자치시",
  경기: "경기도",
  경기도: "경기도",
  성남: "경기도",
  강원: "강원특별자치도",
  강원도: "강원특별자치도",
  강원특별자치도: "강원특별자치도",
  충북: "충청북도",
  충청북도: "충청북도",
  충남: "충청남도",
  충청남도: "충청남도",
  전북: "전북특별자치도",
  전라북도: "전북특별자치도",
  전북특별자치도: "전북특별자치도",
  전남: "전라남도",
  전라남도: "전라남도",
  경북: "경상북도",
  경상북도: "경상북도",
  경남: "경상남도",
  경상남도: "경상남도",
  제주: "제주특별자치도",
  제주도: "제주특별자치도",
  제주특별자치도: "제주특별자치도",
};

export function normalizeNeighborhoodCity(city: string) {
  const trimmed = city.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.includes("출장소")) {
    return "";
  }

  return CITY_ALIAS_TO_CANONICAL[trimmed] ?? trimmed;
}

export function normalizeNeighborhoodDistrict(district: string) {
  return district.trim();
}

export function isDisplayableNeighborhoodRegion(city: string, district: string) {
  const normalizedCity = normalizeNeighborhoodCity(city);
  const normalizedDistrict = normalizeNeighborhoodDistrict(district);
  if (!normalizedCity || !normalizedDistrict) {
    return false;
  }

  if (normalizedDistrict.includes("출장소")) {
    return false;
  }

  if (normalizedDistrict === normalizedCity) {
    return false;
  }

  return true;
}

export function buildNeighborhoodRegionKey(city: string, district: string) {
  return `${normalizeNeighborhoodCity(city)}::${normalizeNeighborhoodDistrict(district)}`;
}

export function getNeighborhoodCityVariants(city: string) {
  const canonicalCity = normalizeNeighborhoodCity(city);
  if (!canonicalCity) {
    return [] as string[];
  }

  const variants = new Set<string>([canonicalCity]);
  for (const [alias, canonical] of Object.entries(CITY_ALIAS_TO_CANONICAL)) {
    if (canonical === canonicalCity) {
      variants.add(alias);
    }
  }

  return Array.from(variants);
}
