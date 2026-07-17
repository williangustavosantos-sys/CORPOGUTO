import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

import { GUTO_PROACTIVITY_ACTION_TIMEOUT_MS } from "../lib/api/guto"

describe("GUTO proactivity action timeout", () => {
  it("não aborta extração e ações no teto genérico de 15 segundos", () => {
    assert.equal(GUTO_PROACTIVITY_ACTION_TIMEOUT_MS, 60_000)
    assert.ok(GUTO_PROACTIVITY_ACTION_TIMEOUT_MS > 15_000)

    const source = readFileSync(new URL("../lib/api/guto.ts", import.meta.url), "utf8")
    const routes = [
      "extract",
      "open-weekly",
      "confirm",
      "discard",
      "change-date",
      "update",
      "validate",
      "request-discard",
      "cancel-discard-request",
    ]

    for (const route of routes) {
      const routeIndex = source.indexOf(`"/guto/proactivity/${route}"`)
      assert.ok(routeIndex >= 0, `rota ${route} deve continuar coberta pelo teste`)
      assert.match(source.slice(routeIndex, routeIndex + 400), /timeoutMs: GUTO_PROACTIVITY_ACTION_TIMEOUT_MS/)
    }
  })
})
