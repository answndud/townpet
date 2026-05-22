import { describe, expect, it } from "vitest";

import {
  buildLostFoundPublicPrivacyMessage,
  detectLostFoundPublicPrivacySignals,
} from "@/lib/lost-found-privacy-policy";

describe("lost-found privacy policy", () => {
  it("allows neighborhood-level public locations", () => {
    expect(detectLostFoundPublicPrivacySignals("반포동 산책로 입구")).toEqual([]);
    expect(detectLostFoundPublicPrivacySignals("OO공원 북문 근처")).toEqual([]);
  });

  it("detects contact channels and detailed addresses in public lost-found text", () => {
    expect(
      detectLostFoundPublicPrivacySignals(
        "서울특별시 서초구 반포대로 10 앞에서 봤어요. 010-1234-5678로 연락 주세요.",
      ),
    ).toEqual(["phone", "detailed_address"]);
  });

  it("builds a Korean validation message for detected signals", () => {
    const message = buildLostFoundPublicPrivacyMessage(["phone", "open_kakao"]);

    expect(message).toContain("전화번호");
    expect(message).toContain("오픈채팅 링크");
    expect(message).toContain("직접 적지 말고");
  });
});
