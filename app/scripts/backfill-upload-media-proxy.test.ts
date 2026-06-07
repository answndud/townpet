import { describe, expect, it } from "vitest";

import {
  applyProxyMappings,
  buildProxyMappings,
  collectLegacyUploadUrls,
  formatUploadMediaProxyBackfillOutput,
  inferMimeTypeFromStorageKey,
} from "./backfill-upload-media-proxy";

describe("upload media proxy backfill CLI wrapper", () => {
  it("collects distinct raw blob and local upload URLs from content", () => {
    expect(
      collectLegacyUploadUrls(
        [
          "one /uploads/a.jpg",
          "again /uploads/a.jpg",
          "blob https://example.public.blob.vercel-storage.com/uploads/b.webp",
          "already proxied /media/uploads/c.png",
        ].join(" "),
      ),
    ).toEqual([
      "https://example.public.blob.vercel-storage.com/uploads/b.webp",
      "/uploads/a.jpg",
    ]);
  });

  it("builds proxy mappings for trusted raw upload URLs", () => {
    expect(
      Array.from(buildProxyMappings(["/uploads/a.jpg", "/media/uploads/already.jpg"]).entries()),
    ).toEqual([["/uploads/a.jpg", "/media/uploads/a.jpg"]]);
  });

  it("applies proxy mappings to post content", () => {
    const mappings = new Map([["/uploads/a.jpg", "/media/uploads/a.jpg"]]);

    expect(applyProxyMappings("image /uploads/a.jpg /uploads/a.jpg", mappings)).toBe(
      "image /media/uploads/a.jpg /media/uploads/a.jpg",
    );
  });

  it("infers common image mime types", () => {
    expect(inferMimeTypeFromStorageKey("uploads/a.jpg")).toBe("image/jpeg");
    expect(inferMimeTypeFromStorageKey("uploads/a.webp")).toBe("image/webp");
    expect(inferMimeTypeFromStorageKey("uploads/a.unknown")).toBe("application/octet-stream");
  });

  it("explains dry-run output without implying rows were rewritten", () => {
    expect(
      formatUploadMediaProxyBackfillOutput({
        dryRun: true,
        registeredAssetCount: 2,
        updatedPostImageCount: 1,
        updatedUserImageCount: 1,
        updatedPetImageCount: 0,
        updatedPostContentCount: 3,
        legacyUrlsSeen: 4,
      }),
    ).toBe(
      [
        "Upload media proxy backfill",
        "- dryRun: yes",
        "- registeredAssets: 2",
        "- updatedPostImages: 1",
        "- updatedUserImages: 1",
        "- updatedPetImages: 0",
        "- updatedPostContent: 3",
        "- legacyUrlsSeen: 4",
        "Dry-run mode. Re-run with --apply to rewrite media URLs.",
      ].join("\n"),
    );
  });

  it("formats apply output as completed rewrites", () => {
    expect(
      formatUploadMediaProxyBackfillOutput({
        dryRun: false,
        registeredAssetCount: 2,
        updatedPostImageCount: 1,
        updatedUserImageCount: 1,
        updatedPetImageCount: 0,
        updatedPostContentCount: 3,
        legacyUrlsSeen: 4,
      }),
    ).toBe(
      [
        "Upload media proxy backfill",
        "- dryRun: no",
        "- registeredAssets: 2",
        "- updatedPostImages: 1",
        "- updatedUserImages: 1",
        "- updatedPetImages: 0",
        "- updatedPostContent: 3",
        "- legacyUrlsSeen: 4",
      ].join("\n"),
    );
  });
});
