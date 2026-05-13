const ENABLED_VALUE = "1";

export function isClientTelemetryEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_CLIENT_TELEMETRY === ENABLED_VALUE;
}
