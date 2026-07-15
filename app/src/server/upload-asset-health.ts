type UploadFinalizationKind = "attach" | "release";

let attachFailureCount = 0;
let releaseFailureCount = 0;
let lastFailureAt = 0;
let lastFailureKind: UploadFinalizationKind | null = null;

export function recordUploadFinalizationFailure(kind: UploadFinalizationKind) {
  if (kind === "attach") attachFailureCount += 1;
  else releaseFailureCount += 1;
  lastFailureAt = Date.now();
  lastFailureKind = kind;
}

export function getUploadFinalizationHealth() {
  const totalFailureCount = attachFailureCount + releaseFailureCount;
  return {
    state: totalFailureCount === 0 ? ("ok" as const) : ("warn" as const),
    attachFailureCount,
    releaseFailureCount,
    totalFailureCount,
    lastFailureAt: lastFailureAt > 0 ? new Date(lastFailureAt).toISOString() : null,
    lastFailureKind,
    message:
      totalFailureCount === 0
        ? "upload finalization healthy"
        : "upload finalization failures require cleanup/retry review",
  };
}

