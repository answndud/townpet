export type MarketSafetyBlockReason =
  | "live_animal_sale"
  | "expired_food"
  | "animal_medicine";

export const MARKET_SAFETY_CHECKLIST = [
  "사료·간식은 개봉 여부와 유통기한을 적어 주세요.",
  "이동장·케이지·하네스는 반려동물 체중/사이즈 기준을 적어 주세요.",
  "유모차·자동급식기·정수기 같은 고가 용품은 작동 확인과 구성품을 적어 주세요.",
  "직거래는 공개된 장소에서 진행하고, 선입금·외부 연락 유도는 피하세요.",
] as const;

const liveAnimalSalePattern =
  /(강아지|고양이|반려동물|동물|새끼|아기)\s*(분양|판매|팝니다|팔아요|거래|입양비|책임비)/i;
const expiredFoodPattern =
  /(유통기한|소비기한)\s*(지난|지남|만료|초과)|(지난|만료된)\s*(사료|간식|캔|츄르)/i;
const animalMedicinePattern =
  /(처방약|동물약|동물 의약품|심장사상충\s*약|구충제|항생제|진통제)\s*(판매|팝니다|팔아요|거래|나눔)?/i;

const reasonLabel: Record<MarketSafetyBlockReason, string> = {
  live_animal_sale: "동물 생체 판매/분양",
  expired_food: "유통기한이 지난 사료·간식",
  animal_medicine: "동물 의약품 거래",
};

export function detectMarketSafetyBlockReasons(value: string | null | undefined) {
  const text = value?.trim();
  if (!text) {
    return [] as MarketSafetyBlockReason[];
  }

  const reasons = new Set<MarketSafetyBlockReason>();
  if (liveAnimalSalePattern.test(text)) reasons.add("live_animal_sale");
  if (expiredFoodPattern.test(text)) reasons.add("expired_food");
  if (animalMedicinePattern.test(text)) reasons.add("animal_medicine");

  return Array.from(reasons);
}

export function buildMarketSafetyBlockMessage(reasons: MarketSafetyBlockReason[]) {
  if (reasons.length === 0) {
    return null;
  }

  const labels = reasons.map((reason) => reasonLabel[reason]).join(", ");
  return `중고·공동구매 글에는 ${labels}을 올릴 수 없습니다. 반려용품 상태, 위생, 사이즈, 거래 장소 중심으로 작성해 주세요.`;
}
