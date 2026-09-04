import { apiRequest, ApiError } from "./client"
import { assertValidGutoUserId } from "../guto-user-id"
import { Country } from "country-state-city"

export type SupportedLanguage = "pt-BR" | "it-IT" | "en-US"
export type WorkoutLocationMode = "gym" | "home" | "park"

// Operações soberanas podem atravessar cold start, hidratação Redis e modelo.
// Não herdar o teto genérico de 15 s do cliente: um timeout curto faz o browser
// declarar falha enquanto o backend ainda pode concluir a gravação.
export const GUTO_MEMORY_IO_TIMEOUT_MS = 60_000
export const GUTO_MEMORY_SAVE_TIMEOUT_MS = GUTO_MEMORY_IO_TIMEOUT_MS
export const GUTO_DIET_READ_TIMEOUT_MS = 60_000
export const GUTO_PROACTIVITY_READ_TIMEOUT_MS = 60_000
export const GUTO_PROACTIVITY_ACTION_TIMEOUT_MS = 60_000

export interface WorkoutValidationRecord {
  id: string
  userId: string
  createdAt: string
  dateLabel: string
  workoutFocus: string
  workoutLabel: string
  locationMode: WorkoutLocationMode
  language: SupportedLanguage
  photoUrl: string
  posterUrl: string
  thumbUrl: string
  xp: number
  status: "validated" | "pending"
  gutoMessage: string
}
export type WorkoutFeedbackDifficulty = "easy" | "ok" | "hard" | "pain"
export type WorkoutFeedbackEnergy = "low" | "normal" | "high"

export interface WorkoutFeedbackRecord {
  id: string
  userId: string
  createdAt: string
  workoutFocus: WorkoutFocus
  workoutLabel: string
  locationMode: WorkoutLocationMode
  difficulty: WorkoutFeedbackDifficulty
  energy?: WorkoutFeedbackEnergy
  painArea?: string
  note?: string
  exerciseIds: string[]
}
export type GutoAvatarEmotion = "default" | "alert" | "critical" | "reward"

export type ActiveContextType = "workout" | "diet"

export interface ActiveContextItem {
  id: string
  name: string
  mealId?: string
  mealName?: string
  quantity?: string
  nutritionalRole?: string
  workoutId?: string
  position?: number
  sets?: number
  reps?: string
  rest?: string
}

export interface ActiveContext {
  id: string
  version: number
  type: ActiveContextType
  sourceSurface: "mission" | "diet"
  originalItem: ActiveContextItem
  currentItem: ActiveContextItem
  lastSuggestedItem: ActiveContextItem | null
  rejectedItems: ActiveContextItem[]
  acceptedItem: ActiveContextItem | null
  createdAt: string
  updatedAt: string
}

export interface GutoLastSuggestedItem {
  kind: "exercise" | "food"
  id: string
  name: string
}
export type GutoAction =
  | "none"
  | "askClarification"
  | "updateWorkout"
  | "generateDiet"
  | "generateWorkout"
  | "updateFacts"
  | "swapExercise"
  | "swapFood"
  | "startMinimumMission"
  | "acknowledge"
  | "callSafetyPath"
  | "openProactiveCard"
  | "callCoach"
  | "lock"
  | "changeLanguage"
  | "requestDeleteAccount"
  | "showProfile"
export type GutoTelemetryEvent =
  | "user_created"
  | "pact_completed"
  | "first_message_sent"
  | "mission_completed"
  | "user_returned_next_day"
  | "calibration_completed"
  | "guto_online_session_event"

export interface GutoWorkoutExercise {
  id: string
  name: string
  canonicalNamePt: string
  muscleGroup: string
  sets: number
  reps: string
  load?: string | null
  rest: string
  restSeconds?: number
  cue: string
  note: string
  alternatives?: string[]
  order?: number
  videoUrl: string
  videoProvider: "local"
  sourceFileName: string
  // kept for backward compat with plans saved before the catalog migration
  animationId?: string
  animationUrl?: string
  animationProvider?: "workoutx"
}

export type WorkoutFocus =
  | "chest_triceps"
  | "back_biceps"
  | "legs_core"
  | "shoulders_abs"
  | "full_body"

export interface GutoWorkoutPlan {
  studentId?: string
  title?: string
  focus: string
  focusKey?: WorkoutFocus
  weekDay?: string
  goal?: string
  location?: string
  locationMode?: WorkoutLocationMode
  dateLabel: string
  scheduledFor: string
  summary: string
  exercises: GutoWorkoutExercise[]
  blocks?: Array<{
    name: string
    exercises: Array<Partial<GutoWorkoutExercise> & {
      name: string
      load?: string | null
      restSeconds?: number
      notes?: string
      alternatives?: string[]
    }>
  }>
  estimatedDurationMinutes?: number
  difficulty?: string
  coachNotes?: string
  manualOverride?: boolean
  editedBy?: string
  editedAt?: string
  editReason?: string
  planSource?: "ai_generated" | "admin_override" | "coach_override"
  source?: "guto_generated" | "coach_manual" | "mixed"
  lockedByCoach?: boolean
  updatedBy?: string
  updatedAt?: string
  proactiveImpactId?: string
  proactiveAdaptationMode?: ProactiveWorkoutEffect
  confirmedContextVersion?: number | null
}

export interface GutoExpectedResponse {
  type: "text"
  options?: string[]
  instruction?: string
  context?:
    | "training_schedule"
    | "training_location"
    | "training_status"
    | "training_limitations"
    | "limitation_check"
    | "exercise_swap"
    | "travel_training"
}

export type ProactivePromptKind =
  | "weekly_opening"
  | "travel_training"
  | "memory_reminder"
  | "memory_validation"

export interface ProactivePrompt {
  id: string
  kind: ProactivePromptKind
  status: "active" | "resolved"
  fala: string
  expectedResponse?: GutoExpectedResponse | null
  relatedMemoryId?: string
  weekKey?: string
  dayKey?: string
  createdAt: string
  updatedAt: string
  surfacedAt?: string
  answeredAt?: string
}

export type ActiveConversationContextKind =
  | "travel_confirmation"
  | "travel_impact_confirmation"
  | "travel_date_correction"
  | "workout_substitution"
  | "diet_substitution"
  | "pain_safety"
  | "weekly_checkin"
  | "none"

export interface ActiveConversationContext {
  kind: ActiveConversationContextKind
  source:
    | "proactive_memory"
    | "proactive_prompt"
    | "substitution_context"
    | "safety"
    | "weekly_conversation"
    | "none"
  relatedMemoryId?: string
  originalId?: string
  dateParsed?: string
  updatedAt: string
}

export interface SendGutoMessageRequest {
  /** Texto visivel original. O V3 nunca recebe o contexto enriquecido pelo navegador. */
  message: string
  input: string
  history: {
    role: "user" | "model"
    parts: { text: string }[]
  }[]
  expectedResponse?: GutoExpectedResponse | null
  turnId: string
  requestId: string
  contextId: string | null
  contextVersion: number | null
  activeContextType: ActiveContextType | null
  activeItemId: string | null
  lastSuggestedItem: GutoLastSuggestedItem | null
}

export type ProactiveMemoryStage =
  | "event_confirmation"
  | "continuity_question"
  | "impact_confirmation"
  | "date_correction"
  | "confirmed_adapted"
  | "confirmed_protected"
  | "discarded"

export interface GutoAtomicTurnDecision {
  turnId: string
  userMessage: string
  previousState: {
    activeContext: ActiveConversationContext | null | undefined
    relatedMemoryId?: string
    stage: ProactiveMemoryStage | "none"
  }
  activeContext: ActiveConversationContext | null | undefined
  intent: string
  relatedMemoryId?: string
  stage: ProactiveMemoryStage | "none"
  nextState: {
    activeContext: ActiveConversationContext | null | undefined
    relatedMemoryId?: string
    stage: ProactiveMemoryStage | "none"
  }
  effects: string[]
  response: Pick<SendGutoMessageResponse, "fala" | "acao" | "expectedResponse" | "avatarEmotion">
  cards: Array<{ memoryId: string; stage: "impact_confirmation"; dateParsed?: string }>
  memoryPatch: Partial<GutoMemory>
  workoutEffect: string
  dietEffect: string
  pathEffect: string
}

export interface SendGutoMessageResponse {
  turnId?: string
  requestId?: string
  contextId?: string
  contextVersion?: number
  activeContextType?: ActiveContextType
  activeItemId?: string
  activeContext?: ActiveContext | null
  discardedReason?: string
  fala?: string
  acao?: GutoAction
  expectedResponse?: GutoExpectedResponse | null
  avatarEmotion?: GutoAvatarEmotion
  workoutPlan?: GutoWorkoutPlan | null
  memoryPatch?: Partial<GutoMemory>
  proactiveMemoryAction?: GutoProactiveMemoryAction | null
  turnDecision?: GutoAtomicTurnDecision
  brainVersion?: "guto-cerebro-v3"
  traceId?: string
  execution?: GutoV3Execution
  versions?: GutoV3Versions
}

export interface GutoV3Execution {
  status: "confirmed" | "not_executed" | "rejected"
  code: string
  message: string
  planVersion?: number
  activeContextVersion?: number
  factContextVersion?: number
  affectedDomains?: Array<"WORKOUT" | "NUTRITION" | "PROGRESS" | "PROACTIVITY" | "SESSION">
}

export interface GutoV3Versions {
  memoryVersion: number
  activeContextVersion: number | null
  planVersion: number | null
}

export interface GutoV3TurnResponse {
  speech: string
  action: GutoAction
  requestId: string
  traceId: string
  brainVersion: "guto-cerebro-v3"
  execution: GutoV3Execution
  versions: GutoV3Versions
}

export function getConfirmedV3MemoryPatch(response: SendGutoMessageResponse) {
  if (
    response.brainVersion !== "guto-cerebro-v3" ||
    response.execution?.status !== "confirmed" ||
    !response.memoryPatch ||
    Object.keys(response.memoryPatch).length === 0
  ) {
    return null
  }
  return response.memoryPatch
}

export function requireOfficialV3DietPlan(memory: GutoMemory) {
  const contextVersion = memory.confirmedContext?.version
  if (
    !memory.lastDietPlan ||
    memory.firstContact?.status !== "COMPLETED" ||
    !contextVersion ||
    memory.firstContact.confirmedContextVersion !== contextVersion ||
    memory.lastWorkoutPlan?.confirmedContextVersion !== contextVersion ||
    memory.lastDietPlan.confirmedContextVersion !== contextVersion
  ) {
    throw new ApiError(
      "Dieta V3 não confirmada na mesma versão oficial do treino.",
      409,
      undefined,
      "V3_DIET_NOT_CONFIRMED",
    )
  }
  return memory.lastDietPlan
}

export interface GutoV3ActiveContext {
  id: string
  version: number
  kind: "workout" | "diet"
  planId: string
  planVersion: number
  itemId: string
  itemLabel: string
  rejectedCandidateIds?: string[]
  updatedAt: string
}

export type GutoV3FirstContactStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"
export type GutoV3FirstContactStep = "food_restrictions" | "training_limitations" | "confirmation" | "completed"

export interface GutoV3FirstContactState {
  status: GutoV3FirstContactStatus
  step: GutoV3FirstContactStep
  foodDeclaration: string | null
  limitationDeclaration: string | null
  startedAt: string | null
  completedAt: string | null
  currentPrompt: string | null
  summary: string | null
  confirmedContextVersion: number | null
}

export interface GutoV3ConfirmedContext {
  id: string
  version: number
  confirmedAt: string
  /** Versões oficiais do perfil/goal no momento da confirmação (autoridade V3). */
  profileVersion?: number
  goalVersion?: number
}

export function shouldStartGutoV3FirstContact(firstContact?: GutoV3FirstContactState | null) {
  return firstContact?.status === "NOT_STARTED"
}

export function isGutoV3FirstContactActive(firstContact?: GutoV3FirstContactState | null) {
  return firstContact?.status === "NOT_STARTED" || firstContact?.status === "IN_PROGRESS"
}

export interface GutoV3StateResponse {
  brainVersion: "guto-cerebro-v3"
  requestId: string
  traceId: string
  state: {
    actor: { tenantId: string; userId: string; externalSubject: string; role: string }
    memoryVersion: number
    displayName: string
    journey: {
      preferredLanguage: SupportedLanguage
      consentAcceptedAt: string | null
      sovereignNameConfirmedAt: string | null
      pactAcceptedAt: string | null
      initialXpRewardSeen: boolean
    }
    profile: null | {
      version: number
      displayName?: string
      language: SupportedLanguage
      city?: string
      country?: string
      biologicalSex: string
      age: number
      weightKg: number
      heightCm: number
      trainingStatus: string
      weeklyFrequencyDaysPerWeek: number
      trainingLocation: string
    }
    goal: null | { version: number; code: string }
    preferences: { version: number; dietStyle?: string }
    firstContact: GutoV3FirstContactState
    confirmedContext: GutoV3ConfirmedContext | null
    currentFacts?: Array<{
      id: string
      factType: string
      canonicalValue: string
      value: Record<string, unknown>
      confirmationStatus: "FACT_CONFIRMED" | "FACT_UNKNOWN"
      validFrom: string
      validTo: string | null
      recordedAt: string
      supersededAt: string | null
      supersededBy: string | null
    }>
    healthConstraints: Array<{
      id: string
      kind: "limitation" | "injury" | "illness" | "allergy" | "food_restriction"
      bodyRegion?: string
      description: string
      severity: string
      confirmed: boolean
    }>
    workout: null | {
      id: string
      version: number
      title: string
      status: string
      confirmedContextVersion: number | null
      items: Array<{
        id: string
        exerciseId: string
        name: string
        canonicalNamePt?: string
        purpose: string
        muscleGroup: string
        position: number
        sets?: number
        reps?: string
        rest?: string
        cue?: string
        note?: string
        videoUrl?: string
        sourceFileName?: string
      }>
    }
    diet: null | {
      id: string
      version: number
      status: string
      confirmedContextVersion: number | null
      totalCalories: number
      proteinGrams: number
      carbsGrams: number
      fatGrams: number
      meals: Array<{
        id: string
        name: string
        position: number
        calories: number
        items: Array<{
          id: string
          foodId: string
          name: string
          quantityGrams: number
          calories: number
          proteinGrams: number
          carbsGrams: number
          fatGrams: number
          position: number
        }>
      }>
    }
    progression: {
      totalXp: number
      evolutionStage: "baby" | "teen" | "adult" | "elite"
      trainedToday: boolean
      adaptedMissionToday: boolean
      xpEvents: Array<{
        id: string
        reasonCode: "grant_initial_xp" | "complete_daily_mission" | "accept_adapted_mission" | "apply_daily_miss_penalty" | "legacy_balance_migration"
        amount: number
        sourceKey: string
        createdAt: string
      }>
    }
  }
  activeContext: GutoV3ActiveContext | null
}

export interface GutoV3CalibrationRequest {
  requestId: string
  profile: {
    biologicalSex: "male" | "female" | "other" | "prefer_not_to_say"
    age: number
    weightKg: number
    heightCm: number
    trainingStatus: "beginner" | "returning" | "active" | "advanced"
    weeklyFrequencyDaysPerWeek: number
  }
  goal: { code: string }
}

export interface GutoV3CalibrationInput {
  biologicalSex: "male" | "female"
  age: number
  weightKg: number
  heightCm: number
  trainingLevel: "beginner" | "returning" | "consistent" | "advanced"
  trainingGoal: string
  trainingFrequencyDaysPerWeek: number
}

export interface GutoNameValidation {
  status: "invalid" | "confirm" | "valid"
  normalized: string
  message: string
}

export interface GutoMemory {
  userId: string
  name: string
  sovereignNameConfirmedAt?: string
  language: SupportedLanguage
  initialXpGranted: boolean
  totalXp: number
  streak: number
  trainedToday: boolean
  adaptedMissionToday: boolean
  lastActiveAt: string
  energyLast?: string
  trainingLocation?: string
  trainingStatus?: string
  trainingLimitations?: string
  trainingAge?: number
  userAge?: number
  biologicalSex?: "female" | "male"
  trainingLevel?: "beginner" | "returning" | "consistent" | "advanced"
  trainingGoal?: "consistency" | "fat_loss" | "muscle_gain" | "conditioning" | "mobility_health"
  trainingFrequencyDaysPerWeek?: number
  preferredTrainingLocation?: "gym" | "home" | "park" | "mixed"
  trainingPathology?: string
  country?: string
  countryCode?: string
  city?: string
  heightCm?: number
  weightKg?: number
  foodRestrictions?: string
  consentHealthFitness?: boolean
  acceptedTerms?: boolean
  consentAcceptedAt?: string
  consentRevokedAt?: string
  lastWorkoutCompletedAt?: string
  completedWorkoutDates: string[]
  adaptedMissionDates: string[]
  missedMissionDates: string[]
  xpEvents: {
    id: string
    type: "grant_initial_xp" | "complete_daily_mission" | "accept_adapted_mission" | "apply_daily_miss_penalty"
    amount: number
    date: string
    createdAt: string
  }[]
  lastLimitationCheckAt?: string
  lastWorkoutPlan?: GutoWorkoutPlan | null
  lastDietPlan?: DietPlan | null
  proactiveMemories?: ProactiveMemory[]
  proactiveImpacts?: ProactiveImpact[]
  proactivePrompt?: ProactivePrompt | null
  activeConversationContext?: ActiveConversationContext | null
  activeContext?: ActiveContext | null
  dietGenerationStatus?: "idle" | "ready_to_generate" | "generating" | "generated" | "needs_clarification" | "failed"
  weeklyWorkoutPlan?: {
    studentId: string
    updatedAt: string
    updatedBy: string
    days: Partial<Record<"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday", GutoWorkoutPlan>>
  } | null
  weeklyDietPlan?: {
    studentId: string
    updatedAt: string
    updatedBy: string
    days: Partial<Record<"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday", {
      breakfast?: string
      lunch?: string
      dinner?: string
      snacks?: string
      notes?: string
      hydration?: string
      caloriesEstimate?: number
      proteinEstimate?: number
    }>>
  } | null
  proactiveSent: Record<string, string[]>
  initialXpRewardSeen: boolean
  hasSeenChatOpening?: boolean
  recentChatHistory?: Array<{ id: string; text: string; isGuto: boolean; timestamp: string }>
  validationHistory?: WorkoutValidationRecord[]
  workoutFeedbackHistory?: WorkoutFeedbackRecord[]
  firstContact?: GutoV3FirstContactState
  confirmedContext?: GutoV3ConfirmedContext | null
  // Versões oficiais correntes do perfil/goal (Cérebro V3). Comparadas com
  // confirmedContext.profileVersion/goalVersion para derivar se o contexto
  // confirmado ficou stale depois de uma edição de calibração.
  v3ProfileVersion?: number
  v3GoalVersion?: number
  // Classificação semântica dos 3 campos livres (país/patologia/restrição) feita
  // pelo backend. Usada pelos badges de contexto (Fase 3K) para distinguir
  // cuidado físico ativo (status "clear" + bodyRegion) de cuidado pendente.
  resolvedFields?: GutoResolvedProfileFields
}

export interface GutoResolvedField {
  field: "country" | "pathology" | "foodRestriction"
  rawValue: string
  normalizedValue?: string
  possibleMeaning?: string
  bodyRegion?: string
  riskTags?: string[]
  confidence?: number
  status: "clear" | "needs_confirmation" | "unknown" | "risky_unclear" | "needs_clarification"
  resolvedAt?: string
}

export interface GutoResolvedProfileFields {
  country?: GutoResolvedField
  pathology?: GutoResolvedField
  foodRestriction?: GutoResolvedField
  acknowledged?: string[]
}

export interface GutoProactiveResponse {
  due: boolean
  slot?: string
  fala?: string
  acao?: GutoAction
  expectedResponse?: GutoExpectedResponse | null
  avatarEmotion?: GutoAvatarEmotion
  workoutPlan?: GutoWorkoutPlan | null
  memoryPatch?: Partial<GutoMemory>
}

// ─── Diet types ───────────────────────────────────────────────────────────────

export interface DietMacros {
  bmr: number
  tdee: number
  targetKcal: number
  proteinG: number
  carbsG: number
  fatG: number
  goal: string
}

export interface DietFood {
  id?: string
  planId?: string
  name: string
  quantity: string
  kcal: number
  proteinG?: number
  carbsG?: number
  fatG?: number
  notes?: string
}

export interface DietMeal {
  id: string
  name: string
  time: string
  foods: DietFood[]
  totalKcal: number
  gutoNote: string
  alternatives?: string[]
}

export interface DietPlan {
  userId: string
  title?: string
  // Idioma em que o conteúdo visível foi gerado ("idioma é lei": regenera se mudar).
  language?: string
  generatedAt: string
  country: string
  macros: DietMacros
  meals: DietMeal[]
  goal?: string
  coachNotes?: string
  restrictions?: string
  foodRestrictions?: string
  manualOverride?: boolean
  editedBy?: string
  editedAt?: string
  editReason?: string
  planSource?: "ai_generated" | "admin_override" | "coach_override"
  source?: "guto_generated" | "coach_manual" | "mixed"
  lockedByCoach?: boolean
  updatedBy?: string
  updatedAt?: string
  confirmedContextVersion?: number | null
}

function createV3RequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID()
  const bytes = new Uint8Array(16)
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function v3WorkoutToLegacy(state: GutoV3StateResponse["state"]): GutoWorkoutPlan | null {
  const plan = state.workout
  if (!plan) return null
  const today = new Date().toISOString().slice(0, 10)
  return {
    studentId: plan.id,
    title: plan.title,
    focus: state.goal?.code || "full_body",
    focusKey: "full_body",
    goal: state.goal?.code,
    location: state.profile?.trainingLocation,
    locationMode: state.profile?.trainingLocation === "home" || state.profile?.trainingLocation === "park"
      ? state.profile.trainingLocation
      : "gym",
    dateLabel: today,
    scheduledFor: today,
    summary: plan.title,
    exercises: plan.items.map((item) => ({
      id: item.id,
      name: item.name,
      canonicalNamePt: item.canonicalNamePt || item.name,
      muscleGroup: item.muscleGroup,
      sets: item.sets || 1,
      reps: item.reps || "10-12",
      rest: item.rest || "1:30min",
      cue: item.cue || "Executa com controle e sem dor.",
      note: item.note || "A técnica manda.",
      videoUrl: item.videoUrl || "",
      videoProvider: "local" as const,
      sourceFileName: item.sourceFileName || "",
      order: item.position,
    })),
    planSource: "ai_generated",
    source: "guto_generated",
    confirmedContextVersion: plan.confirmedContextVersion,
  }
}

function normalizeV3Country(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
}

function v3CountryCode(country?: string) {
  const normalized = normalizeV3Country(country || "")
  if (!normalized) return undefined

  const names = ["pt-BR", "it-IT", "en-US"].map((locale) => new Intl.DisplayNames([locale], { type: "region" }))
  return Country.getAllCountries().find((candidate) =>
    [candidate.isoCode, candidate.name, ...names.map((display) => display.of(candidate.isoCode) || "")]
      .some((value) => normalizeV3Country(value) === normalized),
  )?.isoCode
}

function v3DietToLegacy(state: GutoV3StateResponse["state"]): DietPlan | null {
  const plan = state.diet
  if (!plan) return null
  return {
    userId: plan.id,
    title: "Dieta oficial GUTO",
    language: state.profile?.language || state.journey.preferredLanguage,
    generatedAt: new Date().toISOString(),
    country: state.profile?.country || "",
    goal: state.goal?.code,
    macros: {
      bmr: 0,
      tdee: plan.totalCalories,
      targetKcal: plan.totalCalories,
      proteinG: plan.proteinGrams,
      carbsG: plan.carbsGrams,
      fatG: plan.fatGrams,
      goal: state.goal?.code || "consistency",
    },
    meals: plan.meals.map((meal) => ({
      id: meal.id,
      name: meal.name,
      time: "",
      totalKcal: meal.calories,
      gutoNote: "Valores confirmados pelo Cérebro V3.",
      foods: meal.items.map((item) => ({
        id: item.id,
        planId: plan.id,
        name: item.name,
        quantity: `${item.quantityGrams} g`,
        kcal: item.calories,
        proteinG: item.proteinGrams,
        carbsG: item.carbsGrams,
        fatG: item.fatGrams,
      })),
    })),
    planSource: "ai_generated",
    source: "guto_generated",
    confirmedContextVersion: plan.confirmedContextVersion,
  }
}

function v3ActiveContextToLegacy(context: GutoV3ActiveContext | null): ActiveContext | null {
  if (!context) return null
  const item: ActiveContextItem = {
    id: context.itemId,
    name: context.itemLabel,
    workoutId: context.planId,
  }
  return {
    id: context.id,
    version: context.version,
    type: context.kind,
    sourceSurface: context.kind === "workout" ? "mission" : "diet",
    originalItem: item,
    currentItem: item,
    lastSuggestedItem: null,
    rejectedItems: (context.rejectedCandidateIds || []).map((id) => ({ id, name: id })),
    acceptedItem: null,
    createdAt: context.updatedAt,
    updatedAt: context.updatedAt,
  }
}

export function gutoV3StateToMemory(response: GutoV3StateResponse): GutoMemory {
  const { state } = response
  const profile = state.profile
  const workout = v3WorkoutToLegacy(state)
  const diet = v3DietToLegacy(state)
  const limitations = state.healthConstraints.filter((item) => item.kind !== "food_restriction").map((item) => item.description).join("; ")
  const foodRestrictions = state.healthConstraints.filter((item) => item.kind === "food_restriction").map((item) => item.description).join("; ")
  const xpEvents = state.progression.xpEvents.map((event) => ({
    id: event.id,
    type: event.reasonCode === "legacy_balance_migration" ? "grant_initial_xp" as const : event.reasonCode,
    amount: event.amount,
    date: /^\d{4}-\d{2}-\d{2}$/.test(event.sourceKey) ? event.sourceKey : event.createdAt.slice(0, 10),
    createdAt: event.createdAt,
  }))
  const completedWorkoutDates = xpEvents.filter((event) => event.type === "complete_daily_mission").map((event) => event.date)
  const adaptedMissionDates = xpEvents.filter((event) => event.type === "accept_adapted_mission").map((event) => event.date)
  const missedMissionDates = xpEvents.filter((event) => event.type === "apply_daily_miss_penalty").map((event) => event.date)
  const initialXpGranted = Boolean(state.journey.pactAcceptedAt || xpEvents.some((event) => event.type === "grant_initial_xp"))
  const confirmedContextReady = Boolean(
    state.firstContact.status === "COMPLETED" &&
    state.confirmedContext?.version &&
    state.firstContact.confirmedContextVersion === state.confirmedContext.version
  )
  const plansShareConfirmedContext = Boolean(
    confirmedContextReady &&
    state.workout?.confirmedContextVersion === state.confirmedContext?.version &&
    state.diet?.confirmedContextVersion === state.confirmedContext?.version
  )
  return {
    userId: state.actor.externalSubject,
    name: state.displayName,
    sovereignNameConfirmedAt: state.journey.sovereignNameConfirmedAt || undefined,
    language: profile?.language || state.journey.preferredLanguage,
    initialXpGranted,
    totalXp: state.progression.totalXp,
    streak: completedWorkoutDates.length,
    trainedToday: state.progression.trainedToday,
    adaptedMissionToday: state.progression.adaptedMissionToday,
    lastActiveAt: new Date().toISOString(),
    trainingLocation: profile?.trainingLocation,
    trainingStatus: profile?.trainingStatus,
    trainingLimitations: limitations || undefined,
    userAge: profile?.age,
    biologicalSex: profile?.biologicalSex === "male" || profile?.biologicalSex === "female" ? profile.biologicalSex : undefined,
    trainingLevel: profile?.trainingStatus === "active" ? "consistent" : profile?.trainingStatus as GutoMemory["trainingLevel"],
    trainingGoal: state.goal?.code as GutoMemory["trainingGoal"],
    trainingFrequencyDaysPerWeek: profile?.weeklyFrequencyDaysPerWeek,
    preferredTrainingLocation: profile?.trainingLocation === "home" || profile?.trainingLocation === "park" || profile?.trainingLocation === "mixed" ? profile.trainingLocation : profile ? "gym" : undefined,
    trainingPathology: limitations || undefined,
    country: profile?.country,
    countryCode: v3CountryCode(profile?.country),
    city: profile?.city,
    heightCm: profile?.heightCm,
    weightKg: profile?.weightKg,
    foodRestrictions: foodRestrictions || state.preferences.dietStyle,
    consentHealthFitness: Boolean(state.journey.consentAcceptedAt),
    acceptedTerms: Boolean(state.journey.consentAcceptedAt),
    consentAcceptedAt: state.journey.consentAcceptedAt || undefined,
    completedWorkoutDates,
    adaptedMissionDates,
    missedMissionDates,
    xpEvents,
    lastWorkoutPlan: workout,
    lastDietPlan: diet,
    activeContext: v3ActiveContextToLegacy(response.activeContext),
    dietGenerationStatus: plansShareConfirmedContext
      ? "generated"
      : profile && confirmedContextReady
        ? "ready_to_generate"
        : "idle",
    proactiveSent: {},
    initialXpRewardSeen: state.journey.initialXpRewardSeen,
    firstContact: state.firstContact,
    confirmedContext: state.confirmedContext,
    v3ProfileVersion: profile?.version,
    v3GoalVersion: state.goal?.version,
  }
}

/**
 * Contexto confirmado ficou stale: o perfil/goal oficial avançou de versão
 * depois da última confirmação. O backend responde a qualquer superfície V3
 * com 409 V3_CONTEXT_RECONFIRMATION_REQUIRED até o usuário reconfirmar.
 *
 * Retorna false enquanto faltar versão suficiente no memory (ex.: primeiro
 * acesso sem contexto confirmado), para nunca bloquear fluxos legítimos.
 */
export function needsV3ContextReconfirmation(memory?: GutoMemory | null) {
  if (!memory) return false
  if (memory.firstContact?.status !== "COMPLETED") return false
  const confirmed = memory.confirmedContext
  if (!confirmed?.version) return false
  const profileVersion = memory.v3ProfileVersion
  if (
    typeof profileVersion === "number" &&
    typeof confirmed.profileVersion === "number" &&
    profileVersion !== confirmed.profileVersion
  ) {
    return true
  }
  const goalVersion = memory.v3GoalVersion
  return Boolean(
    typeof goalVersion === "number" &&
    typeof confirmed.goalVersion === "number" &&
    goalVersion !== confirmed.goalVersion,
  )
}

export function isV3ContextReconfirmationError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    error.code === "V3_CONTEXT_RECONFIRMATION_REQUIRED"
  )
}

export function hasConfirmedV3Context(memory?: Pick<GutoMemory, "firstContact" | "confirmedContext"> | null) {
  return Boolean(
    memory?.firstContact?.status === "COMPLETED" &&
    memory.confirmedContext?.version &&
    memory.firstContact.confirmedContextVersion === memory.confirmedContext.version
  )
}

export function plansShareConfirmedV3Context(memory?: {
  confirmedContext?: GutoV3ConfirmedContext | null
  lastWorkoutPlan?: { confirmedContextVersion?: number | null } | null
  lastDietPlan?: { confirmedContextVersion?: number | null } | null
} | null) {
  const version = memory?.confirmedContext?.version
  return Boolean(
    version &&
    memory?.lastWorkoutPlan?.confirmedContextVersion === version &&
    memory?.lastDietPlan?.confirmedContextVersion === version
  )
}

export function isGutoV3Enabled(): boolean {
  return process.env.NEXT_PUBLIC_GUTO_V3_ENABLED === "true"
}

// O Preview V3 não pode disfarçar uma funcionalidade ainda não migrada como
// sucesso nem encaminhá-la para a autoridade legada. Quem chamar uma destas
// superfícies recebe um erro identificável, sem tráfego para V1/V2.
function throwV3UnsupportedFeature(feature: string): never {
  throw new ApiError(
    `A funcionalidade ${feature} ainda não pertence ao Cérebro V3 neste ambiente.`,
    409,
    { feature },
    "V3_FEATURE_NOT_IMPLEMENTED",
  )
}

export async function sendGutoMessage(payload: SendGutoMessageRequest) {
  if (isGutoV3Enabled()) {
    const result = await apiRequest<GutoV3TurnResponse>("/guto/v3", {
      method: "POST",
      timeoutMs: 35000,
      body: JSON.stringify({
        message: payload.message,
        requestId: payload.requestId,
        ...(payload.contextId ? { uiContextId: payload.contextId } : {}),
      }),
    })
    // A UI só recebe o novo plano depois que o Executor e os stores V3
    // confirmaram a mutação. O GET é uma reconciliação da autoridade oficial,
    // não uma segunda fonte de estado no navegador.
    const refreshed = result.execution.status === "confirmed"
      ? gutoV3StateToMemory(await getGutoV3State(payload.requestId))
      : null
    return {
      turnId: payload.turnId,
      requestId: result.requestId,
      contextId: payload.contextId || undefined,
      // O V3 recebe somente o texto e o identificador do contexto. Estes
      // metadados pertencem ao turno do navegador e precisam voltar no
      // adaptador para que a barreira anti-resposta-obsoleta valide o mesmo
      // contexto que originou a chamada.
      contextVersion: payload.contextVersion ?? undefined,
      activeContextType: payload.activeContextType ?? undefined,
      activeItemId: payload.activeItemId ?? undefined,
      fala: result.speech,
      acao: result.action,
      brainVersion: result.brainVersion,
      traceId: result.traceId,
      execution: result.execution,
      versions: result.versions,
      ...(refreshed
        ? {
            activeContext: refreshed.activeContext || null,
            memoryPatch: refreshed,
            ...((result.action === "swapExercise" || result.action === "generateWorkout") && refreshed.lastWorkoutPlan
              ? { workoutPlan: refreshed.lastWorkoutPlan }
              : {}),
          }
        : {}),
    } satisfies SendGutoMessageResponse
  }

  return apiRequest<SendGutoMessageResponse>("/guto", {
    method: "POST",
    timeoutMs: 35000,
    body: JSON.stringify(payload),
  })
}

export async function getGutoV3State(requestId: string) {
  return apiRequest<GutoV3StateResponse>("/guto/v3/state", {
    method: "GET",
    headers: { "x-request-id": requestId },
  })
}

export function buildGutoV3CalibrationRequest(input: GutoV3CalibrationInput): GutoV3CalibrationRequest {
  return {
    requestId: createV3RequestId(),
    profile: {
      biologicalSex: input.biologicalSex,
      age: input.age,
      weightKg: input.weightKg,
      heightCm: input.heightCm,
      trainingStatus: input.trainingLevel === "consistent" ? "active" : input.trainingLevel,
      weeklyFrequencyDaysPerWeek: input.trainingFrequencyDaysPerWeek,
    },
    goal: { code: input.trainingGoal },
  }
}

export async function saveGutoV3Calibration(input: GutoV3CalibrationInput) {
  return apiRequest<{
    status: "confirmed"
    requestId: string
    profileVersion: number
    memoryVersion: number
    brainVersion: "guto-cerebro-v3"
    traceId: string
  }>("/guto/v3/calibration", {
    method: "POST",
    body: JSON.stringify(buildGutoV3CalibrationRequest(input)),
  })
}

export async function startGutoV3FirstContact() {
  return apiRequest<GutoV3StateResponse>("/guto/v3/first-contact/start", {
    method: "POST",
    body: JSON.stringify({ requestId: createV3RequestId() }),
  })
}

export async function respondGutoV3FirstContact(
  answer: string,
  expectedStep: Extract<GutoV3FirstContactStep, "food_restrictions" | "training_limitations">,
) {
  return apiRequest<GutoV3StateResponse>("/guto/v3/first-contact/respond", {
    method: "POST",
    body: JSON.stringify({ requestId: createV3RequestId(), answer, expectedStep }),
  })
}

export async function confirmGutoV3FirstContact() {
  return apiRequest<GutoV3StateResponse>("/guto/v3/first-contact/confirm", {
    method: "POST",
    timeoutMs: 60000,
    body: JSON.stringify({ requestId: createV3RequestId(), confirmed: true }),
  })
}

/**
 * Re-confirmação pós-conclusão: autoridade V3 valida o perfil/goal corrente,
 * emite novo UserContextSnapshot e regenera treino/dieta na nova versão.
 * Body assinado server-side via proxy (nunca exposto ao navegador além deste
 * request) — mesmo envelope dos demais endpoints de estado V3.
 */
export async function reconfirmGutoV3Context() {
  return apiRequest<GutoV3StateResponse>("/guto/v3/context/reconfirm", {
    method: "POST",
    timeoutMs: 60000,
    body: JSON.stringify({ requestId: createV3RequestId() }),
  })
}

export async function setGutoV3ActiveContext(payload: {
  requestId: string
  expectedVersion: number | null
  kind: "workout" | "diet"
  planId: string
  itemId: string
}) {
  return apiRequest<{
    requestId: string
    traceId: string
    brainVersion: "guto-cerebro-v3"
    activeContext: GutoV3ActiveContext
  }>("/guto/v3/active-context", {
    method: "POST",
    body: JSON.stringify({ ...payload, clear: false }),
  })
}

export async function setGutoActiveContext(context: ActiveContext | null) {
  if (isGutoV3Enabled()) {
    const state = await getGutoV3State(createV3RequestId())
    const expectedVersion = state.activeContext?.version ?? null
    const result = await apiRequest<{
      requestId: string
      traceId: string
      brainVersion: "guto-cerebro-v3"
      activeContext: GutoV3ActiveContext | null
    }>("/guto/v3/active-context", {
      method: "POST",
      body: JSON.stringify(context
        ? {
            requestId: createV3RequestId(),
            clear: false,
            expectedVersion,
            kind: context.type,
            planId: context.currentItem.workoutId || (context.type === "workout" ? state.state.workout?.id : state.state.diet?.id),
            itemId: context.currentItem.id,
          }
        : { requestId: createV3RequestId(), clear: true, expectedVersion }),
    })
    return v3ActiveContextToLegacy(result.activeContext)
  }
  const result = await apiRequest<{ ok: true; activeContext: ActiveContext | null }>("/guto/active-context", {
    method: "POST",
    body: JSON.stringify({ context }),
  })
  return result.activeContext
}

export async function trackGutoEvent(payload: {
  event: GutoTelemetryEvent
  userId?: string
  language?: SupportedLanguage
  metadata?: Record<string, unknown>
}) {
  if (isGutoV3Enabled()) throwV3UnsupportedFeature("telemetria legada")
  return apiRequest<{ ok: true }>("/guto/events", {
    method: "POST",
    timeoutMs: 5000,
    suppressAuthRedirect: true,
    body: JSON.stringify({
      ...payload,
      timestamp: new Date().toISOString(),
    }),
  })
}

export async function validateGutoName(name: string, userId?: string) {
  if (isGutoV3Enabled()) {
    return apiRequest<GutoNameValidation>("/guto/v3/name/validate", {
      method: "POST",
      body: JSON.stringify({ name }),
    })
  }
  return apiRequest<GutoNameValidation>("/guto/validate-name", {
    method: "POST",
    body: JSON.stringify({ name, userId }),
  })
}

export async function saveGutoMemory(payload: {
  userId?: string
  name?: string
  language?: SupportedLanguage
  trainedToday?: boolean
  xpEvent?: "grant_initial_xp" | "complete_daily_mission" | "accept_adapted_mission" | "apply_daily_miss_penalty"
  energyLast?: string
  trainingLocation?: string
  trainingStatus?: string
  trainingLimitations?: string
  userAge?: number
  biologicalSex?: "female" | "male"
  trainingLevel?: "beginner" | "returning" | "consistent" | "advanced"
  trainingGoal?: "consistency" | "fat_loss" | "muscle_gain" | "conditioning" | "mobility_health"
  preferredTrainingLocation?: "gym" | "home" | "park" | "mixed"
  trainingPathology?: string
  country?: string
  countryCode?: string
  city?: string
  heightCm?: number
  weightKg?: number
  foodRestrictions?: string
  confirmedName?: boolean
  initialXpRewardSeen?: boolean
  lastWorkoutPlan?: GutoWorkoutPlan | null
}) {
  assertValidGutoUserId(payload.userId)
  if (isGutoV3Enabled()) {
    const result = await apiRequest<GutoV3StateResponse>("/guto/v3/memory", {
      method: "POST",
      timeoutMs: GUTO_MEMORY_IO_TIMEOUT_MS,
      body: JSON.stringify({ ...payload, userId: undefined, lastWorkoutPlan: undefined, requestId: createV3RequestId() }),
    })
    return gutoV3StateToMemory(result)
  }
  return apiRequest<GutoMemory>("/guto/memory", {
    method: "POST",
    timeoutMs: GUTO_MEMORY_IO_TIMEOUT_MS,
    body: JSON.stringify(payload),
  })
}

export async function getGutoMemory(userId: unknown) {
  assertValidGutoUserId(userId)
  if (isGutoV3Enabled()) return gutoV3StateToMemory(await getGutoV3State(createV3RequestId()))
  return apiRequest<GutoMemory>(`/guto/memory`, {
    method: "GET",
    timeoutMs: GUTO_MEMORY_IO_TIMEOUT_MS,
    suppressAuthRedirect: true,
  })
}

// Fase 2A — persiste o ACEITE de consentimento no backend (fonte de verdade).
// Retorna a memória atualizada (com consentHealthFitness/acceptedTerms/consentAcceptedAt).
export async function acceptGutoConsent() {
  if (isGutoV3Enabled()) {
    const result = await apiRequest<GutoV3StateResponse>(`/guto/v3/consent/accept`, {
      method: "POST",
      body: JSON.stringify({ requestId: createV3RequestId() }),
    })
    return gutoV3StateToMemory(result)
  }
  return apiRequest<GutoMemory>(`/guto/consent/accept`, {
    method: "POST",
  })
}

export async function validateWorkout(payload: {
  userId: string
  imageBase64?: string  // optional: undefined when user skips camera
  workoutFocus: string
  workoutLabel: string
  locationMode: WorkoutLocationMode
  language: SupportedLanguage
  workoutPlan?: GutoWorkoutPlan | null
  feedback?: {
    difficulty: WorkoutFeedbackDifficulty
    energy?: WorkoutFeedbackEnergy
    painArea?: string
    note?: string
  }
}) {
  if (isGutoV3Enabled()) {
    const requestId = createV3RequestId()
    const result = await apiRequest<GutoV3StateResponse>("/guto/v3/memory", {
      method: "POST",
      body: JSON.stringify({ requestId, xpEvent: "complete_daily_mission", language: payload.language }),
    })
    const memory = gutoV3StateToMemory(result)
    const validation: WorkoutValidationRecord = {
      id: requestId,
      userId: payload.userId,
      createdAt: new Date().toISOString(),
      dateLabel: new Date().toISOString().slice(0, 10),
      workoutFocus: payload.workoutFocus,
      workoutLabel: payload.workoutLabel,
      locationMode: payload.locationMode,
      language: payload.language,
      photoUrl: "",
      posterUrl: "",
      thumbUrl: "",
      xp: memory.xpEvents.find((event) => event.id === requestId)?.amount || 100,
      status: "validated",
      gutoMessage: "Missão confirmada pelo Cérebro V3.",
    }
    return { success: true as const, validation, validationHistory: [validation] }
  }
  return apiRequest<{ success: true; validation: WorkoutValidationRecord; validationHistory: WorkoutValidationRecord[]; workoutFeedback?: WorkoutFeedbackRecord; arena?: ArenaAwardResult }>(
    "/guto/validate-workout",
    {
      method: "POST",
      timeoutMs: 30000,
      body: JSON.stringify(payload),
    }
  )
}

// --- Arena types ---

export type ArenaAvatarStage = "baby" | "teen" | "adult" | "elite"

export interface ArenaRankingItem {
  position: number
  userId: string
  pairName: string
  avatarStage: ArenaAvatarStage
  xp: number
  validatedWorkouts: number
  status?: string
  currentStreak?: number
  nextEvolutionXp?: number | null
  xpToNextEvolution?: number | null
}

export interface ArenaRankingResponse {
  rankingType: "weekly" | "monthly" | "individual"
  arenaGroupId: string
  resetLabel?: string
  items: ArenaRankingItem[]
}

export interface ArenaMyProfile {
  userId: string
  pairName: string
  avatarStage: ArenaAvatarStage
  totalXp: number
  weeklyXp: number
  monthlyXp: number
  currentStreak: number
  validatedWorkoutsTotal: number
  nextEvolutionXp: number | null
  xpToNextEvolution: number | null
}

export interface ArenaAwardResult {
  xpAwarded: number
  totalXp: number
  weeklyXp: number
  monthlyXp: number
  avatarStage: ArenaAvatarStage
  leveledUp: boolean
}

function v3ArenaStats(state: GutoV3StateResponse["state"]) {
  const now = new Date()
  const weekStart = new Date(now)
  const mondayOffset = (weekStart.getDay() + 6) % 7
  weekStart.setDate(weekStart.getDate() - mondayOffset)
  weekStart.setHours(0, 0, 0, 0)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const positiveEvents = state.progression.xpEvents.filter((event) => event.amount > 0)
  const completedDates = new Set(
    state.progression.xpEvents
      .filter((event) => event.reasonCode === "complete_daily_mission" && event.amount > 0)
      .map((event) => event.sourceKey)
  )
  const nextEvolutionXp = state.progression.totalXp < 1_500
    ? 1_500
    : state.progression.totalXp < 5_000
      ? 5_000
      : state.progression.totalXp < 12_000
        ? 12_000
        : null

  return {
    weeklyXp: positiveEvents
      .filter((event) => new Date(event.createdAt) >= weekStart)
      .reduce((sum, event) => sum + event.amount, 0),
    monthlyXp: positiveEvents
      .filter((event) => new Date(event.createdAt) >= monthStart)
      .reduce((sum, event) => sum + event.amount, 0),
    currentStreak: completedDates.size,
    validatedWorkouts: completedDates.size,
    nextEvolutionXp,
    xpToNextEvolution: nextEvolutionXp == null ? null : Math.max(0, nextEvolutionXp - state.progression.totalXp),
  }
}

async function getV3ArenaRanking(rankingType: ArenaRankingResponse["rankingType"]): Promise<ArenaRankingResponse> {
  const response = await getGutoV3State(createV3RequestId())
  const state = response.state
  const stats = v3ArenaStats(state)
  const xp = rankingType === "weekly"
    ? stats.weeklyXp
    : rankingType === "monthly"
      ? stats.monthlyXp
      : state.progression.totalXp

  return {
    rankingType,
    arenaGroupId: "guto-v3-self",
    items: [{
      position: 1,
      userId: state.actor.externalSubject,
      pairName: state.displayName || "GUTO",
      avatarStage: state.progression.evolutionStage,
      xp,
      validatedWorkouts: stats.validatedWorkouts,
      currentStreak: stats.currentStreak,
      nextEvolutionXp: stats.nextEvolutionXp,
      xpToNextEvolution: stats.xpToNextEvolution,
    }],
  }
}

export async function getGutoProactive({
  language,
  force = false,
}: {
  language: SupportedLanguage
  force?: boolean
}) {
  // Proatividade ainda não foi migrada para o contrato V3. Enquanto a flag
  // estiver ativa, não consultamos nem escrevemos a autoridade legada.
  if (isGutoV3Enabled()) throwV3UnsupportedFeature("proatividade")

  const params = new URLSearchParams({ language })
  if (force) params.set("force", "1")

  return apiRequest<GutoProactiveResponse>(`/guto/proactive?${params.toString()}`, {
    method: "GET",
    timeoutMs: 30000,
    suppressAuthRedirect: true,
  })
}

// Bug fix: NÃO passar arenaGroupId hardcoded. Quando o frontend envia
// "will-personal-alpha" mas o backend salvou o profile com o teamId real do
// usuário (ex: GUTO_CORE_TEAM), o ranking vinha vazio. Sem o query param,
// o backend resolve o grupo automaticamente via getUserArenaGroup(userId).
export async function getArenaWeekly() {
  if (isGutoV3Enabled()) return getV3ArenaRanking("weekly")
  return apiRequest<ArenaRankingResponse>(`/guto/arena/weekly`, { method: "GET" })
}

export async function getArenaMonthly() {
  if (isGutoV3Enabled()) return getV3ArenaRanking("monthly")
  return apiRequest<ArenaRankingResponse>(`/guto/arena/monthly`, { method: "GET" })
}

/**
 * Individual ranking é GLOBAL no backend — todos os alunos do GUTO,
 * independente de Time. arenaGroupId é ignorado pelo servidor; aceito
 * só para compat com chamadas antigas.
 */
export async function getArenaIndividual() {
  if (isGutoV3Enabled()) return getV3ArenaRanking("individual")
  return apiRequest<ArenaRankingResponse>(
    `/guto/arena/individual`,
    { method: "GET" }
  )
}

export async function getArenaMe(userId: string) {
  if (isGutoV3Enabled()) {
    const response = await getGutoV3State(createV3RequestId())
    const state = response.state
    const stats = v3ArenaStats(state)
    return {
      userId: state.actor.externalSubject || userId,
      pairName: state.displayName || "GUTO",
      avatarStage: state.progression.evolutionStage,
      totalXp: state.progression.totalXp,
      weeklyXp: stats.weeklyXp,
      monthlyXp: stats.monthlyXp,
      currentStreak: stats.currentStreak,
      validatedWorkoutsTotal: stats.validatedWorkouts,
      nextEvolutionXp: stats.nextEvolutionXp,
      xpToNextEvolution: stats.xpToNextEvolution,
    } satisfies ArenaMyProfile
  }
  // Mesma correção: o backend resolve o arenaGroupId pelo userId autenticado
  return apiRequest<ArenaMyProfile>(
    `/guto/arena/me?userId=${encodeURIComponent(userId)}`,
    { method: "GET" }
  )
}

// ─── Diet API ─────────────────────────────────────────────────────────────────

export async function getDietPlan() {
  if (isGutoV3Enabled()) {
    return gutoV3StateToMemory(await getGutoV3State(createV3RequestId())).lastDietPlan || null
  }
  try {
    return await apiRequest<DietPlan>(`/guto/diet`, {
      method: "GET",
      timeoutMs: GUTO_DIET_READ_TIMEOUT_MS,
    })
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

export async function generateDietPlan(language: SupportedLanguage = "pt-BR") {
  if (isGutoV3Enabled()) {
    const result = await apiRequest<GutoV3StateResponse>("/guto/v3/diet/generate", {
      method: "POST",
      timeoutMs: 45000,
      body: JSON.stringify({ requestId: createV3RequestId(), language }),
    })
    const plan = gutoV3StateToMemory(result).lastDietPlan
    if (!plan) throw new ApiError("Dieta V3 não confirmada.", 409)
    return plan
  }
  return apiRequest<DietPlan>("/guto/diet/generate", {
    method: "POST",
    timeoutMs: 45000,
    body: JSON.stringify({ language }),
  })
}

// ─── Proactivity API ──────────────────────────────────────────────────────────

export type ProactiveMemoryStatus =
  | "pending_confirmation"
  | "confirmed"
  | "enriched"
  | "surfaced"
  | "pending_validation"
  | "validated_happened"
  | "validated_postponed"
  | "discarded"

export type ProactiveValidationOutcome = "happened" | "postponed" | "discarded"

export type ProactiveImpactSurface =
  | "chat"
  | "workout"
  | "mission"
  | "guto_online"
  | "push"
  | "xp"
  | "arena"
  | "path"
  | "evolution"

export type ProactiveImpactStatus = "active" | "superseded" | "discarded" | "validated"

export type ProactiveDecisionReason =
  | "health"
  | "coach_lock"
  | "travel"
  | "commitment"
  | "busy_week"
  | "short_window"
  | "clear_week"

export type ProactiveWorkoutEffect = "normal" | "short_light" | "minimal" | "ask_critical" | "protected" | "coach_locked"
export type ProactiveMissionEffect = "normal" | "reduced" | "protected_before" | "ask_critical" | "protected" | "coach_locked"
export type ProactiveBlockedPeriod = "morning" | "afternoon" | "evening" | "night" | "all_day"

export interface ProactiveDecision {
  id: string
  memoryId: string
  kind: "adapt_day" | "block_period" | "reduce_week" | "keep_normal" | "ask_critical" | "preserve_coach_lock"
  reason: ProactiveDecisionReason
  priority: number
  affectedDates: string[]
  blockedPeriod?: ProactiveBlockedPeriod
  criticalQuestion?: "date" | "period" | "health_detail" | "training"
  workoutEffect: ProactiveWorkoutEffect
  missionEffect: ProactiveMissionEffect
  message: string
  createdAt: string
}

export interface ProactiveImpact {
  id: string
  memoryId: string
  decision: ProactiveDecision
  status: ProactiveImpactStatus
  surfaces: ProactiveImpactSurface[]
  priority: number
  affectedDates: string[]
  blockedPeriod?: ProactiveBlockedPeriod
  workoutEffect: ProactiveWorkoutEffect
  missionEffect: ProactiveMissionEffect
  pushEffect: "none" | "avoid_blind_charge"
  xpEffect: "none" | "no_free_xp_context_only"
  arenaEffect: "none" | "validation_required"
  pathEffect: "none" | "adapted_context"
  evolutionEffect: "none" | "adapted_context"
  supersededBy?: string
  createdAt: string
  updatedAt: string
}

export interface GutoProactivityActionResult {
  ok: boolean
  memory?: ProactiveMemory
  impact?: ProactiveImpact | null
  fala?: string
  expectedResponse?: GutoExpectedResponse | null
  memoryPatch?: Partial<GutoMemory>
  ignored?: boolean
}

export type GutoProactiveMemoryAction =
  | { type: "confirm"; memoryId: string }
  | { type: "discard"; memoryId: string }
  | {
      type: "update"
      memoryId: string
      patch: Partial<Pick<ProactiveMemory, "understood" | "dateText" | "dateParsed" | "location">>
    }
  | { type: "validate"; memoryId: string; outcome: ProactiveValidationOutcome }
  | { type: "request_discard"; memoryId: string }
  | { type: "cancel_discard_request"; memoryId: string }

export interface ProactiveMemory {
  id: string
  userId: string
  type: "trip" | "commitment" | "schedule" | "health" | "other"
  status: ProactiveMemoryStatus
  eventKey?: string
  stage?: ProactiveMemoryStage
  sourceTurnId?: string
  confirmationStage?: "event" | "impact"
  proposedTrainingAdapted?: boolean
  trainingAdapted?: boolean
  rawText: string
  understood: string
  dateText?: string
  dateParsed?: string
  location?: string
  weatherEnrichment?: {
    city: string
    date: string
    tempMin: number
    tempMax: number
    condition: string
    conditionEn: string
    source: "wttr.in"
    fetchedAt?: string
  }
  holidayEnrichment?: Array<{
    name: string
    nameLocal: string
    date: string
    country: string
  }>
  weekKey: string
  createdAt: string
  updatedAt: string
  confirmedAt?: string
  validatedAt?: string
  discardedAt?: string
  discardRequestedAt?: string
  decision?: ProactiveDecision
  weatherFetchedAt?: string
}

/**
 * Sends conversation text to the backend for event extraction.
 * Fires silently — never throws. Returns number of extracted memories.
 */
export async function extractProactivityEvents(
  conversationText: string,
  language: SupportedLanguage
): Promise<number | null> {
  if (isGutoV3Enabled()) throwV3UnsupportedFeature("extração proativa")
  try {
    const result = await apiRequest<{ extracted: number; memories: ProactiveMemory[] }>(
      "/guto/proactivity/extract",
      {
        method: "POST",
        timeoutMs: GUTO_PROACTIVITY_ACTION_TIMEOUT_MS,
        suppressAuthRedirect: true,
        body: JSON.stringify({ conversationText, language }),
      }
    )
    return result.extracted ?? 0
  } catch {
    return null
  }
}

/**
 * Marks the weekly conversation as opened for this week.
 * Called when the Monday proactive message is delivered.
 */
export async function openWeeklyConversation(): Promise<void> {
  if (isGutoV3Enabled()) throwV3UnsupportedFeature("conversa semanal proativa")
  try {
    await apiRequest("/guto/proactivity/open-weekly", {
      method: "POST",
      timeoutMs: GUTO_PROACTIVITY_ACTION_TIMEOUT_MS,
      suppressAuthRedirect: true,
      body: JSON.stringify({}),
    })
  } catch {
    // non-critical
  }
}

/**
 * Returns active proactive memories for the current user.
 */
export async function getProactiveMemories(): Promise<ProactiveMemory[]> {
  if (isGutoV3Enabled()) throwV3UnsupportedFeature("memórias proativas")
  try {
    const result = await apiRequest<{ memories: ProactiveMemory[] }>(
      "/guto/proactivity/memories",
      {
        method: "GET",
        timeoutMs: GUTO_PROACTIVITY_READ_TIMEOUT_MS,
        suppressAuthRedirect: true,
      }
    )
    return result.memories ?? []
  } catch {
    return []
  }
}

const failedProactivityAction: GutoProactivityActionResult = { ok: false }

export async function confirmProactiveMemory(
  memoryId: string,
  trainingAdapted?: boolean
): Promise<GutoProactivityActionResult> {
  if (isGutoV3Enabled()) throwV3UnsupportedFeature("confirmação proativa")
  try {
    const result = await apiRequest<GutoProactivityActionResult>("/guto/proactivity/confirm", {
      method: "POST",
      timeoutMs: GUTO_PROACTIVITY_ACTION_TIMEOUT_MS,
      body: JSON.stringify({ memoryId, ...(typeof trainingAdapted === "boolean" ? { trainingAdapted } : {}) }),
    })
    return result
  } catch {
    return failedProactivityAction
  }
}

export async function discardProactiveMemory(
  memoryId: string,
  confirmedByUser = false
): Promise<GutoProactivityActionResult> {
  if (isGutoV3Enabled()) throwV3UnsupportedFeature("descarte proativo")
  try {
    const result = await apiRequest<GutoProactivityActionResult>("/guto/proactivity/discard", {
      method: "POST",
      timeoutMs: GUTO_PROACTIVITY_ACTION_TIMEOUT_MS,
      body: JSON.stringify({ memoryId, confirmedByUser }),
    })
    return result
  } catch {
    return failedProactivityAction
  }
}

export async function changeProactiveMemoryDate(memoryId: string): Promise<GutoProactivityActionResult> {
  if (isGutoV3Enabled()) throwV3UnsupportedFeature("alteração de data proativa")
  try {
    return await apiRequest<GutoProactivityActionResult>("/guto/proactivity/change-date", {
      method: "POST",
      timeoutMs: GUTO_PROACTIVITY_ACTION_TIMEOUT_MS,
      body: JSON.stringify({ memoryId }),
    })
  } catch {
    return failedProactivityAction
  }
}

export async function updateProactiveMemory(
  memoryId: string,
  patch: Partial<Pick<ProactiveMemory, "understood" | "dateText" | "dateParsed" | "location">>
): Promise<GutoProactivityActionResult> {
  if (isGutoV3Enabled()) throwV3UnsupportedFeature("atualização proativa")
  try {
    const result = await apiRequest<GutoProactivityActionResult>("/guto/proactivity/update", {
      method: "POST",
      timeoutMs: GUTO_PROACTIVITY_ACTION_TIMEOUT_MS,
      body: JSON.stringify({ memoryId, patch }),
    })
    return result
  } catch {
    return failedProactivityAction
  }
}

export async function validateProactiveMemory(
  memoryId: string,
  outcome: ProactiveValidationOutcome
): Promise<GutoProactivityActionResult> {
  if (isGutoV3Enabled()) throwV3UnsupportedFeature("validação proativa")
  try {
    const result = await apiRequest<GutoProactivityActionResult>("/guto/proactivity/validate", {
      method: "POST",
      timeoutMs: GUTO_PROACTIVITY_ACTION_TIMEOUT_MS,
      body: JSON.stringify({ memoryId, outcome }),
    })
    return result
  } catch {
    return failedProactivityAction
  }
}

export async function requestDiscardProactiveMemory(memoryId: string): Promise<GutoProactivityActionResult> {
  if (isGutoV3Enabled()) throwV3UnsupportedFeature("solicitação proativa de descarte")
  try {
    const result = await apiRequest<GutoProactivityActionResult>("/guto/proactivity/request-discard", {
      method: "POST",
      timeoutMs: GUTO_PROACTIVITY_ACTION_TIMEOUT_MS,
      body: JSON.stringify({ memoryId }),
    })
    return result
  } catch {
    return failedProactivityAction
  }
}

export async function cancelDiscardRequest(memoryId: string): Promise<GutoProactivityActionResult> {
  if (isGutoV3Enabled()) throwV3UnsupportedFeature("cancelamento proativo de descarte")
  try {
    const result = await apiRequest<GutoProactivityActionResult>("/guto/proactivity/cancel-discard-request", {
      method: "POST",
      timeoutMs: GUTO_PROACTIVITY_ACTION_TIMEOUT_MS,
      body: JSON.stringify({ memoryId }),
    })
    return result
  } catch {
    return failedProactivityAction
  }
}

// Exercício técnico em foco AGORA. Persistido na fonte única (GutoMemory) para
// ligar a dúvida do treino (chat) e a execução do GUTO Online ao cérebro, de modo
// que o chat nunca volte ao genérico entre mensagens.
export interface ActiveExercisePayload {
  source: "chat" | "online"
  name: string
  muscleGroup?: string
  reps?: string
  load?: string
  rest?: string
  currentSet?: number
  totalSets?: number
  note?: string
}

export async function setActiveExercise(exercise: ActiveExercisePayload): Promise<void> {
  if (isGutoV3Enabled()) throwV3UnsupportedFeature("exercício ativo legado")
  try {
    await apiRequest("/guto/active-exercise", {
      method: "POST",
      body: JSON.stringify({ exercise }),
    })
  } catch {
    // Contexto de exercício é auxiliar — nunca quebra o fluxo do chat/treino.
  }
}

export async function clearActiveExercise(): Promise<void> {
  if (isGutoV3Enabled()) throwV3UnsupportedFeature("limpeza de exercício ativo legado")
  try {
    await apiRequest("/guto/active-exercise", {
      method: "POST",
      body: JSON.stringify({ exercise: null }),
    })
  } catch {
    // silencioso.
  }
}
