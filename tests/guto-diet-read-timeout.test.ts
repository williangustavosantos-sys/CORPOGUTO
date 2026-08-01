import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

import { GUTO_DIET_READ_TIMEOUT_MS } from "../lib/api/guto"

describe("GUTO diet read timeout", () => {
  it("não aborta a leitura soberana no teto genérico de 15 segundos", () => {
    assert.equal(GUTO_DIET_READ_TIMEOUT_MS, 60_000)
    assert.ok(GUTO_DIET_READ_TIMEOUT_MS > 15_000)

    const source = readFileSync(new URL("../lib/api/guto.ts", import.meta.url), "utf8")
    const request = source.match(/apiRequest<DietPlan>\(`\/guto\/diet`, \{([\s\S]*?)\n\s*\}\)/)
    assert.ok(request)
    assert.match(request[1], /method: "GET"/)
    assert.match(request[1], /timeoutMs: GUTO_DIET_READ_TIMEOUT_MS/)
  })
})
