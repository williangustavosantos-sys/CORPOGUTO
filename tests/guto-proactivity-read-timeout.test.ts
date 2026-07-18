import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

import { GUTO_PROACTIVITY_READ_TIMEOUT_MS } from "../lib/api/guto"

describe("GUTO proactivity read timeout", () => {
  it("não aborta memórias proativas no teto genérico de 15 segundos", () => {
    assert.equal(GUTO_PROACTIVITY_READ_TIMEOUT_MS, 60_000)
    assert.ok(GUTO_PROACTIVITY_READ_TIMEOUT_MS > 15_000)

    const source = readFileSync(new URL("../lib/api/guto.ts", import.meta.url), "utf8")
    const routeIndex = source.indexOf('"/guto/proactivity/memories"')
    assert.ok(routeIndex >= 0)
    assert.match(
      source.slice(routeIndex, routeIndex + 300),
      /timeoutMs: GUTO_PROACTIVITY_READ_TIMEOUT_MS/,
    )
  })
})
