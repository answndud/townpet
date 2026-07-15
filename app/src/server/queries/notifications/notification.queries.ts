// Compatibility entrypoint. Read implementations live in notification-read.queries.ts;
// mutations live in the notification write service and are re-exported only for legacy imports.
export * from "./notification-read.queries";
export * from "@/server/services/notifications/notification-write.service";
