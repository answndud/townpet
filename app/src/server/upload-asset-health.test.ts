import { describe, expect, it } from "vitest";

import {
  getUploadFinalizationHealth,
  recordUploadFinalizationFailure,
} from "@/server/upload-asset-health";

describe("upload finalization health", () => {
  it("starts healthy", () => {
    expect(getUploadFinalizationHealth()).toMatchObject({
      state: "ok",
      totalFailureCount: 0,
      lastFailureAt: null,
    });
  });

  it("records attach and release failures for operational review", () => {
    recordUploadFinalizationFailure("attach");
    recordUploadFinalizationFailure("release");

    expect(getUploadFinalizationHealth()).toMatchObject({
      state: "warn",
      attachFailureCount: 1,
      releaseFailureCount: 1,
      totalFailureCount: 2,
      lastFailureKind: "release",
    });
  });
});
