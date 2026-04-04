import "dotenv/config"

type CheckResult = {
  key: string
  status: "PASS" | "WARN" | "FAIL"
  detail: string
}

type RemoteHealthResponse = {
  checks?: {
    controlPlane?: {
      state?: string
      checks?: Array<{
        key?: string
        state?: string
        message?: string
      }>
    }
  }
}

function read(key: string) {
  return process.env[key]?.trim() ?? ""
}

function hasTruthyFlag(value: string) {
  const normalized = value.trim().toLowerCase()
  return normalized === "1" || normalized === "true" || normalized === "yes"
}

function isLikelyWeakSecret(value: string) {
  const lower = value.toLowerCase()
  if (value.length < 32) {
    return true
  }
  if (lower.includes("dev-local-nextauth-secret")) {
    return true
  }
  if (lower.includes("changeme") || lower.includes("example") || lower.includes("test")) {
    return true
  }
  return false
}

function resolveAuthSecret() {
  return read("AUTH_SECRET") || read("NEXTAUTH_SECRET")
}

async function main() {
  const nodeEnv = read("NODE_ENV") || "development"
  const strictMode = hasTruthyFlag(read("SECURITY_ENV_STRICT"))
  const enforceProdRules = nodeEnv === "production" || strictMode
  const strictCspEnabled = hasTruthyFlag(read("CSP_ENFORCE_STRICT"))
  const results: CheckResult[] = []

  const authSecret = resolveAuthSecret()
  if (!authSecret) {
    results.push({
      key: "AUTH_SECRET_OR_NEXTAUTH_SECRET",
      status: "FAIL",
      detail: "인증 시크릿이 비어 있습니다.",
    })
  } else if (isLikelyWeakSecret(authSecret)) {
    results.push({
      key: "AUTH_SECRET_OR_NEXTAUTH_SECRET",
      status: enforceProdRules ? "FAIL" : "WARN",
      detail: "시크릿 길이/패턴이 약합니다(32자+ 랜덤 권장).",
    })
  } else {
    results.push({
      key: "AUTH_SECRET_OR_NEXTAUTH_SECRET",
      status: "PASS",
      detail: "설정됨",
    })
  }

  results.push({
    key: "CSP_RUNTIME_MODE",
    status: !enforceProdRules ? "PASS" : strictCspEnabled ? "PASS" : "WARN",
    detail: !enforceProdRules
      ? "development/test에서는 local tooling 호환을 위해 완화된 CSP가 사용됩니다."
      : strictCspEnabled
        ? "production은 strict nonce CSP를 enforce합니다. framework inline style 2종은 'unsafe-hashes' + 고정 SHA-256 hash allowlist로만 예외 허용됩니다."
      : "현재 production은 hydration-safe fallback CSP를 enforce합니다. `CSP_ENFORCE_STRICT=1`을 설정하면 `script-src`에서 `unsafe-inline`이 제거된 strict nonce CSP로 전환됩니다.",
  })

  const demoAuthFallbackEnabled = hasTruthyFlag(read("ENABLE_DEMO_AUTH_FALLBACK"))
  const demoUserEmail = read("DEMO_USER_EMAIL")
  results.push({
    key: "DEMO_AUTH_FALLBACK",
    status: enforceProdRules
      ? demoAuthFallbackEnabled
        ? "FAIL"
        : "PASS"
      : demoAuthFallbackEnabled && !demoUserEmail
        ? "WARN"
        : "PASS",
    detail: enforceProdRules
      ? demoAuthFallbackEnabled
        ? "production/strict 환경에서는 demo auth fallback을 사용할 수 없습니다."
        : "비활성화됨"
      : demoAuthFallbackEnabled
        ? demoUserEmail
          ? "비프로덕션에서 explicit opt-in으로 활성화됨"
          : "ENABLE_DEMO_AUTH_FALLBACK=1 이지만 DEMO_USER_EMAIL이 비어 있어 fallback 계정을 찾을 수 없습니다."
        : "기본 비활성화됨",
  })

  const socialDevLoginEnabled = hasTruthyFlag(read("ENABLE_SOCIAL_DEV_LOGIN"))
  results.push({
    key: "SOCIAL_DEV_LOGIN",
    status: enforceProdRules
      ? socialDevLoginEnabled
        ? "FAIL"
        : "PASS"
      : socialDevLoginEnabled
        ? "PASS"
        : "PASS",
    detail: enforceProdRules
      ? socialDevLoginEnabled
        ? "production/strict 환경에서는 개발용 소셜 로그인을 사용할 수 없습니다."
        : "비활성화됨"
      : socialDevLoginEnabled
        ? "비프로덕션에서 explicit opt-in으로 활성화됨"
        : "기본 비활성화됨",
  })

  const guestHashPepper = read("GUEST_HASH_PEPPER")
  results.push({
    key: "GUEST_HASH_PEPPER",
    status: guestHashPepper ? "PASS" : enforceProdRules ? "FAIL" : "WARN",
    detail: guestHashPepper
      ? "설정됨"
      : "미설정 시 legacy SHA-256 fallback 동작",
  })

  const healthInternalToken = read("HEALTH_INTERNAL_TOKEN")
  results.push({
    key: "HEALTH_INTERNAL_TOKEN",
    status: healthInternalToken ? "PASS" : enforceProdRules ? "FAIL" : "WARN",
    detail: healthInternalToken ? "설정됨" : "미설정 시 production internal diagnostics 접근 통제가 약화됨",
  })

  const upstashUrl = read("UPSTASH_REDIS_REST_URL")
  const upstashToken = read("UPSTASH_REDIS_REST_TOKEN")
  const hasUpstashPair = Boolean(upstashUrl) && Boolean(upstashToken)
  const hasUpstashPartial = Boolean(upstashUrl) !== Boolean(upstashToken)
  if (hasUpstashPartial) {
    results.push({
      key: "UPSTASH_REDIS_REST_URL_AND_TOKEN_PAIR",
      status: "FAIL",
      detail: "URL/TOKEN이 쌍으로 맞지 않습니다.",
    })
  } else if (!hasUpstashPair) {
    results.push({
      key: "UPSTASH_REDIS_REST_URL_AND_TOKEN_PAIR",
      status: enforceProdRules ? "FAIL" : "WARN",
      detail: "미설정 시 rate-limit/query-cache가 memory fallback으로 동작",
    })
  } else {
    results.push({
      key: "UPSTASH_REDIS_REST_URL_AND_TOKEN_PAIR",
      status: "PASS",
      detail: "설정됨",
    })
  }

  const resendApiKey = read("RESEND_API_KEY")
  results.push({
    key: "RESEND_API_KEY",
    status: resendApiKey ? "PASS" : enforceProdRules ? "FAIL" : "WARN",
    detail: resendApiKey
      ? "설정됨"
      : "미설정 시 인증/비밀번호 재설정 메일이 전송되지 않음",
  })

  const blobToken = read("BLOB_READ_WRITE_TOKEN")
  results.push({
    key: "BLOB_READ_WRITE_TOKEN",
    status: blobToken ? "PASS" : enforceProdRules ? "FAIL" : "WARN",
    detail: blobToken
      ? "설정됨"
      : "미설정 시 hosted runtime 이미지 업로드가 500으로 실패",
  })

  const opsBaseUrl = read("OPS_BASE_URL")
  const opsHealthToken = read("OPS_HEALTH_INTERNAL_TOKEN")
  if (!opsBaseUrl) {
    results.push({
      key: "MODERATION_CONTROL_PLANE_HEALTH",
      status: "WARN",
      detail:
        "OPS_BASE_URL 미설정: 원격 /api/health 기반 moderation control plane drift 검사를 건너뜁니다.",
    })
  } else {
    try {
      const headers: Record<string, string> = {
        accept: "application/json",
        "cache-control": "no-cache",
      }
      if (opsHealthToken) {
        headers["x-health-token"] = opsHealthToken
      }

      const response = await fetch(`${opsBaseUrl.replace(/\/$/, "")}/api/health`, {
        method: "GET",
        headers,
        cache: "no-store",
      })
      const payload = (await response.json()) as RemoteHealthResponse
      const controlPlane = payload.checks?.controlPlane
      const failingChecks = (controlPlane?.checks ?? []).filter((check) => check.state === "error")

      if (response.status !== 200 || controlPlane?.state === "error") {
        results.push({
          key: "MODERATION_CONTROL_PLANE_HEALTH",
          status: "FAIL",
          detail:
            failingChecks.length > 0
              ? `원격 health에서 control plane drift 감지: ${failingChecks
                  .map((check) => `${check.key}: ${check.message ?? "error"}`)
                  .join("; ")}`
              : `원격 health 확인 실패 (HTTP ${response.status})`,
        })
      } else if (!controlPlane || !opsHealthToken) {
        results.push({
          key: "MODERATION_CONTROL_PLANE_HEALTH",
          status: "WARN",
          detail:
            "OPS_HEALTH_INTERNAL_TOKEN 미설정 또는 invalid: control plane 상세 상태를 확인하지 못했습니다.",
        })
      } else {
        results.push({
          key: "MODERATION_CONTROL_PLANE_HEALTH",
          status: "PASS",
          detail: "원격 health에서 moderation control plane 상태 정상",
        })
      }
    } catch (error) {
      results.push({
        key: "MODERATION_CONTROL_PLANE_HEALTH",
        status: enforceProdRules ? "FAIL" : "WARN",
        detail: `원격 /api/health 검사 실패: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  }

  const failed = results.filter((result) => result.status === "FAIL")
  const warned = results.filter((result) => result.status === "WARN")

  console.log("Security env check")
  console.log(`- nodeEnv: ${nodeEnv}`)
  console.log(`- strictMode: ${strictMode ? "on" : "off"} (SECURITY_ENV_STRICT)`)
  for (const result of results) {
    console.log(`- [${result.status}] ${result.key}: ${result.detail}`)
  }
  console.log(`- summary: pass=${results.length - failed.length - warned.length}, warn=${warned.length}, fail=${failed.length}`)

  if (failed.length > 0) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
