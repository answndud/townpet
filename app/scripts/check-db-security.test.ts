import { describe, expect, it } from "vitest"

import { validateDatabaseSecuritySnapshot } from "./check-db-security"

const secureSnapshot = {
  currentUser: "townpet_app",
  isSuperuser: false,
  canCreateRole: false,
  publicSchemaCreateGranted: false,
  tablesWithoutRls: [],
}

describe("database security preflight", () => {
  it("passes a least-privilege role when RLS is not required by the deployment", () => {
    expect(validateDatabaseSecuritySnapshot(secureSnapshot)).toEqual([])
  })

  it("rejects elevated roles and unexpected role drift", () => {
    expect(validateDatabaseSecuritySnapshot({
      ...secureSnapshot,
      currentUser: "postgres",
      isSuperuser: true,
      canCreateRole: true,
      publicSchemaCreateGranted: true,
    }, { DB_SECURITY_EXPECTED_ROLE: "townpet_app" })).toEqual([
      "current role postgres does not match DB_SECURITY_EXPECTED_ROLE",
      "application role is a superuser",
      "application role can create database roles",
      "application role can create objects in public schema",
    ])
  })

  it("can enforce RLS as an explicit production gate", () => {
    expect(validateDatabaseSecuritySnapshot({
      ...secureSnapshot,
      tablesWithoutRls: ["Post", "User"],
    }, { DB_SECURITY_REQUIRE_RLS: "1" })).toEqual([
      "RLS is not enabled for: Post, User",
    ])
  })
})
