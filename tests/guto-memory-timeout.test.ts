import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { readFileSync } from "node:fs"

import { GUTO_MEMORY_IO_TIMEOUT_MS, GUTO_MEMORY_SAVE_TIMEOUT_MS } from "../lib/api/guto"

describe("GUTO memory save timeout", () => {
  it("cobre leitura inicial e calibragem sem abortar no teto genérico de 15 s", () => {
    assert.equal(GUTO_MEMORY_IO_TIMEOUT_MS, 60_000)
    assert.equal(GUTO_MEMORY_SAVE_TIMEOUT_MS, 60_000)
    assert.ok(GUTO_MEMORY_SAVE_TIMEOUT_MS > 15_239)

    const source = readFileSync(new URL("../lib/api/guto.ts", import.meta.url), "utf8")
    const memoryRequests = [...source.matchAll(/apiRequest<GutoMemory>\(["`]\/guto\/memory["`], \{([\s\S]*?)\n\s*\}\)/g)]
    assert.equal(memoryRequests.length, 2)
    for (const request of memoryRequests) {
      assert.match(request[1], /timeoutMs: GUTO_MEMORY_IO_TIMEOUT_MS/)
    }
  })
})
