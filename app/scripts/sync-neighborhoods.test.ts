import { describe, expect, it, vi } from "vitest";

import {
  formatSyncNeighborhoodsOutput,
  main,
  runSyncNeighborhoods,
} from "./sync-neighborhoods";

type NeighborhoodSeed = {
  name: string;
  city: string;
  district: string;
};

function createPrisma(params: { existing?: number; final?: number; insertedCounts?: number[] } = {}) {
  const createMany = vi.fn(async () => ({
    count: params.insertedCounts?.[createMany.mock.calls.length - 1] ?? 0,
  }));
  const count = vi
    .fn()
    .mockResolvedValueOnce(params.existing ?? 0)
    .mockResolvedValue(params.final ?? params.existing ?? 0);
  const disconnect = vi.fn().mockResolvedValue(undefined);

  return {
    neighborhood: {
      count,
      createMany,
    },
    $disconnect: disconnect,
    __count: count,
    __createMany: createMany,
    __disconnect: disconnect,
  };
}

describe("sync neighborhoods", () => {
  const seeds: NeighborhoodSeed[] = [
    { city: "서울특별시", district: "마포구", name: "망원동" },
    { city: "서울특별시", district: "마포구", name: "연남동" },
    { city: "서울특별시", district: "성동구", name: "성수동" },
  ];

  it("syncs neighborhoods in chunks with injected seeds and prisma", async () => {
    const prisma = createPrisma({ existing: 10, final: 12, insertedCounts: [2, 0] });

    const result = await runSyncNeighborhoods(prisma, {
      loadSeeds: async () => seeds,
      chunkSize: 2,
      retryMax: 1,
    });

    expect(result).toEqual({
      processed: 3,
      existing: 10,
      inserted: 2,
      total: 12,
    });
    expect(prisma.__createMany).toHaveBeenCalledTimes(2);
    expect(prisma.__createMany).toHaveBeenNthCalledWith(1, {
      data: seeds.slice(0, 2),
      skipDuplicates: true,
    });
    expect(prisma.__createMany).toHaveBeenNthCalledWith(2, {
      data: seeds.slice(2),
      skipDuplicates: true,
    });
  });

  it("fails before writing when seed data is empty", async () => {
    const prisma = createPrisma();

    await expect(
      runSyncNeighborhoods(prisma, {
        loadSeeds: async () => [],
      }),
    ).rejects.toThrow("Neighborhood seed data is empty.");

    expect(prisma.__createMany).not.toHaveBeenCalled();
  });

  it("formats a stable summary output", () => {
    expect(
      formatSyncNeighborhoodsOutput({
        processed: 3,
        existing: 10,
        inserted: 2,
        total: 12,
      }),
    ).toBe("[sync-neighborhoods] processed=3 existing=10 inserted=2 total=12");
  });

  it("prints output and disconnects through main", async () => {
    const prisma = createPrisma({ existing: 10, final: 12, insertedCounts: [2] });
    const logger = { log: vi.fn(), warn: vi.fn() };

    const output = await main(prisma, {
      loadSeeds: async () => seeds.slice(0, 2),
      logger,
    });

    expect(output).toBe("[sync-neighborhoods] processed=2 existing=10 inserted=2 total=12");
    expect(logger.log).toHaveBeenCalledWith(output);
    expect(prisma.__disconnect).toHaveBeenCalledOnce();
  });
});
