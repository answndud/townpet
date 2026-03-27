import type { Metadata } from "next";

import { LegalDocumentPage } from "@/components/legal/legal-document-page";
import { getSiteOrigin } from "@/lib/site-url";

const siteOrigin = getSiteOrigin();

export const metadata: Metadata = {
  title: "이용약관",
  description: "TownPet 서비스 이용에 필요한 기본 약관을 확인하세요.",
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title: "TownPet 이용약관",
    description: "TownPet 서비스 이용에 필요한 기본 약관을 확인하세요.",
    url: `${siteOrigin}/terms`,
  },
};

export default function TermsPage() {
  return (
    <LegalDocumentPage
      eyebrow="Legal"
      title="이용약관"
      description="TownPet 서비스 이용 시 지켜야 할 기본 원칙과 운영 기준을 안내합니다."
      updatedAt="2026-03-27"
      relatedLinks={[
        { href: "/privacy", label: "개인정보처리방침" },
        { href: "/commercial", label: "광고·제휴 고지" },
      ]}
    >
      <div className="space-y-5 text-sm leading-7 text-[#274b7a]">
        <section className="space-y-2">
          <h2 className="tp-text-section-title tp-text-heading">1. 서비스 목적</h2>
          <p>
            TownPet은 동네 기반 반려생활 정보를 나누는 커뮤니티입니다. 글, 댓글, 검색, 알림,
            운영/제재 기능은 서비스의 안전성과 신뢰를 위해 제공됩니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="tp-text-section-title tp-text-heading">2. 계정과 이용 책임</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>가입 시 제공한 정보는 사실과 일치해야 합니다.</li>
            <li>계정은 본인 책임으로 관리해야 하며, 타인의 계정을 무단 사용하면 안 됩니다.</li>
            <li>게시물과 댓글은 서비스 정책과 법령을 준수해야 합니다.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="tp-text-section-title tp-text-heading">3. 게시물과 콘텐츠</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>게시물, 사진, 댓글 등 사용자가 올린 콘텐츠의 책임은 작성자에게 있습니다.</li>
            <li>서비스는 운영상 필요한 범위에서 콘텐츠를 노출, 보관, 비공개 처리할 수 있습니다.</li>
            <li>신고나 정책 위반이 확인되면 콘텐츠가 숨김, 제한, 삭제될 수 있습니다.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="tp-text-section-title tp-text-heading">4. 금지 행위</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>스팸, 도배, 광고성 게시물, 악성 링크, 금칙어 우회는 금지됩니다.</li>
            <li>타인의 개인정보, 위치, 연락처, 증빙 이미지를 무단 노출하면 안 됩니다.</li>
            <li>허위 신고, 차단 우회, 시스템 악용, 서비스 방해 행위는 제재 대상입니다.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="tp-text-section-title tp-text-heading">5. 서비스 변경과 책임 제한</h2>
          <p>
            TownPet은 서비스 품질을 위해 일부 기능을 변경, 중단, 제한할 수 있습니다. 외부 링크,
            제휴, 사용자 게시물의 정확성에 대해서는 서비스가 보장하지 않으며, 법령이 허용하는
            범위 내에서 책임을 집니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="tp-text-section-title tp-text-heading">6. 약관 변경</h2>
          <p>
            운영 정책, 법령, 서비스 구조가 바뀌면 약관도 업데이트될 수 있습니다. 중요한 변경은
            서비스 내 공지를 통해 알립니다.
          </p>
        </section>
      </div>
    </LegalDocumentPage>
  );
}

