function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&#39;");
}

function isRangeWithinEditor(editor: HTMLElement, range: Range) {
  return editor.contains(range.startContainer) && editor.contains(range.endContainer);
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

function insertImageBlocksWithRange(editor: HTMLElement, imageUrls: string[], range: Range) {
  const selection = window.getSelection();
  const fragment = document.createDocumentFragment();
  let lastNode: Node | null = null;

  for (const url of imageUrls) {
    const block = document.createElement("p");
    const image = document.createElement("img");
    image.src = url;
    image.alt = "첨부 이미지";
    image.loading = "lazy";
    image.style.maxWidth = "100%";
    image.style.height = "auto";
    block.appendChild(image);
    fragment.appendChild(block);

    const spacer = document.createElement("p");
    spacer.appendChild(document.createElement("br"));
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

  const insertHtml = imageUrls
    .map(
      (url) =>
        `<p><img src="${escapeHtmlAttribute(url)}" alt="첨부 이미지" style="max-width:100%;height:auto" /></p><p><br></p>`,
    )
    .join("");

  const inserted = document.execCommand("insertHTML", false, insertHtml);
  if (!inserted) {
    return insertImageBlocksWithRange(editor, imageUrls, nextRange);
  }

  return cloneSelectionRangeWithin(editor) ?? createRangeAtEditorEnd(editor);
}
