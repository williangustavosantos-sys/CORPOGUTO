import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { sumXpForDay } from "../lib/xp-events"
import type { GutoMemory } from "../lib/api/guto"

// O Percurso lê o ledger real, mas exclui o buffer do Pacto: ele não representa
// presença validada nem pode criar log de treino (AR-5/X-4).

type XpEvent = GutoMemory["xpEvents"][number]

function event(partial: Partial<XpEvent>): XpEvent {
  return {
    id: `${partial.date || "2026-06-11"}:${partial.type || "grant_initial_xp"}`,
    type: "grant_initial_xp",
    amount: 100,
    date: "2026-06-11",
    createdAt: "2026-06-11T10:00:00.000Z",
    ...partial,
  }
}

describe("sumXpForDay — XP real do dia a partir do ledger", () => {
  it("pacto de 100 XP datado hoje não cria XP no Percurso", () => {
    const memory = { xpEvents: [event({ type: "grant_initial_xp", amount: 100, date: "2026-06-11" })] }
    assert.equal(sumXpForDay(memory, "2026-06-11"), 0)
  })

  it("evento legado com date=\"lifetime\" não conta em nenhum dia", () => {
    const memory = { xpEvents: [event({ date: "lifetime" })] }
    assert.equal(sumXpForDay(memory, "2026-06-11"), 0)
  })

  it("eventos de outros dias não vazam para hoje", () => {
    const memory = {
      xpEvents: [
        event({ type: "complete_daily_mission", amount: 100, date: "2026-06-10" }),
        event({ type: "complete_daily_mission", amount: 100, date: "2026-06-11" }),
      ],
    }
    assert.equal(sumXpForDay(memory, "2026-06-11"), 100)
  })

  it("missão adaptada (+50) seguida de treino validado (+50) soma 100 no dia", () => {
    const memory = {
      xpEvents: [
        event({ type: "accept_adapted_mission", amount: 50, date: "2026-06-11" }),
        event({ type: "complete_daily_mission", amount: 50, date: "2026-06-11" }),
      ],
    }
    assert.equal(sumXpForDay(memory, "2026-06-11"), 100)
  })

  it("memória nula, sem xpEvents ou vazia: 0 XP sem quebrar", () => {
    assert.equal(sumXpForDay(null, "2026-06-11"), 0)
    assert.equal(sumXpForDay(undefined, "2026-06-11"), 0)
    assert.equal(sumXpForDay({ xpEvents: [] }, "2026-06-11"), 0)
    assert.equal(sumXpForDay({} as Pick<GutoMemory, "xpEvents">, "2026-06-11"), 0)
  })
})
