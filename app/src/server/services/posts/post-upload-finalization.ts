import { monitorUnhandledError } from "@/server/error-monitor";
import { recordUploadFinalizationFailure } from "@/server/upload-asset-health";
import {
  attachUploadUrls,
  releaseUploadUrlsIfUnreferenced,
} from "@/server/upload-asset.service";

export async function finalizeUploadUrlChanges(params: {
  attachedUrls?: string[];
  releasedUrls?: string[];
  ownership?: {
    ownerUserId?: string;
    ownerGuestIdentity?: { ip: string; fingerprint?: string };
  };
}) {
  if (params.attachedUrls && params.attachedUrls.length > 0) {
    try {
      await attachUploadUrls(params.attachedUrls, params.ownership);
    } catch (error) {
      recordUploadFinalizationFailure("attach");
      void monitorUnhandledError(error, {
        route: "upload-finalization/attach",
        extra: { assetCount: params.attachedUrls.length },
      }).catch(() => undefined);
      throw error;
    }
  }

  if (params.releasedUrls && params.releasedUrls.length > 0) {
    void releaseUploadUrlsIfUnreferenced(params.releasedUrls).catch(async (error) => {
      recordUploadFinalizationFailure("release");
      await monitorUnhandledError(error, {
        route: "upload-finalization/release",
        extra: { assetCount: params.releasedUrls?.length ?? 0 },
      }).catch(() => undefined);
    });
  }
}

