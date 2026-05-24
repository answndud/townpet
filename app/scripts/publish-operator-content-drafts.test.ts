import { PostStatus, PostType, UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  OPERATOR_CONTENT_DRAFTS,
  OPERATOR_CONTENT_PUBLISH_CONFIRM_ENV_KEY,
  OPERATOR_CONTENT_PUBLISH_CONFIRM_VALUE,
  formatPublishOperatorContentResult,
  publishOperatorContentDrafts,
} from "./publish-operator-content-drafts";

function createMockPrisma(params: {
  existing?: Array<{ id: string; title: string; type: PostType }>;
  createdIds?: string[];
}) {
  const created: Array<{ data: Record<string, unknown> & { title: string; type: PostType }; select: unknown }> = [];

  return {
    user: {
      findFirst: async () => ({
        id: "admin-1",
        nickname: "ops-admin",
        role: UserRole.ADMIN,
      }),
    },
    post: {
      findMany: async () => params.existing ?? [],
      create: (input: {
        data: Record<string, unknown> & { title: string; type: PostType };
        select: unknown;
      }) => {
        created.push(input);
        return async () => ({
          id: params.createdIds?.[created.length - 1] ?? `post-${created.length}`,
          title: input.data.title,
          type: input.data.type,
        });
      },
    },
    $transaction: async (operations: Array<() => Promise<{ id: string; title: string; type: PostType }>>) =>
      Promise.all(operations.map((operation) => operation())),
    __created: created,
  };
}

describe("publish operator content drafts", () => {
  const env: NodeJS.ProcessEnv = {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://user:pass@localhost:5432/townpet",
    [OPERATOR_CONTENT_PUBLISH_CONFIRM_ENV_KEY]: OPERATOR_CONTENT_PUBLISH_CONFIRM_VALUE,
  };

  it("dry-runs all drafts without creating posts by default", async () => {
    const prisma = createMockPrisma({});
    const result = await publishOperatorContentDrafts({
      prisma: prisma as never,
      env,
    });

    expect(result.status).toBe("DRY_RUN");
    expect(result.created).toHaveLength(OPERATOR_CONTENT_DRAFTS.length);
    expect(prisma.__created).toHaveLength(0);
    expect(formatPublishOperatorContentResult(result)).toContain("status: DRY_RUN");
  });

  it("skips existing operator-content titles", async () => {
    const prisma = createMockPrisma({
      existing: [
        {
          id: "existing-1",
          title: OPERATOR_CONTENT_DRAFTS[0].title,
          type: OPERATOR_CONTENT_DRAFTS[0].type,
        },
      ],
    });
    const result = await publishOperatorContentDrafts({
      prisma: prisma as never,
      env: {
        ...env,
        OPERATOR_CONTENT_PUBLISH_APPLY: "1",
      },
    });

    expect(result.status).toBe("APPLIED");
    expect(result.skipped).toHaveLength(1);
    expect(result.created).toHaveLength(OPERATOR_CONTENT_DRAFTS.length - 1);
    expect(prisma.__created[0].data.title).toBe(OPERATOR_CONTENT_DRAFTS[1].title);
  });

  it("marks walk route drafts with structured walk route data", async () => {
    const prisma = createMockPrisma({});
    await publishOperatorContentDrafts({
      prisma: prisma as never,
      env: {
        ...env,
        OPERATOR_CONTENT_PUBLISH_APPLY: "1",
      },
    });

    const walkCreates = prisma.__created.filter((entry) => entry.data.type === PostType.WALK_ROUTE);
    expect(walkCreates).toHaveLength(2);
    expect(walkCreates[0].data).toMatchObject({
      status: PostStatus.ACTIVE,
      walkRoute: {
        create: {
          coordinates: [],
        },
      },
    });
  });
});
