import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";

import { WebVitalsReporter } from "@/components/analytics/web-vitals-reporter";
import { AppShellFooter } from "@/components/navigation/app-shell-footer";
import { AppShellHeader } from "@/components/navigation/app-shell-header";
import { ScrollToTopButton } from "@/components/ui/scroll-to-top-button";
import { getSiteOrigin } from "@/lib/site-url";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const siteOrigin = getSiteOrigin();

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: "TownPet | 우리 동네 반려생활 정보",
    template: "%s | TownPet",
  },
  description:
    "동물병원, 산책코스, 분실동물, 입양, 중고거래 정보를 지역별로 찾고 공유하는 동네 반려생활 정보 커뮤니티입니다.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: siteOrigin,
    siteName: "TownPet",
    title: "TownPet | 우리 동네 반려생활 정보",
    description:
      "동물병원, 산책코스, 분실동물, 입양, 중고거래 정보를 지역별로 찾고 공유하는 동네 반려생활 정보 커뮤니티입니다.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TownPet | 우리 동네 반려생활 정보",
    description:
      "동물병원, 산책코스, 분실동물, 입양, 중고거래 정보를 지역별로 찾고 공유하는 동네 반려생활 정보 커뮤니티입니다.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${spaceGrotesk.variable} ${plexMono.variable} app-shell-bg tp-text-primary min-h-screen antialiased`}
      >
        <AppShellHeader />

        {children}
        <AppShellFooter />
        <ScrollToTopButton />
        <WebVitalsReporter />
      </body>
    </html>
  );
}
