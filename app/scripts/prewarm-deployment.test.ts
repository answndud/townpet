import { describe, expect, it } from "vitest"

import { buildPrewarmTargets } from "./prewarm-deployment"

describe("deployment prewarm targets", () => {
  it("includes the landing page before feed and API targets", () => {
    const targets = buildPrewarmTargets()

    expect(targets[0]).toEqual({
      label: "home_page",
      path: "/",
      accept: "text/html",
    })
    expect(targets.map((target) => target.label)).toContain("feed_page_guest")
    expect(targets.map((target) => target.label)).toContain("api_feed_guest")
  })
})
