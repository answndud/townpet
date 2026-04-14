"use client";

import type { MouseEvent, ReactNode } from "react";

import {
  PostEditorToolbarButton,
  PostEditorToolbarDivider,
} from "@/components/posts/post-rich-text-editor-shell";

const FONT_SIZE_OPTIONS = [12, 14, 16, 18, 20, 24, 28, 32];

const COLOR_OPTIONS = [
  { label: "검정", value: "#111827" },
  { label: "회색", value: "#475569" },
  { label: "갈색", value: "#92400e" },
  { label: "빨강", value: "#dc2626" },
  { label: "주황", value: "#ea580c" },
  { label: "노랑", value: "#ca8a04" },
  { label: "초록", value: "#16a34a" },
  { label: "청록", value: "#0f766e" },
  { label: "파랑", value: "#2563eb" },
  { label: "남색", value: "#4338ca" },
  { label: "보라", value: "#7c3aed" },
  { label: "분홍", value: "#db2777" },
] as const;

type EditorMode = "write" | "preview";

type PostEditorQuickActionBarProps = {
  imageInputId: string;
  onBlockquote: () => void;
  onBulletList: () => void;
  onOrderedList: () => void;
  onLink: () => void;
  onToolbarSelectionCapture: () => void;
  onToolbarMouseDown: (event: MouseEvent<HTMLButtonElement>) => void;
  mode?: EditorMode;
  onModeChange?: (mode: EditorMode) => void;
  endContent?: ReactNode;
};

type PostEditorFormatBarProps = {
  fontSizeValue: number;
  colorValue: string;
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onStrike: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onFontSizeChange: (size: number) => void;
  onTextColorChange: (color: string) => void;
  onToolbarSelectionCapture: () => void;
  onToolbarMouseDown: (event: MouseEvent<HTMLButtonElement>) => void;
};

function ToolbarIcon({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-4 w-4 items-center justify-center text-[#425b85] ${className}`.trim()}
    >
      {children}
    </span>
  );
}

function QuickActionLabel({
  htmlFor,
  icon,
  children,
  onMouseDownCapture,
}: {
  htmlFor: string;
  icon: ReactNode;
  children: ReactNode;
  onMouseDownCapture?: () => void;
}) {
  return (
    <label
      htmlFor={htmlFor}
      onMouseDownCapture={onMouseDownCapture}
      className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-[#d7e1f0] bg-white px-4 text-[13px] font-semibold text-[#1f3558] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition hover:bg-[#f7fbff]"
    >
      {icon}
      <span className="whitespace-nowrap">{children}</span>
    </label>
  );
}

export function PostEditorQuickActionBar({
  imageInputId,
  onBlockquote,
  onBulletList,
  onOrderedList,
  onLink,
  onToolbarSelectionCapture,
  onToolbarMouseDown,
  mode,
  onModeChange,
  endContent,
}: PostEditorQuickActionBarProps) {
  return (
    <div className="flex min-w-max items-center gap-2">
      <QuickActionLabel
        htmlFor={imageInputId}
        onMouseDownCapture={onToolbarSelectionCapture}
        icon={
          <ToolbarIcon>
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
              <rect x="2.5" y="4" width="15" height="12" rx="2" />
              <circle cx="7" cy="8" r="1.3" fill="currentColor" stroke="none" />
              <path d="m4.5 13 3.2-3.2a1 1 0 0 1 1.4 0L12 12.7l1.4-1.4a1 1 0 0 1 1.4 0l2.7 2.7" />
            </svg>
          </ToolbarIcon>
        }
      >
        이미지
      </QuickActionLabel>
      <PostEditorToolbarButton
        scale="action"
        onClick={onLink}
        onMouseDown={onToolbarMouseDown}
        className="gap-2 whitespace-nowrap border border-[#d7e1f0] bg-white text-[13px] text-[#1f3558] hover:bg-[#f7fbff]"
      >
        <ToolbarIcon>
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M8 12.5 12.5 8" />
            <path d="M6.5 6.5h-1A3.5 3.5 0 0 0 2 10a3.5 3.5 0 0 0 3.5 3.5h1" />
            <path d="M13.5 6.5h1A3.5 3.5 0 0 1 18 10a3.5 3.5 0 0 1-3.5 3.5h-1" />
          </svg>
        </ToolbarIcon>
        링크
      </PostEditorToolbarButton>
      <PostEditorToolbarButton
        scale="action"
        onClick={onBlockquote}
        onMouseDown={onToolbarMouseDown}
        className="gap-2 whitespace-nowrap border border-[#d7e1f0] bg-white text-[13px] text-[#1f3558] hover:bg-[#f7fbff]"
      >
        <ToolbarIcon>
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M6.5 7H4.8A1.8 1.8 0 0 0 3 8.8v1.4A1.8 1.8 0 0 0 4.8 12H7v4H3.8" />
            <path d="M14.5 7h-1.7A1.8 1.8 0 0 0 11 8.8v1.4a1.8 1.8 0 0 0 1.8 1.8H15v4h-3.2" />
          </svg>
        </ToolbarIcon>
        인용
      </PostEditorToolbarButton>
      <PostEditorToolbarButton
        scale="action"
        onClick={onBulletList}
        onMouseDown={onToolbarMouseDown}
        className="gap-2 whitespace-nowrap border border-[#d7e1f0] bg-white text-[13px] text-[#1f3558] hover:bg-[#f7fbff]"
      >
        <ToolbarIcon>
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="4.5" cy="5.5" r="1" fill="currentColor" stroke="none" />
            <circle cx="4.5" cy="10" r="1" fill="currentColor" stroke="none" />
            <circle cx="4.5" cy="14.5" r="1" fill="currentColor" stroke="none" />
            <path d="M8 5.5h8M8 10h8M8 14.5h8" />
          </svg>
        </ToolbarIcon>
        글머리
      </PostEditorToolbarButton>
      <PostEditorToolbarButton
        scale="action"
        onClick={onOrderedList}
        onMouseDown={onToolbarMouseDown}
        className="gap-2 whitespace-nowrap border border-[#d7e1f0] bg-white text-[13px] text-[#1f3558] hover:bg-[#f7fbff]"
      >
        <ToolbarIcon>
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M3.5 5.5h1.8V9" />
            <path d="M3.5 14.5h2.3L3.5 17h2.3" />
            <path d="M9 5.5h8M9 10h8M9 14.5h8" />
          </svg>
        </ToolbarIcon>
        번호
      </PostEditorToolbarButton>
      {onModeChange ? (
        <div className="ml-2 inline-flex items-center rounded-xl border border-[#d7e1f0] bg-white p-1">
          <PostEditorToolbarButton
            scale="bar"
            tone={mode === "write" ? "primary" : "soft"}
            onClick={() => onModeChange("write")}
            className="text-[12px]"
          >
            작성
          </PostEditorToolbarButton>
          <PostEditorToolbarButton
            scale="bar"
            tone={mode === "preview" ? "primary" : "soft"}
            onClick={() => onModeChange("preview")}
            className="text-[12px]"
          >
            미리보기
          </PostEditorToolbarButton>
        </div>
      ) : null}
      {endContent ? <div className="ml-auto">{endContent}</div> : null}
    </div>
  );
}

export function PostEditorFormatBar({
  fontSizeValue,
  colorValue,
  onBold,
  onItalic,
  onUnderline,
  onStrike,
  onUndo,
  onRedo,
  onFontSizeChange,
  onTextColorChange,
  onToolbarSelectionCapture,
  onToolbarMouseDown,
}: PostEditorFormatBarProps) {
  return (
    <div className="flex min-w-max items-center gap-1.5">
      <div className="inline-flex items-center rounded-lg border border-[#d7e1f0] bg-white px-2">
        <select
          value={String(fontSizeValue)}
          onMouseDownCapture={onToolbarSelectionCapture}
          onFocus={onToolbarSelectionCapture}
          onChange={(event) => onFontSizeChange(Number(event.target.value))}
          className="h-8 bg-transparent pr-6 text-[13px] font-semibold text-[#203a62] outline-none"
          aria-label="글자 크기"
        >
          {FONT_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
      <PostEditorToolbarDivider />
      <PostEditorToolbarButton onClick={onBold} onMouseDown={onToolbarMouseDown} className="text-[15px] font-extrabold">
        B
      </PostEditorToolbarButton>
      <PostEditorToolbarButton onClick={onItalic} onMouseDown={onToolbarMouseDown} className="text-[15px] italic">
        I
      </PostEditorToolbarButton>
      <PostEditorToolbarButton onClick={onUnderline} onMouseDown={onToolbarMouseDown} className="text-[14px] underline">
        U
      </PostEditorToolbarButton>
      <PostEditorToolbarButton onClick={onStrike} onMouseDown={onToolbarMouseDown} className="text-[14px] line-through">
        S
      </PostEditorToolbarButton>
      <PostEditorToolbarDivider />
      <div className="inline-flex items-center gap-1 rounded-xl border border-[#d7e1f0] bg-white px-1.5 py-1">
        {COLOR_OPTIONS.map((color) => (
          <PostEditorToolbarButton
            key={color.value}
            onClick={() => onTextColorChange(color.value)}
            onMouseDown={onToolbarMouseDown}
            className={`h-8 w-8 rounded-full border px-0 ${colorValue === color.value ? "border-[#8fa8cf] bg-[#eef5ff]" : "border-transparent bg-white"}`}
            aria-label={`${color.label} 색상`}
            title={color.label}
          >
            <span
              aria-hidden="true"
              className="h-5 w-5 rounded-full border border-white shadow-[0_0_0_1px_rgba(71,85,105,0.16)]"
              style={{ backgroundColor: color.value }}
            />
          </PostEditorToolbarButton>
        ))}
      </div>
      <label
        onMouseDownCapture={onToolbarSelectionCapture}
        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[#d7e1f0] bg-white"
        title="사용자 지정 색상"
        aria-label="사용자 지정 색상"
      >
        <span
          aria-hidden="true"
          className="h-5 w-5 rounded-md border border-white shadow-[0_0_0_1px_rgba(71,85,105,0.18)]"
          style={{ backgroundColor: colorValue }}
        />
        <input
          type="color"
          value={colorValue}
          onFocus={onToolbarSelectionCapture}
          onChange={(event) => onTextColorChange(event.target.value)}
          className="sr-only"
        />
      </label>
      <PostEditorToolbarDivider />
      <PostEditorToolbarButton onClick={onUndo} onMouseDown={onToolbarMouseDown} aria-label="실행 취소" title="실행 취소">
        <ToolbarIcon>
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M8 6 4 10l4 4" />
            <path d="M5 10h6a5 5 0 1 1 0 10" />
          </svg>
        </ToolbarIcon>
      </PostEditorToolbarButton>
      <PostEditorToolbarButton onClick={onRedo} onMouseDown={onToolbarMouseDown} aria-label="다시 실행" title="다시 실행">
        <ToolbarIcon>
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="m12 6 4 4-4 4" />
            <path d="M15 10H9a5 5 0 1 0 0 10" />
          </svg>
        </ToolbarIcon>
      </PostEditorToolbarButton>
    </div>
  );
}
