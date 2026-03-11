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
      <main className="mx-auto flex w-full max-w-[720px] flex-col gap-5 px-4 py-8 sm:px-6 sm:py-12">
        <header className="tp-hero p-5 sm:p-6">
          <p className="tp-eyebrow">{eyebrow}</p>
          <h1 className="tp-text-page-title mt-2 text-[#10284a]">{title}</h1>
          <p className="mt-2 text-sm text-[#4f678d]">{description}</p>
        </header>

        <section className="tp-card p-5 sm:p-6">
          {form}
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={primaryFooterLink.href}
            className="tp-btn-soft tp-btn-sm inline-flex items-center justify-center text-[#315484]"
          >
            {primaryFooterLink.label}
          </Link>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#5a7398]">
            {secondaryFooterLinks.map((link) => (
              <Link
                key={`${link.href}:${link.label}`}
                href={link.href}
                className="transition hover:text-[#274b7a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/35"
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
