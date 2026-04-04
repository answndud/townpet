import { timingSafeEqual } from "crypto";

import { getClientIp } from "@/server/request-context";

type InternalDiagnosticsRequest = Pick<Request, "headers" | "url">;

type InternalDiagnosticsAccessOptions = {
  configuredToken: string;
  isProduction: boolean;
};

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);
const LOOPBACK_IPS = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

function resolveBearerToken(authorizationHeader: string | null) {
  if (!authorizationHeader) {
    return "";
  }

  const [scheme, token] = authorizationHeader.trim().split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return "";
  }

  return token.trim();
}

function isLoopbackHostname(hostname: string) {
  const normalized = hostname.replace(/^\[(.*)\]$/, "$1").trim().toLowerCase();
  return LOOPBACK_HOSTNAMES.has(normalized);
}

function isLoopbackIp(ipAddress: string) {
  return LOOPBACK_IPS.has(ipAddress.trim().toLowerCase());
}

function hasMatchingInternalToken(providedToken: string, configuredToken: string) {
  if (!providedToken || !configuredToken) {
    return false;
  }

  const providedBuffer = Buffer.from(providedToken);
  const configuredBuffer = Buffer.from(configuredToken);
  if (providedBuffer.length !== configuredBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, configuredBuffer);
}

function isLocalNonProductionRequest(
  request: InternalDiagnosticsRequest,
  isProduction: boolean,
) {
  if (isProduction) {
    return false;
  }

  let hostname = "";
  try {
    hostname = new URL(request.url).hostname;
  } catch {
    return false;
  }

  if (!isLoopbackHostname(hostname)) {
    return false;
  }

  const clientIp = getClientIp(request);
  return clientIp === "anonymous" || isLoopbackIp(clientIp);
}

export function canAccessInternalDiagnostics(
  request: InternalDiagnosticsRequest,
  options: InternalDiagnosticsAccessOptions,
) {
  const configuredToken = options.configuredToken.trim();

  if (configuredToken) {
    const tokenFromHeader = request.headers.get("x-health-token")?.trim() ?? "";
    const tokenFromBearer = resolveBearerToken(request.headers.get("authorization"));
    const providedToken = tokenFromHeader || tokenFromBearer;

    return hasMatchingInternalToken(providedToken, configuredToken);
  }

  return isLocalNonProductionRequest(request, options.isProduction);
}
