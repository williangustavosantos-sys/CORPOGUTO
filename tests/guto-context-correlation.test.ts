import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { readFileSync } from "node:fs"
import type { ActiveContext } from "../lib/api/guto"
import {
  buildGutoLastSuggestedItem,
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
    lastSuggestedItem: null,
    rejectedItems: [],
    acceptedItem: null,
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

  it("envia o substituto confirmado em campo estruturado após reload para treino e dieta", () => {
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
    assert.doesNotMatch(workoutInput, /Last confirmed substitute/)
    assert.deepEqual(buildGutoLastSuggestedItem(workout), {
      id: "crucifixo_maquina",
      name: "Crucifixo máquina",
      kind: "exercise",
    })

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
    assert.doesNotMatch(dietInput, /Last confirmed substitute/)
    assert.deepEqual(buildGutoLastSuggestedItem(diet), {
      id: "wholegrain_bread",
      name: "Pão integral",
      kind: "food",
    })
  })

  it("mantém o domínio explícito nas sequências Supino e Maçã, inclusive após reload", () => {
    const supino = {
      ...context("ctx-supino", "workout", "supino_reto_maquina"),
      currentItem: { id: "supino_reto_maquina", name: "Supino reto máquina" },
    }
    assert.match(buildGutoModelInputWithActiveContext("ocupado", supino), /ACTIVE WORKOUT CONTEXT/)
    assert.equal(buildGutoLastSuggestedItem(supino), null)

    const treinoDepoisDaPrimeiraTroca = {
      ...supino,
      version: 2,
      currentItem: { id: "crucifixo_maquina", name: "Crucifixo máquina" },
      lastSuggestedItem: { id: "crucifixo_maquina", name: "Crucifixo máquina" },
    }
    const treinoReidratado = JSON.parse(JSON.stringify(treinoDepoisDaPrimeiraTroca)) as ActiveContext
    assert.match(buildGutoModelInputWithActiveContext("tbm nao tenho", treinoReidratado), /ACTIVE WORKOUT CONTEXT/)
    assert.deepEqual(buildGutoLastSuggestedItem(treinoReidratado), {
      id: "crucifixo_maquina",
      name: "Crucifixo máquina",
      kind: "exercise",
    })

    const maca = {
      ...context("ctx-maca", "diet", "apple"),
      currentItem: { id: "apple", name: "Maçã", quantity: "2 unidades", mealName: "Lanche da manhã" },
    }
    assert.match(buildGutoModelInputWithActiveContext("não tenho", maca), /ACTIVE DIET CONTEXT/)
    assert.equal(buildGutoLastSuggestedItem(maca), null)

    const dietaDepoisDaPrimeiraTroca = {
      ...maca,
      version: 2,
      currentItem: { id: "banana", name: "Banana", quantity: "2 unidades", mealName: "Lanche da manhã" },
      lastSuggestedItem: { id: "banana", name: "Banana", quantity: "2 unidades" },
    }
    const dietaReidratada = JSON.parse(JSON.stringify(dietaDepoisDaPrimeiraTroca)) as ActiveContext
    assert.match(buildGutoModelInputWithActiveContext("tbm nao tenho", dietaReidratada), /ACTIVE DIET CONTEXT/)
    assert.doesNotMatch(buildGutoModelInputWithActiveContext("tbm nao tenho", dietaReidratada), /WORKOUT/)
    assert.deepEqual(buildGutoLastSuggestedItem(dietaReidratada), {
      id: "banana",
      name: "Banana",
      kind: "food",
    })
  })

  it("o turno pendente preserva e envia o campo estruturado separado do texto", () => {
    const source = readFileSync(
      new URL("../components/guto/tabs/chat-tab.tsx", import.meta.url),
      "utf8",
    )
    assert.match(source, /lastSuggestedItem:\s*buildGutoLastSuggestedItem\(activeContextSnapshot\)/)
    assert.match(source, /lastSuggestedItem:\s*nextPendingTurn\.lastSuggestedItem\s*\|\|\s*null/)
    assert.match(source, /contextId:\s*nextPendingTurn\.contextId/)
    assert.match(source, /activeContextType:\s*nextPendingTurn\.activeContextType/)
    assert.match(source, /activeItemId:\s*nextPendingTurn\.activeItemId/)
    assert.match(source, /setGutoActiveContext\(nextContext\)/)
    assert.doesNotMatch(source, /Last confirmed substitute:/)
  })
})
