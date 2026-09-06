import assert from "node:assert/strict"
import { afterEach, describe, it } from "node:test"

// Comportamental: o corpo V3 do saveGutoMemory carrega SOMENTE grant_initial_xp.
// complete_daily_mission é descartado no cliente (bypass impossível) e o backend
// também rejeita (V3_WORKOUT_VALIDATION_REQUIRED) — dupla barreira.
process.env.NEXT_PUBLIC_GUTO_V3_ENABLED = "true"

const originalFetch = globalThis.fetch
const captured: Array<{ path: string; body: Record<string, unknown> }> = []

afterEach(() => {
  globalThis.fetch = originalFetch
  captured.length = 0
})

function stubV3FetchWithState() {
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    let body: Record<string, unknown> = {}
    try {
      body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {}
    } catch {
      body = {}
    }
    captured.push({ path: url.replace(/^.*\/api\/guto/, ""), body })
    // Estado V3 mínimo suficiente para gutoV3StateToMemory
    const state = {
      actor: { tenantId: "t", userId: "u", externalSubject: "s", role: "student" },
      memoryVersion: 1,
      displayName: "FRESH C",
      journey: { preferredLanguage: "pt-BR", consentAcceptedAt: new Date().toISOString(), pactAcceptedAt: new Date().toISOString(), initialXpRewardSeen: true },
      profile: { version: 1, displayName: "FRESH C", language: "pt-BR", biologicalSex: "male", age: 32, weightKg: 74, heightCm: 170, trainingStatus: "returning", trainingLocation: "gym", weeklyFrequencyDaysPerWeek: 4 },
      goal: { version: 1, code: "muscle_gain" },
      preferences: { version: 1 },
      healthConstraints: [],
      firstContact: { status: "NOT_STARTED", confirmedContextVersion: null },
      confirmedContext: null,
      currentFacts: [],
      workout: null,
      diet: null,
      relationshipLifecycle: null,
      progression: { totalXp: 100, evolutionStage: "baby", trainedToday: false, adaptedMissionToday: false, xpEvents: [{ id: "x1", reasonCode: "grant_initial_xp", amount: 100, sourceKey: "lifetime", createdAt: new Date().toISOString() }] },
    }
    return new Response(JSON.stringify({ brainVersion: "guto-cerebro-v3", requestId: "r", traceId: "t", state }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  }) as typeof fetch
}

// import depois do env flag para o módulo enxergar V3 ligado
import { saveGutoMemory } from "../lib/api/guto"

const VALID_USER = "1327dc5d-cce4-4750-9f11-c1b20345baa0"

describe("GUTO V3 memory xpEvent contract", () => {
  it("pacto: grant_initial_xp é transmitido para /guto/v3/memory", async () => {
    stubV3FetchWithState()
    await saveGutoMemory({ userId: VALID_USER, name: "FRESH C", language: "pt-BR", trainedToday: false, xpEvent: "grant_initial_xp" })
    const memoryCall = captured.find((c) => c.path.includes("/guto/v3/memory"))
    assert.ok(memoryCall, "chamada /guto/v3/memory ausente")
    assert.equal(memoryCall.body.xpEvent, "grant_initial_xp")
  })

  it("bypass: complete_daily_mission é descartado no cliente (nunca sai do frontend)", async () => {
    stubV3FetchWithState()
    await saveGutoMemory({ userId: VALID_USER, trainedToday: true, xpEvent: "complete_daily_mission" })
    const memoryCall = captured.find((c) => c.path.includes("/guto/v3/memory"))
    assert.ok(memoryCall, "chamada /guto/v3/memory ausente")
    assert.equal(memoryCall.body.xpEvent, undefined, "complete_daily_mission NÃO pode ser transmitido")
  })

  it("accept_adapted_mission também é descartado no cliente", async () => {
    stubV3FetchWithState()
    await saveGutoMemory({ userId: VALID_USER, xpEvent: "accept_adapted_mission" })
    const memoryCall = captured.find((c) => c.path.includes("/guto/v3/memory"))
    assert.ok(memoryCall)
    assert.equal(memoryCall.body.xpEvent, undefined)
  })
})
