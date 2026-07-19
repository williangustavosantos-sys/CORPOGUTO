import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { ActiveContext } from "../lib/api/guto"
import { isGutoResponseCorrelated } from "../lib/guto-context-correlation"

function context(id: string, type: "workout" | "diet", itemId: string): ActiveContext {
  const item = { id: itemId, name: itemId }
  return {
    id,
    version: 1,
    type,
    sourceSurface: type === "workout" ? "mission" : "diet",
    originalItem: item,
    currentItem: item,
    rejectedItems: [],
    createdAt: "2026-07-19T00:00:00.000Z",
    updatedAt: "2026-07-19T00:00:00.000Z",
  }
}

describe("chat response correlation", () => {
  const request = {
    turnId: "turn-a",
    requestId: "request-a",
    contextId: "ctx-workout",
    contextVersion: 1,
    activeContextType: "workout" as const,
    activeItemId: "supino",
  }
  const response = {
    ...request,
    fala: "resposta",
    acao: "none" as const,
  }

  it("aceita somente a resposta do contexto ainda ativo", () => {
    assert.equal(isGutoResponseCorrelated(request, context("ctx-workout", "workout", "supino"), response), true)
  })

  it("descarta resposta do treino quando o usuário já abriu a dieta", () => {
    assert.equal(isGutoResponseCorrelated(request, context("ctx-diet", "diet", "rice"), response), false)
  })

  it("descarta identificador divergente ou marca explícita stale_context", () => {
    assert.equal(isGutoResponseCorrelated(request, context("ctx-workout", "workout", "supino"), { ...response, requestId: "old" }), false)
    assert.equal(isGutoResponseCorrelated(request, context("ctx-workout", "workout", "supino"), { ...response, discardedReason: "stale_context" }), false)
  })
})
