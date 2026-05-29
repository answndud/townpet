import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from "react";

type PostRichTextEditorShellProps = {
  title?: string;
  headerContent?: ReactNode;
  topToolbar?: ReactNode;
  mobileToolbar?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  footerContent?: ReactNode;
};

type PostEditorToolbarButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "soft" | "primary";
  scale?: "toolbar" | "bar" | "action";
};

type PostEditorToolbarDividerProps = HTMLAttributes<HTMLDivElement>;

export function PostRichTextEditorShell({
  title = "본문",
  headerContent,
  topToolbar,
  mobileToolbar,
  toolbar,
  children,
  footerContent,
}: PostRichTextEditorShellProps) {
  return (
    <section className="tp-card overflow-hidden">
      <div className="tp-editor-toolbar-soft">
        <span className="tp-form-section-title">{title}</span>
        {headerContent}
      </div>

      {topToolbar ? <div className="tp-editor-toolbar-soft tp-editor-toolbar-scroll">{topToolbar}</div> : null}
      {mobileToolbar ? <div className="tp-editor-toolbar sm:hidden">{mobileToolbar}</div> : null}
      {toolbar ? (
        <div className={`tp-editor-toolbar tp-editor-toolbar-scroll ${mobileToolbar ? "hidden sm:flex" : ""}`}>{toolbar}</div>
      ) : null}

      {children}

      {footerContent ? <div className="tp-editor-toolbar-soft border-t">{footerContent}</div> : null}
    </section>
  );
}

export function PostEditorToolbarButton({
  tone = "soft",
  scale = "toolbar",
  type = "button",
  className = "",
  ...props
}: PostEditorToolbarButtonProps) {
  const toneClassName =
    tone === "primary"
      ? "bg-[#3567b5] text-[#fbfdff] hover:bg-[#2f5da4] disabled:bg-[#9fb2cf]"
      : "tp-text-muted hover:bg-[#f6f9fe] hover:text-[#2f5da4] disabled:text-[#9aacbf]";
  const scaleClassName =
    scale === "bar"
      ? "min-h-10 px-2.5 text-xs leading-none"
      : scale === "action"
        ? "min-h-10 px-3 text-xs leading-none"
        : "min-h-10 px-2.5 text-xs leading-none";

  return (
    <button
      type={type}
      className={`${toneClassName} inline-flex items-center rounded-md ${scaleClassName} font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-1 disabled:cursor-not-allowed ${className}`.trim()}
      {...props}
    />
  );
}

export function PostEditorToolbarDivider({
  className = "",
  ...props
}: PostEditorToolbarDividerProps) {
  return <div className={`tp-divider-soft mx-1 ${className}`.trim()} {...props} />;
}
