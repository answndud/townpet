"use client";

import { useEffect } from "react";

import {
  getWebVitalRating,
  isWebVitalsTelemetryEnabled,
  normalizeWebVitalRoute,
  type WebVitalMetric,
  type WebVitalPayload,
} from "@/lib/web-vitals";

type LayoutShiftEntry = PerformanceEntry & {
  value?: number;
  hadRecentInput?: boolean;
};

type EventTimingEntry = PerformanceEntry & {
  interactionId?: number;
};

function getConnectionType() {
  const connection = (navigator as Navigator & {
    connection?: { effectiveType?: string };
  }).connection;
  return connection?.effectiveType ?? "unknown";
}

function getDeviceType() {
  if (window.matchMedia("(max-width: 767px)").matches) {
    return "mobile";
  }
  return "desktop";
}

function getNavigationType() {
  const navigation = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  return navigation?.type ?? "unknown";
}

async function sendWebVital(input: Omit<WebVitalPayload, "rating">) {
  const payload: WebVitalPayload = {
    ...input,
    rating: getWebVitalRating(input.metric, input.value),
  };

  await fetch("/api/metrics/web-vitals", {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
    cache: "no-store",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  }).catch(() => undefined);
}

export function WebVitalsReporter() {
  useEffect(() => {
    if (!isWebVitalsTelemetryEnabled()) {
      return;
    }

    const route = normalizeWebVitalRoute(window.location.pathname);
    const common = {
      route,
      navigationType: getNavigationType(),
      deviceType: getDeviceType(),
      connectionType: getConnectionType(),
    };
    const sent = new Set<WebVitalMetric>();
    let latestLcp = 0;
    let cumulativeLayoutShift = 0;
    let maxInteractionDelay = 0;
    const observers: PerformanceObserver[] = [];

    const mark = (metric: WebVitalMetric, value: number) => {
      if (!Number.isFinite(value) || value < 0 || sent.has(metric)) {
        return;
      }
      sent.add(metric);
      void sendWebVital({ metric, value, ...common });
    };

    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const latest = entries.at(-1);
        if (latest) {
          latestLcp = latest.startTime;
        }
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
      observers.push(lcpObserver);
    } catch {
      // Unsupported browsers simply skip this metric.
    }

    try {
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries() as LayoutShiftEntry[]) {
          if (!entry.hadRecentInput) {
            cumulativeLayoutShift += entry.value ?? 0;
          }
        }
      });
      clsObserver.observe({ type: "layout-shift", buffered: true });
      observers.push(clsObserver);
    } catch {
      // Unsupported browsers simply skip this metric.
    }

    try {
      const inpObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries() as EventTimingEntry[]) {
          if (entry.interactionId && entry.duration > maxInteractionDelay) {
            maxInteractionDelay = entry.duration;
          }
        }
      });
      inpObserver.observe({
        type: "event",
        buffered: true,
        durationThreshold: 40,
      } as PerformanceObserverInit);
      observers.push(inpObserver);
    } catch {
      // Unsupported browsers simply skip this metric.
    }

    const timer = window.setTimeout(() => {
      const navigation = performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined;
      const fcp = performance
        .getEntriesByType("paint")
        .find((entry) => entry.name === "first-contentful-paint");

      if (navigation) {
        mark("TTFB", navigation.responseStart);
      }
      if (fcp) {
        mark("FCP", fcp.startTime);
      }
      if (latestLcp > 0) {
        mark("LCP", latestLcp);
      }
      mark("CLS", cumulativeLayoutShift);
      if (maxInteractionDelay > 0) {
        mark("INP", maxInteractionDelay);
      }
    }, 3000);

    return () => {
      window.clearTimeout(timer);
      for (const observer of observers) {
        observer.disconnect();
      }
    };
  }, []);

  return null;
}
