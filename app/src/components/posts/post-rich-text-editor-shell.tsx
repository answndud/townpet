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
  const toneClassName = tone === "primary" ? "tp-btn-primary" : "tp-btn-soft";
  const scaleClassName =
    scale === "bar"
      ? "tp-btn-sm px-3"
      : scale === "action"
        ? "h-10 rounded-xl px-4"
        : "h-7 px-2.5";

  return (
    <button
      type={type}
      className={`${toneClassName} inline-flex items-center ${scaleClassName} font-semibold ${className}`.trim()}
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
