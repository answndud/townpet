export const POPULAR_POST_POLICY_KEY = "popular_post_policy_v1";

export const DEFAULT_POPULAR_POST_MIN_LIKES = 3;
export const POPULAR_POST_MIN_LIKES_MIN = 1;
export const POPULAR_POST_MIN_LIKES_MAX = 100;

export type PopularPostPolicy = {
  minLikes: number;
};

function normalizeInteger(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.trunc(numeric) : null;
  }
  return null;
}

export function normalizePopularPostPolicy(
  value: unknown,
  fallback: PopularPostPolicy = { minLikes: DEFAULT_POPULAR_POST_MIN_LIKES },
): PopularPostPolicy {
  const candidate =
    value && typeof value === "object"
      ? normalizeInteger((value as { minLikes?: unknown }).minLikes)
      : normalizeInteger(value);
  const fallbackMinLikes = Math.min(
    POPULAR_POST_MIN_LIKES_MAX,
    Math.max(POPULAR_POST_MIN_LIKES_MIN, fallback.minLikes),
  );

  return {
    minLikes:
      candidate && candidate >= POPULAR_POST_MIN_LIKES_MIN && candidate <= POPULAR_POST_MIN_LIKES_MAX
        ? candidate
        : fallbackMinLikes,
  };
}
