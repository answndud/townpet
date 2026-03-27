import type { Metadata } from "next";

import { LegalDocumentPage } from "@/components/legal/legal-document-page";
import { getSiteOrigin } from "@/lib/site-url";

const siteOrigin = getSiteOrigin();

export const metadata: Metadata = {
  title: "광고·제휴 고지",
  description: "TownPet의 광고, 제휴, 스폰서 노출 원칙을 안내합니다.",
  alternates: {
    canonical: "/commercial",
  },
  openGraph: {
    title: "TownPet 광고·제휴 고지",
    description: "TownPet의 광고, 제휴, 스폰서 노출 원칙을 안내합니다.",
    url: `${siteOrigin}/commercial`,
  },
};

export default function CommercialPage() {
  return (
    <LegalDocumentPage
      eyebrow="Commercial"
      title="광고·제휴 고지"
      description="TownPet은 커뮤니티 신뢰를 해치지 않는 범위에서 광고, 제휴, 스폰서 노출을 운영합니다."
      updatedAt="2026-03-27"
      relatedLinks={[
        { href: "/terms", label: "이용약관" },
        { href: "/privacy", label: "개인정보처리방침" },
      ]}
    >
      <div className="space-y-5 text-sm leading-7 text-[#274b7a]">
        <section className="space-y-2">
          <h2 className="tp-text-section-title tp-text-heading">1. 광고·제휴 표기</h2>
          <p>
            광고, 스폰서 카드, 제휴 링크, 유료 노출은 본문 또는 카드 영역에 라벨로 명확히
            표시합니다. 사용자가 일반 게시물과 구분할 수 있어야 합니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="tp-text-section-title tp-text-heading">2. 운영 원칙</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>핵심 커뮤니티 기능은 무료로 유지합니다.</li>
            <li>광고/제휴 노출은 빈도와 위치를 제한합니다.</li>
            <li>추천, 랭킹, 신고 기준은 유료 여부와 분리합니다.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="tp-text-section-title tp-text-heading">3. 제휴 실험</h2>
          <p>
            지역 파트너, 리드형 문의, 검증 배지처럼 선택형 제휴 실험을 할 수 있습니다. 실험은
            짧은 단위로 운영하며, 신뢰 지표가 악화되면 중단하거나 구조를 조정합니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="tp-text-section-title tp-text-heading">4. 빈도와 영향 제한</h2>
          <p>
            광고성 노출은 세션/일 빈도 캡을 적용하고, 신고/자동숨김/제재 규칙은 일반 게시물과
            동일하게 적용합니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="tp-text-section-title tp-text-heading">5. 문의와 수정 요청</h2>
          <p>
            광고·제휴 관련 문의는 서비스 내 문의/신고 경로를 통해 접수해 주세요. 운영팀은 콘텐츠
            표기와 노출 기준을 조정할 수 있습니다.
          </p>
        </section>
      </div>
    </LegalDocumentPage>
  );
}

