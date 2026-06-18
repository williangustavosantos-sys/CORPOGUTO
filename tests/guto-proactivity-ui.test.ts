import { describe, it } from "node:test"
import assert from "node:assert/strict"

import {
  formatProactiveMemoryLabel,
  getActionableProactiveMemories,
  getProactiveMemoryUiCopy,
} from "../lib/guto-proactivity-ui"
import type { ProactiveMemory } from "../lib/api/guto"

function tripMemory(patch: Partial<ProactiveMemory> = {}): ProactiveMemory {
  return {
    id: "pm-trip",
    userId: "user-1",
    type: "trip",
    status: "pending_confirmation",
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

  it("usa copy de decisao visual para viagem detectada", () => {
    const copy = getProactiveMemoryUiCopy("pt-BR")

    assert.equal(copy.pendingTrip, "VIAGEM DETECTADA")
    assert.equal(copy.btnYes, "Confirmar")
    assert.equal(copy.btnFix, "Alterar data")
    assert.equal(copy.btnNo, "Fechar")
    assert.equal(formatProactiveMemoryLabel(tripMemory()), "Viagem provável em 2026-06-19 (19/06)")
  })
})
