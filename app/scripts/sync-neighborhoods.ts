import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";

import { Prisma, PrismaClient } from "@prisma/client";

type NeighborhoodSeed = {
  name: string;
  city: string;
  district: string;
};

const CHUNK_SIZE = 500;
const CHUNK_RETRY_MAX = 3;
const CHUNK_RETRY_DELAY_MS = 1500;

type SyncNeighborhoodsPrisma = {
  neighborhood: {
    count(): Promise<number>;
    createMany(params: {
      data: NeighborhoodSeed[];
      skipDuplicates: true;
    }): Promise<{ count: number }>;
  };
  $disconnect(): Promise<void>;
};

type SyncNeighborhoodsResult = {
  processed: number;
  existing: number;
  inserted: number;
  total: number;
};

type SyncNeighborhoodsDeps = {
  loadSeeds?: () => Promise<NeighborhoodSeed[]>;
  sleep?: (ms: number) => Promise<void>;
  logger?: Pick<Console, "log" | "warn">;
  chunkSize?: number;
  retryMax?: number;
  retryDelayMs?: number;
};

function isTransientDbError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ["P1001", "P1002", "P1003", "P1011"].includes(error.code);
  }
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return true;
  }
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return true;
  }
  return false;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loadNeighborhoodSeeds() {
  const filePath = path.join(process.cwd(), "scripts", "data", "korean-neighborhoods.json");
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as NeighborhoodSeed[];

  return parsed
    .map((item) => ({
      name: item.name.trim(),
      city: item.city.trim(),
      district: item.district.trim(),
    }))
    .filter(
      (item) =>
        item.name.length > 0 &&
        item.city.length > 0 &&
        item.district.length > 0,
    );
}

export function formatSyncNeighborhoodsOutput(result: SyncNeighborhoodsResult) {
  return `[sync-neighborhoods] processed=${result.processed} existing=${result.existing} inserted=${result.inserted} total=${result.total}`;
}

export async function runSyncNeighborhoods(
  prisma: SyncNeighborhoodsPrisma,
  deps: SyncNeighborhoodsDeps = {},
): Promise<SyncNeighborhoodsResult> {
  const loadSeeds = deps.loadSeeds ?? loadNeighborhoodSeeds;
  const sleepFn = deps.sleep ?? sleep;
  const logger = deps.logger ?? console;
  const chunkSize = deps.chunkSize ?? CHUNK_SIZE;
  const retryMax = deps.retryMax ?? CHUNK_RETRY_MAX;
  const retryDelayMs = deps.retryDelayMs ?? CHUNK_RETRY_DELAY_MS;
  const existingCount = await prisma.neighborhood.count().catch(() => 0);

  const seeds = await loadSeeds();
  if (seeds.length === 0) {
    throw new Error("Neighborhood seed data is empty.");
  }

  let insertedCount = 0;

  for (let index = 0; index < seeds.length; index += chunkSize) {
    const chunk = seeds.slice(index, index + chunkSize);
    for (let attempt = 1; attempt <= retryMax; attempt += 1) {
      try {
        const result = await prisma.neighborhood.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        insertedCount += result.count;
        break;
      } catch (error) {
        if (isTransientDbError(error) && attempt < retryMax) {
          logger.warn(
            `[sync-neighborhoods] transient error on chunk ${index}-${index + chunk.length}. Retry ${attempt}/${retryMax}`,
          );
          await sleepFn(retryDelayMs * attempt);
          continue;
        }
        throw error;
      }
    }
  }

  const finalCount = await prisma.neighborhood.count();

  return {
    processed: seeds.length,
    existing: existingCount,
    inserted: insertedCount,
    total: finalCount,
  };
}

export async function main(
  prisma: SyncNeighborhoodsPrisma = new PrismaClient(),
  deps: SyncNeighborhoodsDeps = {},
) {
  try {
    const result = await runSyncNeighborhoods(prisma, deps);
    const output = formatSyncNeighborhoodsOutput(result);
    (deps.logger ?? console).log(output);
    return output;
  } finally {
    await prisma.$disconnect();
  }
}

if (
  process.env.NODE_ENV !== "test" &&
  process.argv[1]?.endsWith("sync-neighborhoods.ts")
) {
  const prisma = new PrismaClient();
  main(prisma)
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
