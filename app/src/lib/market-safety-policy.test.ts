import { describe, expect, it } from "vitest";

import {
  buildMarketSafetyBlockMessage,
  detectMarketSafetyBlockReasons,
  MARKET_SAFETY_CHECKLIST,
} from "@/lib/market-safety-policy";

describe("market safety policy", () => {
  it("keeps a pet-specific checklist for used market posts", () => {
    expect(MARKET_SAFETY_CHECKLIST.join("\n")).toContain("유통기한");
    expect(MARKET_SAFETY_CHECKLIST.join("\n")).toContain("체중/사이즈");
    expect(MARKET_SAFETY_CHECKLIST.join("\n")).toContain("작동 확인");
    expect(MARKET_SAFETY_CHECKLIST.join("\n")).toContain("직거래");
  });

  it("detects blocked pet-market items", () => {
    expect(detectMarketSafetyBlockReasons("강아지 분양합니다")).toEqual([
      "live_animal_sale",
    ]);
    expect(detectMarketSafetyBlockReasons("유통기한 지난 사료 나눔")).toEqual([
      "expired_food",
    ]);
    expect(detectMarketSafetyBlockReasons("심장사상충 약 판매")).toEqual([
      "animal_medicine",
    ]);
  });

  it("builds a Korean validation message for blocked market items", () => {
    const message = buildMarketSafetyBlockMessage(["expired_food", "animal_medicine"]);

    expect(message).toContain("유통기한이 지난 사료·간식");
    expect(message).toContain("동물 의약품 거래");
    expect(message).toContain("올릴 수 없습니다");
  });
});
