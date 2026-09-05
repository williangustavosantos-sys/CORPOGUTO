import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { localizeFoodName } from "../lib/food-l10n"

const gutoSource = readFileSync(new URL("../lib/api/guto.ts", import.meta.url), "utf8")
const chatSource = readFileSync(new URL("../components/guto/tabs/chat-tab.tsx", import.meta.url), "utf8")
const onlineSource = readFileSync(
  new URL("../components/guto/guto-online-session.tsx", import.meta.url),
  "utf8",
)
const validationSource = readFileSync(
  new URL("../components/guto/validation/workout-validation-flow.tsx", import.meta.url),
  "utf8",
)
const missionSource = readFileSync(
  new URL("../components/guto/tabs/mission-tab.tsx", import.meta.url),
  "utf8",
)
const appSource = readFileSync(new URL("../components/guto/guto-app.tsx", import.meta.url), "utf8")

// ─── P0: workout validation authority ─────────────────────────────────────────

test("A. V3 não usa mais /guto/v3/memory complete_daily_mission como autoridade de conclusão", () => {
  // A única rota de conclusão V3 usada pelo frontend é /guto/v3/workout/validate.
  assert.match(gutoSource, /\/guto\/v3\/workout\/validate/)
  // O corpo V3 do saveGutoMemory NUNCA carrega xpEvent (bypass impossível).
  const v3MemoryBody = gutoSource.slice(
    gutoSource.indexOf("export async function saveGutoMemory"),
    gutoSource.indexOf("export async function saveGutoMemory") + 1600,
  )
  assert.match(v3MemoryBody, /xpEvent: undefined,/)
  assert.doesNotMatch(v3MemoryBody, /xpEvent: "complete_daily_mission"/)
  // handleMissionComplete no V3 não envia XP por /memory (navegação apenas).
  const appBlock = appSource.slice(appSource.indexOf("const handleMissionComplete"))
  assert.match(appBlock, /isGutoV3Enabled\(\)\s*\?\s*null\s*:/)
  // O bloco V3 de validateWorkout (até a rota legada) não envia xpEvent.
  const v3Validate = gutoSource.slice(
    gutoSource.indexOf("export async function validateWorkout"),
    gutoSource.indexOf("\"/guto/validate-workout\""),
  )
  assert.doesNotMatch(v3Validate, /xpEvent/)
})

test("B. sem selfie: validateWorkout V3 rejeita com V3_WORKOUT_VALIDATION_EVIDENCE_REQUIRED (sem chamar autoridade)", () => {
  assert.match(
    gutoSource,
    /V3_WORKOUT_VALIDATION_EVIDENCE_REQUIRED/,
  )
  // A checagem acontece ANTES do fetch (guard de evidência no corpo V3).
  const validateIdx = gutoSource.indexOf("export async function validateWorkout")
  const v3Guard = gutoSource.slice(validateIdx, gutoSource.indexOf("export async function", validateIdx + 10))
  const evidenceCheckIdx = v3Guard.indexOf("if (!evidence)")
  assert.ok(evidenceCheckIdx > 0, "guarda de evidência presente")
  const beforeEvidence = v3Guard.slice(0, evidenceCheckIdx)
  assert.doesNotMatch(beforeEvidence, /apiRequest/, "nenhuma chamada antes do guard de evidência")
})

test("C. o fluxo de validação bloqueia sem foto capturada (selfie é core, sem skip-camera)", () => {
  assert.match(validationSource, /if \(!imageBase64Ref\.current\)/)
  assert.match(validationSource, /setUploadError\(locale\.incompleteWorkout\)/)
})

test("D. o fluxo de validação consolida exercícios oficiais na sessão lógica antes da autoridade final", () => {
  assert.match(validationSource, /recordGutoV3WorkoutSessionExercises/)
  assert.match(validationSource, /if \(!workoutSessionId\)/)
  assert.match(validationSource, /\/guto\/v3\/workout\/validate/)
})

test("E. workoutSessionId estável: criado UMA vez por execução no guto-app e compartilhado com Mission/Online/Validation", () => {
  assert.match(appSource, /createV3WorkoutSessionId\(\)/)
  assert.match(appSource, /setV3WorkoutSessionId\(\(current\) => current \?\? createV3WorkoutSessionId\(\)\)/)
  assert.match(appSource, /workoutSessionId=\{v3WorkoutSessionId\}/)
  assert.match(appSource, /workoutSessionId=\{v3WorkoutSessionId \?\? undefined\}/)
  // Após sucesso, a sessão é renovada (XP exactly-once: nunca reusa completada).
  assert.match(appSource, /setV3WorkoutSessionId\(null\)/)
  // MissionTab repassa para o GUTO Online.
  assert.match(missionSource, /workoutSessionId=\{workoutSessionId\}/)
  // lib/api/guto.ts: id UUID real, não Date.now.
  assert.match(gutoSource, /createV3WorkoutSessionId\(\): string \{[\s\S]*?createV3RequestId\(\)/)
})

// ─── GUTO Online V3-safe ──────────────────────────────────────────────────────

test("F. GUTO Online não chama active-exercise legado no V3", () => {
  assert.match(onlineSource, /if \(!isGutoV3Enabled\(\)\)/)
  // As chamadas legadas ficam DENTRO do guard não-V3.
  const guardIdx = onlineSource.indexOf("if (!isGutoV3Enabled())")
  const guarded = onlineSource.slice(guardIdx)
  assert.match(guarded, /setActiveExercise/)
  assert.match(guarded, /clearActiveExercise/)
  // Fora do guard não há chamada a setActiveExercise/clearActiveExercise.
  const outside = onlineSource.slice(0, guardIdx)
  assert.doesNotMatch(outside, /setActiveExercise\(/)
  assert.doesNotMatch(outside, /clearActiveExercise\(/)
  // handleValidate no V3 nunca chama clearActiveExercise.
  const validateIdx = onlineSource.indexOf("const handleValidate")
  const handleValidate = onlineSource.slice(validateIdx, validateIdx + 500)
  assert.match(handleValidate, /if \(!isGutoV3Enabled\(\)\)/)
})

test("G. o fim do GUTO Online não concede XP sozinho — só navega para a validação", () => {
  assert.match(onlineSource, /onFinish\?\.\(\)/)
  // Nenhuma chamada de XP/validação dentro do Online: ele só fecha e navega.
  assert.doesNotMatch(onlineSource, /validateWorkout\(/)
  assert.doesNotMatch(onlineSource, /complete_daily_mission/)
  assert.doesNotMatch(onlineSource, /apiRequest\(/)
})

// ─── Chat lock (active-context sync) ──────────────────────────────────────────

test("H. activeContext sync rejeita → send nunca fica travado (promise guardada nunca rejeita + try/finally)", () => {
  // As promises guardadas em activeContextSyncRef têm .catch(() => null).
  const syncAssignments = chatSource.match(/activeContextSyncRef\.current = setGutoActiveContext\([^)]*\)\s*\.then[\s\S]*?\.catch\(\(\) => null\)/g)
  assert.ok(syncAssignments && syncAssignments.length >= 2, "todas as atribuições de sync têm catch")
  // O await da sync é envolvido em try/catch defensivo (a promise guardada
  // nunca rejeita, então o lock nunca trava).
  assert.match(chatSource, /try \{[\s\S]{0,80}await activeContextSyncRef\.current[\s\S]{0,120}catch \{/)
  // sendInFlightRef SEMPRE libera no finally (mesmo com exceção no meio).
  const sendBlock = chatSource.slice(chatSource.indexOf("sendInFlightRef.current = true"))
  assert.match(sendBlock, /finally \{[\s\S]{0,80}sendInFlightRef\.current = false/)
})

// ─── 409 runtime recovery ─────────────────────────────────────────────────────

test("I. chat reconhece 409 V3_CONTEXT_RECONFIRMATION_REQUIRED no runtime: readback + gate, sem erro de conexão", () => {
  assert.match(chatSource, /isV3ContextReconfirmationError\(error\)/)
  assert.match(chatSource, /getGutoV3State\(createGutoTurnId\(userId\)\)/)
  assert.match(chatSource, /reconfirmationRequired/)
  // O catch genérico (connectionError) NÃO é o único caminho: existe branch específico.
  const catchBlock = chatSource.slice(chatSource.indexOf("} catch (error) {"))
  assert.match(catchBlock, /isV3ContextReconfirmationError\(error\)/)
  assert.match(catchBlock, /copy\.reconfirmationRequired/)
  assert.match(catchBlock, /copy\.connectionError/)
})

test("J. validação de treino reconhece 409 reconfirmation e fecha overlay para o gate abrir", () => {
  assert.match(validationSource, /isV3ContextReconfirmationError\(err\)/)
  assert.match(validationSource, /locale\.reconfirmationRequired/)
  assert.match(validationSource, /onClose\(\)/)
})

// ─── Idioma dos alimentos ─────────────────────────────────────────────────────

test("K. nomes oficiais localizados deterministicamente por foodId + language (pt/it/en)", () => {
  assert.equal(localizeFoodName("wholegrain_bread", "Whole grain bread", "pt-BR"), "Pão integral")
  assert.equal(localizeFoodName("wholegrain_bread", "Whole grain bread", "it-IT"), "Pane integrale")
  assert.equal(localizeFoodName("wholegrain_bread", "Whole grain bread", "en-US"), "Whole grain bread")
  assert.equal(localizeFoodName("oats", "Oats", "pt-BR"), "Aveia")
  assert.equal(localizeFoodName("oats", "Oats", "it-IT"), "Avena")
  assert.equal(localizeFoodName("chicken_breast", "Chicken breast", "pt-BR"), "Peito de frango")
  assert.equal(localizeFoodName("tuna_canned", "Canned tuna", "pt-BR"), "Atum enlatado")
  assert.equal(localizeFoodName("lentils", "Lentils", "it-IT"), "Lenticchie")
  // fallback: foodId desconhecido preserva o nome do backend
  assert.equal(localizeFoodName(undefined, "Custom dish", "pt-BR"), "Custom dish")
  assert.equal(localizeFoodName("unknown_food", "Custom dish", "pt-BR"), "Custom dish")
})

test("L. swap + reload preservam idioma: mapeamento da dieta usa localizeFoodName com o idioma do perfil", () => {
  assert.match(gutoSource, /localizeFoodName\(item\.foodId, item\.name, state\.profile\?\.language \|\| state\.journey\.preferredLanguage\)/)
  assert.match(gutoSource, /foodId: item\.foodId/)
})