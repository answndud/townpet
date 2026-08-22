import { describe, expect, it } from "vitest";

import { resolveBackupOutputDir, validateBackupEnv } from "./backup-local";

describe("local encrypted backup", () => {
  it("requires a database URL and age recipient for backup", () => {
    expect(validateBackupEnv({})).toEqual([
      "DATABASE_URL is required",
      "BACKUP_AGE_RECIPIENT is required",
    ]);
  });

  it("requires an age identity for restore verification", () => {
    expect(validateBackupEnv({ DATABASE_URL: "postgres://db" }, "verify")).toEqual([
      "BACKUP_AGE_IDENTITY_FILE is required",
    ]);
  });

  it("defaults backups outside the repository app directory", () => {
    expect(resolveBackupOutputDir({})).toMatch(/townpet\/backups$/);
  });
});
