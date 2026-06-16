import { describe, it } from "node:test"
import assert from "node:assert/strict"

import type { GutoMemory, ProactiveImpact, ProactiveMemory, WorkoutValidationRecord } from "../lib/api/guto"
import { buildGutoPathMonth, type GutoPathMonth } from "../lib/guto-path-calendar"

function baseMemory(partial: Partial<GutoMemory> = {}): GutoMemory {
  return {
    userId: "user-1",
    name: "Will",
    language: "pt-BR",
    initialXpGranted: true,
    totalXp: 100,
    streak: 0,
    trainedToday: false,
    adaptedMissionToday: false,
    lastActiveAt: "2026-06-16T10:00:00.000Z",
    completedWorkoutDates: [],
    adaptedMissionDates: [],
    missedMissionDates: [],
    xpEvents: [],
    proactiveSent: {},
    initialXpRewardSeen: true,
    proactiveMemories: [],
    proactiveImpacts: [],
    ...partial,
  }
}

function tripMemory(partial: Partial<ProactiveMemory> = {}): ProactiveMemory {
  return {
    id: "pm-trip",
    userId: "user-1",
    type: "trip",
    status: "confirmed",
    rawText: "vou viajar sexta",
    understood: "Viagem registrada",
    dateText: "sexta",
    dateParsed: "2026-06-20",
    weekKey: "2026-W25",
    createdAt: "2026-06-16T10:00:00.000Z",
    updatedAt: "2026-06-16T10:00:00.000Z",
    ...partial,
  }
}

function proactiveImpact(partial: Partial<ProactiveImpact> = {}): ProactiveImpact {
  const memoryId = partial.memoryId || "pm-trip"
  const affectedDates = partial.affectedDates || ["2026-06-20"]
  const workoutEffect = partial.workoutEffect || "short_light"
  const missionEffect = partial.missionEffect || "reduced"

  return {
    id: "pi-trip",
    memoryId,
    status: "active",
    surfaces: ["chat", "workout", "mission", "path"],
    priority: 80,
    affectedDates,
    workoutEffect,
    missionEffect,
    pushEffect: "avoid_blind_charge",
    xpEffect: "no_free_xp_context_only",
    arenaEffect: "validation_required",
    pathEffect: "adapted_context",
    evolutionEffect: "adapted_context",
    createdAt: "2026-06-16T10:00:00.000Z",
    updatedAt: "2026-06-16T10:00:00.000Z",
    decision: {
      id: "decision-trip",
      memoryId,
      kind: workoutEffect === "protected" ? "block_period" : workoutEffect === "ask_critical" ? "ask_critical" : "adapt_day",
      reason: "travel",
      priority: 80,
      affectedDates,
      workoutEffect,
      missionEffect,
      message: "GUTO adaptou o dia por causa da viagem.",
      createdAt: "2026-06-16T10:00:00.000Z",
    },
    ...partial,
  }
}

function findDay(month: GutoPathMonth, dateKey: string) {
  const day = month.days.find((item) => item.dateKey === dateKey)
  assert.ok(day, `expected day ${dateKey}`)
  return day
}

describe("buildGutoPathMonth — calendário vivo do Percurso", () => {
  it("registra viagem e adaptação no calendário mensal", () => {
    const month = buildGutoPathMonth({
      language: "pt-BR",
      today: new Date(2026, 5, 16, 12),
      memory: baseMemory({
        proactiveMemories: [tripMemory()],
        proactiveImpacts: [proactiveImpact()],
      }),
    })

    const day = findDay(month, "2026-06-20")
    const labels = day.events.map((event) => event.label)

    assert.equal(day.status, "adapted")
    assert.ok(labels.includes("Viagem registrada"))
    assert.ok(labels.includes("Treino adaptado"))
  })

  it("registra dia protegido quando a viagem impossibilita treino", () => {
    const month = buildGutoPathMonth({
      language: "pt-BR",
      today: new Date(2026, 5, 16, 12),
      memory: baseMemory({
        proactiveMemories: [tripMemory()],
        proactiveImpacts: [
          proactiveImpact({
            workoutEffect: "protected",
            missionEffect: "protected",
          }),
        ],
      }),
    })

    const day = findDay(month, "2026-06-20")
    const labels = day.events.map((event) => event.label)

    assert.equal(day.status, "protected")
    assert.ok(labels.includes("Viagem registrada"))
    assert.ok(labels.includes("Dia protegido"))
  })

  it("mantem viagem pendente visível sem cravar adaptação definitiva", () => {
    const month = buildGutoPathMonth({
      language: "pt-BR",
      today: new Date(2026, 5, 16, 12),
      memory: baseMemory({
        proactiveMemories: [tripMemory({ status: "pending_confirmation" })],
        proactiveImpacts: [
          proactiveImpact({
            workoutEffect: "ask_critical",
            missionEffect: "ask_critical",
            surfaces: ["chat"],
            pathEffect: "none",
          }),
        ],
      }),
    })

    const day = findDay(month, "2026-06-20")
    const labels = day.events.map((event) => event.label)

    assert.equal(day.status, "pending")
    assert.ok(labels.includes("Viagem em confirmação"))
    assert.ok(labels.includes("Definir treino da viagem"))
  })

  it("registra treino validado e XP real do ledger", () => {
    const validation: WorkoutValidationRecord = {
      id: "validation-1",
      userId: "user-1",
      createdAt: "2026-06-16T18:00:00.000Z",
      dateLabel: "16 Jun",
      workoutFocus: "Peito",
      workoutLabel: "Peito e tríceps",
      locationMode: "gym",
      language: "pt-BR",
      photoUrl: "/photo.jpg",
      posterUrl: "/poster.jpg",
      thumbUrl: "/thumb.jpg",
      xp: 100,
      status: "validated",
      gutoMessage: "Treino validado.",
    }
    const month = buildGutoPathMonth({
      language: "pt-BR",
      today: new Date(2026, 5, 16, 12),
      validationHistory: [validation],
      memory: baseMemory({
        xpEvents: [
          {
            id: "xp-1",
            type: "complete_daily_mission",
            amount: 100,
            date: "2026-06-16",
            createdAt: "2026-06-16T18:00:00.000Z",
          },
        ],
      }),
    })

    const day = findDay(month, "2026-06-16")
    const labels = day.events.map((event) => event.label)

    assert.equal(day.status, "completed")
    assert.equal(day.xp, 100)
    assert.ok(labels.includes("Treino concluído"))
    assert.ok(labels.includes("+100 XP"))
  })
})
