import { describe, expect, it } from "vitest";

import {
  LOCAL_DB_SEED_CONFIRM_ENV_KEY,
  NON_LOCAL_DATABASE_CONFIRM_VALUE,
  assertDatabaseAccess,
  assertLocalDevelopmentDatabase,
  isLocalDatabaseUrl,
} from "@/server/local-database-guard";

function makeEnv(values: Record<string, string | undefined>): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NODE_ENV: "test",
    ...values,
  };
}

describe("local database guard", () => {
  it("treats loopback and docker service hosts as local", () => {
    expect(isLocalDatabaseUrl("postgresql://townpet:townpet@localhost:5432/townpet")).toBe(true);
    expect(isLocalDatabaseUrl("postgresql://townpet:townpet@127.0.0.1:5432/townpet")).toBe(true);
    expect(isLocalDatabaseUrl("postgresql://townpet:townpet@postgres:5432/townpet")).toBe(true);
    expect(isLocalDatabaseUrl("postgresql://townpet:townpet@db.example.com:5432/townpet")).toBe(
      false,
    );
  });

  it("rejects non-local local-dev operations without explicit confirmation", () => {
    expect(() =>
      assertLocalDevelopmentDatabase(
        makeEnv({
          DATABASE_URL: "postgresql://seed:pw@db.example.com:5432/townpet",
        }),
        "local restore/bootstrap",
      ),
    ).toThrow(
      `${LOCAL_DB_SEED_CONFIRM_ENV_KEY}=${NON_LOCAL_DATABASE_CONFIRM_VALUE} is required for local restore/bootstrap against a non-local database.`,
    );
  });

  it("accepts non-local access when the expected confirmation is present", () => {
    expect(
      assertDatabaseAccess({
        env: makeEnv({
          DATABASE_URL: "postgresql://seed:pw@db.example.com:5432/townpet",
          LOCAL_DB_SEED_CONFIRM: NON_LOCAL_DATABASE_CONFIRM_VALUE,
        }),
        confirmEnvKey: LOCAL_DB_SEED_CONFIRM_ENV_KEY,
        confirmValue: NON_LOCAL_DATABASE_CONFIRM_VALUE,
        operationLabel: "dummy data seeding",
      }),
    ).toBe("postgresql://seed:pw@db.example.com:5432/townpet");
  });
});
