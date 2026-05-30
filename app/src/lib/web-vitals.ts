export const WEB_VITAL_METRICS = ["LCP", "INP", "CLS", "FCP", "TTFB"] as const;
export const WEB_VITAL_RATINGS = ["GOOD", "NEEDS_IMPROVEMENT", "POOR"] as const;

export type WebVitalMetric = (typeof WEB_VITAL_METRICS)[number];
export type WebVitalRating = (typeof WEB_VITAL_RATINGS)[number];

export type WebVitalPayload = {
  metric: WebVitalMetric;
  value: number;
  rating: WebVitalRating;
  route: string;
  navigationType?: string | null;
  deviceType?: string | null;
  connectionType?: string | null;
};

export function normalizeWebVitalRoute(value: string) {
  const pathname = value.split("?")[0]?.trim() || "/";
  const normalized = pathname
    .replace(/\/posts\/[^/]+\/guest\b/, "/posts/[id]/guest")
    .replace(/\/posts\/(?!\[id\])[^/]+$/u, "/posts/[id]")
    .replace(/\/users\/[^/]+$/u, "/users/[id]")
    .replace(/\/notifications\/redirect\/[^/]+$/u, "/notifications/redirect/[id]")
    .replace(/\/media\/.+$/, "/media/[path]")
    .replace(/\/sitemap\/[^/]+\.xml\b/, "/sitemap/[id].xml");

  return normalized.length > 128 ? normalized.slice(0, 128) : normalized;
}

export function getWebVitalRating(metric: WebVitalMetric, value: number): WebVitalRating {
  const thresholds: Record<WebVitalMetric, [number, number]> = {
    LCP: [2500, 4000],
    INP: [200, 500],
    CLS: [0.1, 0.25],
    FCP: [1800, 3000],
    TTFB: [800, 1800],
  };
  const [good, needsImprovement] = thresholds[metric];
  if (value <= good) {
    return "GOOD";
  }
  if (value <= needsImprovement) {
    return "NEEDS_IMPROVEMENT";
  }
  return "POOR";
}

export function isWebVitalsTelemetryEnabled() {
  if (process.env.NEXT_PUBLIC_ENABLE_WEB_VITALS === "0") {
    return false;
  }

  return (
    process.env.NODE_ENV === "production" ||
    process.env.NEXT_PUBLIC_ENABLE_WEB_VITALS === "1" ||
    process.env.NEXT_PUBLIC_ENABLE_CLIENT_TELEMETRY === "1"
  );
}
