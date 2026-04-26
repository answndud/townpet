import { describe, expect, it } from "vitest";

import { summarizeCareDemoSeed } from "@/../scripts/seed-care-demo";

describe("care demo seed summary", () => {
  it("marks issue queue coverage when feedback rows exist", () => {
    expect(
      summarizeCareDemoSeed({
        posts: 3,
        requests: 3,
        applications: 2,
        feedbacks: 1,
      }),
    ).toEqual({
      posts: 3,
      requests: 3,
      applications: 2,
      feedbacks: 1,
      hasIssueQueueCase: true,
    });
  });

  it("does not claim issue queue coverage without feedback rows", () => {
    expect(
      summarizeCareDemoSeed({
        posts: 1,
        requests: 1,
        applications: 0,
        feedbacks: 0,
      }).hasIssueQueueCase,
    ).toBe(false);
  });
});
