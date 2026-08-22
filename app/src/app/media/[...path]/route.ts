import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { get as getBlob } from "@vercel/blob";

import {
  getTrustedUploadPathname,
  isTrustedUploadPathname,
} from "@/lib/upload-url";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getCurrentUserId } from "@/server/auth";
import { runtimeEnv } from "@/lib/env";
import { findStoredUploadSourceByPathname } from "@/server/upload-asset.service";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ path: string[] }>;
};

function inferContentTypeFromStorageKey(storageKey: string) {
  const extension = storageKey.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "jpg" || extension === "jpeg") {
    return "image/jpeg";
  }
  if (extension === "png") {
    return "image/png";
  }
  if (extension === "gif") {
    return "image/gif";
  }
  if (extension === "webp") {
    return "image/webp";
  }
  if (extension === "avif") {
    return "image/avif";
  }
  if (extension === "heic") {
    return "image/heic";
  }
  if (extension === "heif") {
    return "image/heif";
  }

  return "application/octet-stream";
}

function normalizeImageContentType(contentType: string | null) {
  const normalized = contentType?.split(";")[0]?.trim().toLowerCase() ?? "";
  return [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/avif",
    "image/heic",
    "image/heif",
  ].includes(normalized)
    ? normalized
    : null;
}

function buildMediaHeaders(params: {
  contentType?: string | null;
  contentLength?: string | null;
  visibility?: "PUBLIC" | "PRIVATE";
}) {
  const headers = new Headers({
    "Cache-Control": params.visibility === "PRIVATE"
      ? "private, no-store"
      : "public, max-age=31536000, immutable",
    "Cross-Origin-Resource-Policy": "same-site",
    "X-Content-Type-Options": "nosniff",
  });

  if (params.contentType) {
    headers.set("Content-Type", params.contentType);
  }
  if (params.contentLength) {
    headers.set("Content-Length", params.contentLength);
  }

  return headers;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { path: requestedSegments } = await params;
  const storageKey = requestedSegments.join("/");

  if (!isTrustedUploadPathname(storageKey)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "MEDIA_NOT_FOUND",
          message: "이미지를 찾을 수 없습니다.",
        },
      },
      { status: 404 },
    );
  }

  try {
    const storedSource = await findStoredUploadSourceByPathname(storageKey);

    if (storedSource?.blocked) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "MEDIA_NOT_FOUND",
            message: "이미지를 찾을 수 없습니다.",
          },
        },
        { status: 404 },
      );
    }

    if (storedSource?.visibility === "PRIVATE") {
      const currentUserId = await getCurrentUserId();
      if (!currentUserId || storedSource.ownerUserId !== currentUserId) {
        return NextResponse.json(
          { ok: false, error: { code: "MEDIA_NOT_FOUND", message: "이미지를 찾을 수 없습니다." } },
          { status: 404 },
        );
      }
    }

    if (
      storedSource &&
      getTrustedUploadPathname(storedSource.sourceUrl) !== storageKey
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "MEDIA_NOT_FOUND",
            message: "이미지를 찾을 수 없습니다.",
          },
        },
        { status: 404 },
      );
    }

    if (!storedSource || storedSource.storageProvider === "LOCAL") {
      const absolutePath = path.join(process.cwd(), "public", ...storageKey.split("/"));
      try {
        const buffer = await readFile(absolutePath);
        return new Response(buffer, {
          status: 200,
          headers: buildMediaHeaders({
            contentType: inferContentTypeFromStorageKey(storageKey),
            contentLength: String(buffer.byteLength),
          }),
        });
      } catch (error) {
        const code =
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          typeof (error as { code?: unknown }).code === "string"
            ? (error as { code: string }).code
            : null;
        if (code === "ENOENT") {
          return NextResponse.json(
            {
              ok: false,
              error: {
                code: "MEDIA_NOT_FOUND",
                message: "이미지를 찾을 수 없습니다.",
              },
            },
            { status: 404 },
          );
        }
        throw error;
      }
    }

    const upstream = storedSource.visibility === "PRIVATE"
      ? await getBlob(storedSource.sourceUrl, {
          access: "private",
          token: runtimeEnv.blobReadWriteToken,
          useCache: false,
        })
      : await fetch(storedSource.sourceUrl, {
          method: "GET",
          cache: "force-cache",
        });

    const upstreamBody = upstream && ("stream" in upstream ? upstream.stream : upstream.body);
    if (!upstream || ("ok" in upstream && !upstream.ok) || !upstreamBody) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "MEDIA_NOT_FOUND",
            message: "이미지를 찾을 수 없습니다.",
          },
        },
        { status: 404 },
      );
    }

    const upstreamContentType = normalizeImageContentType(
      "headers" in upstream ? upstream.headers.get("content-type") : null,
    );
    if (!upstreamContentType) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "MEDIA_NOT_FOUND",
            message: "이미지를 찾을 수 없습니다.",
          },
        },
        { status: 404 },
      );
    }

    return new Response(upstreamBody, {
      status: 200,
      headers: buildMediaHeaders({
        contentType: upstreamContentType,
        contentLength: "headers" in upstream ? upstream.headers.get("content-length") : null,
        visibility: storedSource.visibility,
      }),
    });
  } catch (error) {
    await monitorUnhandledError(error, {
      route: "GET /media/[...path]",
      request,
      extra: { storageKey },
    });

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "이미지를 불러오는 중 오류가 발생했습니다.",
        },
      },
      { status: 500 },
    );
  }
}
