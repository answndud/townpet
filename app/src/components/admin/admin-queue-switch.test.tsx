import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminQueueSwitch } from "@/components/admin/admin-queue-switch";

describe("AdminQueueSwitch", () => {
  it("links reports and corrections queues with compact summaries", () => {
    const html = renderToStaticMarkup(
      <AdminQueueSwitch
        current="reports"
        reportPendingCount={5}
        reportCriticalCount={2}
        correctionActiveCount={3}
        correctionOperatorCount={1}
      />,
    );

    expect(html).toContain('href="/admin/reports?status=PENDING"');
    expect(html).toContain('href="/admin/corrections?status=PENDING"');
    expect(html).toContain("5건 대기");
    expect(html).toContain("긴급 2건");
    expect(html).toContain("3건 진행");
    expect(html).toContain("운영자 콘텐츠 제보 1건");
  });

  it("avoids fake critical counts when viewed outside the report queue", () => {
    const html = renderToStaticMarkup(
      <AdminQueueSwitch
        current="corrections"
        reportPendingCount={5}
        reportCriticalCount={null}
        correctionActiveCount={3}
        correctionOperatorCount={0}
      />,
    );

    expect(html).toContain("대기 신고를 열어 긴급/높음 우선순위를 확인");
    expect(html).not.toContain("긴급 0건");
  });
});
