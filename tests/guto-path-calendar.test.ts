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
  it("agrega viagem e adaptação em um único item do calendário", () => {
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
    assert.deepEqual(labels, ["Viagem registrada"])
    assert.equal(day.events[0]?.detail, "Treino adaptado")
    assert.equal(day.events[0]?.editable, true)
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
    assert.deepEqual(labels, ["Viagem registrada"])
    assert.equal(day.events[0]?.detail, "Dia protegido")
  })

  it("não projeta viagem pendente no Percurso antes da validação do card", () => {
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

    assert.equal(day.status, "empty")
    assert.deepEqual(labels, [])
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

function workoutsOnDay(month: GutoPathMonth, dateKey: string) {
  const day = month.days.find((item) => item.dateKey === dateKey)
  if (!day) return 0
  return day.events.filter((event) => event.kind === "workout_completed").length
}

describe("buildGutoPathMonth — timezone do treino validado (alinhado ao backend)", () => {
  // O backend (CEREBROGUTO) crava todas as datas em GUTO_TIME_ZONE = Europe/Rome
  // (config.timeZone / render.yaml). O Percurso tem que cravar createdAt no MESMO fuso,
  // senão o treino cai no dia errado e/ou duplica entre validationHistory e
  // completedWorkoutDates. Estes testes rodam com o default Europe/Rome.

  it("treino às 22h30 em America/Sao_Paulo aparece SOMENTE no dia oficial, sem duplicar", () => {
    // 22h30 de 16/06 em São Paulo (UTC-3) = 2026-06-17T01:30Z. Em Europe/Rome (CEST, UTC+2)
    // isso é 17/06 03h30 — o mesmo dia que o backend grava em completedWorkoutDates.
    const createdAt = "2026-06-17T01:30:00.000Z"
    const validation: WorkoutValidationRecord = {
      id: "validation-sp-2230",
      userId: "user-1",
      createdAt,
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
      today: new Date("2026-06-16T12:00:00.000Z"),
      validationHistory: [validation],
      // backend já registrou o mesmo treino no dia oficial (Rome): 17/06.
      memory: baseMemory({ completedWorkoutDates: ["2026-06-17"] }),
    })

    // Aparece UMA vez, no dia oficial (17/06) — as duas fontes (validationHistory +
    // completedWorkoutDates) caem no mesmo dia e o dedup colapsa em um único evento.
    assert.equal(workoutsOnDay(month, "2026-06-17"), 1)
    assert.equal(findDay(month, "2026-06-17").status, "completed")
    // E NÃO vaza para 16/06 nem duplica.
    assert.equal(workoutsOnDay(month, "2026-06-16"), 0)
  })

  it("treino cujo instante UTC cai no dia anterior ao oficial NÃO duplica (regressão do slice)", () => {
    // 23h30Z de 16/06 = 01h30 de 17/06 em Europe/Rome. O slice cru do ISO ('2026-06-16')
    // cairia em 16/06 enquanto completedWorkoutDates (Rome) está em 17/06 → ANTES: dois
    // marcadores em dias diferentes. DEPOIS: ambos em 17/06, deduplicados.
    const createdAt = "2026-06-16T23:30:00.000Z"
    const validation: WorkoutValidationRecord = {
      id: "validation-late-utc",
      userId: "user-1",
      createdAt,
      dateLabel: "16 Jun",
      workoutFocus: "Costas",
      workoutLabel: "Costas e bíceps",
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
      today: new Date("2026-06-16T12:00:00.000Z"),
      validationHistory: [validation],
      memory: baseMemory({ completedWorkoutDates: ["2026-06-17"] }),
    })

    // Dia oficial (Rome): exatamente um "Treino concluído".
    assert.equal(workoutsOnDay(month, "2026-06-17"), 1)
    // Dia anterior (o que o slice cru marcaria): nenhum evento de treino.
    assert.equal(workoutsOnDay(month, "2026-06-16"), 0)
  })
})
