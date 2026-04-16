"use client";

import type SunEditorInstance from "suneditor/src/lib/core";
import type { SunEditorOptions } from "suneditor/src/options";
import type { UploadBeforeHandler } from "suneditor-react/dist/types/upload";
import ko from "suneditor/src/lang/ko";
import dynamic from "next/dynamic";
import {
  forwardRef,
  type ReactNode,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  PostEditorToolbarButton,
  PostRichTextEditorShell,
} from "@/components/posts/post-rich-text-editor-shell";
import {
  areSameStringArray,
  collapseAdjacentDuplicateImageTokens,
  extractImageUrlsFromMarkup,
} from "@/lib/editor-image-markup";
import {
  markupToEditorHtml,
  serializeEditorHtml,
} from "@/lib/editor-content-serializer";
import {
  DEFAULT_POST_EDITOR_FONT_SIZE,
  DEFAULT_POST_EDITOR_TEXT_COLOR,
} from "@/lib/post-editor-font-size";
import { type GuestWriteScope, getGuestWriteHeaders } from "@/lib/guest-step-up.client";
import { renderLiteMarkdown } from "@/lib/markdown-lite";

const SunEditor = dynamic(() => import("suneditor-react"), { ssr: false });
const STYLED_SPAN_SELECTOR = "span[style*='font-size'], span[style*='color']";
const STYLE_BOUNDARY_SENTINEL = "\u200b";

const FONT_SIZE_OPTIONS = [12, 14, 16, 18, 20, 24, 28, 32];

type UploadApiResponse = {
  ok: boolean;
  data?: {
    url: string;
    size: number;
    mimeType: string;
  };
  error?: {
    message?: string;
  };
};

export type PostEditorMode = "write" | "preview";

type PostBodyRichEditorProps = {
  value: string;
  imageUrls: string[];
  onChange: (nextContent: string, nextImageUrls: string[]) => void;
  maxFiles: number;
  guestWriteScope?: GuestWriteScope;
  mode?: PostEditorMode;
  onModeChange?: (mode: PostEditorMode) => void;
  footerContent?: ReactNode;
  contentMaxLength: number;
};

export type PostBodyRichEditorHandle = {
  getSerializedState: () => {
    content: string;
    imageUrls: string[];
  };
};

function formatUploadError(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "이미지 업로드에 실패했습니다.";
}

async function uploadEditorImage(file: File, guestWriteScope?: GuestWriteScope) {
  const headers = guestWriteScope
    ? await getGuestWriteHeaders(guestWriteScope)
    : undefined;
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    headers,
    body: formData,
  });

  const payload = (await response.json()) as UploadApiResponse;
  if (!response.ok || !payload.ok || !payload.data?.url) {
    throw new Error(payload.error?.message ?? "이미지 업로드에 실패했습니다.");
  }

  return {
    url: payload.data.url,
    name: file.name,
    size: payload.data.size ?? file.size,
  };
}

function serializeEditorContent(html: string) {
  return collapseAdjacentDuplicateImageTokens(serializeEditorHtml(html));
}

export const PostBodyRichEditor = forwardRef<PostBodyRichEditorHandle, PostBodyRichEditorProps>(function PostBodyRichEditor({
  value,
  imageUrls,
  onChange,
  maxFiles,
  guestWriteScope,
  mode = "write",
  onModeChange,
  footerContent,
  contentMaxLength,
}, ref) {
  const editorRef = useRef<SunEditorInstance | null>(null);
  const latestValueRef = useRef(value);
  const latestImageUrlsRef = useRef(imageUrls);
  const latestOnChangeRef = useRef(onChange);
  const latestSelectionRangeRef = useRef<Range | null>(null);
  const pendingStyleBoundaryTimeoutRef = useRef<number | null>(null);
  const pendingStyleBoundaryCorrectionRef = useRef(false);
  const [isMounted, setIsMounted] = useState(false);
  const [editorInstanceVersion, setEditorInstanceVersion] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);

    return () => {
      if (pendingStyleBoundaryTimeoutRef.current !== null) {
        window.clearTimeout(pendingStyleBoundaryTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    latestValueRef.current = value;
    latestImageUrlsRef.current = imageUrls;
    latestOnChangeRef.current = onChange;
  }, [imageUrls, onChange, value]);

  const editorOptions = useMemo<SunEditorOptions>(
    () => ({
      defaultStyle: `font-size:${DEFAULT_POST_EDITOR_FONT_SIZE}px;color:${DEFAULT_POST_EDITOR_TEXT_COLOR};line-height:1.75;`,
      minHeight: "340px",
      maxHeight: "640px",
      placeholder: "내용을 입력해 주세요.",
      buttonList: [
        ["image", "link"],
        ["undo", "redo", "removeFormat"],
        "/",
        ["fontSize"],
        ["bold", "underline", "italic", "strike"],
        ["list", "blockquote"],
      ],
      fontSize: FONT_SIZE_OPTIONS,
      fontSizeUnit: "px",
      formats: ["p", "blockquote"],
      resizingBar: false,
      showPathLabel: false,
      imageResizing: true,
      imageHeightShow: false,
      imageRotation: false,
      imageAlignShow: true,
      imageFileInput: true,
      imageUrlInput: false,
      imageAccept: "image/*",
      imageMultipleFile: maxFiles > 1,
      imageUploadSizeLimit: 10 * 1024 * 1024,
      attributesWhitelist: {
        all: "style|href|src|alt|target|rel",
      },
    }),
    [maxFiles],
  );

  const previewHtml = useMemo(() => renderLiteMarkdown(value), [value]);

  const captureSelectionRange = useCallback(() => {
    const editor = editorRef.current;
    const editable = editor?.core.context.element.wysiwyg;
    if (!editor || !editable) {
      return;
    }

    const selection = editor.core.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (!editable.contains(range.startContainer) || !editable.contains(range.endContainer)) {
      return;
    }

    latestSelectionRangeRef.current = range.cloneRange();
  }, []);

  const restoreSelectionRange = useCallback(() => {
    const editor = editorRef.current;
    const editable = editor?.core.context.element.wysiwyg;
    const range = latestSelectionRangeRef.current;
    if (!editor || !editable || !range) {
      return false;
    }

    if (!editable.contains(range.startContainer) || !editable.contains(range.endContainer)) {
      latestSelectionRangeRef.current = null;
      return false;
    }

    try {
      editor.core.setRange(
        range.startContainer,
        range.startOffset,
        range.endContainer,
        range.endOffset,
      );
      editor.core.focus();
      return true;
    } catch {
      latestSelectionRangeRef.current = null;
      return false;
    }
  }, []);

  const resolveStyledSpanFromSelection = useCallback((selection: Selection | null) => {
    const editable = editorRef.current?.core.context.element.wysiwyg;
    if (!(editable instanceof HTMLElement) || !selection || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const resolveStyledSpan = (node: Node | null): HTMLElement | null => {
      const element = node instanceof HTMLElement ? node : node?.parentElement;
      const matched = element?.closest(STYLED_SPAN_SELECTOR);
      return matched instanceof HTMLElement && editable.contains(matched) ? matched : null;
    };

    const container = range.startContainer;
    let styledSpan =
      resolveStyledSpan(container) ?? resolveStyledSpan(range.commonAncestorContainer);

    if (!styledSpan && container instanceof HTMLElement && range.startOffset > 0) {
      styledSpan = resolveStyledSpan(container.childNodes[range.startOffset - 1] ?? null);
    }

    return styledSpan;
  }, []);

  const isSelectionAtStyledSpanEnd = useCallback((selection: Selection | null) => {
    const styledSpan = resolveStyledSpanFromSelection(selection);
    if (!styledSpan || !selection || selection.rangeCount === 0) {
      return false;
    }

    const range = selection.getRangeAt(0);
    if (!range.collapsed) {
      return false;
    }

    if (range.startContainer.nodeType === Node.TEXT_NODE) {
      return range.startOffset === (range.startContainer.textContent ?? "").length;
    }

    return range.startOffset === range.startContainer.childNodes.length;
  }, [resolveStyledSpanFromSelection]);

  const moveCaretOutsideStyledSpan = useCallback(() => {
    const editor = editorRef.current;
    const editable = editor?.core.context.element.wysiwyg;
    if (!editor || !(editable instanceof HTMLElement)) {
      return false;
    }

    const selection = window.getSelection();
    const styledSpan = resolveStyledSpanFromSelection(selection);
    if (!styledSpan || !styledSpan.parentNode) {
      return false;
    }

    const nextSibling = styledSpan.nextSibling;
    const sentinel =
      nextSibling?.nodeType === Node.TEXT_NODE &&
      (nextSibling.textContent ?? "").startsWith(STYLE_BOUNDARY_SENTINEL)
        ? nextSibling
        : document.createTextNode(STYLE_BOUNDARY_SENTINEL);

    if (sentinel !== nextSibling) {
      styledSpan.parentNode.insertBefore(sentinel, nextSibling);
    }

    try {
      editor.core.setRange(
        sentinel,
        STYLE_BOUNDARY_SENTINEL.length,
        sentinel,
        STYLE_BOUNDARY_SENTINEL.length,
      );
      editor.core.focus();
    } catch {
      return false;
    }

    const nextSelection = editor.core.getSelection();
    latestSelectionRangeRef.current =
      nextSelection && nextSelection.rangeCount > 0
        ? nextSelection.getRangeAt(0).cloneRange()
        : null;
    return true;
  }, [resolveStyledSpanFromSelection]);

  const scheduleDeferredStyleBoundaryCorrection = useCallback((remainingAttempts = 4) => {
    if (typeof window === "undefined") {
      return;
    }
    if (pendingStyleBoundaryTimeoutRef.current !== null) {
      window.clearTimeout(pendingStyleBoundaryTimeoutRef.current);
    }

    pendingStyleBoundaryTimeoutRef.current = window.setTimeout(() => {
      pendingStyleBoundaryTimeoutRef.current = null;
      if (!pendingStyleBoundaryCorrectionRef.current) {
        return;
      }
      if (moveCaretOutsideStyledSpan()) {
        return;
      }
      if (remainingAttempts > 1) {
        scheduleDeferredStyleBoundaryCorrection(remainingAttempts - 1);
      }
    }, 24);
  }, [moveCaretOutsideStyledSpan]);

  const syncEditableAttributes = useCallback(() => {
    const editable = editorRef.current?.core.context.element.wysiwyg;
    if (!editable) {
      return;
    }

    editable.setAttribute("data-testid", "post-body-editor");
    editable.setAttribute("aria-label", "본문");

    const editorRoot = editable.closest(".sun-editor");
    const imageFileInputs = editorRoot?.querySelectorAll<HTMLInputElement>("input._se_image_file");
    imageFileInputs?.forEach((input) => {
      input.setAttribute("data-testid", "post-editor-image-file-input");
      if (maxFiles > 1) {
        input.setAttribute("multiple", "multiple");
      } else {
        input.removeAttribute("multiple");
      }
    });
  }, [maxFiles]);

  useEffect(() => {
    const editor = editorRef.current;
    const editable = editor?.core.context.element.wysiwyg;
    const editorRoot = editable?.closest(".sun-editor");
    if (!editor || !(editable instanceof HTMLElement) || !editorRoot) {
      return;
    }

    const handleSelectionChange = () => {
      captureSelectionRange();
      const selection = window.getSelection();
      const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      if (
        pendingStyleBoundaryCorrectionRef.current &&
        resolveStyledSpanFromSelection(selection) &&
        (Boolean(range && !range.collapsed) || isSelectionAtStyledSpanEnd(selection))
      ) {
        scheduleDeferredStyleBoundaryCorrection();
      }
    };

    const handleToolbarMouseDownCapture = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      if (target.closest(".sun-editor") !== editorRoot) {
        return;
      }
      if (target.closest(".se-dialog")) {
        return;
      }

      const control = target.closest("button");
      if (!control) {
        return;
      }
      if (!control.closest(".se-toolbar") && !control.closest(".se-submenu")) {
        return;
      }

      if (control.closest(".se-list-font-size")) {
        pendingStyleBoundaryCorrectionRef.current = true;
        scheduleDeferredStyleBoundaryCorrection();
      }

      captureSelectionRange();
      if (restoreSelectionRange()) {
        event.preventDefault();
      }
    };

    const handleBeforeInput: EventListener = (event) => {
      if (!(event instanceof InputEvent)) {
        return;
      }
      if (!event.inputType.startsWith("insert")) {
        return;
      }

      const selection = window.getSelection();
      const shouldExitStyledSpan =
        pendingStyleBoundaryCorrectionRef.current
          ? Boolean(resolveStyledSpanFromSelection(selection))
          : isSelectionAtStyledSpanEnd(selection);

      if (!shouldExitStyledSpan) {
        return;
      }

      if (moveCaretOutsideStyledSpan() || !resolveStyledSpanFromSelection(window.getSelection())) {
        pendingStyleBoundaryCorrectionRef.current = false;
      }
    };

    editable.addEventListener("mouseup", handleSelectionChange);
    editable.addEventListener("keyup", handleSelectionChange);
    editable.addEventListener("touchend", handleSelectionChange);
    editable.addEventListener("beforeinput", handleBeforeInput);
    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("mousedown", handleToolbarMouseDownCapture, true);

    return () => {
      editable.removeEventListener("mouseup", handleSelectionChange);
      editable.removeEventListener("keyup", handleSelectionChange);
      editable.removeEventListener("touchend", handleSelectionChange);
      editable.removeEventListener("beforeinput", handleBeforeInput);
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("mousedown", handleToolbarMouseDownCapture, true);
    };
  }, [
    captureSelectionRange,
    editorInstanceVersion,
    isSelectionAtStyledSpanEnd,
    isMounted,
    moveCaretOutsideStyledSpan,
    resolveStyledSpanFromSelection,
    restoreSelectionRange,
    scheduleDeferredStyleBoundaryCorrection,
  ]);

  const pushEditorChange = (html: string) => {
    const serialized = serializeEditorContent(html);
    const nextImageUrls = extractImageUrlsFromMarkup(serialized);

    if (
      serialized === latestValueRef.current &&
      areSameStringArray(nextImageUrls, latestImageUrlsRef.current)
    ) {
      return;
    }

    latestOnChangeRef.current(serialized, nextImageUrls);
  };

  useImperativeHandle(ref, () => ({
    getSerializedState: () => {
      const html = editorRef.current?.getContents(true) ?? markupToEditorHtml(latestValueRef.current);
      const content = serializeEditorContent(html);
      return {
        content,
        imageUrls: extractImageUrlsFromMarkup(content),
      };
    },
  }), []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    syncEditableAttributes();
    const currentSerialized = serializeEditorContent(editor.getContents(true));
    if (currentSerialized === value) {
      return;
    }

    editor.setContents(markupToEditorHtml(value));
    syncEditableAttributes();
  }, [maxFiles, syncEditableAttributes, value]);

  const handleImageUploadBefore = (
    files: File[],
    _info: object,
    uploadHandler: UploadBeforeHandler,
  ) => {
    void (async () => {
      const remainingCount = Math.max(0, maxFiles - latestImageUrlsRef.current.length);
      if (remainingCount <= 0) {
        const message = `이미지는 최대 ${maxFiles}장까지 첨부할 수 있습니다.`;
        setUploadError(message);
        uploadHandler(message);
        return;
      }

      const targetFiles = files.slice(0, remainingCount);
      if (targetFiles.length === 0) {
        uploadHandler();
        return;
      }

      if (targetFiles.length < files.length) {
        setUploadError(`이미지는 최대 ${maxFiles}장까지 첨부할 수 있어 일부 파일은 제외되었습니다.`);
      } else {
        setUploadError(null);
      }

      setIsUploading(true);

      try {
        const uploaded = await Promise.all(
          targetFiles.map((file) => uploadEditorImage(file, guestWriteScope)),
        );

        uploadHandler({ result: uploaded });
      } catch (error) {
        const message = formatUploadError(error);
        setUploadError(message);
        uploadHandler(message);
      } finally {
        setIsUploading(false);
      }
    })();

    return undefined;
  };

  const headerContent = (
    <div className="ml-auto flex items-center gap-2">
      {onModeChange ? (
        <div className="inline-flex items-center rounded-xl border border-[#d7e1f0] bg-white p-1">
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
      <span
        className={
          value.length > contentMaxLength
            ? "text-xs font-medium text-rose-600"
            : "tp-text-subtle"
        }
      >
        {value.length.toLocaleString("ko-KR")} / {contentMaxLength.toLocaleString("ko-KR")}자
      </span>
    </div>
  );

  return (
    <PostRichTextEditorShell
      headerContent={headerContent}
      footerContent={footerContent}
    >
      {mode === "preview" ? (
        <div
          className="tp-editor-surface prose prose-sm max-w-none px-4 py-4 text-[#1f3f71]"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      ) : (
        <div className="tp-sun-editor-wrap border-t border-[#dbe6f6] bg-[#fcfdff] px-3 py-3">
          {isMounted ? (
            <SunEditor
              defaultValue={markupToEditorHtml(value)}
              lang={ko}
              setOptions={editorOptions}
              getSunEditorInstance={(instance) => {
                editorRef.current = instance;
                setEditorInstanceVersion((current) => current + 1);
                syncEditableAttributes();
              }}
              onLoad={() => {
                setEditorInstanceVersion((current) => current + 1);
                syncEditableAttributes();
              }}
              onChange={(html) => {
                pushEditorChange(html);
                if (pendingStyleBoundaryCorrectionRef.current) {
                  scheduleDeferredStyleBoundaryCorrection();
                }
              }}
              onImageUploadBefore={handleImageUploadBefore}
              onImageUploadError={(message) => {
                setUploadError(message);
                return false;
              }}
            />
          ) : (
            <div className="min-h-[340px] rounded-xl border border-[#d7e1f0] bg-white" />
          )}
        </div>
      )}

      {isUploading ? (
        <div className="tp-editor-toolbar-soft border-t text-[12px] text-[#4c6790]">
          이미지를 업로드하는 중입니다.
        </div>
      ) : null}
      {uploadError ? (
        <div className="tp-editor-toolbar-soft border-t text-[12px] text-rose-600">
          {uploadError}
        </div>
      ) : null}
    </PostRichTextEditorShell>
  );
});

export { PostEditorToolbarButton };
