import { describe, expect, it } from "vitest";

import {
  getOfflinePartnerQrChannelBySource,
  listOfflinePartnerQrChannels,
  OFFLINE_PARTNER_UTM_CAMPAIGN,
  OFFLINE_PARTNER_UTM_MEDIUM,
} from "@/lib/offline-partner-campaign";

describe("offline partner QR campaign", () => {
  it("defines separate QR sources for partner surfaces", () => {
    const channels = listOfflinePartnerQrChannels();

    expect(channels.map((channel) => channel.source)).toEqual([
      "hospital_qr",
      "petcafe_qr",
      "grooming_qr",
      "shelter_qr",
    ]);
    expect(channels.every((channel) => !channel.landingHref.includes("/register"))).toBe(true);
    expect(channels.every((channel) => !channel.landingHref.includes("/onboarding"))).toBe(true);
  });

  it("adds offline QR UTM dimensions to landing and primary actions", () => {
    const hospital = getOfflinePartnerQrChannelBySource("hospital_qr");

    expect(hospital?.landingHref).toContain("utm_source=hospital_qr");
    expect(hospital?.landingHref).toContain(`utm_medium=${OFFLINE_PARTNER_UTM_MEDIUM}`);
    expect(hospital?.landingHref).toContain(`utm_campaign=${OFFLINE_PARTNER_UTM_CAMPAIGN}`);
    expect(hospital?.primaryHref).toContain("type=HOSPITAL_REVIEW");
    expect(hospital?.primaryHref).toContain("template=hospital_review");
  });

  it("returns null for unknown QR source", () => {
    expect(getOfflinePartnerQrChannelBySource("newsletter")).toBeNull();
  });
});
