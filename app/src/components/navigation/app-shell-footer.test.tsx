import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppShellFooter } from "@/components/navigation/app-shell-footer";

describe("AppShellFooter", () => {
  it("exposes public legal routes from the app shell", () => {
    const html = renderToStaticMarkup(<AppShellFooter />);

    expect(html).toContain('href="/terms"');
    expect(html).toContain('href="/privacy"');
    expect(html).toContain('href="/commercial"');
    expect(html).toContain("광고·제휴 고지");
  });
});

