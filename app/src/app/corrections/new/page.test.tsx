import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import CorrectionRequestPage, { metadata } from "@/app/corrections/new/page";

describe("CorrectionRequestPage", () => {
  it("renders public correction request form with post prefill", async () => {
    const html = renderToStaticMarkup(
      await CorrectionRequestPage({
        searchParams: Promise.resolve({
          postId: "ckc7k5qsj0000u0t8qv6d1d7k",
          targetType: "HOSPITAL",
          targetName: "타운동물병원",
        }),
      }),
    );

    expect(html).toContain("정보 정정 요청");
    expect(html).toContain('action="/api/corrections"');
    expect(html).toContain('name="postId"');
    expect(html).toContain("타운동물병원");
    expect(html).toContain("정정 요청 접수");
  });

  it("is noindex and canonical to correction request URL", () => {
    expect(metadata.alternates).toMatchObject({ canonical: "/corrections/new" });
    expect(metadata.robots).toMatchObject({ index: false, follow: true });
  });
});
