import type { ReactNode } from "react";

type ErrorStateProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions: ReactNode;
  className?: string;
  role?: "alert" | "status";
};

export function ErrorState({
  eyebrow,
  title,
  description,
  actions,
  className = "",
  role = "alert",
}: ErrorStateProps) {
  return (
    <section
      className={`tp-card mx-auto w-full max-w-[720px] p-5 text-center sm:p-6 ${className}`}
      role={role}
      aria-live={role === "alert" ? "assertive" : "polite"}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5b78a1]">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-balance text-2xl font-bold text-[#10284a] sm:text-3xl">
        {title}
      </h1>
      <p className="mx-auto mt-3 max-w-[560px] text-sm leading-6 text-[#5a7398]">
        {description}
      </p>
      <div className="mt-5 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
        {actions}
      </div>
    </section>
  );
}
