import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { dynamic } from "@/app/page";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("HomePage", () => {
  it("opens visitors on the public feed", () => {
    const source = readSource("src/app/page.tsx");

    expect(source).toContain('redirect("/feed/guest")');
    expect(source).not.toContain("HomeFeedPreview");
    expect(source).not.toContain("우리 동네 반려생활 정보");
  });

  it("keeps the root route dynamic for the redirect", () => {
    expect(dynamic).toBe("force-dynamic");
  });
});
