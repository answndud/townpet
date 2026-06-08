import { UploadStorageProvider } from "@prisma/client";
import { access } from "fs/promises";
import path from "path";

import { prisma } from "@/lib/prisma";
import {
  getTrustedUploadPathname,
  isTrustedUploadUrl,
} from "@/lib/upload-url";

type UploadImageReference = {
  url?: string | null;
};

function normalizeTrustedUploadUrls(urls: string[]) {
  return Array.from(
    new Set(urls.map((url) => url.trim()).filter((url) => isTrustedUploadUrl(url))),
  );
}

function normalizeTrustedUploadStorageKeys(urls: string[]) {
  return Array.from(
    new Set(
      normalizeTrustedUploadUrls(urls)
        .map((url) => getTrustedUploadPathname(url))
        .filter((storageKey): storageKey is string => Boolean(storageKey)),
    ),
  );
}

async function localUploadFileExists(storageKey: string) {
  const absolutePath = path.join(process.cwd(), "public", ...storageKey.split("/"));
  try {
    await access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

export function filterRenderableUploadImages<T extends UploadImageReference>(
  images: T[],
  renderableUploadPathnames: Set<string>,
) {
  return images.filter((image) => {
    const url = image.url?.trim();
    if (!url) {
      return false;
    }

    const storageKey = getTrustedUploadPathname(url);
    if (!storageKey) {
      return true;
    }

    return renderableUploadPathnames.has(storageKey);
  });
}

export async function resolveRenderableUploadPathnames(urls: string[]) {
  const trustedStorageKeys = normalizeTrustedUploadStorageKeys(urls);
  const renderableStorageKeys = new Set<string>();
  if (trustedStorageKeys.length === 0) {
    return renderableStorageKeys;
  }

  const relatedAssets = await prisma.uploadAsset.findMany({
    where: {
      deletedAt: null,
      OR: [
        {
          storageKey: {
            in: trustedStorageKeys,
          },
        },
        {
          thumbnailStorageKey: {
            in: trustedStorageKeys,
          },
        },
      ],
    },
    select: {
      storageKey: true,
      thumbnailStorageKey: true,
      storageProvider: true,
    },
  });

  for (const asset of relatedAssets) {
    if (asset.storageProvider === UploadStorageProvider.BLOB) {
      renderableStorageKeys.add(asset.storageKey);
      if (asset.thumbnailStorageKey) {
        renderableStorageKeys.add(asset.thumbnailStorageKey);
      }
    }
  }

  const localCandidateKeys = trustedStorageKeys.filter(
    (storageKey) => !renderableStorageKeys.has(storageKey),
  );
  const localChecks = await Promise.all(
    localCandidateKeys.map(async (storageKey) => ({
      storageKey,
      exists: await localUploadFileExists(storageKey),
    })),
  );

  for (const check of localChecks) {
    if (check.exists) {
      renderableStorageKeys.add(check.storageKey);
    }
  }

  return renderableStorageKeys;
}
