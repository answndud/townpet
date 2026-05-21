"use client";

import type { AcquisitionEventInput } from "@/lib/acquisition-events";
import { isClientTelemetryEnabled } from "@/lib/client-telemetry";

export async function sendAcquisitionEvent(input: AcquisitionEventInput) {
  if (!isClientTelemetryEnabled() || typeof window === "undefined") {
    return;
  }

  await fetch("/api/acquisition/events", {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
    cache: "no-store",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  }).catch(() => undefined);
}
