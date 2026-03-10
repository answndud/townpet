import { describe, expect, it } from "vitest";

import {
  APP_SHELL_HEADER_CLASS_NAME,
  hasMobileStickyHeader,
} from "@/components/navigation/app-shell-header-class";

describe("app shell header classes", () => {
  it("keeps sticky positioning scoped to tablet and larger breakpoints", () => {
    expect(APP_SHELL_HEADER_CLASS_NAME).toContain("sm:sticky");
    expect(APP_SHELL_HEADER_CLASS_NAME).toContain("sm:top-0");
    expect(hasMobileStickyHeader(APP_SHELL_HEADER_CLASS_NAME)).toBe(false);
  });
});
