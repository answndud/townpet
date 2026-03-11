import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("globals.css semantic color roles", () => {
  it("defines shared text, border, and surface role classes", () => {
    const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toContain(".tp-text-primary");
    expect(css).toContain(".tp-text-heading");
    expect(css).toContain(".tp-text-muted");
    expect(css).toContain(".tp-text-subtle");
    expect(css).toContain(".tp-text-accent");
    expect(css).toContain(".tp-text-link");
    expect(css).toContain(".tp-border-soft");
    expect(css).toContain(".tp-surface-soft");
    expect(css).toContain(".tp-surface-alt");
  });
});
