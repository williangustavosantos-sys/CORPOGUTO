import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { ActiveContext } from "../lib/api/guto"
import {
  buildGutoModelInputWithActiveContext,
  isGutoResponseCorrelated,
  resolveGutoResponseForRender,
  shouldHydrateActiveContext,
} from "../lib/guto-context-correlation"

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

  it("renderiza resposta válida e usa fallback honesto para stale, correlação inválida ou fala vazia", () => {
    assert.deepEqual(
      resolveGutoResponseForRender(
        request,
        context("ctx-workout", "workout", "supino"),
        response,
        "fallback",
      ),
      { kind: "accepted", speech: "resposta" },
    )
    assert.deepEqual(
      resolveGutoResponseForRender(
        request,
        context("ctx-workout", "workout", "supino"),
        { ...response, discardedReason: "stale_context" },
        "fallback",
      ),
      { kind: "fallback", speech: "fallback", reason: "stale_context" },
    )
    assert.deepEqual(
      resolveGutoResponseForRender(
        request,
        context("ctx-workout", "workout", "supino"),
        { ...response, requestId: "old" },
        "fallback",
      ),
      { kind: "fallback", speech: "fallback", reason: "correlation_mismatch" },
    )
    assert.deepEqual(
      resolveGutoResponseForRender(
        request,
        context("ctx-workout", "workout", "supino"),
        { ...response, fala: "   " },
        "fallback",
      ),
      { kind: "fallback", speech: "fallback", reason: "empty_response" },
    )
  })

  it("reidrata o chip com o contexto persistido mais novo sem sobrescrever uma ativação local recente", () => {
    const staleLocal = context("ctx-old", "workout", "supino")
    const persisted = {
      ...context("ctx-old", "workout", "flexao"),
      version: 3,
      currentItem: { id: "flexao", name: "Flexão" },
      updatedAt: "2026-07-19T00:05:00.000Z",
    }
    assert.equal(shouldHydrateActiveContext(staleLocal, persisted), true)

    const localActivation = {
      ...context("ctx-food", "diet", "soy_yogurt"),
      updatedAt: "2026-07-19T00:10:00.000Z",
    }
    assert.equal(shouldHydrateActiveContext(localActivation, persisted), false)
  })

  it("envia ao cérebro o substituto confirmado após reload para treino e dieta", () => {
    const workout = {
      ...context("ctx-workout", "workout", "supino_reto_maquina"),
      version: 2,
      currentItem: {
        id: "crucifixo_maquina",
        name: "Crucifixo máquina",
        sets: 3,
        reps: "10-12",
        rest: "90s",
      },
      lastSuggestedItem: {
        id: "crucifixo_maquina",
        name: "Crucifixo máquina",
      },
    }
    const workoutInput = buildGutoModelInputWithActiveContext("também está ocupado", workout)
    assert.match(workoutInput, /Exercise: "Crucifixo máquina" \(id=crucifixo_maquina\)/)
    assert.match(workoutInput, /Last confirmed substitute: "Crucifixo máquina" \(id=crucifixo_maquina\)/)

    const diet = {
      ...context("ctx-diet", "diet", "wholegrain_bread"),
      version: 2,
      currentItem: {
        id: "wholegrain_bread",
        name: "Pão integral",
        quantity: "2 fatias",
        mealId: "cafe",
        mealName: "Café da manhã",
      },
      lastSuggestedItem: {
        id: "wholegrain_bread",
        name: "Pão integral",
        quantity: "2 fatias",
      },
    }
    const dietInput = buildGutoModelInputWithActiveContext("também não tenho essa opção", diet)
    assert.match(dietInput, /Food: "Pão integral" \(id=wholegrain_bread, quantity=2 fatias\)/)
    assert.match(dietInput, /Last confirmed substitute: "Pão integral" \(id=wholegrain_bread\)/)
  })
})
