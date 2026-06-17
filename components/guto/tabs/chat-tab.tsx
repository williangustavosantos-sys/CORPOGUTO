"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import { Dumbbell, Loader2, Mic, Send, TrendingUp, UtensilsCrossed, Volume2, VolumeX } from "lucide-react"

import { getApiErrorMessage } from "@/lib/api/client"
import {
  cancelDiscardRequest,
  clearActiveExercise,
  confirmProactiveMemory,
  discardProactiveMemory,
  extractProactivityEvents,
  generateDietPlan,
  getGutoProactive,
  getProactiveMemories,
  requestDiscardProactiveMemory,
  sendGutoMessage,
  setActiveExercise,
  trackGutoEvent,
  updateProactiveMemory,
  validateProactiveMemory,
} from "@/lib/api/guto"
import type {
  DietFood,
  DietMeal,
  GutoAvatarEmotion,
  GutoExpectedResponse,
  GutoMemory,
  GutoProactiveMemoryAction,
  GutoProactivityActionResult,
  GutoWorkoutPlan,
  ProactiveMemory,
} from "@/lib/api/guto"
import {
  formatProactiveMemoryLabel,
  getActionableProactiveMemories,
  getProactiveMemoryUiCopy,
  hasActionableProactiveMemories,
} from "@/lib/guto-proactivity-ui"
import {
  appendProactivityActionFalaMessage,
  getProactivityActionMemoryPatch,
} from "@/lib/guto-proactivity-action-result"
import type { EvolutionStage, SupportedLanguage } from "@/types/contract"
import type { GutoVitalStateResult } from "@/lib/guto-vital-state"

import { GutoAvatarController } from "../guto-avatar-controller"
import { getLanguage, translations } from "../translations"
import type { MissionExercise } from "../view-models"
import { gutoAudio } from "@/lib/audio-haptics"
import { firstRealGutoName, hasCompleteGutoCalibration } from "@/lib/guto-profile"
import { GutoVoiceQueue } from "@/lib/guto-online/guto-voice-queue"
import { createChatVoiceItem } from "@/lib/guto-chat-voice"

interface PendingExerciseQuestion {
  id: string
  exercise: MissionExercise
}

interface ChatTabProps {
  userId: string
  userName: string
  language: string
  evolution?: EvolutionStage
  pendingExerciseQuestion?: PendingExerciseQuestion | null
  onExerciseQuestionHandled?: () => void
  pendingFoodQuestion?: { food: DietMeal["foods"][0]; meal: DietMeal } | null
  onFoodQuestionHandled?: () => void
  onWorkoutPlanUpdated?: (plan: GutoWorkoutPlan | null) => void
  workoutPlan?: GutoWorkoutPlan | null
  vitalState?: GutoVitalStateResult
  initialXpGranted?: boolean
  initialXpRewardSeen?: boolean
  onXpRewardSeen?: () => void
  memory?: GutoMemory | null
  onProfileUpdate?: (field: string, value: string | number) => Promise<void>
  onMemoryPatch?: (patch: Partial<GutoMemory>) => void
  onChangeLanguage?: (language: SupportedLanguage) => void
  onOpenPrivacySettings?: () => void
  isAvatarActive?: boolean
  isKeyboardOpen?: boolean
}

interface Message {
  id: string
  text: string
  isGuto: boolean
  timestamp: Date
  avatarEmotion?: GutoAvatarEmotion
}

interface BrowserSpeechRecognitionResult {
  transcript: string
}

interface BrowserSpeechRecognitionEvent {
  resultIndex: number
  results: {
    length: number
    [index: number]: {
      isFinal: boolean
      [index: number]: BrowserSpeechRecognitionResult
    }
  }
}

interface BrowserSpeechRecognitionErrorEvent {
  error?: string
}

interface BrowserSpeechRecognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor
  }
}

interface StoredChatState {
  messages: Message[]
  expectedResponse: GutoExpectedResponse | null
  expectedResponseMessageId: string | null
}

const chatCopy: Record<
  SupportedLanguage,
  {
    channel: string
    speaking: string
    micUnavailable: string
    micNoSpeech: string
    unmute: string
    mute: string
    audioFailure: string
    emptyResponseFallback: string
    connectionError: string
    xpRewardLabel: string
    xpCardTitle: string
    xpCardBody: string
    xpCardDismiss: string
    exerciseContextHint: (name: string) => string
    mealContextHint: (name: string) => string
    exerciseInputPlaceholder: string
    mealInputPlaceholder: string
    contextClear: string
    opening: (name: string) => string
    conversationActive: string
    visualMemoryHint: string
    voiceOn: string
    voiceOff: string
    quickReplyLabel: string
  }
> = {
  "pt-BR": {
    channel: "Canal do oráculo",
    speaking: "falando",
    micUnavailable: "Este navegador não liberou reconhecimento de fala aqui. Digita em uma frase curta que eu sigo contigo.",
    micNoSpeech: "Não entrou voz suficiente. Segura o microfone e fala uma frase direta.",
    unmute: "Ativar fala do GUTO",
    mute: "Silenciar fala do GUTO",
    audioFailure: "O áudio falhou. Sem perder o ritmo: escreve a mesma resposta em uma frase curta.",
    emptyResponseFallback: "Ixi, meu sistema engasgou por um segundo. Me manda de novo em uma frase que eu resolvo.",
    connectionError: "Ixi, deu um curto na conexão aqui. Aguenta aí e me manda de novo em 1 frase.",
    xpRewardLabel: "Prêmio Inicial • Guto Ativo",
    xpCardTitle: "+100 XP",
    xpCardBody:
      "Prêmio do pacto. Mesmo que você demore nos primeiros desafios, essa base fica contigo — o GUTO nunca fica com XP negativo.",
    xpCardDismiss: "Bora",
    exerciseContextHint: (name) =>
      `Manda tua dúvida sobre ${name} — eu já sei qual exercício é.`,
    mealContextHint: (name) =>
      `Manda o que precisa sobre ${name} — eu já tenho o contexto da refeição.`,
    exerciseInputPlaceholder: "Ex.: equipamento ocupado, como executar, trocar exercício…",
    mealInputPlaceholder: "Ex.: não tenho isso, quanto de substituto, trocar alimento…",
    contextClear: "Sair do contexto",
    opening: (name) => `Finalmente${name ? `, ${name}` : ""}. Tava te esperando. Enquanto isso, já organizei nosso plano daqui pra frente. Estamos juntos — bora começar?`,
    conversationActive: "Conversa ativa",
    visualMemoryHint: "Decisões aparecem no Percurso",
    voiceOn: "VOZ ON",
    voiceOff: "VOZ OFF",
    quickReplyLabel: "Resposta rápida",
  },
  "en-US": {
    channel: "Oracle channel",
    speaking: "speaking",
    micUnavailable: "This browser did not expose speech recognition here. Type one short sentence and I will keep this moving.",
    micNoSpeech: "Not enough voice came through. Hold the mic and say one direct sentence.",
    unmute: "Enable GUTO voice",
    mute: "Mute GUTO voice",
    audioFailure: "Audio failed. No need to stop — just type your answer in one short sentence.",
    emptyResponseFallback: "My system hiccuped for a second. Send it again in one sentence and I will handle it.",
    connectionError: "Connection shorted out on my side for a moment. Hold on and send it again in 1 sentence.",
    xpRewardLabel: "Initial Reward • GUTO Active",
    xpCardTitle: "+100 XP",
    xpCardBody:
      "Pact reward. Even if you take your time on the first challenges, this base stays with you — GUTO never goes below zero XP.",
    xpCardDismiss: "Let's go",
    exerciseContextHint: (name) =>
      `Send your question about ${name} — I already know which exercise this is.`,
    mealContextHint: (name) =>
      `Tell me what you need about ${name} — I already have this meal's context.`,
    exerciseInputPlaceholder: "E.g. equipment busy, how to perform, swap exercise…",
    mealInputPlaceholder: "E.g. don't have this, how much substitute, swap food…",
    contextClear: "Clear context",
    opening: (name) => `Finally${name ? `, ${name}` : ""}. I was waiting for you. In the meantime, I already organized our plan from here. I'm with you — ready to start?`,
    conversationActive: "Active conversation",
    visualMemoryHint: "Decisions appear in Journey",
    voiceOn: "VOICE ON",
    voiceOff: "VOICE OFF",
    quickReplyLabel: "Quick reply",
  },
  "it-IT": {
    channel: "Canale dell'oracolo",
    speaking: "parlando",
    micUnavailable: "Questo browser non ha esposto il riconoscimento vocale qui. Scrivi una frase breve e andiamo avanti.",
    micNoSpeech: "Non è arrivata abbastanza voce. Tieni premuto il microfono e di una frase diretta.",
    unmute: "Attiva la voce di GUTO",
    mute: "Silenzia la voce di GUTO",
    audioFailure: "Audio fallito. Senza perdere il ritmo: scrivi la stessa risposta in una frase breve.",
    emptyResponseFallback: "Mi si è inceppato il sistema per un secondo. Mandamelo di nuovo in una frase e lo sistemo.",
    connectionError: "Mi è saltata la connessione per un attimo. Aspetta un secondo e rimandamelo in 1 frase.",
    xpRewardLabel: "Premio Iniziale • GUTO Attivo",
    xpCardTitle: "+100 XP",
    xpCardBody:
      "Premio del patto. Anche se ci metti con le prime sfide, questa base resta con te — GUTO non scende mai sotto zero XP.",
    xpCardDismiss: "Andiamo",
    exerciseContextHint: (name) =>
      `Mandami il tuo dubbio su ${name} — so già quale esercizio è.`,
    mealContextHint: (name) =>
      `Dimmi cosa ti serve su ${name} — ho già il contesto del pasto.`,
    exerciseInputPlaceholder: "Es.: attrezzo occupato, come eseguire, cambiare esercizio…",
    mealInputPlaceholder: "Es.: non ce l'ho, quanto sostituto, cambiare alimento…",
    contextClear: "Esci dal contesto",
    opening: (name) => `Finalmente${name ? `, ${name}` : ""}. Ti stavo aspettando. Nel frattempo ho già organizzato il nostro piano da qui in avanti. Sono con te — iniziamo?`,
    conversationActive: "Conversazione attiva",
    visualMemoryHint: "Le decisioni appaiono nel Percorso",
    voiceOn: "VOCE ON",
    voiceOff: "VOCE OFF",
    quickReplyLabel: "Risposta rapida",
  },
}

// Set of all language variants of audioFailure — used to detect stale messages
// saved before language switch. Replaces the old STALE_AUDIO_FAILURE_TEXT constant.
const AUDIO_FAILURE_TEXTS = new Set(Object.values(chatCopy).map((c) => c.audioFailure))

const PROACTIVE_CHECK_INTERVAL_MS = 60_000
const FIRST_MESSAGE_SENT_KEY_PREFIX = "guto-first-message-sent"
const CHAT_STATE_KEY_PREFIX = "guto-chat-state"
const INITIAL_XP_REWARD_SEEN_KEY_PREFIX = "guto-initial-xp-reward-seen"
const PROACTIVITY_EXTRACTION_KEY_PREFIX = "guto-proactivity-extracted"
const ARRIVAL_BRIEFING_DELIVERED_KEY_PREFIX = "guto-arrival-delivered"
const PROACTIVITY_ACTION_KEY_PREFIX = "guto-proactivity-action"
const GUTO_OPERATIONAL_TIME_ZONE = process.env.NEXT_PUBLIC_GUTO_TIME_ZONE || "Europe/Rome"
// Minimum number of messages in chat (user + GUTO) before triggering extraction
const PROACTIVITY_MIN_MESSAGES_FOR_EXTRACTION = 2
const PROACTIVITY_SUPPRESS_AFTER_WORKOUT_MS = 10 * 60 * 1000

function getGutoDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: GUTO_OPERATIONAL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

/** Returns ISO week key "YYYY-WNN" for the given date */
function getISOWeekKey(date = new Date()): string {
  const [year, month, day] = getGutoDateKey(date).split("-").map(Number) as [number, number, number]
  const tmp = new Date(Date.UTC(year, month - 1, day))
  const dayOfWeek = tmp.getUTCDay() || 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayOfWeek)
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`
}

/** True if this week's proactivity extraction has already been triggered from this browser */
function hasExtractedThisWeek(userId: string): boolean {
  if (typeof window === "undefined") return false
  try {
    const weekKey = getISOWeekKey()
    return window.localStorage.getItem(`${PROACTIVITY_EXTRACTION_KEY_PREFIX}:${userId}:${weekKey}`) === "1"
  } catch {
    return false
  }
}

function markExtractedThisWeek(userId: string): void {
  if (typeof window === "undefined") return
  try {
    const weekKey = getISOWeekKey()
    window.localStorage.setItem(`${PROACTIVITY_EXTRACTION_KEY_PREFIX}:${userId}:${weekKey}`, "1")
  } catch {}
}

function hasDeliveredArrivalBriefing(userId: string): boolean {
  if (typeof window === "undefined") return false
  try {
    const day = getGutoDateKey()
    return window.localStorage.getItem(`${ARRIVAL_BRIEFING_DELIVERED_KEY_PREFIX}:${userId}:${day}`) === "1"
  } catch {
    return false
  }
}

function markDeliveredArrivalBriefing(userId: string): void {
  if (typeof window === "undefined") return
  try {
    const day = getGutoDateKey()
    window.localStorage.setItem(`${ARRIVAL_BRIEFING_DELIVERED_KEY_PREFIX}:${userId}:${day}`, "1")
  } catch {}
}

function hasWorkoutPlanExercises(plan?: GutoWorkoutPlan | null) {
  return Boolean(plan?.exercises?.length)
}

function hasArrivalContext(memory?: GutoMemory | null, workoutPlan?: GutoWorkoutPlan | null) {
  if (hasWorkoutPlanExercises(workoutPlan) || hasWorkoutPlanExercises(memory?.lastWorkoutPlan)) return true
  const day = getGutoDateKey()
  return Boolean(
    memory?.proactiveImpacts?.some((impact) =>
      impact.status === "active" && impact.affectedDates.some((date) => date >= day)
    )
  )
}

function getProactivityActionKey(userId: string, action: GutoProactiveMemoryAction): string {
  const outcome = action.type === "validate" ? action.outcome : "none"
  return `${PROACTIVITY_ACTION_KEY_PREFIX}:${userId}:${action.type}:${action.memoryId}:${outcome}`
}

function hasProcessedProactivityAction(storageKey: string): boolean {
  if (typeof window === "undefined") return false
  try {
    return window.localStorage.getItem(storageKey) === "1"
  } catch {
    return false
  }
}

function markProcessedProactivityAction(storageKey: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(storageKey, "1")
  } catch {}
}

function clearProcessedProactivityAction(storageKey: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(storageKey)
  } catch {}
}

function formatDisplayName(value: string) {
  return firstRealGutoName(value)
}

function normalizeAvatarEmotion(value?: string): GutoAvatarEmotion {
  return value === "alert" || value === "critical" || value === "reward" ? value : "default"
}

function getBrowserSpeechRecognition() {
  if (typeof window === "undefined") return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

function isStaleAudioFailureMessage(message: Message) {
  return message.isGuto && AUDIO_FAILURE_TEXTS.has(message.text.trim())
}

function normalizeMessageText(value: string) {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase()
}

function removeConsecutiveDuplicateGutoMessages(messages: Message[]) {
  return messages.reduce<Message[]>((cleaned, message) => {
    const previous = cleaned[cleaned.length - 1]
    const isDuplicateGuto =
      previous?.isGuto &&
      message.isGuto &&
      normalizeMessageText(previous.text) === normalizeMessageText(message.text)

    if (!isDuplicateGuto) {
      cleaned.push(message)
    }

    return cleaned
  }, [])
}

function appendMessagesWithoutDuplicateGuto(previous: Message[], nextMessages: Message[]) {
  return removeConsecutiveDuplicateGutoMessages([...previous, ...nextMessages])
}

function shouldTrackFirstMessage(userId: string) {
  if (typeof window === "undefined") return false

  try {
    const key = `${FIRST_MESSAGE_SENT_KEY_PREFIX}:${userId}`
    if (window.localStorage.getItem(key)) return false
    window.localStorage.setItem(key, new Date().toISOString())
    return true
  } catch {
    return false
  }
}

function getChatStateKey(userId: string) {
  return `${CHAT_STATE_KEY_PREFIX}:${userId}`
}

function getInitialXpRewardSeenKey(userId: string) {
  return `${INITIAL_XP_REWARD_SEEN_KEY_PREFIX}:${userId}`
}

function readInitialXpRewardSeen(userId: string) {
  if (typeof window === "undefined") return false
  try {
    return window.localStorage.getItem(getInitialXpRewardSeenKey(userId)) === "true"
  } catch {
    return false
  }
}

function writeInitialXpRewardSeen(userId: string) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(getInitialXpRewardSeenKey(userId), "true")
  } catch {}
}

function readStoredChatState(userId: string): StoredChatState | null {
  if (typeof window === "undefined") return null

  try {
    const raw = window.localStorage.getItem(getChatStateKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      messages?: Array<Omit<Message, "timestamp"> & { timestamp?: string }>
      expectedResponse?: GutoExpectedResponse | null
      expectedResponseMessageId?: string | null
    }
    const messages = Array.isArray(parsed.messages)
      ? parsed.messages
          .filter((message) => typeof message.text === "string" && typeof message.id === "string")
          .slice(-80)
          .map((message) => ({
            ...message,
            timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
          }))
      : []

    if (!messages.length) return null
    return {
      messages: removeConsecutiveDuplicateGutoMessages(
        messages.filter((message) => !isStaleAudioFailureMessage(message))
      ),
      expectedResponse: parsed.expectedResponse || null,
      expectedResponseMessageId: parsed.expectedResponseMessageId || null,
    }
  } catch {
    return null
  }
}

function writeStoredChatState(userId: string, state: StoredChatState) {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(
      getChatStateKey(userId),
      JSON.stringify({
        messages: state.messages.slice(-80).map((message) => ({
          ...message,
          timestamp: message.timestamp.toISOString(),
        })),
        expectedResponse: state.expectedResponse,
        expectedResponseMessageId: state.expectedResponseMessageId,
      })
    )
  } catch {}
}

function buildExerciseModelContext(
  exercise: MissionExercise,
  memory: GutoMemory | null | undefined,
  language: SupportedLanguage,
  workoutPlan?: GutoWorkoutPlan | null,
): string {
  const location = memory?.trainingLocation || memory?.preferredTrainingLocation || ""
  const pathology = memory?.trainingPathology?.trim() || "none"
  const planLine = workoutPlan
    ? `Today's workout: "${workoutPlan.title || workoutPlan.focus}" (${workoutPlan.dateLabel}). Focus: ${workoutPlan.focus}. Session location: ${workoutPlan.locationMode || workoutPlan.location || location}. All exercises today: ${workoutPlan.exercises.map((item) => item.name).join(", ")}.`
    : ""

  return [
    `[WORKOUT EXERCISE CONTEXT — language: ${language}]`,
    `User opened chat from the "?" button on this exercise in today's mission.`,
    `Exercise: "${exercise.name}" (canonical PT: ${exercise.canonicalNamePt || exercise.name}). Muscle group: ${exercise.muscleGroup}.`,
    `Prescription: ${exercise.sets} sets × ${exercise.reps} reps, rest ${exercise.rest}.`,
    `Execution cue: ${exercise.cue}. Coach note: ${exercise.note || "none"}.`,
    planLine,
    `User profile — training location: ${location || "from calibration"}. Goal: ${memory?.trainingGoal || "unknown"}. Level: ${memory?.trainingLevel || "unknown"}.`,
    `Sex: ${memory?.biologicalSex || "?"}, age: ${memory?.userAge ?? "?"}, weight: ${memory?.weightKg ?? "?"}kg, height: ${memory?.heightCm ?? "?"}cm.`,
    `Limitations/pathology: ${pathology}.`,
    `Reply in ${language}. If user reports busy equipment, pain, or wants a swap, suggest an equivalent for THIS muscle/group and their location. Be direct, max 2–3 short sentences.`,
  ]
    .filter(Boolean)
    .join(" ")
}

function buildDietModelContext(
  food: DietFood,
  meal: DietMeal,
  memory: GutoMemory | null | undefined,
  language: SupportedLanguage,
): string {
  const goalLabel = memory?.trainingGoal ?? "unknown"
  const countryLabel = memory?.country ?? ""
  const mealFoodsList = meal.foods.map((item) => `${item.name} (${item.quantity})`).join(", ")
  const profileStr = [
    memory?.biologicalSex,
    memory?.userAge ? `${memory.userAge}y` : "",
    memory?.heightCm ? `${memory.heightCm}cm` : "",
    memory?.weightKg ? `${memory.weightKg}kg` : "",
    countryLabel,
  ]
    .filter(Boolean)
    .join(", ")

  return [
    `[DIET CONTEXT — language: ${language} — nutrition only]`,
    `User opened chat from the food "?" button on their weekly diet plan.`,
    `Food in question: "${food.name}" (${food.quantity}, ${food.kcal ?? "?"} kcal).`,
    `Meal: "${meal.name}" (${meal.time}). Full meal: ${mealFoodsList}.`,
    `Goal: ${goalLabel}. Profile: ${profileStr || "unknown"}.`,
    `Food restrictions (what they avoid eating, incl. intolerances/allergies): ${memory?.foodRestrictions?.trim() || "none"}.`,
    `Limitations/pathology: ${memory?.trainingPathology?.trim() || "none"}.`,
    `Reply in ${language} with substitution, portion guidance, or macro impact for THIS food in THIS meal. Direct, max 2–3 short sentences.`,
  ].join(" ")
}

export function ChatTab({
  userId,
  userName,
  language,
  evolution = "baby",
  pendingExerciseQuestion,
  onExerciseQuestionHandled,
  pendingFoodQuestion,
  onFoodQuestionHandled,
  onWorkoutPlanUpdated,
  workoutPlan = null,
  vitalState,
  initialXpGranted = false,
  initialXpRewardSeen = false,
  onXpRewardSeen,
  memory,
  onMemoryPatch,
  onChangeLanguage,
  onOpenPrivacySettings,
  isAvatarActive = true,
  isKeyboardOpen = false,
}: ChatTabProps) {
  const validLang = getLanguage(language)
  const locale = translations[validLang]
  const copy = chatCopy[validLang]
  const brandName = formatDisplayName(userName || "")
  const storedChatState = useMemo(() => readStoredChatState(userId), [userId])
  const localOpeningMessage = useMemo<Message>(
    () => ({
      id: `g-local-opening-${userId}-${validLang}`,
      text: copy.opening(brandName),
      isGuto: true,
      timestamp: new Date(),
      avatarEmotion: "default",
    }),
    [brandName, copy, userId, validLang]
  )
  const calibrationComplete = hasCompleteGutoCalibration(memory)
  const initialChatState = useMemo(() => {
    if (storedChatState) return storedChatState
    if (
      calibrationComplete ||
      memory?.hasSeenChatOpening ||
      hasDeliveredArrivalBriefing(userId)
    ) {
      return {
        messages: [],
        expectedResponse: null,
        expectedResponseMessageId: null,
      }
    }
    return {
      messages: [localOpeningMessage],
      expectedResponse: null,
      expectedResponseMessageId: null,
    }
  }, [
    calibrationComplete,
    localOpeningMessage,
    memory?.hasSeenChatOpening,
    storedChatState,
    userId,
  ])

  const [messages, setMessages] = useState<Message[]>(initialChatState.messages)
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [showInitialXpCard, setShowInitialXpCard] = useState(false)
  const [contextChip, setContextChip] = useState<{ type: "exercise" | "meal"; label: string } | null>(null)
  const [proactiveMemories, setProactiveMemories] = useState<ProactiveMemory[]>([])
  const [expectedResponse, setExpectedResponse] = useState<GutoExpectedResponse | null>(initialChatState.expectedResponse)
  const [expectedResponseMessageId, setExpectedResponseMessageId] = useState<string | null>(
    initialChatState.expectedResponseMessageId
  )

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const voiceQueueRef = useRef<GutoVoiceQueue | null>(null)
  const messagesRef = useRef<Message[]>(messages)
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const speechTranscriptRef = useRef("")
  const speechResultHandledRef = useRef(false)
  const handledExerciseQuestionRef = useRef<string | null>(null)
  const activeExerciseContextRef = useRef<string | null>(null)
  const activeDietContextRef = useRef<string | null>(null)
  const handledFoodQuestionRef = useRef<string | null>(null)
  const processedProactiveActionKeysRef = useRef<Set<string>>(new Set())
  const proactiveInFlightRef = useRef(false)
  const sendInFlightRef = useRef(false)
  const lastProactiveKeyRef = useRef<string | null>(null)
  const arrivalBriefingRequestedRef = useRef(false)
  const suppressProactivityUntilRef = useRef(0)
  const dietGenerationAfterWorkoutRef = useRef(false)
  const shouldForceArrivalBriefingRef = useRef((() => {
    if (!storedChatState || storedChatState.messages.length === 0) return false
    const lastMsg = storedChatState.messages[storedChatState.messages.length - 1]
    if (!lastMsg || !lastMsg.timestamp) return true
    const timeDiff = Date.now() - new Date(lastMsg.timestamp).getTime()
    return timeDiff > 4 * 60 * 60 * 1000 // 4 hours
  })())
  const pendingExpectedResponseRef = useRef<GutoExpectedResponse | null>(initialChatState.expectedResponse)
  const pendingExpectedResponseMessageIdRef = useRef<string | null>(initialChatState.expectedResponseMessageId)
  const previousMessagesLengthRef = useRef(messages.length)

  const syncExpectedResponse = useCallback((next: GutoExpectedResponse | null, messageId: string | null) => {
    pendingExpectedResponseRef.current = next
    pendingExpectedResponseMessageIdRef.current = messageId
    setExpectedResponse(next)
    setExpectedResponseMessageId(messageId)
  }, [])

  const getVoiceQueue = useCallback(() => {
    if (!voiceQueueRef.current) {
      voiceQueueRef.current = new GutoVoiceQueue({ source: "chat" })
    }
    return voiceQueueRef.current
  }, [])

  useEffect(() => {
    if (messages.length > previousMessagesLengthRef.current) {
      const newMessages = messages.slice(previousMessagesLengthRef.current)
      if (newMessages.some((m) => m.isGuto)) {
        gutoAudio.playGutoFeedback("message")
      }
    }
    previousMessagesLengthRef.current = messages.length
  }, [messages])

  useEffect(() => {
    if (isSending) {
      gutoAudio.playGutoSound("guto_typing_loop")
    } else {
      gutoAudio.stopGutoSound("guto_typing_loop")
    }
    return () => gutoAudio.stopGutoSound("guto_typing_loop")
  }, [isSending])

  useEffect(() => {
    messagesRef.current = messages
    writeStoredChatState(userId, {
      messages,
      expectedResponse: pendingExpectedResponseRef.current,
      expectedResponseMessageId: pendingExpectedResponseMessageIdRef.current,
    })
  }, [expectedResponse, expectedResponseMessageId, messages, userId])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = window.localStorage.getItem(`guto-voice-enabled-${userId}`)
      if (stored === "false") {
        setIsMuted(true) // user explicitly disabled voice — respect that
      }
      // stored === "true" or null (new user) → keep default (unmuted)
    } catch {}
  }, [userId])


  const showInitialXpCardRef = useRef(false)
  const dismissInitialXpCardRef = useRef<(() => void) | null>(null)

  const refreshProactiveMemories = useCallback(async () => {
    const memories = await getProactiveMemories()
    setProactiveMemories(memories)
    return memories
  }, [])

  const applyProactiveActionResult = useCallback(
    (result?: GutoProactivityActionResult | null) => {
      const memoryPatch = getProactivityActionMemoryPatch(result)
      if (memoryPatch) {
        onMemoryPatch?.(memoryPatch)
      }

      const messageId = `g-proactivity-action-${Date.now()}`
      const timestamp = new Date()
      setMessages((prev) =>
        appendProactivityActionFalaMessage(prev, result, (fala) => ({
          id: messageId,
          text: fala,
          isGuto: true,
          timestamp,
          avatarEmotion: "default",
        })),
      )
    },
    [onMemoryPatch]
  )

  // Botões Sim/Não do card de proatividade: resolve de forma determinística
  // (não depende do GUTO interpretar o chat). Remove o card na hora (otimista),
  // chama a API e reconcilia com o backend.
  const resolveProactiveConfirmation = useCallback(
    async (memoryId: string, decision: "confirm" | "discard") => {
      gutoAudio.playGutoFeedback("tap")
      setProactiveMemories((prev) => prev.filter((item) => item.id !== memoryId))
      try {
        const result = decision === "confirm"
          ? await confirmProactiveMemory(memoryId)
          : await discardProactiveMemory(memoryId)
        applyProactiveActionResult(result)
      } catch {
        // silencioso — o refresh abaixo reflete o estado real do backend
      }
      await refreshProactiveMemories()
    },
    [applyProactiveActionResult, refreshProactiveMemories]
  )

  const triggerProactivityExtraction = useCallback(
    (safeLanguage: SupportedLanguage, extraMessages: Message[] = []) => {
      if (hasExtractedThisWeek(userId)) return
      const currentMessages = [...messagesRef.current, ...extraMessages]
      if (currentMessages.length < PROACTIVITY_MIN_MESSAGES_FOR_EXTRACTION) return

      const conversationText = currentMessages
        .slice(-20)
        .map((message) => `${message.isGuto ? "GUTO" : "USER"}: ${message.text}`)
        .join("\n")

      void extractProactivityEvents(conversationText, safeLanguage).then(async (extracted) => {
        if (extracted === null) return
        markExtractedThisWeek(userId)
        await refreshProactiveMemories()
      })
    },
    [refreshProactiveMemories, userId]
  )

  const handleProactiveMemoryAction = useCallback(
    async (action?: GutoProactiveMemoryAction | null) => {
      if (!action?.memoryId) return

      const storageKey = getProactivityActionKey(userId, action)
      if (processedProactiveActionKeysRef.current.has(storageKey) || hasProcessedProactivityAction(storageKey)) {
        return
      }
      processedProactiveActionKeysRef.current.add(storageKey)
      markProcessedProactivityAction(storageKey)

      try {
        let result: GutoProactivityActionResult = { ok: false }
        if (action.type === "confirm") {
          result = await confirmProactiveMemory(action.memoryId)
        } else if (action.type === "discard") {
          result = await discardProactiveMemory(action.memoryId)
        } else if (action.type === "request_discard") {
          result = await requestDiscardProactiveMemory(action.memoryId)
        } else if (action.type === "cancel_discard_request") {
          result = await cancelDiscardRequest(action.memoryId)
        } else if (action.type === "update") {
          result = await updateProactiveMemory(action.memoryId, action.patch)
        } else {
          result = await validateProactiveMemory(action.memoryId, action.outcome)
        }

        if (!result.ok) {
          processedProactiveActionKeysRef.current.delete(storageKey)
          clearProcessedProactivityAction(storageKey)
        } else {
          applyProactiveActionResult(result)
          await refreshProactiveMemories()
        }
      } catch {
        processedProactiveActionKeysRef.current.delete(storageKey)
        clearProcessedProactivityAction(storageKey)
      }
    },
    [applyProactiveActionResult, refreshProactiveMemories, userId]
  )

  useEffect(() => {
    showInitialXpCardRef.current = showInitialXpCard
  }, [showInitialXpCard])

  useEffect(() => {
    if (!initialXpGranted) return
    if (initialXpRewardSeen || readInitialXpRewardSeen(userId)) return
    setShowInitialXpCard(true)
    const successTimer = window.setTimeout(() => {
      gutoAudio.playGutoFeedback("success")
    }, 400)
    // Auto-dismiss em 6s — card de premiação não deve ficar travando o chat.
    // O dismiss aciona a chegada contextual do backend em seguida.
    const autoDismissTimer = window.setTimeout(() => {
      if (showInitialXpCardRef.current) {
        dismissInitialXpCardRef.current?.()
      }
    }, 6000)
    return () => {
      window.clearTimeout(successTimer)
      window.clearTimeout(autoDismissTimer)
    }
  }, [initialXpGranted, initialXpRewardSeen, userId])

  const clearActiveContext = useCallback(() => {
    const hadExercise = activeExerciseContextRef.current !== null
    activeExerciseContextRef.current = null
    activeDietContextRef.current = null
    setContextChip(null)
    if (hadExercise) void clearActiveExercise()
  }, [])

  const wrapWithActiveContext = useCallback((text: string) => {
    const exerciseCtx = activeExerciseContextRef.current
    if (exerciseCtx) return `${exerciseCtx} User message: ${text}`
    const dietCtx = activeDietContextRef.current
    if (dietCtx) return `${dietCtx} User question: ${text}`
    return text
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages, showInitialXpCard, contextChip])

  // BUG 3 (mobile): quando o teclado do iOS abre/fecha, o visualViewport encolhe
  // mas a lista de mensagens não re-rola sozinha — a última resposta pode ficar
  // escondida atrás do input. Re-rola ao fim em toda mudança de visualViewport
  // para manter a última mensagem visível. Seguro: só mexe no scroll da própria
  // lista, não altera layout/estrutura. (Validação final no iPhone — ver
  // docs/QA_IPHONE_FASE3.md.)
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null
    if (!vv) return
    let frame = 0
    const scrollToLatest = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        const el = scrollRef.current
        if (el) el.scrollTop = el.scrollHeight
      })
    }
    vv.addEventListener("resize", scrollToLatest)
    return () => {
      window.cancelAnimationFrame(frame)
      vv.removeEventListener("resize", scrollToLatest)
    }
  }, [])

  useEffect(() => {
    return () => {
      voiceQueueRef.current?.destroy()
    }
  }, [])

  const stopTypingLoop = useCallback(() => {
    gutoAudio.stopGutoSound("guto_typing_loop")
    setIsSending(false)
  }, [])

  const synthesizeAndPlay = useCallback((text: string, lang: string) => {
    stopTypingLoop()
    getVoiceQueue().enqueue({
      ...createChatVoiceItem(text, lang),
      onStart: () => {
        stopTypingLoop()
        setIsSpeaking(true)
      },
      onEnd: () => setIsSpeaking(false),
    })
  }, [getVoiceQueue, stopTypingLoop])

  const checkProactiveMessage = useCallback(async (forceArrivalBriefing = false) => {
    if (proactiveInFlightRef.current || sendInFlightRef.current) return
    if (showInitialXpCardRef.current) return
    if (forceArrivalBriefing && arrivalBriefingRequestedRef.current) return
    if (!forceArrivalBriefing && Date.now() < suppressProactivityUntilRef.current) return

    proactiveInFlightRef.current = true
    if (forceArrivalBriefing) {
      arrivalBriefingRequestedRef.current = true
      // Abertura demora (chamada ao modelo): liga o "GUTO digitando" (som + spinner)
      // pra não parecer travado. Só na abertura — o poll de 60s não pisca o indicador.
      setIsSending(true)
    }
    const safeLanguage = getLanguage(language) as SupportedLanguage

    try {
      const data = await getGutoProactive({
        language: safeLanguage,
        force: forceArrivalBriefing,
      })
      const fala = data.fala?.trim()
      if (!data.due || !fala) {
        if (forceArrivalBriefing) {
          syncExpectedResponse(null, null)
          markDeliveredArrivalBriefing(userId)
        }
        return
      }

      const proactiveKey = `${data.slot || "slot"}-${fala}`
      if (lastProactiveKeyRef.current === proactiveKey) return
      lastProactiveKeyRef.current = proactiveKey

      const messageId = `g-proactive-${Date.now()}`
      const gutoMessage: Message = {
        id: messageId,
        text: fala,
        isGuto: true,
        timestamp: new Date(),
        avatarEmotion: normalizeAvatarEmotion(data.avatarEmotion),
      }

      syncExpectedResponse(data.expectedResponse || null, data.expectedResponse ? messageId : null)

      setMessages((prev) => {
        if (forceArrivalBriefing && prev.length === 0) {
          return [gutoMessage]
        }

        return appendMessagesWithoutDuplicateGuto(prev, [gutoMessage])
      })

      // Propagate workout plan to mission tab
      if (data.acao === "updateWorkout" && data.workoutPlan) {
        onWorkoutPlanUpdated?.(data.workoutPlan)
      }

      if (data.slot === "arrival" || forceArrivalBriefing) {
        markDeliveredArrivalBriefing(userId)
      }

      if (!isMuted) {
        await synthesizeAndPlay(fala, safeLanguage)
      }
    } catch (error) {
      console.warn(`Proatividade do GUTO indisponível: ${getApiErrorMessage(error)}`)
    } finally {
      proactiveInFlightRef.current = false
      if (forceArrivalBriefing) setIsSending(false)
    }
  }, [isMuted, language, onWorkoutPlanUpdated, syncExpectedResponse, synthesizeAndPlay, userId])

  // Após o card +100 XP: a chegada passa pelo backend, que decide se precisa
  // abrir contexto semanal antes de missão.
  const dismissInitialXpCard = useCallback(() => {
    setShowInitialXpCard(false)
    writeInitialXpRewardSeen(userId)
    onXpRewardSeen?.()
    void checkProactiveMessage(true)
  }, [checkProactiveMessage, onXpRewardSeen, userId])

  useEffect(() => {
    dismissInitialXpCardRef.current = dismissInitialXpCard
  }, [dismissInitialXpCard])

  useEffect(() => {
    if (initialXpGranted && !initialXpRewardSeen && !readInitialXpRewardSeen(userId)) {
      return
    }
    const shouldForceArrivalBriefing = shouldForceArrivalBriefingRef.current
    shouldForceArrivalBriefingRef.current = false
    const needsContextualArrival =
      calibrationComplete &&
      !memory?.trainedToday &&
      hasArrivalContext(memory, workoutPlan) &&
      !hasDeliveredArrivalBriefing(userId)
    const needsFirstArrival =
      calibrationComplete &&
      !hasDeliveredArrivalBriefing(userId) &&
      !memory?.hasSeenChatOpening
    const needsWeeklyArrivalProbe =
      calibrationComplete &&
      !hasDeliveredArrivalBriefing(userId) &&
      Boolean(memory?.hasSeenChatOpening) &&
      !memory?.trainedToday

    void checkProactiveMessage(
      shouldForceArrivalBriefing ||
      needsFirstArrival ||
      needsContextualArrival ||
      needsWeeklyArrivalProbe,
    )

    const timer = window.setInterval(() => {
      void checkProactiveMessage()
    }, PROACTIVE_CHECK_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [
    calibrationComplete,
    checkProactiveMessage,
    initialXpGranted,
    initialXpRewardSeen,
    memory,
    workoutPlan,
    userId,
  ])

  useEffect(() => {
    if (memory?.hasSeenChatOpening) {
      markDeliveredArrivalBriefing(userId)
    }
  }, [memory?.hasSeenChatOpening, userId])

  useEffect(() => {
    if (showInitialXpCard) return
    void refreshProactiveMemories()
    const timer = window.setInterval(() => {
      void refreshProactiveMemories()
    }, PROACTIVE_CHECK_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [refreshProactiveMemories, showInitialXpCard])

  const startRecording = async () => {
    if (isSending || isRecording) return

    const SpeechRecognition = getBrowserSpeechRecognition()
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "unknown"
    let microphonePermission = "unknown"
    try {
      const permission = await navigator.permissions?.query({ name: "microphone" as PermissionName })
      microphonePermission = permission?.state || "unknown"
    } catch {
      microphonePermission = "unavailable"
    }

    console.info("[GUTO_MIC] start", {
      userAgent,
      microphonePermission,
      speechRecognitionAvailable: Boolean(SpeechRecognition),
      nativeSpeechRecognition: typeof window !== "undefined" ? Boolean(window.SpeechRecognition) : false,
      webkitSpeechRecognition: typeof window !== "undefined" ? Boolean(window.webkitSpeechRecognition) : false,
      language: getLanguage(language),
    })

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition()
        speechTranscriptRef.current = ""
        speechResultHandledRef.current = false
        recognition.lang = getLanguage(language)
        recognition.continuous = false
        recognition.interimResults = true
        recognition.maxAlternatives = 1

        recognition.onresult = (event) => {
          const parts: string[] = []
          for (let index = 0; index < event.results.length; index += 1) {
            const transcript = event.results[index]?.[0]?.transcript
            if (transcript) parts.push(transcript)
          }
          speechTranscriptRef.current = parts.join(" ").replace(/\s+/g, " ").trim()
        }

        recognition.onerror = (event) => {
          console.warn("[GUTO_MIC] recognition_error", {
            error: event.error,
            microphonePermission,
            speechRecognitionAvailable: true,
          })
        }

        recognition.onend = () => {
          setIsRecording(false)
          speechRecognitionRef.current = null
          if (speechResultHandledRef.current) return

          const transcript = speechTranscriptRef.current.trim()
          speechResultHandledRef.current = true
          if (transcript) {
            console.info("[GUTO_MIC] transcript_ready", { length: transcript.length })
            void sendTextToGuto(transcript, wrapWithActiveContext(transcript))
            return
          }

          console.info("[GUTO_MIC] no_transcript", { microphonePermission })
          setMessages((prev) => [
            ...prev,
            {
              id: `g-speech-empty-${Date.now()}`,
              text: copy.micNoSpeech,
              isGuto: true,
              timestamp: new Date(),
              avatarEmotion: "default",
            },
          ])
        }

        speechRecognitionRef.current = recognition
        recognition.start()
        setIsRecording(true)
        console.info("[GUTO_MIC] recognition_started")
        return
      } catch (error) {
        console.warn("[GUTO_MIC] recognition_start_failed", {
          error,
          microphonePermission,
          speechRecognitionAvailable: true,
        })
        speechRecognitionRef.current = null
      }
    }

    console.warn("[GUTO_MIC] speech_recognition_unavailable", {
      userAgent,
      microphonePermission,
      speechRecognitionAvailable: false,
    })
    setMessages((prev) => [
      ...prev,
      {
        id: `g-speech-unavailable-${Date.now()}`,
        text: copy.micUnavailable,
        isGuto: true,
        timestamp: new Date(),
        avatarEmotion: "default",
      },
    ])
  }

  const stopRecording = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop()
      } catch (error) {
        console.warn("[GUTO_MIC] recognition_stop_failed", { error })
      }
      return
    }

    setIsRecording(false)
  }

  const sendTextToGuto = useCallback(async (
    displayText: string,
    modelInput = displayText,
    options?: { hideUserBubble?: boolean }
  ) => {
    if (sendInFlightRef.current) return
    sendInFlightRef.current = true

    // Enviar uma nova mensagem INTERROMPE a fala atual do GUTO (não espera o TTS
    // terminar) — o usuário pode falar a qualquer momento.
    voiceQueueRef.current?.abort()
    setIsSpeaking(false)

    const safeLanguage = getLanguage(language) as SupportedLanguage

    const userMessage: Message = {
      id: `u-${Date.now()}`,
      text: displayText,
      isGuto: false,
      timestamp: new Date(),
    }

    if (!options?.hideUserBubble) {
      setMessages((prev) => [...prev, userMessage])
    }
    setInput("")
    setIsSending(true)

    if (shouldTrackFirstMessage(userId)) {
      void trackGutoEvent({
        event: "first_message_sent",
        userId,
        language: safeLanguage,
        metadata: { inputType: "text" },
      }).catch((error) => {
        console.warn(`Evento do GUTO não registrado: ${getApiErrorMessage(error)}`)
      })
    }

    try {
      const lastVisibleGuto = [...messagesRef.current].reverse().find((message) => message.isGuto)
      const expectedResponse =
        lastVisibleGuto?.id &&
        pendingExpectedResponseMessageIdRef.current === lastVisibleGuto.id
          ? pendingExpectedResponseRef.current
          : null

      const fallbackName: Record<SupportedLanguage, string> = {
        "pt-BR": "Usuário",
        "en-US": "User",
        "it-IT": "Utente",
      }

      const data = await sendGutoMessage({
        profile: { name: userName || fallbackName[safeLanguage], userId },
        input: modelInput,
        language: safeLanguage,
        history: messagesRef.current.slice(-6).map((message) => ({
          role: message.isGuto ? "model" : "user",
          parts: [{ text: message.text }],
        })),
        expectedResponse,
      })

      const fala = data?.fala?.trim() || copy.emptyResponseFallback
      const messageId = `g-${Date.now()}`
      syncExpectedResponse(data?.expectedResponse || null, data?.expectedResponse ? messageId : null)

      const gutoMessage: Message = {
        id: messageId,
        text: fala,
        isGuto: true,
        timestamp: new Date(),
        avatarEmotion: normalizeAvatarEmotion(data?.avatarEmotion),
      }

      setMessages((prev) => appendMessagesWithoutDuplicateGuto(prev, [gutoMessage]))
      if (data.acao === "updateWorkout" && data.workoutPlan) {
        onWorkoutPlanUpdated?.(data.workoutPlan)
      }
      if (data.memoryPatch && Object.keys(data.memoryPatch).length > 0) {
        onMemoryPatch?.(data.memoryPatch)
      }
      if (data.acao === "changeLanguage" && data.memoryPatch?.language) {
        const nextLang = data.memoryPatch.language as SupportedLanguage
        if (["pt-BR", "en-US", "it-IT"].includes(nextLang)) {
          onChangeLanguage?.(nextLang)
        }
      }
      if (data.acao === "requestDeleteAccount") {
        onOpenPrivacySettings?.()
      }
      void handleProactiveMemoryAction(data.proactiveMemoryAction).then(() => refreshProactiveMemories())
      stopTypingLoop()
      const closedWorkoutFlow = data.acao === "updateWorkout" || Boolean(data.workoutPlan)
      const dietReadyFromBackend = data.memoryPatch?.dietGenerationStatus === "ready_to_generate"
      if (closedWorkoutFlow) {
        suppressProactivityUntilRef.current = Date.now() + PROACTIVITY_SUPPRESS_AFTER_WORKOUT_MS
        if (dietReadyFromBackend && !dietGenerationAfterWorkoutRef.current) {
          dietGenerationAfterWorkoutRef.current = true
          void generateDietPlan(safeLanguage).catch((error) => {
            dietGenerationAfterWorkoutRef.current = false
            console.warn(`Dieta do GUTO não foi gerada após fechar treino: ${getApiErrorMessage(error)}`)
          })
        }
      }

      triggerProactivityExtraction(
        safeLanguage,
        options?.hideUserBubble ? [gutoMessage] : [userMessage, gutoMessage],
      )

      // Fala em paralelo (fire-and-forget): NÃO travar o input enquanto o GUTO
      // fala. Antes o `await` mantinha isSending=true durante toda a fala, então
      // o usuário só conseguia enviar depois que ele parava. Agora libera assim
      // que a resposta chega (o finally roda em seguida).
      if (!isMuted) {
        void synthesizeAndPlay(fala, safeLanguage)
      }
    } catch {
      syncExpectedResponse(null, null)
      stopTypingLoop()
      setMessages((prev) => [
        ...prev,
        {
          id: `g-err-${Date.now()}`,
          text: copy.connectionError,
          isGuto: true,
          timestamp: new Date(),
          avatarEmotion: "default",
        },
      ])
    } finally {
      sendInFlightRef.current = false
      setIsSending(false)
    }
  }, [
    copy,
    isMuted,
    language,
    onChangeLanguage,
    onMemoryPatch,
    onOpenPrivacySettings,
    handleProactiveMemoryAction,
    refreshProactiveMemories,
    onWorkoutPlanUpdated,
    synthesizeAndPlay,
    stopTypingLoop,
    syncExpectedResponse,
    triggerProactivityExtraction,
    userId,
    userName,
  ])

  useEffect(() => {
    if (!pendingExerciseQuestion) return
    if (handledExerciseQuestionRef.current === pendingExerciseQuestion.id) return

    handledExerciseQuestionRef.current = pendingExerciseQuestion.id
    const { exercise } = pendingExerciseQuestion
    const lang = validLang as SupportedLanguage

    activeDietContextRef.current = null
    activeExerciseContextRef.current = buildExerciseModelContext(exercise, memory, lang, workoutPlan)
    setContextChip({ type: "exercise", label: exercise.name })
    // Persiste o exercício na fonte única (GutoMemory) para o cérebro saber dele
    // entre mensagens — não some no turno seguinte (CORE §6).
    void setActiveExercise({
      source: "chat",
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      reps: String(exercise.reps),
      rest: exercise.rest,
      totalSets: exercise.sets,
      note: exercise.note || undefined,
    })

    const hintText = copy.exerciseContextHint(exercise.name)
    const hintId = `g-exercise-ctx-${pendingExerciseQuestion.id}`
    setMessages((prev) => {
      if (prev.some((message) => message.id === hintId)) return prev
      return appendMessagesWithoutDuplicateGuto(prev, [
        {
          id: hintId,
          text: hintText,
          isGuto: true,
          timestamp: new Date(),
          avatarEmotion: "default",
        },
      ])
    })

    onExerciseQuestionHandled?.()
    if (!isMuted) {
      synthesizeAndPlay(hintText, lang)
    }
    window.setTimeout(() => inputRef.current?.focus(), 120)
  }, [
    copy,
    isMuted,
    memory,
    onExerciseQuestionHandled,
    pendingExerciseQuestion,
    synthesizeAndPlay,
    validLang,
    workoutPlan,
  ])

  useEffect(() => {
    if (!pendingFoodQuestion) return
    const { food, meal } = pendingFoodQuestion
    const key = `${food.name}-${meal.id}`
    if (handledFoodQuestionRef.current === key) return
    handledFoodQuestionRef.current = key

    const lang = validLang as SupportedLanguage
    activeExerciseContextRef.current = null
    activeDietContextRef.current = buildDietModelContext(food, meal, memory, lang)
    setContextChip({ type: "meal", label: food.name })

    const hintText = copy.mealContextHint(food.name)
    const hintId = `g-meal-ctx-${meal.id}-${food.name}`
    setMessages((prev) => {
      if (prev.some((message) => message.id === hintId)) return prev
      return appendMessagesWithoutDuplicateGuto(prev, [
        {
          id: hintId,
          text: hintText,
          isGuto: true,
          timestamp: new Date(),
          avatarEmotion: "default",
        },
      ])
    })

    onFoodQuestionHandled?.()
    if (!isMuted) {
      synthesizeAndPlay(hintText, lang)
    }
    window.setTimeout(() => inputRef.current?.focus(), 120)
  }, [
    copy,
    isMuted,
    memory,
    onFoodQuestionHandled,
    pendingFoodQuestion,
    synthesizeAndPlay,
    validLang,
  ])

  const handleSend = async () => {
    if (!input.trim() || isSending) return
    const text = input.trim()
    await sendTextToGuto(text, wrapWithActiveContext(text))
  }

  const resolveQuickReplyModelInput = useCallback(
    (option: string, response: GutoExpectedResponse | null) => {
      if (response?.context !== "travel_training") return option
      const normalized = option
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLocaleLowerCase(validLang)
      const isYes = normalized === "sim" || normalized === "yes" || normalized === "si"
      const positive: Record<SupportedLanguage, string> = {
        "pt-BR": "consigo treinar na viagem",
        "en-US": "I can train during the trip",
        "it-IT": "riesco ad allenarmi in viaggio",
      }
      const negative: Record<SupportedLanguage, string> = {
        "pt-BR": "não vou conseguir treinar na viagem",
        "en-US": "I cannot train during the trip",
        "it-IT": "non riesco ad allenarmi in viaggio",
      }
      return isYes ? positive[validLang as SupportedLanguage] : negative[validLang as SupportedLanguage]
    },
    [validLang]
  )

  const handleQuickReply = useCallback(
    async (option: string, response: GutoExpectedResponse) => {
      if (isSending) return
      const displayText = option.trim()
      const modelText = resolveQuickReplyModelInput(displayText, response)
      await sendTextToGuto(displayText, wrapWithActiveContext(modelText))
    },
    [isSending, resolveQuickReplyModelInput, sendTextToGuto, wrapWithActiveContext]
  )

  const visibleMessages = messages
  const latestGutoMessage = [...messages].reverse().find((message) => message.isGuto)
  const activeExpectedResponse =
    expectedResponse && expectedResponseMessageId && latestGutoMessage?.id === expectedResponseMessageId
      ? expectedResponse
      : null
  const quickReplyOptions = activeExpectedResponse?.options?.filter((option) => option.trim()) ?? []
  const proactiveUi = useMemo(() => getProactiveMemoryUiCopy(validLang), [validLang])
  const actionableProactive = useMemo(
    () => getActionableProactiveMemories(proactiveMemories),
    [proactiveMemories]
  )
  const showProactiveBanner =
    !showInitialXpCard && hasActionableProactiveMemories(proactiveMemories)
  const inputPlaceholder =
    contextChip?.type === "exercise"
      ? copy.exerciseInputPlaceholder
      : contextChip?.type === "meal"
        ? copy.mealInputPlaceholder
        : locale.placeholder

  // Dock inferior (banner proativo + context chip + input) empilhado e ancorado
  // no rodapé. Medimos a altura pra a lista de mensagens nunca ficar atrás dele.
  const dockRef = useRef<HTMLDivElement>(null)
  const [dockHeight, setDockHeight] = useState(72)
  useEffect(() => {
    const el = dockRef.current
    if (!el) return
    const update = () => setDockHeight(el.offsetHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="guto-chat-stage relative h-full min-h-0 overflow-hidden">
      <div className="guto-top-strip absolute left-0 top-[1.03%] z-40 h-[9.27%] w-full border-y border-(--guto-cyan)">
        <div className="guto-chat-brand" aria-label={brandName ? `GUTO e ${brandName}` : "GUTO"}>
          <Image
            src="/assets/guto/logo_guto.png"
            alt="GUTO"
            width={104}
            height={33}
            priority
            className="guto-chat-brand-logo"
            style={{ height: "auto" }}
          />
        </div>
        {brandName && (
          <div className="guto-chat-partner">
            <span className="guto-chat-partner-amp" aria-hidden="true">
              &
            </span>
            <span className="guto-chat-partner-name">{brandName}</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          gutoAudio.playGutoFeedback("tap")
          setIsMuted((prev) => {
            const next = !prev
            try {
              window.localStorage.setItem(`guto-voice-enabled-${userId}`, next ? "false" : "true")
            } catch {}

            if (next) {
              voiceQueueRef.current?.abort()
              setIsSpeaking(false)
            } else if (!next) {
              const testPhrases: Record<SupportedLanguage, string> = {
                "pt-BR": "Voz ativada. Agora eu estou contigo.",
                "en-US": "Voice enabled. I am with you now.",
                "it-IT": "Voce attivata. Ora sono con te."
              }
              const phrase = testPhrases[validLang as SupportedLanguage] || testPhrases["pt-BR"]
              void synthesizeAndPlay(phrase, validLang as SupportedLanguage)
            }
            return next
          })
        }}
        className="guto-chat-sound-toggle absolute z-40"
        data-audio-active={!isMuted}
        aria-label={isMuted ? copy.unmute : copy.mute}
        aria-pressed={!isMuted}
      >
        {isMuted ? <VolumeX className="h-[18px] w-[18px]" /> : <Volume2 className="h-[18px] w-[18px]" />}
      </button>

      {/* Card +100 XP — overlay centralizado em cima do avatar. */}
      <AnimatePresence>
        {showInitialXpCard && (
          <motion.div
            key="initial-xp-card"
            className="absolute inset-x-0 top-[clamp(96px,18%,160px)] z-[60] flex justify-center px-6 pointer-events-none"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.32 } }}
            transition={{ duration: 0.42, ease: [0.4, 0, 0.2, 1] }}
          >
            <motion.div
              role="dialog"
              aria-live="polite"
              aria-label={copy.xpCardTitle}
              className="guto-xp-card pointer-events-auto w-full max-w-[20rem] rounded-[26px] border-2 border-[rgba(82,231,255,0.85)] px-6 py-5 text-center shadow-[0_24px_60px_rgba(82,231,255,0.32)]"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(228,248,255,0.95) 100%)",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
              }}
              initial={{ scale: 0.86 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.36, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <div className="mb-2 flex justify-center text-(--guto-cyan)">
                <TrendingUp className="h-12 w-12 stroke-[2.6]" aria-hidden />
              </div>
              <div
                className="text-[clamp(36px,11vw,52px)] font-black italic leading-none tracking-tight text-(--guto-cyan)"
                style={{
                  textShadow:
                    "0 0 18px rgba(82,231,255,0.46), 0 2px 0 rgba(13,35,65,0.06)",
                }}
              >
                {copy.xpCardTitle}
              </div>
              <p className="mt-3 font-mono text-[clamp(11px,2.8vw,13px)] font-bold leading-snug text-(--guto-navy)">
                {copy.xpCardBody}
              </p>
              <div className="mt-2 font-mono text-[9px] font-black uppercase tracking-[0.22em] text-[rgba(13,35,65,0.55)]">
                {copy.xpRewardLabel}
              </div>
              <button
                type="button"
                onClick={() => {
                  gutoAudio.playGutoFeedback("tap")
                  dismissInitialXpCard()
                }}
                className="guto-big-touch mt-4 w-full rounded-full border border-[rgba(82,231,255,0.6)] bg-[rgba(82,231,255,0.18)] px-4 py-2.5 font-mono text-[12px] font-black uppercase tracking-[0.16em] text-(--guto-navy)"
              >
                {copy.xpCardDismiss}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isKeyboardOpen && (
        <div className="guto-chat-presence absolute z-30">
          <div className="flex items-center gap-3 rounded-[22px] border border-[rgba(82,231,255,0.38)] bg-white/80 px-3 py-2 shadow-[0_14px_34px_rgba(82,231,255,0.12)] backdrop-blur-[18px]">
            <div
              className="guto-chat-presence-avatar flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full"
              style={{ opacity: vitalState?.opacity ?? 1 }}
            >
              <GutoAvatarController
                stage={evolution}
                size="sm"
                showPlatform={false}
                isActive={isAvatarActive}
                interactive={false}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-(--guto-cyan)">
                {copy.conversationActive}
              </p>
              <p className="mt-1 truncate text-[12px] font-black leading-tight text-(--guto-navy)">
                {brandName ? `GUTO & ${brandName}` : "GUTO"}
              </p>
              <p className="mt-0.5 truncate font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-[rgba(13,35,65,0.44)]">
                {copy.visualMemoryHint}
              </p>
            </div>
            <span
              className="shrink-0 rounded-full border border-[rgba(82,231,255,0.36)] px-2.5 py-1 font-mono text-[9px] font-black uppercase tracking-[0.08em] text-[rgba(13,35,65,0.58)]"
              aria-hidden="true"
            >
              {isMuted ? copy.voiceOff : copy.voiceOn}
            </span>
          </div>
        </div>
      )}

      {/* Mensagens — camada principal da aba GUTO: histórico natural, não vitrine do avatar. */}
      <div
        ref={scrollRef}
        className="guto-chat-list absolute left-0 right-0 z-30 overflow-y-auto px-5 pb-3 pt-1"
        style={{
          top: "calc(var(--guto-chat-header-top) + var(--guto-chat-header-height) + 92px)",
          bottom: `calc(var(--guto-chat-input-bottom) + ${dockHeight + 16}px)`,
        }}
      >
        <motion.div className="flex min-h-full flex-col justify-end gap-2.5">
          {visibleMessages.map((message) => (
            <motion.div
              key={message.id}
              data-testid={message.isGuto ? "guto-message" : "user-message"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={
                message.isGuto
                  ? "mr-auto w-fit max-w-[82%] rounded-[20px] border border-[rgba(82,231,255,0.62)] px-4 py-3 text-left font-mono text-[clamp(11px,2.8vw,13px)] font-black leading-snug text-(--guto-navy)"
                  : "ml-auto w-fit max-w-[78%] rounded-[18px] border border-white/80 bg-white/90 px-4 py-2 text-right text-xs font-semibold leading-snug text-[rgba(13,35,65,0.68)] shadow-[0_12px_26px_rgba(137,151,168,0.1)]"
              }
              style={message.isGuto ? {
                background: "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(248,251,255,0.82) 100%)",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.96), 0 8px 32px rgba(82,231,255,0.10), 0 2px 12px rgba(13,35,65,0.06)",
              } : undefined}
            >
              {message.text}
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Dock inferior: banner proativo + context chip + input, empilhados e
          ancorados no rodapé. Nada se sobrepõe e a lista de mensagens (acima)
          mede a altura deste dock pra nunca ficar atrás dele. */}
      <div
        ref={dockRef}
        className="absolute left-[8.46%] z-50 flex w-[81.34%] flex-col gap-2"
        style={{ bottom: "var(--guto-chat-input-bottom)" }}
      >
      {showProactiveBanner && !isKeyboardOpen && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-h-[42vh] w-full overflow-y-auto rounded-[16px] border border-[rgba(82,231,255,0.4)] bg-white/95 px-3 py-2 shadow-[0_8px_24px_rgba(82,231,255,0.18)]"
        >
          <p className="mb-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(13,35,65,0.55)]">
            {actionableProactive.pendingConfirmation.length > 0
              ? proactiveUi.hintConfirm
              : actionableProactive.awaitingDiscard.length > 0
                ? proactiveUi.hintConfirm
                : proactiveUi.hintValidate}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {actionableProactive.pendingConfirmation.map((memory) => (
              <div key={memory.id} className="flex w-full flex-col gap-1.5">
                <span className="self-start rounded-full border border-[rgba(255,193,7,0.55)] bg-[rgba(255,243,205,0.9)] px-2.5 py-1 font-mono text-[9px] font-black uppercase tracking-[0.06em] text-(--guto-navy)">
                  {memory.type === "trip"
                    ? `${proactiveUi.pendingTrip} • ${formatProactiveMemoryLabel(memory)}`
                    : proactiveUi.pendingConfirm(formatProactiveMemoryLabel(memory))}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => void resolveProactiveConfirmation(memory.id, "confirm")}
                    className="rounded-full bg-(--guto-cyan) px-3 py-1.5 font-mono text-[10px] font-black uppercase tracking-[0.08em] text-(--guto-navy)"
                  >
                    {proactiveUi.btnYes}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      gutoAudio.playGutoFeedback("tap")
                      inputRef.current?.focus()
                    }}
                    className="rounded-full border border-[rgba(82,231,255,0.5)] bg-white px-3 py-1.5 font-mono text-[10px] font-black uppercase tracking-[0.08em] text-(--guto-cyan)"
                  >
                    {proactiveUi.btnFix}
                  </button>
                  <button
                    type="button"
                    onClick={() => void resolveProactiveConfirmation(memory.id, "discard")}
                    className="rounded-full border border-[rgba(13,35,65,0.25)] bg-white px-3 py-1.5 font-mono text-[10px] font-black uppercase tracking-[0.08em] text-[rgba(13,35,65,0.7)]"
                  >
                    {proactiveUi.btnNo}
                  </button>
                </div>
              </div>
            ))}
            {actionableProactive.awaitingDiscard.map((memory) => (
              <span
                key={memory.id}
                className="rounded-full border border-[rgba(255,120,80,0.45)] bg-[rgba(255,235,228,0.92)] px-2.5 py-1 font-mono text-[9px] font-black uppercase tracking-[0.06em] text-(--guto-navy)"
              >
                {proactiveUi.pendingConfirm(formatProactiveMemoryLabel(memory))}
              </span>
            ))}
            {actionableProactive.pendingValidation.map((memory) => (
              <span
                key={memory.id}
                className="rounded-full border border-[rgba(82,231,255,0.55)] bg-[rgba(230,252,255,0.92)] px-2.5 py-1 font-mono text-[9px] font-black uppercase tracking-[0.06em] text-(--guto-navy)"
              >
                {proactiveUi.pendingValidate(formatProactiveMemoryLabel(memory))}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {quickReplyOptions.length > 0 && activeExpectedResponse && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex w-full flex-wrap gap-2 rounded-[18px] border border-[rgba(82,231,255,0.38)] bg-white/92 p-2 shadow-[0_8px_24px_rgba(82,231,255,0.14)]"
        >
          <span className="sr-only">{copy.quickReplyLabel}</span>
          {quickReplyOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => void handleQuickReply(option, activeExpectedResponse)}
              disabled={isSending}
              className="min-h-11 flex-1 rounded-full border border-[rgba(82,231,255,0.62)] bg-[rgba(82,231,255,0.16)] px-4 py-2 font-mono text-[11px] font-black uppercase tracking-[0.16em] text-(--guto-navy) shadow-[0_0_14px_rgba(82,231,255,0.18)] disabled:opacity-45"
            >
              {option}
            </button>
          ))}
        </motion.div>
      )}

      {contextChip && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex w-full items-center justify-between gap-2 rounded-full border border-[rgba(82,231,255,0.45)] bg-white/90 px-3 py-1.5 shadow-[0_8px_24px_rgba(82,231,255,0.12)]"
        >
          <span className="flex min-w-0 items-center gap-1.5 truncate font-mono text-[10px] font-black uppercase tracking-[0.08em] text-(--guto-navy)">
            {contextChip.type === "exercise" ? (
              <Dumbbell className="h-3.5 w-3.5 shrink-0 text-(--guto-cyan)" aria-hidden="true" />
            ) : (
              <UtensilsCrossed className="h-3.5 w-3.5 shrink-0 text-(--guto-cyan)" aria-hidden="true" />
            )}
            <span className="truncate">{contextChip.label}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              gutoAudio.playGutoFeedback("tap")
              clearActiveContext()
            }}
            className="shrink-0 font-mono text-[9px] font-black uppercase tracking-[0.1em] text-(--guto-cyan)"
          >
            {copy.contextClear}
          </button>
        </motion.div>
      )}

      <div className="w-full">
        <div className="guto-chat-input h-[58px] rounded-[18px] px-3 py-2">
          <div className="flex h-[42px] items-center gap-3">
            <motion.button
              type="button"
              onPointerDown={() => {
                gutoAudio.playGutoFeedback("tap")
                startRecording()
              }}
              onPointerUp={stopRecording}
              onPointerLeave={() => isRecording && stopRecording()}
              disabled={isSending}
              className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full text-(--guto-cyan)"
              animate={isRecording ? { scale: [1, 1.08, 1] } : { scale: 1 }}
              transition={{ duration: 0.8, repeat: isRecording ? Infinity : 0 }}
              aria-label="Microfone"
            >
              <Mic className="h-[28px] w-[28px]" style={{ color: isRecording ? "#c03535" : "var(--guto-cyan)" }} />
            </motion.button>

            <input
              ref={inputRef}
              type="text"
              placeholder={inputPlaceholder}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.repeat) return
                event.preventDefault()
                void handleSend()
              }}
              className="min-w-0 flex-1 bg-transparent text-center text-[16px] font-semibold leading-none tracking-normal text-(--guto-navy) outline-none placeholder:text-[#a6aeb1]"
            />

            <motion.button
              type="button"
              onClick={() => {
                gutoAudio.playGutoFeedback("tap")
                void handleSend()
              }}
              disabled={isSending || !input.trim()}
              className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full text-(--guto-cyan) disabled:opacity-35"
              whileTap={{ scale: isSending ? 1 : 0.94 }}
              aria-label="Enviar mensagem"
            >
              {isSending ? <Loader2 className="h-[24px] w-[24px] animate-spin" /> : <Send className="h-[27px] w-[27px]" />}
            </motion.button>
          </div>
        </div>

        {isSpeaking && !isMuted && (
          <div className="mt-1 text-center font-mono text-[9px] uppercase tracking-normal text-(--guto-cyan)">
            {copy.speaking}
          </div>
        )}
        </div>
      </div>

    </div>
  )
}
