import { describe, expect, it } from "vitest";

import {
  PRODUCTION_DEMO_CONTENT_CONFIRM_ENV_KEY,
  PRODUCTION_DEMO_CONTENT_CONFIRM_VALUE,
  buildDemoAccountEmail,
  buildDemoPostImageUrl,
  resolveDemoContentSeedConfig,
} from "@/server/demo-content-seeding";

describe("resolveDemoContentSeedConfig", () => {
  it("requires explicit confirmation for non-local databases", () => {
    expect(() =>
      resolveDemoContentSeedConfig({
        DATABASE_URL: "postgresql://prod.example.com:5432/townpet",
        DEMO_CONTENT_EMAIL_DOMAIN: "demo.example.com",
      } as unknown as NodeJS.ProcessEnv),
    ).toThrow(
      `${PRODUCTION_DEMO_CONTENT_CONFIRM_ENV_KEY}=${PRODUCTION_DEMO_CONTENT_CONFIRM_VALUE} is required`,
    );
  });

  it("parses mode and boolean flags for non-local demo seeding", () => {
    const config = resolveDemoContentSeedConfig({
      DATABASE_URL: "postgresql://prod.example.com:5432/townpet",
      [PRODUCTION_DEMO_CONTENT_CONFIRM_ENV_KEY]: PRODUCTION_DEMO_CONTENT_CONFIRM_VALUE,
      DEMO_CONTENT_EMAIL_DOMAIN: "demo.example.com",
      DEMO_CONTENT_MODE: "cleanup",
      DEMO_CONTENT_RESET_EXISTING: "false",
      DEMO_CONTENT_INCLUDE_LOST_FOUND: "true",
    } as unknown as NodeJS.ProcessEnv);

    expect(config).toMatchObject({
      emailDomain: "demo.example.com",
      mode: "cleanup",
      resetExisting: false,
      includeLostFound: true,
    });
  });

  it("rejects invalid email domains", () => {
    expect(() =>
      resolveDemoContentSeedConfig({
        DATABASE_URL: "postgresql://prod.example.com:5432/townpet",
        [PRODUCTION_DEMO_CONTENT_CONFIRM_ENV_KEY]: PRODUCTION_DEMO_CONTENT_CONFIRM_VALUE,
        DEMO_CONTENT_EMAIL_DOMAIN: "naver.com user",
      } as unknown as NodeJS.ProcessEnv),
    ).toThrow("DEMO_CONTENT_EMAIL_DOMAIN must be a valid owned domain");
  });
});

describe("buildDemoAccountEmail", () => {
  it("builds normalized demo account emails", () => {
    expect(buildDemoAccountEmail("sample-maru", "demo.example.com")).toBe(
      "sample-maru@demo.example.com",
    );
  });

  it("rejects unsupported local parts", () => {
    expect(() => buildDemoAccountEmail("샘플", "demo.example.com")).toThrow(
      "Invalid demo account local-part",
    );
  });
});

describe("buildDemoPostImageUrl", () => {
  it("maps known demo seeds to local raster assets", () => {
    expect(buildDemoPostImageUrl("adoption-maru")).toBe("/demo/adoption/maru.jpg");
    expect(buildDemoPostImageUrl("pet-showcase-coco")).toBe("/demo/adoption/moka.jpg");
  });

  it("falls back to a stable local asset for unknown seeds", () => {
    expect(buildDemoPostImageUrl("unknown-seed")).toBe("/demo/adoption/coco.jpg");
    expect(buildDemoPostImageUrl("")).toBe("/demo/adoption/coco.jpg");
  });
});
