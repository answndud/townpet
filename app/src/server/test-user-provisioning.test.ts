import { describe, expect, it } from "vitest";

import { registerSchema } from "@/lib/validations/auth";
import {
  TEST_USER_PROVISION_CONFIRM_VALUE,
  generateProvisionTestUserCredentials,
  resolveProvisionTestUsersConfig,
} from "@/server/test-user-provisioning";

function makeTestEnv(values: Record<string, string | undefined>): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NODE_ENV: "test",
    ...values,
  };
}

describe("resolveProvisionTestUsersConfig", () => {
  it("rejects production-like configuration without explicit confirmation", () => {
    expect(() =>
      resolveProvisionTestUsersConfig(
        makeTestEnv({
        DATABASE_URL: "postgresql://prod-user:pw@db.example.com:5432/townpet",
        TEST_USER_EMAIL_DOMAIN: "qa-login.example.com",
        }),
      ),
    ).toThrow(
      `TEST_USER_PROVISION_CONFIRM=${TEST_USER_PROVISION_CONFIRM_VALUE} is required for non-local database provisioning.`,
    );
  });

  it("accepts production-like configuration when explicit confirmation is present", () => {
    expect(
      resolveProvisionTestUsersConfig(
        makeTestEnv({
        DATABASE_URL: "postgresql://prod-user:pw@db.example.com:5432/townpet",
        TEST_USER_PROVISION_CONFIRM: TEST_USER_PROVISION_CONFIRM_VALUE,
        TEST_USER_EMAIL_DOMAIN: "qa-login.example.com",
        TEST_USER_COUNT: "3",
        TEST_USER_OUTPUT_FILE: "/tmp/townpet-qa-users.json",
        }),
      ),
    ).toEqual({
      databaseUrl: "postgresql://prod-user:pw@db.example.com:5432/townpet",
      count: 3,
      emailDomain: "qa-login.example.com",
      outputFile: "/tmp/townpet-qa-users.json",
    });
  });

  it("accepts local database urls without production confirmation", () => {
    expect(
      resolveProvisionTestUsersConfig(
        makeTestEnv({
        DATABASE_URL: "postgresql://townpet:townpet@localhost:5432/townpet",
        TEST_USER_EMAIL_DOMAIN: "qa-login.example.com",
        }),
      ),
    ).toMatchObject({
      databaseUrl: "postgresql://townpet:townpet@localhost:5432/townpet",
      count: 4,
      emailDomain: "qa-login.example.com",
    });
  });
});

describe("generateProvisionTestUserCredentials", () => {
  it("creates unique credentials that satisfy register password policy", () => {
    const credentials = generateProvisionTestUserCredentials({
      count: 4,
      emailDomain: "qa-login.example.com",
    });

    expect(credentials).toHaveLength(4);
    expect(new Set(credentials.map((credential) => credential.email)).size).toBe(4);
    expect(new Set(credentials.map((credential) => credential.nickname)).size).toBe(4);

    for (const credential of credentials) {
      expect(credential.email).toMatch(/^[a-z][a-z0-9]{19}@qa-login\.example\.com$/);
      expect(
        registerSchema.safeParse({
          email: credential.email,
          nickname: credential.nickname,
          password: credential.password,
        }).success,
      ).toBe(true);
      expect(/(.)\1{3,}/.test(credential.password)).toBe(false);
    }
  });

  it("avoids collisions with existing emails and nicknames", () => {
    const credentials = generateProvisionTestUserCredentials({
      count: 3,
      emailDomain: "qa-login.example.com",
      existingEmails: ["taken@qa-login.example.com"],
      existingNicknames: ["maru-ab123", "bori-cd456"],
    });

    expect(credentials.every((credential) => credential.email !== "taken@qa-login.example.com")).toBe(
      true,
    );
    expect(credentials.every((credential) => credential.nickname !== "maru-ab123")).toBe(true);
    expect(credentials.every((credential) => credential.nickname !== "bori-cd456")).toBe(true);
  });
});
