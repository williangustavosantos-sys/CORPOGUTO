import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { getGutoMemory, saveGutoMemory } from "../lib/api/guto"
import { applyIfLatestMemoryWrite } from "../lib/guto-memory-write-order"

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

describe("GUTO memory write ordering", () => {
  it("rejects a stale frontend response after a newer BORA write", async () => {
    type Memory = { initialXpGranted: boolean; initialXpRewardSeen: boolean }
    const older = deferred<Memory>()
    const newer = deferred<Memory>()
    let latestMemoryWrite = 0
    let memory: Memory = { initialXpGranted: false, initialXpRewardSeen: false }
    const appliedWrites: number[] = []

    const persist = async (response: Promise<Memory>) => {
      const writeId = ++latestMemoryWrite
      const updated = await response
      applyIfLatestMemoryWrite(writeId, latestMemoryWrite, updated, (latest) => {
        memory = latest
        appliedWrites.push(writeId)
      })
    }

    const initialXpRequest = persist(older.promise)
    const boraRequest = persist(newer.promise)

    newer.resolve({ initialXpGranted: true, initialXpRewardSeen: true })
    await boraRequest
    older.resolve({ initialXpGranted: true, initialXpRewardSeen: false })
    await initialXpRequest

    assert.deepEqual(appliedWrites, [2])
    assert.equal(memory.initialXpGranted, true)
    assert.equal(memory.initialXpRewardSeen, true)
  })

  it("does not request or save memory before a valid identity exists", async () => {
    const originalFetch = globalThis.fetch
    let fetchCalls = 0
    globalThis.fetch = (async () => {
      fetchCalls += 1
      throw new Error("fetch must not run")
    }) as typeof fetch

    try {
      for (const invalidId of [undefined, null, "", "   "]) {
        await assert.rejects(getGutoMemory(invalidId), /non-empty GUTO userId/i)
        await assert.rejects(
          saveGutoMemory({ userId: invalidId as undefined }),
          /non-empty GUTO userId/i,
        )
      }
      assert.equal(fetchCalls, 0)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
