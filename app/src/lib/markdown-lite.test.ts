import { describe, expect, it } from "vitest";

import { renderLiteMarkdown } from "@/lib/markdown-lite";

describe("renderLiteMarkdown", () => {
  it("renders emphasis and code blocks", () => {
    const html = renderLiteMarkdown("**굵게** *기울임* `코드`");

    expect(html).toContain("<strong>굵게</strong>");
    expect(html).toContain("<em>기울임</em>");
    expect(html).toContain("<code");
  });

  it("renders markdown links and bare urls", () => {
    const html = renderLiteMarkdown("[링크](https://example.com) https://townpet.dev");

    expect(html).toContain('href="https://example.com/');
    expect(html).toContain('href="https://townpet.dev/');
    expect(html).toContain("rel=\"noopener noreferrer nofollow\"");
  });

  it("escapes unsafe html input", () => {
    const html = renderLiteMarkdown("<script>alert(1)</script>");

    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("renders markdown image tokens", () => {
    const html = renderLiteMarkdown(
      "![강아지 사진](https://store-1.public.blob.vercel-storage.com/uploads/dog.png)",
    );

    expect(html).toContain('<div class="my-2">');
    expect(html).toContain('<img src="https://store-1.public.blob.vercel-storage.com/uploads/dog.png"');
    expect(html).toContain('alt="강아지 사진"');
    expect(html).toContain('class="block h-auto max-h-[520px] max-w-full border-0 bg-transparent object-contain"');
    expect(html).not.toContain("<p><img");
  });

  it("renders image width token", () => {
    const html = renderLiteMarkdown(
      "![강아지 사진](https://store-1.public.blob.vercel-storage.com/uploads/dog.png){width=320}",
    );

    expect(html).toContain('style="width:min(100%, 320px);height:auto"');
  });

  it("renders numeric size and hex color tokens", () => {
    const html = renderLiteMarkdown("[size=12][color=#2563eb]본문[/color][/size]");

    expect(html).toContain('data-size="12"');
    expect(html).toContain('style="font-size:12px"');
    expect(html).toContain('data-color="#2563eb"');
    expect(html).toContain('style="color:#2563eb"');
  });

  it("does not render external markdown images", () => {
    const html = renderLiteMarkdown("![추적 픽셀](https://example.com/pixel.png)");

    expect(html).not.toContain("<img");
    expect(html).toContain("추적 픽셀");
  });
});
