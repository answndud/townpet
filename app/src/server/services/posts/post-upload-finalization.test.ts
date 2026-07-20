import { beforeEach, describe, expect, it, vi } from "vitest";

import { monitorUnhandledError } from "@/server/error-monitor";
import { attachUploadUrls, releaseUploadUrlsIfUnreferenced } from "@/server/upload-asset.service";

import { finalizeUploadUrlChanges } from "./post-upload-finalization";

vi.mock("@/server/error-monitor", () => ({
  monitorUnhandledError: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/upload-asset-health", () => ({
  recordUploadFinalizationFailure: vi.fn(),
}));

vi.mock("@/server/upload-asset.service", () => ({
  attachUploadUrls: vi.fn(),
  releaseUploadUrlsIfUnreferenced: vi.fn(),
}));

describe("upload finalization coordinator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(attachUploadUrls).mockResolvedValue(0);
    vi.mocked(releaseUploadUrlsIfUnreferenced).mockResolvedValue({
      deletedUrls: [],
      skippedUrls: [],
    });
  });

  it("attaches assets before returning and reports attach failures", async () => {
    vi.mocked(attachUploadUrls).mockRejectedValueOnce(new Error("attach failed"));

    await expect(
      finalizeUploadUrlChanges({
        attachedUrls: ["/media/asset-1"],
        ownership: { ownerUserId: "user-1" },
      }),
    ).rejects.toThrow("attach failed");

    expect(monitorUnhandledError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ route: "upload-finalization/attach" }),
    );
  });

  it("starts release cleanup without delaying the successful mutation response", async () => {
    await finalizeUploadUrlChanges({ releasedUrls: ["/media/asset-1"] });

    expect(releaseUploadUrlsIfUnreferenced).toHaveBeenCalledWith(["/media/asset-1"]);
  });
});
