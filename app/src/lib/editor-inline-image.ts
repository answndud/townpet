export const DEFAULT_EDITOR_FONT_SIZE = 14;
export const DEFAULT_EDITOR_TEXT_COLOR = "#111827";
const EDITOR_CARET_SENTINEL = "\u200b";
const INLINE_FORMATTING_TAGS = new Set([
  "A",
  "B",
  "CODE",
  "DEL",
  "EM",
  "I",
  "S",
  "SPAN",
  "STRONG",
  "U",
]);
const TEXT_BLOCK_TAGS = new Set(["BLOCKQUOTE", "DIV", "H1", "H2", "H3", "LI", "P"]);

function isRangeWithinEditor(editor: HTMLElement, range: Range) {
  return editor.contains(range.startContainer) && editor.contains(range.endContainer);
}

function normalizeColorToken(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(trimmed)) {
    return trimmed;
  }

  const rgbMatch = trimmed.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/);
  if (!rgbMatch) {
    return null;
  }

  const channels = rgbMatch.slice(1).map((channel) => Number(channel));
  if (channels.some((channel) => !Number.isFinite(channel) || channel < 0 || channel > 255)) {
    return null;
  }

  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function normalizeEditorText(value: string) {
  return value.replace(/\u00a0/g, " ").replaceAll(EDITOR_CARET_SENTINEL, "");
}

function isInlineFormattingElement(value: Node | null): value is HTMLElement {
  return value instanceof HTMLElement && INLINE_FORMATTING_TAGS.has(value.tagName);
}

function getEditorTextBlock(editor: HTMLElement, node: Node) {
  let current: HTMLElement | null =
    node instanceof HTMLElement ? node : node.parentElement;

  while (current && current !== editor) {
    if (TEXT_BLOCK_TAGS.has(current.tagName)) {
      return current;
    }
    current = current.parentElement;
  }

  return editor;
}

function hasMeaningfulContentAfterNode(container: Node, node: Node) {
  if (typeof document === "undefined") {
    return false;
  }

  const range = document.createRange();
  range.selectNodeContents(container);

  try {
    range.setStartAfter(node);
  } catch {
    return false;
  }

  const fragment = range.cloneContents();
  if (normalizeEditorText(fragment.textContent ?? "").trim().length > 0) {
    return true;
  }

  return Array.from(fragment.childNodes).some((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      return normalizeEditorText(child.textContent ?? "").trim().length > 0;
    }

    if (!(child instanceof HTMLElement)) {
      return false;
    }

    return child.tagName !== "BR";
  });
}

function resolveInlineExitNode(editor: HTMLElement, node: Node) {
  let current = node;
  let parent = current.parentNode;

  while (parent instanceof HTMLElement && parent !== editor) {
    if (!isInlineFormattingElement(parent) || hasMeaningfulContentAfterNode(parent, current)) {
      break;
    }

    current = parent;
    parent = current.parentNode;
  }

  return current;
}

function ensureTrailingCaretSentinel(node: Node) {
  const nextSibling = node.nextSibling;
  if (
    nextSibling?.nodeType === Node.TEXT_NODE &&
    (nextSibling.textContent ?? "") === EDITOR_CARET_SENTINEL
  ) {
    return nextSibling;
  }

  const sentinel = document.createTextNode(EDITOR_CARET_SENTINEL);
  node.parentNode?.insertBefore(sentinel, nextSibling);
  return sentinel;
}

function placeCaretAfterInlineNode(params: {
  editor: HTMLElement;
  insertedNode: Node;
}) {
  const { editor, insertedNode } = params;
  const selection = window.getSelection();
  if (!selection) {
    return null;
  }

  const exitNode = resolveInlineExitNode(editor, insertedNode);
  const block = getEditorTextBlock(editor, exitNode);
  const caretAnchor = hasMeaningfulContentAfterNode(block, exitNode)
    ? exitNode
    : ensureTrailingCaretSentinel(exitNode);

  const nextRange = document.createRange();
  nextRange.setStartAfter(caretAnchor);
  nextRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(nextRange);
  return nextRange.cloneRange();
}

function getRangeAnchorElement(range: Range) {
  if (range.startContainer instanceof HTMLElement) {
    return range.startContainer;
  }
  return range.startContainer.parentElement;
}

function createRangeAtEditorEnd(editor: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  return range;
}

function setSelectionRange(range: Range) {
  const selection = window.getSelection();
  if (!selection) {
    return false;
  }
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

function hasMeaningfulContentBeforeRangeInBlock(block: HTMLElement, range: Range) {
  if (typeof document === "undefined") {
    return false;
  }

  const blockRange = document.createRange();
  blockRange.selectNodeContents(block);

  try {
    blockRange.setEnd(range.startContainer, range.startOffset);
  } catch {
    return false;
  }

  const fragment = blockRange.cloneContents();
  if (normalizeEditorText(fragment.textContent ?? "").trim().length > 0) {
    return true;
  }

  return Array.from(fragment.childNodes).some((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      return normalizeEditorText(child.textContent ?? "").trim().length > 0;
    }

    return child instanceof HTMLElement && child.tagName !== "BR";
  });
}

function insertImageBlocksWithRange(editor: HTMLElement, imageUrls: string[], range: Range) {
  const selection = window.getSelection();
  const fragment = document.createDocumentFragment();
  const block = getEditorTextBlock(editor, range.startContainer);
  let lastNode: Node | null = null;
  const shouldPrefixBreak = hasMeaningfulContentBeforeRangeInBlock(block, range);

  if (shouldPrefixBreak) {
    const leadingBreak = document.createElement("br");
    fragment.appendChild(leadingBreak);
  }

  for (const url of imageUrls) {
    const image = document.createElement("img");
    image.src = url;
    image.alt = "첨부 이미지";
    image.loading = "lazy";
    image.style.maxWidth = "100%";
    image.style.height = "auto";
    fragment.appendChild(image);

    const breakAfter = document.createElement("br");
    const spacer = document.createElement("br");
    fragment.appendChild(breakAfter);
    fragment.appendChild(spacer);
    lastNode = spacer;
  }

  range.deleteContents();
  range.insertNode(fragment);

  const nextRange = document.createRange();
  if (lastNode && editor.contains(lastNode)) {
    nextRange.setStartAfter(lastNode);
  } else {
    nextRange.selectNodeContents(editor);
  }
  nextRange.collapse(true);

  if (selection) {
    selection.removeAllRanges();
    selection.addRange(nextRange);
  }

  return nextRange.cloneRange();
}

export function cloneSelectionRangeWithin(editor: HTMLElement) {
  if (typeof window === "undefined") {
    return null;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  return isRangeWithinEditor(editor, range) ? range.cloneRange() : null;
}

export function restoreSelectionRangeWithin(params: {
  editor: HTMLElement;
  savedRange: Range | null;
  preferSaved?: boolean;
}) {
  const { editor, savedRange, preferSaved = false } = params;

  if (typeof window === "undefined") {
    return null;
  }

  const selection = window.getSelection();
  if (!selection) {
    return null;
  }

  const currentRange =
    selection.rangeCount > 0 && isRangeWithinEditor(editor, selection.getRangeAt(0))
      ? selection.getRangeAt(0).cloneRange()
      : null;
  const safeSavedRange =
    savedRange && isRangeWithinEditor(editor, savedRange) ? savedRange.cloneRange() : null;
  const targetRange = preferSaved
    ? safeSavedRange ?? currentRange
    : currentRange ?? safeSavedRange;

  if (!targetRange) {
    return null;
  }

  editor.focus();
  selection.removeAllRanges();
  selection.addRange(targetRange);
  return targetRange.cloneRange();
}

export function getSelectionInlineStyleState(params: {
  editor: HTMLElement;
  range: Range | null;
}) {
  const { editor, range } = params;
  if (!range) {
    return {
      fontSize: DEFAULT_EDITOR_FONT_SIZE,
      textColor: DEFAULT_EDITOR_TEXT_COLOR,
    };
  }

  let currentElement = getRangeAnchorElement(range);
  let fontSize = DEFAULT_EDITOR_FONT_SIZE;
  let textColor = DEFAULT_EDITOR_TEXT_COLOR;

  while (currentElement && currentElement !== editor) {
    const maybeSize = currentElement.dataset.size?.trim();
    if (maybeSize && /^\d{1,2}$/.test(maybeSize)) {
      fontSize = Number(maybeSize);
      break;
    }
    currentElement = currentElement.parentElement;
  }

  currentElement = getRangeAnchorElement(range);
  while (currentElement && currentElement !== editor) {
    const maybeColor =
      normalizeColorToken(currentElement.dataset.color) ??
      normalizeColorToken(currentElement.style.color);
    if (maybeColor) {
      textColor = maybeColor;
      break;
    }
    currentElement = currentElement.parentElement;
  }

  return {
    fontSize,
    textColor,
  };
}

export function moveCaretAfterStyledNode(params: {
  editor: HTMLElement;
  insertedNode: Node;
}) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }

  return placeCaretAfterInlineNode(params);
}

export function insertImagesAtSavedSelection(params: {
  editor: HTMLElement;
  imageUrls: string[];
  savedRange: Range | null;
}) {
  const { editor, imageUrls, savedRange } = params;

  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    imageUrls.length === 0
  ) {
    return null;
  }

  const nextRange =
    savedRange && isRangeWithinEditor(editor, savedRange)
      ? savedRange.cloneRange()
      : createRangeAtEditorEnd(editor);

  editor.focus();
  if (!setSelectionRange(nextRange)) {
    return null;
  }
  return insertImageBlocksWithRange(editor, imageUrls, nextRange);
}
