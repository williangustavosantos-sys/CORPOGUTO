import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { persistXpRewardBeforeArrival } from "../lib/guto-arrival"

describe("GUTO first arrival ordering", () => {
  it("só solicita a missão depois de persistir que o card de XP foi visto", async () => {
    const calls: string[] = []
    let releasePersist!: () => void
    const persisted = new Promise<void>((resolve) => {
      releasePersist = resolve
    })

    const flow = persistXpRewardBeforeArrival(
      async () => {
        calls.push("persist:start")
        await persisted
        calls.push("persist:end")
      },
      () => {
        calls.push("arrival")
      },
    )

    await Promise.resolve()
    assert.deepEqual(calls, ["persist:start"])

    releasePersist()
    await flow
    assert.deepEqual(calls, ["persist:start", "persist:end", "arrival"])
  })
})
