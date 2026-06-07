import { describe, expect, it } from "vitest";

import {
  formatNotificationDeliveryRetryOutput,
  readPositiveInt,
} from "./retry-notification-deliveries";

describe("notification delivery retry CLI wrapper", () => {
  it("uses the fallback positive integer when not configured", () => {
    expect(readPositiveInt("NOTIFICATION_OUTBOX_RETRY_LIMIT", 50, undefined)).toBe(50);
  });

  it("rejects invalid positive integers", () => {
    expect(() => readPositiveInt("NOTIFICATION_OUTBOX_RETRY_LIMIT", 50, "0")).toThrow(
      "NOTIFICATION_OUTBOX_RETRY_LIMIT must be a positive integer.",
    );
    expect(() => readPositiveInt("NOTIFICATION_OUTBOX_RETRY_LIMIT", 50, "1.5")).toThrow(
      "NOTIFICATION_OUTBOX_RETRY_LIMIT must be a positive integer.",
    );
  });

  it("formats dry-run output as JSON without retry results", () => {
    expect(
      formatNotificationDeliveryRetryOutput({
        mode: "dry-run",
        limit: 50,
        before: {
          pending: 3,
          failed: 2,
          due: 4,
          checkedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      }),
    ).toBe(
      [
        "{",
        '  "mode": "dry-run",',
        '  "limit": 50,',
        '  "before": {',
        '    "pending": 3,',
        '    "failed": 2,',
        '    "due": 4,',
        '    "checkedAt": "2026-01-01T00:00:00.000Z"',
        "  }",
        "}",
      ].join("\n"),
    );
  });

  it("formats apply output with retry result and after stats", () => {
    expect(
      formatNotificationDeliveryRetryOutput({
        mode: "retry",
        limit: 50,
        before: {
          pending: 3,
          failed: 2,
          due: 4,
          checkedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
        result: {
          scanned: 2,
          delivered: 1,
          failed: 1,
          skipped: 0,
          deliveryIds: {
            delivered: ["delivery-ok"],
            failed: ["delivery-failed"],
            skipped: [],
          },
        },
        after: {
          pending: 1,
          failed: 1,
          due: 1,
          checkedAt: new Date("2026-01-01T00:01:00.000Z"),
        },
      }),
    ).toBe(
      [
        "{",
        '  "mode": "retry",',
        '  "limit": 50,',
        '  "before": {',
        '    "pending": 3,',
        '    "failed": 2,',
        '    "due": 4,',
        '    "checkedAt": "2026-01-01T00:00:00.000Z"',
        "  },",
        '  "result": {',
        '    "scanned": 2,',
        '    "delivered": 1,',
        '    "failed": 1,',
        '    "skipped": 0,',
        '    "deliveryIds": {',
        '      "delivered": [',
        '        "delivery-ok"',
        "      ],",
        '      "failed": [',
        '        "delivery-failed"',
        "      ],",
        '      "skipped": []',
        "    }",
        "  },",
        '  "after": {',
        '    "pending": 1,',
        '    "failed": 1,',
        '    "due": 1,',
        '    "checkedAt": "2026-01-01T00:01:00.000Z"',
        "  }",
        "}",
      ].join("\n"),
    );
  });
});
