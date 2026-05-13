import Link from "next/link";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ErrorState } from "@/components/ui/error-state";

describe("ErrorState", () => {
  it("renders an accessible recovery state with mobile-safe actions", () => {
    const html = renderToStaticMarkup(
      <ErrorState
        eyebrow="오류 발생"
        title="요청을 처리하지 못했습니다."
        description="잠시 후 다시 시도하거나 피드로 이동해 주세요."
        actions={
          <>
            <button type="button" className="tp-btn-primary">
              다시 시도
            </button>
            <Link href="/feed" className="tp-btn-soft">
              피드로 이동
            </Link>
          </>
        }
      />,
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
    expect(html).toContain("flex-col");
    expect(html).toContain("sm:flex-row");
    expect(html).toContain("다시 시도");
    expect(html).toContain('href="/feed"');
  });

  it("can render non-alert fallback states", () => {
    const html = renderToStaticMarkup(
      <ErrorState
        eyebrow="404"
        title="페이지를 찾을 수 없습니다."
        description="주소를 확인하거나 피드로 이동해 주세요."
        role="status"
        actions={<Link href="/feed">피드로 이동</Link>}
      />,
    );

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });
});
