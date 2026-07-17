import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { GUTO_MEMORY_SAVE_TIMEOUT_MS } from "../lib/api/guto"

describe("GUTO memory save timeout", () => {
  it("cobre calibragem soberana e cold start sem abortar no teto genérico de 15 s", () => {
    assert.equal(GUTO_MEMORY_SAVE_TIMEOUT_MS, 60_000)
    assert.ok(GUTO_MEMORY_SAVE_TIMEOUT_MS > 15_239)
  })
})
