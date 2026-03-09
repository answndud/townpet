function normalizeReactionCount(value: number | null | undefined) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.trunc(Number(value)));
}

export function calculatePostReactionScore(
  likeCount: number | null | undefined,
  dislikeCount: number | null | undefined,
) {
  return normalizeReactionCount(likeCount) - normalizeReactionCount(dislikeCount);
}

export function getPostReactionScoreMagnitude(score: number) {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.abs(Math.trunc(score));
}

export function getPostReactionScoreTone(score: number) {
  const safeScore = Number.isFinite(score) ? Math.trunc(score) : 0;
  const absoluteScore = Math.abs(safeScore);

  if (safeScore > 0) {
    if (absoluteScore >= 50) {
      return "positiveStrong" as const;
    }
    if (absoluteScore >= 10) {
      return "positive" as const;
    }
    return "positiveSoft" as const;
  }

  if (safeScore < 0) {
    if (absoluteScore >= 50) {
      return "negativeStrong" as const;
    }
    if (absoluteScore >= 10) {
      return "negative" as const;
    }
    return "negativeSoft" as const;
  }

  return "neutral" as const;
}
