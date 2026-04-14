import { renderLiteMarkdown } from "@/lib/markdown-lite";

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function extractPostContentPlainText(content: string) {
  const rendered = renderLiteMarkdown(content);
  const plainText = decodeHtmlEntities(rendered.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

  if (plainText.includes("미리보기 내용이 없습니다")) {
    return "";
  }

  return plainText;
}

export function buildPostContentExcerpt(content: string, maxLength = 160) {
  const normalized = extractPostContentPlainText(content);
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength)}...`;
}
