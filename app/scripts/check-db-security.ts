import "dotenv/config"

import { prisma } from "@/lib/prisma"

type DatabaseSecurityClient = {
  $queryRaw<T>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>
}

export type DatabaseSecuritySnapshot = {
  currentUser: string
  isSuperuser: boolean
  canCreateRole: boolean
  publicSchemaCreateGranted: boolean
  tablesWithoutRls: string[]
}

type DatabaseSecurityEnv = {
  DB_SECURITY_EXPECTED_ROLE?: string
  DB_SECURITY_REQUIRE_RLS?: string
}

type RoleRow = {
  current_user: string
  rolsuper: boolean
  rolcreaterole: boolean
}

type GrantRow = { has_schema_privilege: boolean }
type TableRow = { table_name: string }

const RLS_REQUIRED_TABLES = [
  "User",
  "Account",
  "Session",
  "Post",
  "Comment",
  "Report",
  "Sanction",
  "UploadAsset",
]

export async function readDatabaseSecuritySnapshot(
  client: DatabaseSecurityClient,
): Promise<DatabaseSecuritySnapshot> {
  const [roleRows, grantRows, tableRows] = await Promise.all([
    client.$queryRaw<RoleRow[]>`SELECT current_user, rolsuper, rolcreaterole FROM pg_roles WHERE rolname = current_user`,
    client.$queryRaw<GrantRow[]>`SELECT has_schema_privilege(current_user, 'public', 'CREATE') AS has_schema_privilege`,
    client.$queryRaw<TableRow[]>`
      SELECT c.relname AS table_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND c.relname = ANY(${RLS_REQUIRED_TABLES})
        AND NOT c.relrowsecurity
      ORDER BY c.relname
    `,
  ])

  const role = roleRows[0]
  if (!role) throw new Error("Unable to inspect current database role")

  return {
    currentUser: role.current_user,
    isSuperuser: role.rolsuper,
    canCreateRole: role.rolcreaterole,
    publicSchemaCreateGranted: grantRows[0]?.has_schema_privilege ?? false,
    tablesWithoutRls: tableRows.map((row) => row.table_name),
  }
}

export function validateDatabaseSecuritySnapshot(
  snapshot: DatabaseSecuritySnapshot,
  env: DatabaseSecurityEnv = process.env as DatabaseSecurityEnv,
) {
  const expectedRole = env.DB_SECURITY_EXPECTED_ROLE?.trim()
  const requireRls = env.DB_SECURITY_REQUIRE_RLS === "1"
  const failures: string[] = []

  if (expectedRole && snapshot.currentUser !== expectedRole) {
    failures.push(`current role ${snapshot.currentUser} does not match DB_SECURITY_EXPECTED_ROLE`)
  }
  if (snapshot.isSuperuser) failures.push("application role is a superuser")
  if (snapshot.canCreateRole) failures.push("application role can create database roles")
  if (snapshot.publicSchemaCreateGranted) failures.push("application role can create objects in public schema")
  if (requireRls && snapshot.tablesWithoutRls.length > 0) {
    failures.push(`RLS is not enabled for: ${snapshot.tablesWithoutRls.join(", ")}`)
  }

  return failures
}

async function main() {
  const snapshot = await readDatabaseSecuritySnapshot(prisma)
  const failures = validateDatabaseSecuritySnapshot(snapshot)

  console.log(JSON.stringify({
    status: failures.length === 0 ? "PASS" : "FAIL",
    ...snapshot,
    failures,
  }, null, 2))

  if (failures.length > 0) process.exitCode = 1
}

if (process.argv[1]?.endsWith("check-db-security.ts")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }).finally(() => prisma.$disconnect())
}
