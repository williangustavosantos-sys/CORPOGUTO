import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { ApiError, apiRequest } from "../lib/api/client"
import {
  hasConfirmedV3Context,
  isV3ContextReconfirmationError,
  needsV3ContextReconfirmation,
  plansShareConfirmedV3Context,
  reconfirmGutoV3Context,
} from "../lib/api/guto"
import type { GutoMemory } from "../lib/api/guto"

const gutoSource = readFileSync(new URL("../lib/api/guto.ts", import.meta.url), "utf8")
const clientSource = readFileSync(new URL("../lib/api/client.ts", import.meta.url), "utf8")
const appSource = readFileSync(new URL("../components/guto/guto-app.tsx", import.meta.url), "utf8")
const gateSource = readFileSync(
  new URL("../components/guto/context-reconfirm-gate.tsx", import.meta.url),
  "utf8",
)
const chatSource = readFileSync(new URL("../components/guto/tabs/chat-tab.tsx", import.meta.url), "utf8")

function memoryWith(overrides: Partial<GutoMemory>): GutoMemory {
  return {
    userId: "tenant|user-a",
    name: "User A",
    language: "pt-BR",
    trainingGoal: "muscle_gain",
    initialXpGranted: true,
    totalXp: 0,
    streak: 0,
    trainedToday: false,
    adaptedMissionToday: false,
    lastActiveAt: "2026-01-01T00:00:00.000Z",
    xpEvents: [],
    completedWorkoutDates: [],
    adaptedMissionDates: [],
    missedMissionDates: [],
    proactiveSent: {},
    initialXpRewardSeen: true,
    firstContact: {
      status: "COMPLETED",
      step: "completed",
      foodDeclaration: "nenhuma",
      limitationDeclaration: "nenhuma",
      startedAt: "2026-01-01T00:00:00.000Z",
      completedAt: "2026-01-01T00:00:00.000Z",
      currentPrompt: null,
      summary: "contexto v1",
      confirmedContextVersion: 1,
    },
    confirmedContext: {
      id: "ctx-1",
      version: 1,
      confirmedAt: "2026-01-01T00:00:00.000Z",
      profileVersion: 1,
      goalVersion: 1,
    },
    v3ProfileVersion: 1,
    v3GoalVersion: 1,
    ...overrides,
  }
}

test("A. deriva reconfirmation required quando o perfil oficial avança de versão", () => {
  // consistente: nada a reconfirmar
  assert.equal(needsV3ContextReconfirmation(memoryWith({})), false)

  // perfil mudou (ex.: peso 75→74) depois da confirmação → contexto stale
  const profileDrifted = memoryWith({ v3ProfileVersion: 2 })
  assert.equal(needsV3ContextReconfirmation(profileDrifted), true)

  // goal mudou → também stale
  const goalDrifted = memoryWith({ v3GoalVersion: 2 })
  assert.equal(needsV3ContextReconfirmation(goalDrifted), true)
})

test("A. nunca bloqueia fluxos legítimos (sem contexto confirmado / mid-First-Contact)", () => {
  assert.equal(needsV3ContextReconfirmation(null), false)
  assert.equal(needsV3ContextReconfirmation(undefined), false)

  const notCompleted = memoryWith({
    firstContact: {
      status: "IN_PROGRESS",
      step: "food_restrictions",
      foodDeclaration: null,
      limitationDeclaration: null,
      startedAt: "2026-01-01T00:00:00.000Z",
      completedAt: null,
      currentPrompt: "declara restrições",
      summary: null,
      confirmedContextVersion: null,
    },
  })
  assert.equal(needsV3ContextReconfirmation(notCompleted), false)

  const withoutContext = memoryWith({ confirmedContext: null })
  assert.equal(needsV3ContextReconfirmation(withoutContext), false)

  // Defensivo: antes de o backend expor versões, não inventa bloqueio.
  const withoutVersions = memoryWith({ v3ProfileVersion: undefined, v3GoalVersion: undefined })
  assert.equal(needsV3ContextReconfirmation(withoutVersions), false)
})

test("B. reconfirmar emite contexto oficial novo e limpa o gate", () => {
  const stale = memoryWith({ v3ProfileVersion: 2 })
  assert.equal(needsV3ContextReconfirmation(stale), true)

  // Resposta do /guto/v3/context/reconfirm: ctx v2 com profileVersion=2, planos v2.
  const reconfirmed = memoryWith({
    v3ProfileVersion: 2,
    firstContact: {
      status: "COMPLETED",
      step: "completed",
      foodDeclaration: "nenhuma",
      limitationDeclaration: "nenhuma",
      startedAt: "2026-01-01T00:00:00.000Z",
      completedAt: "2026-01-02T00:00:00.000Z",
      currentPrompt: null,
      summary: "contexto v2",
      confirmedContextVersion: 2,
    },
    confirmedContext: {
      id: "ctx-2",
      version: 2,
      confirmedAt: "2026-01-02T00:00:00.000Z",
      profileVersion: 2,
      goalVersion: 1,
    },
    lastWorkoutPlan: {
      focus: "força",
      focusKey: "full_body",
      dateLabel: "2026-01-02",
      scheduledFor: "2026-01-02",
      summary: "plano v2",
      exercises: [],
      confirmedContextVersion: 2,
    },
    lastDietPlan: {
      userId: "tenant|user-a",
      generatedAt: "2026-01-02T00:00:00.000Z",
      country: "BR",
      macros: { bmr: 1700, tdee: 2400, targetKcal: 2600, proteinG: 170, carbsG: 300, fatG: 80, goal: "muscle_gain" },
      meals: [],
      confirmedContextVersion: 2,
    },
  })
  assert.equal(needsV3ContextReconfirmation(reconfirmed), false)
  assert.equal(hasConfirmedV3Context(reconfirmed), true)
  assert.equal(plansShareConfirmedV3Context(reconfirmed), true)
})

test("C. CORRIGIR não confirma contexto errado (só abre o editor Dados)", () => {
  // O gate não invoca nenhuma API do Cérebro por conta própria.
  assert.equal(/from "..\/lib\/api\/guto"/.test(gateSource), false)
  assert.equal(/apiRequest|reconfirmGutoV3Context|saveGutoV3Calibration/.test(gateSource), false)
  // CORRIGIR = corrigir calibração; a reconfirmação fica com o backend/UI após salvar.
  assert.match(appSource, /handleCorrectV3Context/)
  assert.match(appSource, /setSettingsMode\("data"\)/)
})

test("D. reload durante reconfirmation: estado oficial stale é recuperável (gate reaparece)", () => {
  // Após reload o memory vem da autoridade (boot) — mesma derivação decide.
  const bootStateStillStale = memoryWith({ v3ProfileVersion: 3 })
  assert.equal(needsV3ContextReconfirmation(bootStateStillStale), true)
})

test("E. double confirm: sem duplicação — botão trava durante a confirmação + guard no handler", () => {
  assert.match(gateSource, /disabled=\{isConfirming\}/)
  assert.match(appSource, /if \(isReconfirmingV3Context\) return/)
})

test("contrato: client propaga o code V3 do body no erro genérico (não só 401/403)", async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        error: "V3_CONTEXT_RECONFIRMATION_REQUIRED",
        message: "O perfil mudou. Confirme novamente o contexto antes de continuar.",
      }),
      { status: 409, headers: { "content-type": "application/json" } },
    )) as typeof fetch

  try {
    await assert.rejects(
      apiRequest<unknown>("/guto/v3", { method: "POST", body: "{}" }),
      (error: unknown) => {
        assert.ok(error instanceof ApiError)
        assert.equal(error.status, 409)
        assert.equal(error.code, "V3_CONTEXT_RECONFIRMATION_REQUIRED")
        assert.equal(isV3ContextReconfirmationError(error), true)
        return true
      },
    )
  } finally {
    globalThis.fetch = originalFetch
  }

  assert.match(clientSource, /body\.code \|\| body\.error/)
})

test("contrato: reconfirmGutoV3Context usa exatamente a autoridade V3 existente", async () => {
  // Mesmo envelope dos demais endpoints de estado V3 (GutoV3StateResponse),
  // chamado server-side pelo proxy — requestId sem token NEXT_PUBLIC.
  assert.equal(typeof reconfirmGutoV3Context, "function")
  assert.match(gutoSource, /\/guto\/v3\/context\/reconfirm/)
  assert.match(gutoSource, /apiRequest<GutoV3StateResponse>\(\"\/guto\/v3\/context\/reconfirm\"/)
  assert.match(gutoSource, /timeoutMs: 60000/)
  // Body contém só o requestId — nenhuma informação do navegador é enviada.
  const bodyMatch = gutoSource.match(
    /reconfirmGutoV3Context[\s\S]*?body: JSON\.stringify\(\{([^}]*)\}\)/,
  )
  assert.ok(bodyMatch, "reconfirm body presente")
  assert.match(bodyMatch[1]!, /requestId: createV3RequestId\(\)/)
})

test("F-H. gate fecha após reconfirm e planos compartilham o contexto v2 (chat/diet/food swap livres)", () => {
  const stale = memoryWith({ v3ProfileVersion: 2 })
  assert.equal(needsV3ContextReconfirmation(stale), true)

  const reconfirmed = memoryWith({
    v3ProfileVersion: 2,
    firstContact: {
      ...stale.firstContact!,
      confirmedContextVersion: 2,
      summary: "contexto v2",
      completedAt: "2026-01-02T00:00:00.000Z",
    },
    confirmedContext: {
      id: "ctx-2",
      version: 2,
      confirmedAt: "2026-01-02T00:00:00.000Z",
      profileVersion: 2,
      goalVersion: 1,
    },
    lastWorkoutPlan: {
      focus: "força",
      focusKey: "full_body",
      dateLabel: "2026-01-02",
      scheduledFor: "2026-01-02",
      summary: "plano v2",
      exercises: [],
      confirmedContextVersion: 2,
    },
    lastDietPlan: {
      userId: "tenant|user-a",
      generatedAt: "2026-01-02T00:00:00.000Z",
      country: "BR",
      macros: { bmr: 1700, tdee: 2400, targetKcal: 2600, proteinG: 170, carbsG: 300, fatG: 80, goal: "muscle_gain" },
      meals: [],
      confirmedContextVersion: 2,
    },
  })
  assert.equal(needsV3ContextReconfirmation(reconfirmed), false)
  assert.equal(plansShareConfirmedV3Context(reconfirmed), true)

  // Superfícies dependem do shared context para habilitar treino/dieta (linha
  // de montagem atual) — depois da reconfirmação todas ficam oficiais de novo.
  assert.match(appSource, /sharedContextReady = hasConfirmedV3Context\(official\) && plansShareConfirmedV3Context\(official\)/)
  assert.match(appSource, /setWorkoutPlan\(sharedContextReady \? official\.lastWorkoutPlan \|\| null : null\)/)
})

test("I. rapid food swap após reconfirm: sem gate stale nem contexto antigo no turno", () => {
  // Depois da reconfirmação o contexto ativo referenciado pelo swap pertence ao
  // plano v2 oficial — não há bloqueio adicional por request no cliente.
  const reconfirmed = memoryWith({
    v3ProfileVersion: 2,
    firstContact: {
      status: "COMPLETED",
      step: "completed",
      foodDeclaration: "nenhuma",
      limitationDeclaration: "nenhuma",
      startedAt: "2026-01-01T00:00:00.000Z",
      completedAt: "2026-01-02T00:00:00.000Z",
      currentPrompt: null,
      summary: "contexto v2",
      confirmedContextVersion: 2,
    },
    confirmedContext: {
      id: "ctx-2",
      version: 2,
      confirmedAt: "2026-01-02T00:00:00.000Z",
      profileVersion: 2,
      goalVersion: 1,
    },
    lastWorkoutPlan: {
      focus: "força",
      focusKey: "full_body",
      dateLabel: "2026-01-02",
      scheduledFor: "2026-01-02",
      summary: "plano v2",
      exercises: [],
      confirmedContextVersion: 2,
    },
    lastDietPlan: {
      userId: "tenant|user-a",
      generatedAt: "2026-01-02T00:00:00.000Z",
      country: "BR",
      macros: { bmr: 1700, tdee: 2400, targetKcal: 2600, proteinG: 170, carbsG: 300, fatG: 80, goal: "muscle_gain" },
      meals: [],
      confirmedContextVersion: 2,
    },
  })
  assert.equal(needsV3ContextReconfirmation(reconfirmed), false)
  assert.equal(hasConfirmedV3Context(reconfirmed), true)
})

test("gate montado no app com superfície CONFIRMAR/CORRIGIR (estado de produto, não erro genérico)", () => {
  assert.match(appSource, /<ContextReconfirmGate/)
  assert.match(appSource, /needsV3ContextReconfirmation\(memory\)/)
  assert.match(appSource, /onConfirm=\{\(\) => void handleReconfirmV3Context\(\)\}/)
  assert.match(appSource, /onCorrect=\{handleCorrectV3Context\}/)
  assert.match(appSource, /settingsMode === "menu"/)
  // Cópia da superfície
  assert.match(gateSource, /CONFIRMAR AJUSTES/)
  assert.match(gateSource, /CORRIGIR/)
  assert.match(gateSource, /data-testid="guto-v3-context-reconfirm-gate"/)
  // O chat NÃO mostra erro de conexão para o 409: reconhece o código no
  // runtime (isV3ContextReconfirmationError), faz readback do estado oficial
  // e deixa o gate abrir (recovery §14) — nunca fallback genérico.
  assert.match(chatSource, /isV3ContextReconfirmationError\(error\)/)
  assert.match(chatSource, /copy\.reconfirmationRequired/)
  assert.match(chatSource, /getGutoV3State\(createGutoTurnId\(userId\)\)/)
})
