import { PostStatus, PostType, UserRole } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  PUBLIC_SMOKE_FIXTURE_CONFIRM_ENV_KEY,
  PUBLIC_SMOKE_FIXTURE_CONFIRM_VALUE,
  PUBLIC_SMOKE_FIXTURE_DRAFTS,
  formatPublishPublicSmokeFixtureResult,
  main,
  publishPublicSmokeFixtures,
} from "./publish-public-smoke-fixtures";

function createMockPrisma(params: {
  existing?: Array<{ id: string; title: string; type: PostType }>;
  createdIds?: string[];
}) {
  const created: Array<{ data: Record<string, unknown> & { title: string; type: PostType }; select: unknown }> = [];
  const disconnect = vi.fn().mockResolvedValue(undefined);

  return {
    user: {
      findFirst: async () => ({
        id: "admin-1",
        nickname: "townpet-admin",
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
    $disconnect: disconnect,
    __created: created,
    __disconnect: disconnect,
  };
}

describe("publish public smoke fixtures", () => {
  const env: NodeJS.ProcessEnv = {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://user:pass@localhost:5432/townpet",
    [PUBLIC_SMOKE_FIXTURE_CONFIRM_ENV_KEY]: PUBLIC_SMOKE_FIXTURE_CONFIRM_VALUE,
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dry-runs all fixtures without creating posts by default", async () => {
    const prisma = createMockPrisma({});
    const result = await publishPublicSmokeFixtures({
      prisma: prisma as never,
      env,
    });

    expect(result.status).toBe("DRY_RUN");
    expect(result.created).toHaveLength(PUBLIC_SMOKE_FIXTURE_DRAFTS.length);
    expect(prisma.__created).toHaveLength(0);
    expect(formatPublishPublicSmokeFixtureResult(result)).toContain("status: DRY_RUN");
  });

  it("creates lost-found and market fixtures with required structured relations", async () => {
    const prisma = createMockPrisma({});
    const result = await publishPublicSmokeFixtures({
      prisma: prisma as never,
      env: {
        ...env,
        PUBLIC_SMOKE_FIXTURE_APPLY: "1",
      },
    });

    expect(result.status).toBe("APPLIED");
    expect(prisma.__created).toHaveLength(2);
    expect(prisma.__created[0].data).toMatchObject({
      status: PostStatus.ACTIVE,
      type: PostType.LOST_FOUND,
      lostFoundAlert: {
        create: {
          petType: "강아지",
          lastSeenLocation: "공개 기준 예시 지역",
        },
      },
    });
    expect(prisma.__created[1].data).toMatchObject({
      status: PostStatus.ACTIVE,
      type: PostType.MARKET_LISTING,
      marketListing: {
        create: {
          price: 0,
        },
      },
    });
  });

  it("skips existing fixture titles", async () => {
    const prisma = createMockPrisma({
      existing: [
        {
          id: "existing-1",
          title: PUBLIC_SMOKE_FIXTURE_DRAFTS[0].title,
          type: PUBLIC_SMOKE_FIXTURE_DRAFTS[0].type,
        },
      ],
    });
    const result = await publishPublicSmokeFixtures({
      prisma: prisma as never,
      env: {
        ...env,
        PUBLIC_SMOKE_FIXTURE_APPLY: "1",
      },
    });

    expect(result.skipped).toHaveLength(1);
    expect(result.created).toHaveLength(1);
    expect(prisma.__created[0].data.title).toBe(PUBLIC_SMOKE_FIXTURE_DRAFTS[1].title);
  });

  it("prints the formatted result and disconnects through main", async () => {
    const prisma = createMockPrisma({});
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const output = await main(prisma as never, env);

    expect(output).toContain("Public smoke fixture publishing");
    expect(output).toContain("status: DRY_RUN");
    expect(log).toHaveBeenCalledWith(output);
    expect(prisma.__disconnect).toHaveBeenCalledOnce();
  });
});
