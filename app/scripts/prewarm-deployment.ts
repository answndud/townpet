import "dotenv/config"

type PrewarmTarget = {
  label: string
  path: string
  accept: "text/html" | "application/json"
}

type PrewarmResult = {
  label: string
  pass: number
  status: number
  elapsedMs: number
  vercelCache: string
  contentType: string
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "")
}

function toPositiveInt(name: string, raw: string | undefined, fallback: number) {
  if (!raw) {
    return fallback
  }

  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    throw new Error(`${name} must be a positive integer. received=${raw}`)
  }

  return parsed
}

function toNonNegativeInt(name: string, raw: string | undefined, fallback: number) {
  if (!raw) {
    return fallback
  }

  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    throw new Error(`${name} must be a non-negative integer. received=${raw}`)
  }

  return parsed
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function prewarmTarget(baseUrl: string, target: PrewarmTarget, pass: number) {
  const url = `${baseUrl}${target.path}`
  const startedAt = Date.now()
  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: target.accept,
      "user-agent": "townpet-ops-prewarm/1.0",
    },
    redirect: "follow",
  })

  await response.arrayBuffer()

  const result: PrewarmResult = {
    label: target.label,
    pass,
    status: response.status,
    elapsedMs: Date.now() - startedAt,
    vercelCache: response.headers.get("x-vercel-cache") ?? "unknown",
    contentType: response.headers.get("content-type") ?? "unknown",
  }

  if (!response.ok) {
    throw new Error(
      `Prewarm failed: label=${target.label}, pass=${pass}, status=${response.status}, url=${url}`,
    )
  }

  return result
}

async function main() {
  const baseUrl = process.env.OPS_BASE_URL
  if (!baseUrl) {
    throw new Error("OPS_BASE_URL is required (example: https://townpet.example.com)")
  }

  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)
  const passes = toPositiveInt("OPS_PREWARM_PASSES", process.env.OPS_PREWARM_PASSES, 2)
  const pauseMs = toNonNegativeInt("OPS_PREWARM_PAUSE_MS", process.env.OPS_PREWARM_PAUSE_MS, 250)
  const targets: PrewarmTarget[] = [
    {
      label: "feed_page_guest",
      path: "/feed",
      accept: "text/html",
    },
    {
      label: "search_page_guest",
      path: "/search",
      accept: "text/html",
    },
    {
      label: "api_posts_global",
      path: "/api/posts?scope=GLOBAL",
      accept: "application/json",
    },
    {
      label: "api_posts_suggestions",
      path: `/api/posts/suggestions?q=${encodeURIComponent("산책코스")}`,
      accept: "application/json",
    },
    {
      label: "api_breed_posts",
      path: `/api/lounges/breeds/golden/posts?q=${encodeURIComponent("산책")}`,
      accept: "application/json",
    },
  ]

  console.log("Deployment prewarm started")
  console.log(`- baseUrl: ${normalizedBaseUrl}`)
  console.log(`- passes: ${passes}`)
  console.log(`- targets: ${targets.length}`)

  const results: PrewarmResult[] = []
  for (let pass = 1; pass <= passes; pass += 1) {
    for (const target of targets) {
      const result = await prewarmTarget(normalizedBaseUrl, target, pass)
      results.push(result)
      console.log(
        `- warmed: pass=${pass} label=${target.label} status=${result.status} elapsedMs=${result.elapsedMs} x-vercel-cache=${result.vercelCache}`,
      )
      if (pauseMs > 0) {
        await sleep(pauseMs)
      }
    }
  }

  const missCount = results.filter((item) => item.vercelCache === "MISS").length
  const hitLikeCount = results.filter((item) => ["HIT", "STALE", "REVALIDATED"].includes(item.vercelCache)).length
  console.log("Deployment prewarm completed")
  console.log(`- requests: ${results.length}`)
  console.log(`- cacheMisses: ${missCount}`)
  console.log(`- cacheHitLike: ${hitLikeCount}`)
}

main().catch((error) => {
  console.error("Deployment prewarm failed")
  console.error(error)
  process.exit(1)
})
