import type { Metadata } from "next";

import { LegalDocumentPage } from "@/components/legal/legal-document-page";
import { getSiteOrigin } from "@/lib/site-url";

const siteOrigin = getSiteOrigin();

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "TownPet이 어떤 정보를 왜 수집하고 어떻게 보호하는지 확인하세요.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "TownPet 개인정보처리방침",
    description: "TownPet이 어떤 정보를 왜 수집하고 어떻게 보호하는지 확인하세요.",
    url: `${siteOrigin}/privacy`,
  },
};

export default function PrivacyPage() {
  return (
    <LegalDocumentPage
      eyebrow="Privacy"
      title="개인정보처리방침"
      description="TownPet이 수집하는 정보의 종류, 이용 목적, 보관 기준, 사용자 권리를 안내합니다."
      updatedAt="2026-03-27"
      relatedLinks={[
        { href: "/terms", label: "이용약관" },
        { href: "/commercial", label: "광고·제휴 고지" },
      ]}
    >
      <div className="space-y-5 text-sm leading-7 text-[#274b7a]">
        <section className="space-y-2">
          <h2 className="tp-text-section-title tp-text-heading">1. 수집하는 정보</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>계정 정보: 이메일, 닉네임, 프로필 이미지, 로그인 관련 식별자</li>
            <li>이용 정보: 게시글, 댓글, 검색 기록, 알림, 신고 및 운영 로그</li>
            <li>보호 목적 정보: 제재 기록, IP/기기 관련 악용 방지 신호</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="tp-text-section-title tp-text-heading">2. 이용 목적</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>서비스 제공, 계정 인증, 게시물 노출, 댓글/알림 기능 제공</li>
            <li>신고 처리, 자동숨김, 악용 방지, 부정 이용 탐지</li>
            <li>검색 품질, 운영 통계, 서비스 개선과 안전성 확보</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="tp-text-section-title tp-text-heading">3. 보관과 삭제</h2>
          <p>
            개인정보는 목적 달성에 필요한 기간 동안만 보관하며, 게시물과 신고, 제재 기록은
            운영/법적 요구사항을 고려해 별도 기준으로 관리합니다. 불필요해진 정보는 지체 없이
            삭제하거나 비식별화합니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="tp-text-section-title tp-text-heading">4. 제3자 제공과 위탁</h2>
          <p>
            이메일 발송, 호스팅, 로그 분석처럼 서비스 운영에 필요한 범위에서 외부 서비스를
            사용할 수 있습니다. 이 경우에도 최소 수집과 목적 제한 원칙을 지킵니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="tp-text-section-title tp-text-heading">5. 사용자 권리</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>계정 정보 확인, 수정, 삭제를 요청할 수 있습니다.</li>
            <li>동네 설정, 알림, 공개 범위는 서비스 안에서 조정할 수 있습니다.</li>
            <li>운영/신고 관련 문의는 서비스 내 문의/신고 경로로 접수할 수 있습니다.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="tp-text-section-title tp-text-heading">6. 안전 조치</h2>
          <p>
            TownPet은 접근 제어, 감사 로그, 자동 숨김, 비정상 행위 탐지, 비밀번호 해시 저장 등을
            통해 개인정보를 보호합니다.
          </p>
        </section>
      </div>
    </LegalDocumentPage>
  );
}

