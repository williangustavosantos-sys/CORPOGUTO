import { describe, it } from "node:test"
import assert from "node:assert/strict"

import {
  formatProactiveMemoryLabel,
  getActionableProactiveMemories,
  getProactiveMemoryUiCopy,
  hasActionableProactiveMemories,
} from "../lib/guto-proactivity-ui"
import type { ProactiveMemory } from "../lib/api/guto"

function tripMemory(patch: Partial<ProactiveMemory> = {}): ProactiveMemory {
  return {
    id: "pm-trip",
    userId: "user-1",
    type: "trip",
    status: "pending_confirmation",
    stage: "impact_confirmation",
    rawText: "viajo sexta",
    understood: "Viagem provável em 2026-06-19",
    dateText: "sexta",
    dateParsed: "2026-06-19",
    weekKey: "2026-W25",
    createdAt: "2026-06-16T10:00:00.000Z",
    updatedAt: "2026-06-16T10:00:00.000Z",
    ...patch,
  }
}

describe("guto proactivity UI", () => {
  it("mantem pending_confirmation acionavel para virar card visual", () => {
    const actionable = getActionableProactiveMemories([tripMemory()])

    assert.equal(actionable.pendingConfirmation.length, 1)
    assert.equal(actionable.pendingConfirmation[0]?.type, "trip")
  })

  it("mostra confirmação da viagem real ainda no estágio do evento", () => {
    const actionable = getActionableProactiveMemories([tripMemory({
      stage: "continuity_question",
      confirmationStage: "event",
    })])

    assert.equal(actionable.pendingConfirmation.length, 1)
    assert.equal(actionable.pendingConfirmation[0]?.stage, "continuity_question")
    assert.equal(actionable.pendingConfirmation[0]?.confirmationStage, "event")
  })

  it("usa copy de decisao visual para viagem detectada", () => {
    const copy = getProactiveMemoryUiCopy("pt-BR")

    assert.equal(copy.tripTitle, "Viagem")
    assert.equal(copy.tripQuestion("19/06/2026", false), "Confirmar viagem em 19/06/2026 sem treino adaptado?")
    assert.equal(copy.btnConfirm, "CONFIRMAR")
    assert.equal(copy.btnFix, "ALTERAR DATA")
    assert.equal(copy.btnCancel, "CANCELAR")
    assert.equal(formatProactiveMemoryLabel(tripMemory()), "Viagem provável em 2026-06-19 (19/06/2026)")
  })

  it("nunca usa instrução interna como texto de card proativo", () => {
    const leaked = "Compromisso informado: Evento proativo devido: arrival. Decida a fala e a próxima ação. Não use culpa por streak nem template de agenda."
    const label = formatProactiveMemoryLabel(tripMemory({
      type: "commitment",
      stage: "event_confirmation",
      confirmationStage: undefined,
      rawText: leaked,
      understood: leaked,
      dateText: undefined,
      dateParsed: undefined,
    }))
    const visibleCardText = getProactiveMemoryUiCopy("pt-BR").pendingConfirm(label)

    assert.equal(visibleCardText, "Confirmar: Compromisso informado")
    assert.doesNotMatch(visibleCardText, /Evento proativo devido|Decida a fala|streak|expectedResponse|memoryPatch/i)
  })

  it("deduplica cards iguais e mostra só um contexto principal", () => {
    const memories = [
      tripMemory({ id: "pm-trip-1" }),
      tripMemory({ id: "pm-trip-2" }),
    ]
    const actionable = getActionableProactiveMemories(memories)

    assert.equal(actionable.pendingConfirmation.length, 1)
    assert.equal(actionable.pendingConfirmation[0]?.id, "pm-trip-1")
    assert.equal(hasActionableProactiveMemories(memories), true)
  })

  it("respeita activeConversationContext ao escolher o card visivel", () => {
    const memories = [
      tripMemory({
        id: "pm-trip-event",
        stage: "continuity_question",
        confirmationStage: "event",
        dateParsed: "2026-06-19",
      }),
      tripMemory({
        id: "pm-trip-impact",
        confirmationStage: "impact",
        dateParsed: "2026-06-20",
        understood: "Viagem confirmada sem treino",
      }),
    ]
    const actionable = getActionableProactiveMemories(memories, {
      kind: "travel_impact_confirmation",
      source: "proactive_memory",
      relatedMemoryId: "pm-trip-impact",
      dateParsed: "2026-06-20",
      updatedAt: "2026-06-18T12:00:00.000Z",
    })

    assert.equal(actionable.pendingConfirmation.length, 1)
    assert.equal(actionable.pendingConfirmation[0]?.id, "pm-trip-impact")
    assert.equal(actionable.pendingConfirmation[0]?.confirmationStage, "impact")
  })
})
