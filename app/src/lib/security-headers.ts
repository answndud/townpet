type CspPolicyParams = {
  scriptSrc: string;
  styleSrc?: string;
  connectSrc: string;
  includeUnsafeEval: boolean;
};

type ResolveCspHeadersParams = {
  nodeEnv?: string;
  cspEnforceStrict?: string;
  nonce?: string;
};

type StaticSecurityHeadersParams = Pick<ResolveCspHeadersParams, "nodeEnv">;

const PERMISSIONS_POLICY = "camera=(), geolocation=(), microphone=()";
const HSTS_HEADER_VALUE = "max-age=31536000";
const STRICT_STYLE_HASHES = [
  `'sha256-zlqnbDt84zf1iSefLU/ImC54isoprH/MRiVZGskwexk='`,
  `'sha256-32t0bJPIyxns/QqsW8RE3JGUERKnHL5RygHBgJvEanc='`,
];

function buildCspPolicy(params: CspPolicyParams) {
  const scriptSrc = params.includeUnsafeEval
    ? `${params.scriptSrc} 'unsafe-eval'`
    : params.scriptSrc;

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    `script-src ${scriptSrc}`,
    `style-src ${params.styleSrc ?? "'self' 'unsafe-inline'"}`,
    `connect-src ${params.connectSrc}`,
    "report-uri /api/security/csp-report",
  ].join("; ");
}

export function isStrictCspEnforced(value?: string) {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function buildNonceScriptSrc(nonce: string, isStrict: boolean) {
  const strictSources = [`'self'`, `'nonce-${nonce}'`];
  if (isStrict) {
    return [...strictSources, `'strict-dynamic'`].join(" ");
  }

  return [...strictSources, `'unsafe-inline'`].join(" ");
}

function buildNonceStyleSrc(nonce: string, isStrict: boolean) {
  if (isStrict) {
    return [`'self'`, `'nonce-${nonce}'`, `'unsafe-hashes'`, ...STRICT_STYLE_HASHES].join(" ");
  }

  return `'self' 'nonce-${nonce}' 'unsafe-inline'`;
}

function buildStrictNonceEnforcedPolicy(nonce: string) {
  return buildCspPolicy({
    scriptSrc: buildNonceScriptSrc(nonce, true),
    styleSrc: buildNonceStyleSrc(nonce, true),
    connectSrc: "'self' https:",
    includeUnsafeEval: false,
  });
}

function buildStrictNonceReportOnlyPolicy(nonce: string) {
  return buildCspPolicy({
    scriptSrc: buildNonceScriptSrc(nonce, true),
    styleSrc: buildNonceStyleSrc(nonce, true),
    connectSrc: "'self' https:",
    includeUnsafeEval: false,
  });
}

function buildStaticScriptSrc(isDevelopment: boolean) {
  if (isDevelopment) {
    return `'self' 'unsafe-inline' http: https:`;
  }

  // Fallback for middleware incidents: weaker than nonce CSP, but safer than no CSP.
  return `'self' 'unsafe-inline'`;
}

export function resolveCspHeaders(params: ResolveCspHeadersParams) {
  const isProduction = params.nodeEnv === "production";
  const enforceStrictCsp = isStrictCspEnforced(params.cspEnforceStrict);
  const nonce = params.nonce?.trim();

  if (!nonce) {
    return {
      csp: buildStaticSecurityHeaders(params).find(
        (header) => header.key === "Content-Security-Policy",
      )?.value ?? "",
      cspReportOnly: null,
    };
  }

  if (!isProduction) {
    return {
      csp: buildCspPolicy({
        scriptSrc: `${buildNonceScriptSrc(nonce, false)} http: https:`,
        styleSrc: buildNonceStyleSrc(nonce, false),
        connectSrc: "'self' https: http: ws: wss:",
        includeUnsafeEval: true,
      }),
      cspReportOnly: null,
    };
  }

  if (enforceStrictCsp) {
    return {
      csp: buildStrictNonceEnforcedPolicy(nonce),
      cspReportOnly: null,
    };
  }

  const staticProductionCsp = buildStaticSecurityHeaders({
    nodeEnv: params.nodeEnv,
  }).find((header) => header.key === "Content-Security-Policy")?.value ?? "";
  const strictReportOnlyCsp = buildStrictNonceReportOnlyPolicy(nonce);

  return {
    csp: staticProductionCsp,
    cspReportOnly: strictReportOnlyCsp,
  };
}

export function buildStaticSecurityHeaders(params: StaticSecurityHeadersParams) {
  const isDevelopment = params.nodeEnv !== "production";
  const csp = buildCspPolicy({
    scriptSrc: buildStaticScriptSrc(isDevelopment),
    connectSrc: isDevelopment ? "'self' https: http: ws: wss:" : "'self' https:",
    includeUnsafeEval: isDevelopment,
  });

  return [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
    ...(isDevelopment
      ? []
      : [{ key: "Strict-Transport-Security", value: HSTS_HEADER_VALUE }]),
    { key: "Content-Security-Policy", value: csp },
  ];
}
