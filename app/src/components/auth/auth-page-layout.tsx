import type { ReactNode } from "react";
import Link from "next/link";

type AuthFooterLink = {
  href: string;
  label: string;
};

type AuthPageLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  form: ReactNode;
  primaryFooterLink: AuthFooterLink;
  secondaryFooterLinks: AuthFooterLink[];
};

const AUTH_PAGE_PRIMARY_FOOTER_LINK_CLASS_NAME =
  "tp-text-link inline-flex min-h-10 items-center justify-center px-1.5 text-xs font-semibold transition hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/35 focus-visible:ring-offset-1";

const AUTH_PAGE_SECONDARY_FOOTER_LINK_CLASS_NAME =
  "tp-text-muted inline-flex min-h-10 items-center px-1.5 text-sm transition hover:text-[#274b7a] hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/35 focus-visible:ring-offset-1";

export function AuthPageLayout({
  eyebrow,
  title,
  description,
  form,
  primaryFooterLink,
  secondaryFooterLinks,
}: AuthPageLayoutProps) {
  return (
    <div className="tp-page-bg min-h-screen">
      <main className="mx-auto flex w-full max-w-[760px] flex-col gap-5 px-4 py-8 sm:px-6 sm:py-12">
        <header className="tp-hero p-5 sm:p-6">
          <p className="tp-eyebrow">{eyebrow}</p>
          <h1 className="tp-text-page-title mt-2 text-[#10284a]">{title}</h1>
          <p className="mt-2 max-w-[62ch] text-sm leading-6 text-[#4f678d]">{description}</p>
        </header>

        <section className="tp-card p-5 sm:p-6">
          {form}
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={primaryFooterLink.href}
            className={AUTH_PAGE_PRIMARY_FOOTER_LINK_CLASS_NAME}
          >
            {primaryFooterLink.label}
          </Link>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-[#5a7398] sm:gap-x-4">
            {secondaryFooterLinks.map((link) => (
              <Link
                key={`${link.href}:${link.label}`}
                href={link.href}
                className={AUTH_PAGE_SECONDARY_FOOTER_LINK_CLASS_NAME}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
