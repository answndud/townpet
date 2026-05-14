import { ReportStatus } from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ReportActions } from "@/components/admin/report-actions";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}));

describe("ReportActions", () => {
  it("keeps moderation action controls mobile-safe", () => {
    const html = renderToStaticMarkup(
      <ReportActions reportId="report-1" status={ReportStatus.PENDING} />,
    );

    expect(html).toContain("min-h-10");
    expect(html).toContain("flex-wrap");
    expect(html).toContain("조치 완료");
    expect(html).toContain("조치 없음");
  });

  it("marks processed reports as disabled", () => {
    const html = renderToStaticMarkup(
      <ReportActions reportId="report-1" status={ReportStatus.RESOLVED} />,
    );

    expect(html).toContain("disabled");
    expect(html).toContain("처리 완료");
  });
});
