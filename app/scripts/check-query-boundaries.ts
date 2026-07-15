import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const WRITE_CALL_PATTERN = /\b(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/;
const TRANSACTION_PATTERN = /\$transaction\s*\(/;

async function listQueryFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) return listQueryFiles(filePath);
      return entry.isFile() && /\.ts$/.test(entry.name) && !entry.name.endsWith(".test.ts")
        ? [filePath]
        : [];
    }),
  );
  return files.flat().sort();
}

export function findViolations(source: string, filePath: string) {
  return source.split("\n").flatMap((line, index) => {
    const isPrismaWrite = /\b(?:prisma|tx|transaction)\b/.test(line) && WRITE_CALL_PATTERN.test(line);
    const isTransaction = TRANSACTION_PATTERN.test(line);
    if (!isPrismaWrite && !isTransaction) return [];
    return [{ filePath, line: index + 1, source: line.trim() }];
  });
}

export async function checkQueryBoundaries(queryRoot = path.join(process.cwd(), "src/server/queries")) {
  const files = await listQueryFiles(queryRoot);
  const violations = (await Promise.all(
    files.map(async (filePath) => findViolations(await readFile(filePath, "utf8"), filePath)),
  )).flat();

  if (violations.length > 0) {
    console.error("Query boundary violation: read-only query files contain a write or transaction call.");
    for (const violation of violations) {
      console.error(`${violation.filePath}:${violation.line}: ${violation.source}`);
    }
    return false;
  }

  console.log(`Query boundary check passed (${files.length} files).`);
  return true;
}

async function main() {
  const passed = await checkQueryBoundaries();
  process.exit(passed ? 0 : 1);
}

if (process.argv[1]?.endsWith("check-query-boundaries.ts")) {
  void main();
}
