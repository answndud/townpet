import { extractImageUrlsFromMarkup } from "@/lib/editor-image-markup";
import { renderLiteMarkdown } from "@/lib/markdown-lite";
import {
  filterRenderableUploadImages,
  resolveRenderableUploadPathnames,
} from "@/server/upload-asset.service";

type DetailImage = {
  url?: string | null;
  order?: number | null;
};

export function hasRenderedInlineImages(renderedContentHtml: string) {
  return /<img[\s>]/i.test(renderedContentHtml);
}

export async function buildPostDetailMediaRendering<T extends DetailImage>(
  content: string,
  images: T[],
) {
  const imageUrls = [
    ...extractImageUrlsFromMarkup(content),
    ...images.map((image) => image.url ?? "").filter((url) => url.length > 0),
  ];
  const renderableUploadPathnames = await resolveRenderableUploadPathnames(imageUrls);
  const renderedContentHtml = renderLiteMarkdown(content, {
    renderableUploadPathnames,
  });
  const renderedContentText = renderedContentHtml
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const renderableImages = filterRenderableUploadImages(
    images,
    renderableUploadPathnames,
  ).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return {
    renderedContentHtml,
    renderedContentText,
    renderableImages,
    hasInlineImages: hasRenderedInlineImages(renderedContentHtml),
  };
}
