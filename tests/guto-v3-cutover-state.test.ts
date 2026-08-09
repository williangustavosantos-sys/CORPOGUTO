import assert from "node:assert/strict"
import test from "node:test"
import { gutoV3StateToMemory } from "../lib/api/guto"

const actor = {
  tenantId: "20000000-0000-4000-8000-000000000001",
  userId: "30000000-0000-4000-8000-000000000001",
  externalSubject: "founder-v3-test",
  role: "student" as const,
}

function officialResponse() {
  return {
    brainVersion: "guto-cerebro-v3" as const,
    requestId: "10000000-0000-4000-8000-000000000001",
    traceId: "trace-v3",
    state: {
      actor,
      memoryVersion: 4,
      displayName: "Will",
      journey: {
        preferredLanguage: "pt-BR" as const,
        consentAcceptedAt: "2026-08-09T10:00:00.000Z",
        sovereignNameConfirmedAt: "2026-08-09T10:01:00.000Z",
        pactAcceptedAt: "2026-08-09T10:02:00.000Z",
        initialXpRewardSeen: true,
      },
      profile: {
        version: 2,
        language: "pt-BR" as const,
        city: "Roma",
        country: "Italia",
        biologicalSex: "male" as const,
        age: 35,
        weightKg: 80,
        heightCm: 180,
        trainingStatus: "active",
        trainingLocation: "gym",
      },
      goal: { version: 1, code: "consistency" },
      preferences: { version: 1, dietStyle: "vegetarian" },
      healthConstraints: [],
      workout: {
        id: "40000000-0000-4000-8000-000000000001",
        version: 2,
        title: "Treino oficial",
        status: "active" as const,
        items: [{
          id: "50000000-0000-4000-8000-000000000001",
          exerciseId: "incline-dumbbell-press",
          name: "Supino inclinado com halteres",
          purpose: "push",
          muscleGroup: "chest",
          position: 0,
          sets: 3,
          reps: "10-12",
        }],
      },
      diet: {
        id: "60000000-0000-4000-8000-000000000001",
        version: 2,
        status: "active" as const,
        totalCalories: 2200,
        proteinGrams: 140,
        carbsGrams: 260,
        fatGrams: 65,
        meals: [{
          id: "70000000-0000-4000-8000-000000000001",
          name: "Café da manhã",
          position: 0,
          calories: 500,
          items: [{
            id: "80000000-0000-4000-8000-000000000001",
            foodId: "oats",
            name: "Aveia",
            quantityGrams: 80,
            calories: 300,
            proteinGrams: 10,
            carbsGrams: 50,
            fatGrams: 6,
            position: 0,
          }],
        }],
      },
      progression: {
        totalXp: 200,
        evolutionStage: "baby" as const,
        trainedToday: true,
        adaptedMissionToday: false,
        xpEvents: [{
          id: "90000000-0000-4000-8000-000000000001",
          reasonCode: "complete_daily_mission" as const,
          amount: 100,
          sourceKey: "2026-08-09",
          createdAt: "2026-08-09T12:00:00.000Z",
        }],
      },
    },
    activeContext: {
      id: "a0000000-0000-4000-8000-000000000001",
      version: 2,
      kind: "workout" as const,
      planId: "40000000-0000-4000-8000-000000000001",
      planVersion: 2,
      itemId: "50000000-0000-4000-8000-000000000001",
      itemLabel: "Supino inclinado com halteres",
      rejectedCandidateIds: ["barbell-bench-press"],
      updatedAt: "2026-08-09T12:01:00.000Z",
    },
  }
}

test("estado V3 reconciliado usa IDs oficiais para treino, dieta e contexto após reload", () => {
  const memory = gutoV3StateToMemory(officialResponse())

  assert.equal(memory.userId, actor.externalSubject)
  assert.equal(memory.lastWorkoutPlan?.studentId, officialResponse().state.workout.id)
  assert.equal(memory.lastWorkoutPlan?.exercises[0]?.id, officialResponse().state.workout.items[0]?.id)
  assert.equal(memory.lastDietPlan?.meals[0]?.foods[0]?.id, officialResponse().state.diet.id && officialResponse().state.diet.meals[0]?.items[0]?.id)
  assert.equal(memory.lastDietPlan?.meals[0]?.foods[0]?.planId, officialResponse().state.diet.id)
  assert.equal(memory.activeContext?.currentItem.id, officialResponse().activeContext.itemId)
  assert.equal(memory.activeContext?.currentItem.name, "Supino inclinado com halteres")
  assert.equal(memory.totalXp, 200)
  assert.equal(memory.trainedToday, true)
})
