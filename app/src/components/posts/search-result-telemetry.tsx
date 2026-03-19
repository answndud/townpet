"use client";

import { useEffect } from "react";
import type { PostType } from "@prisma/client";

type SearchResultTelemetryProps = {
  query: string;
  resultCount: number;
  scope?: "LOCAL" | "GLOBAL";
  type?: PostType | null;
  searchIn?: "ALL" | "TITLE" | "CONTENT" | "AUTHOR";
};

const SEARCH_RESULT_TELEMETRY_PREFIX = "townpet:search-result-telemetry:v1:";

function normalizeSearchQuery(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < 2 || normalized.length > 100) {
    return null;
  }
  return normalized;
}

export function SearchResultTelemetry({
  query,
  resultCount,
  scope,
  type,
  searchIn = "ALL",
}: SearchResultTelemetryProps) {
  useEffect(() => {
    const normalizedQuery = normalizeSearchQuery(query);
    if (!normalizedQuery || typeof window === "undefined") {
      return;
    }

    const safeResultCount = Math.min(Math.max(Math.floor(resultCount), 0), 500);
    const key = `${SEARCH_RESULT_TELEMETRY_PREFIX}${scope ?? "GLOBAL"}:${type ?? "ALL"}:${searchIn}:${normalizedQuery}:${safeResultCount}`;
    if (window.sessionStorage.getItem(key) === "1") {
      return;
    }

    window.sessionStorage.setItem(key, "1");
    const payload = JSON.stringify({
      q: normalizedQuery,
      stage: "RESULT",
      resultCount: safeResultCount,
      scope,
      type,
      searchIn,
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/search/log", blob);
      return;
    }

    void fetch("/api/search/log", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      credentials: "same-origin",
      body: payload,
      keepalive: true,
    });
  }, [query, resultCount, scope, type, searchIn]);

  return null;
}
