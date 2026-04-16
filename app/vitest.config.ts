import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      exclude: [
        "src/lib/notification-unread-sync.ts",
        "src/lib/validations/auth.ts",
        "src/lib/validations/direct-moderation.ts",
        "src/lib/validations/policy.ts",
        "src/lib/validations/post.ts",
        "src/lib/validations/report-bulk.ts",
        "src/lib/validations/report-update.ts",
        "src/lib/validations/report.ts",
        "src/server/actions/notification.ts",
        "src/server/queries/notification.queries.ts",
        "src/server/queries/policy.queries.ts",
        "src/server/queries/post.queries.ts",
        "src/server/queries/report.queries.ts",
        "src/server/queries/sanction.queries.ts",
        "src/server/services/auth.service.ts",
        "src/server/services/direct-moderation.service.ts",
        "src/server/services/guest-safety.service.ts",
        "src/server/services/notification.service.ts",
        "src/server/services/policy.service.ts",
        "src/server/services/post-read-access.service.ts",
        "src/server/services/post.service.ts",
        "src/server/services/report.service.ts",
        "src/server/services/sanction.service.ts",
      ],
      thresholds: {
        statements: 66,
        branches: 56,
        functions: 67,
        lines: 66,
      },
    },
  },
});
