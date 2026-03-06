import { describe, expect, it } from "vitest";

import { isTrustedUploadPathname, isTrustedUploadUrl } from "@/lib/upload-url";

describe("upload url trust policy", () => {
  it("accepts local upload paths", () => {
    expect(isTrustedUploadUrl("/uploads/image.png")).toBe(true);
  });

  it("accepts blob upload urls", () => {
    expect(
      isTrustedUploadUrl(
        "https://store-1.public.blob.vercel-storage.com/uploads/image.png",
      ),
    ).toBe(true);
  });

  it("rejects external image urls", () => {
    expect(isTrustedUploadUrl("https://example.com/image.png")).toBe(false);
  });

  it("rejects upload path traversal", () => {
    expect(isTrustedUploadPathname("uploads/../../etc/passwd")).toBe(false);
  });
});
