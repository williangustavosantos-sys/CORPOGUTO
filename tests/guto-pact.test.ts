import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { GutoMemory } from "../lib/api/guto"
import { commitPactOnceAndRecover, hasDurablePostPactArtifacts } from "../lib/guto-pact"

function memory(ready: boolean): GutoMemory {
  return {
    userId: "pact-user",
    name: "Will",
    language: "pt-BR",
    initialXpGranted: ready,
    totalXp: ready ? 100 : 0,
    streak: 0,
    trainedToday: false,
    adaptedMissionToday: false,
    lastActiveAt: new Date().toISOString(),
    completedWorkoutDates: [],
    adaptedMissionDates: [],
    missedMissionDates: [],
    xpEvents: [],
    proactiveSent: {},
    initialXpRewardSeen: false,
    lastWorkoutPlan: ready ? { focus: "Treino", dateLabel: "hoje", scheduledFor: "hoje", summary: "", exercises: [{ id: "x" }] } as GutoMemory["lastWorkoutPlan"] : null,
    lastDietPlan: ready ? { userId: "pact-user", generatedAt: "hoje", country: "IT", macros: {} as never, meals: [{ id: "lunch" }] } as unknown as GutoMemory["lastDietPlan"] : null,
  }
}

describe("pact commit recovery", () => {
  it("resposta perdida faz um único POST e avança quando GET confirma XP + treino + dieta", async () => {
    let commits = 0
    let reads = 0
    const result = await commitPactOnceAndRecover({
      commit: async () => {
        commits += 1
        return null // resposta HTTP perdida após o backend concluir o commit
      },
      read: async () => {
        reads += 1
        return memory(reads >= 2)
      },
      attempts: 3,
      wait: async () => {},
    })

    assert.equal(commits, 1)
    assert.equal(reads, 2)
    assert.equal(hasDurablePostPactArtifacts(result), true)
    assert.equal(result?.totalXp, 100)
  })

  it("resposta completa não inicia polling nem duplica o POST", async () => {
    let commits = 0
    let reads = 0
    const result = await commitPactOnceAndRecover({
      commit: async () => {
        commits += 1
        return memory(true)
      },
      read: async () => {
        reads += 1
        return memory(true)
      },
      wait: async () => {},
    })
    assert.equal(commits, 1)
    assert.equal(reads, 0)
    assert.equal(result?.initialXpGranted, true)
  })
})
