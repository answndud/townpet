"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { ComponentProps } from "react";

import type { AcquisitionEventInput } from "@/lib/acquisition-events";
import { sendAcquisitionEvent } from "@/lib/acquisition-tracking";

type AcquisitionEventTrackerProps = {
  event: AcquisitionEventInput;
};

type AcquisitionTrackedLinkProps = ComponentProps<typeof Link> & {
  event: AcquisitionEventInput;
};

export function AcquisitionEventTracker({ event }: AcquisitionEventTrackerProps) {
  useEffect(() => {
    void sendAcquisitionEvent(event);
  }, [event]);

  return null;
}

export function AcquisitionTrackedLink({
  event,
  onClick,
  ...props
}: AcquisitionTrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(clickEvent) => {
        onClick?.(clickEvent);
        if (!clickEvent.defaultPrevented) {
          void sendAcquisitionEvent(event);
        }
      }}
    />
  );
}
