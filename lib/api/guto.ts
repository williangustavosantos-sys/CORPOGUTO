import { apiRequest, ApiError } from "./client"

export type SupportedLanguage = "pt-BR" | "it-IT" | "en-US"
export type WorkoutLocationMode = "gym" | "home" | "park"

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
  | "updateWorkout"
  | "generateDiet"
  | "swapExercise"
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
  profile: {
    name: string
    userId?: string
    streak?: number
    trainedToday?: boolean
    energyLast?: string
  }
  input: string
  language: SupportedLanguage
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
}

export async function sendGutoMessage(payload: SendGutoMessageRequest) {
  return apiRequest<SendGutoMessageResponse>("/guto", {
    method: "POST",
    timeoutMs: 35000,
    body: JSON.stringify(payload),
  })
}

export async function setGutoActiveContext(context: ActiveContext | null) {
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
  return apiRequest<GutoMemory>("/guto/memory", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function getGutoMemory() {
  return apiRequest<GutoMemory>(`/guto/memory`, {
    method: "GET",
    suppressAuthRedirect: true,
  })
}

// Fase 2A — persiste o ACEITE de consentimento no backend (fonte de verdade).
// Retorna a memória atualizada (com consentHealthFitness/acceptedTerms/consentAcceptedAt).
export async function acceptGutoConsent() {
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

export async function getGutoProactive({
  language,
  force = false,
}: {
  language: SupportedLanguage
  force?: boolean
}) {
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
  return apiRequest<ArenaRankingResponse>(`/guto/arena/weekly`, { method: "GET" })
}

export async function getArenaMonthly() {
  return apiRequest<ArenaRankingResponse>(`/guto/arena/monthly`, { method: "GET" })
}

/**
 * Individual ranking é GLOBAL no backend — todos os alunos do GUTO,
 * independente de Time. arenaGroupId é ignorado pelo servidor; aceito
 * só para compat com chamadas antigas.
 */
export async function getArenaIndividual() {
  return apiRequest<ArenaRankingResponse>(
    `/guto/arena/individual`,
    { method: "GET" }
  )
}

export async function getArenaMe(userId: string) {
  // Mesma correção: o backend resolve o arenaGroupId pelo userId autenticado
  return apiRequest<ArenaMyProfile>(
    `/guto/arena/me?userId=${encodeURIComponent(userId)}`,
    { method: "GET" }
  )
}

// ─── Diet API ─────────────────────────────────────────────────────────────────

export async function getDietPlan() {
  try {
    return await apiRequest<DietPlan>(`/guto/diet`, {
      method: "GET",
    })
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

export async function generateDietPlan(language: SupportedLanguage = "pt-BR") {
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
  try {
    const result = await apiRequest<{ extracted: number; memories: ProactiveMemory[] }>(
      "/guto/proactivity/extract",
      {
        method: "POST",
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
  try {
    await apiRequest("/guto/proactivity/open-weekly", {
      method: "POST",
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
  try {
    const result = await apiRequest<{ memories: ProactiveMemory[] }>(
      "/guto/proactivity/memories",
      { method: "GET", suppressAuthRedirect: true }
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
  try {
    const result = await apiRequest<GutoProactivityActionResult>("/guto/proactivity/confirm", {
      method: "POST",
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
  try {
    const result = await apiRequest<GutoProactivityActionResult>("/guto/proactivity/discard", {
      method: "POST",
      body: JSON.stringify({ memoryId, confirmedByUser }),
    })
    return result
  } catch {
    return failedProactivityAction
  }
}

export async function changeProactiveMemoryDate(memoryId: string): Promise<GutoProactivityActionResult> {
  try {
    return await apiRequest<GutoProactivityActionResult>("/guto/proactivity/change-date", {
      method: "POST",
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
  try {
    const result = await apiRequest<GutoProactivityActionResult>("/guto/proactivity/update", {
      method: "POST",
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
  try {
    const result = await apiRequest<GutoProactivityActionResult>("/guto/proactivity/validate", {
      method: "POST",
      body: JSON.stringify({ memoryId, outcome }),
    })
    return result
  } catch {
    return failedProactivityAction
  }
}

export async function requestDiscardProactiveMemory(memoryId: string): Promise<GutoProactivityActionResult> {
  try {
    const result = await apiRequest<GutoProactivityActionResult>("/guto/proactivity/request-discard", {
      method: "POST",
      body: JSON.stringify({ memoryId }),
    })
    return result
  } catch {
    return failedProactivityAction
  }
}

export async function cancelDiscardRequest(memoryId: string): Promise<GutoProactivityActionResult> {
  try {
    const result = await apiRequest<GutoProactivityActionResult>("/guto/proactivity/cancel-discard-request", {
      method: "POST",
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
  try {
    await apiRequest("/guto/active-exercise", {
      method: "POST",
      body: JSON.stringify({ exercise: null }),
    })
  } catch {
    // silencioso.
  }
}
