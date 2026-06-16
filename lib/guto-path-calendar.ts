import type {
  GutoMemory,
  ProactiveImpact,
  ProactiveMemory,
  SupportedLanguage,
  WorkoutValidationRecord,
} from "./api/guto"
import { sumXpForDay } from "./xp-events"

export type GutoPathDayStatus =
  | "completed"
  | "adapted"
  | "protected"
  | "pending"
  | "current"
  | "missed"
  | "empty"

export type GutoPathEventKind =
  | "workout_completed"
  | "workout_adapted"
  | "day_protected"
  | "travel"
  | "pain"
  | "commitment"
  | "missed"
  | "diet"
  | "evolution"
  | "xp"
  | "pending"

export interface GutoPathEvent {
  id: string
  kind: GutoPathEventKind
  label: string
  detail?: string
  priority: number
}

export interface GutoPathDay {
  date: Date
  dateKey: string
  dayNumber: string
  weekdayLabel: string
  isCurrentMonth: boolean
  isToday: boolean
  status: GutoPathDayStatus
  xp: number
  events: GutoPathEvent[]
}

export interface GutoPathMonth {
  monthLabel: string
  weekdays: string[]
  todayKey: string
  days: GutoPathDay[]
}

const VISIBLE_MEMORY_STATUSES = new Set<ProactiveMemory["status"]>([
  "pending_confirmation",
  "confirmed",
  "enriched",
  "surfaced",
  "pending_validation",
  "validated_happened",
  "validated_postponed",
])

const VISIBLE_IMPACT_STATUSES = new Set<ProactiveImpact["status"]>(["active", "validated"])

const copy = {
  "pt-BR": {
    travelRegistered: "Viagem registrada",
    travelPending: "Viagem em confirmação",
    painRegistered: "Dor registrada",
    commitmentRegistered: "Compromisso registrado",
    scheduleChanged: "Agenda alterada",
    gutoRecord: "Registro do GUTO",
    workoutDone: "Treino concluído",
    workoutAdapted: "Treino adaptado",
    dayProtected: "Dia protegido",
    workoutMissed: "Treino perdido",
    dietFollowed: "Dieta seguida",
    evolutionMilestone: "Marco de evolução",
    xp: (amount: number) => `+${amount} XP`,
    defineTravelTraining: "Definir treino da viagem",
    defineDecision: "Decisão pendente",
  },
  "en-US": {
    travelRegistered: "Travel registered",
    travelPending: "Travel awaiting confirmation",
    painRegistered: "Pain registered",
    commitmentRegistered: "Commitment registered",
    scheduleChanged: "Schedule changed",
    gutoRecord: "GUTO record",
    workoutDone: "Workout completed",
    workoutAdapted: "Workout adapted",
    dayProtected: "Day protected",
    workoutMissed: "Workout missed",
    dietFollowed: "Diet followed",
    evolutionMilestone: "Evolution milestone",
    xp: (amount: number) => `+${amount} XP`,
    defineTravelTraining: "Define travel workout",
    defineDecision: "Decision pending",
  },
  "it-IT": {
    travelRegistered: "Viaggio registrato",
    travelPending: "Viaggio in conferma",
    painRegistered: "Dolore registrato",
    commitmentRegistered: "Impegno registrato",
    scheduleChanged: "Agenda modificata",
    gutoRecord: "Registro di GUTO",
    workoutDone: "Allenamento completato",
    workoutAdapted: "Allenamento adattato",
    dayProtected: "Giorno protetto",
    workoutMissed: "Allenamento perso",
    dietFollowed: "Dieta seguita",
    evolutionMilestone: "Tappa di evoluzione",
    xp: (amount: number) => `+${amount} XP`,
    defineTravelTraining: "Definire allenamento viaggio",
    defineDecision: "Decisione pendente",
  },
} as const

export function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseDateKey(value?: string | null): Date | null {
  if (!value) return null
  const match = value.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day), 12)
  return Number.isNaN(date.getTime()) ? null : date
}

// Fuso oficial do GUTO — DEVE espelhar config.timeZone do backend (CEREBROGUTO:
// GUTO_TIME_ZONE || TZ || "Europe/Rome"). O Percurso precisa cravar cada INSTANTE
// (createdAt da validação, "hoje", trainedToday) no MESMO dia que o backend usa em
// completedWorkoutDates/xpEvents. Fatiar o ISO em UTC (slice) cravava o treino no dia
// errado e duplicava entre validationHistory e completedWorkoutDates.
const GUTO_TIME_ZONE = process.env.NEXT_PUBLIC_GUTO_TIME_ZONE || "Europe/Rome"

// Converte um instante (Date/ISO/epoch) na data-chave YYYY-MM-DD do fuso oficial.
// Equivale ao todayKey() do backend (Intl en-CA + timeZone).
function instantToDateKey(value: Date | string | number): string | null {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: GUTO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12)
}

function startOfCalendarGrid(monthStart: Date) {
  const mondayOffset = (monthStart.getDay() + 6) % 7
  return addDays(monthStart, -mondayOffset)
}

function createDay(date: Date, month: number, language: SupportedLanguage, todayKey: string): GutoPathDay {
  const dateKey = toDateKey(date)
  return {
    date,
    dateKey,
    dayNumber: String(date.getDate()).padStart(2, "0"),
    weekdayLabel: new Intl.DateTimeFormat(language, { weekday: "short" }).format(date).toUpperCase(),
    isCurrentMonth: date.getMonth() === month,
    isToday: dateKey === todayKey,
    status: dateKey === todayKey ? "current" : "empty",
    xp: 0,
    events: [],
  }
}

function pushEvent(day: GutoPathDay | undefined, event: GutoPathEvent) {
  if (!day) return
  const key = `${event.kind}:${event.label}:${event.detail || ""}`
  if (day.events.some((item) => `${item.kind}:${item.label}:${item.detail || ""}` === key)) return
  day.events.push(event)
}

function memoryEvent(memory: ProactiveMemory, language: SupportedLanguage): GutoPathEvent {
  const text = copy[language]
  const base = {
    id: `memory:${memory.id}`,
    detail: memory.understood || memory.rawText,
    priority: memory.status === "pending_confirmation" ? 78 : 82,
  }

  if (memory.type === "trip") {
    return {
      ...base,
      kind: "travel",
      label: memory.status === "pending_confirmation" ? text.travelPending : text.travelRegistered,
    }
  }
  if (memory.type === "health") return { ...base, kind: "pain", label: text.painRegistered, priority: 86 }
  if (memory.type === "schedule") return { ...base, kind: "commitment", label: text.scheduleChanged }
  if (memory.type === "commitment") return { ...base, kind: "commitment", label: text.commitmentRegistered }
  return { ...base, kind: "commitment", label: text.gutoRecord, priority: 70 }
}

function impactEvent(impact: ProactiveImpact, language: SupportedLanguage): GutoPathEvent | null {
  const text = copy[language]
  const detail = impact.decision?.message

  if (impact.workoutEffect === "protected" || impact.missionEffect === "protected") {
    return {
      id: `impact:${impact.id}:protected`,
      kind: "day_protected",
      label: text.dayProtected,
      detail,
      priority: 96,
    }
  }

  if (impact.workoutEffect === "short_light" || impact.workoutEffect === "minimal" || impact.missionEffect === "reduced") {
    return {
      id: `impact:${impact.id}:adapted`,
      kind: "workout_adapted",
      label: text.workoutAdapted,
      detail,
      priority: 92,
    }
  }

  if (impact.workoutEffect === "ask_critical" || impact.missionEffect === "ask_critical") {
    return {
      id: `impact:${impact.id}:pending`,
      kind: "pending",
      label: impact.decision?.reason === "travel" ? text.defineTravelTraining : text.defineDecision,
      detail,
      priority: 88,
    }
  }

  return null
}

function statusFromEvents(day: GutoPathDay): GutoPathDayStatus {
  const kinds = new Set(day.events.map((event) => event.kind))
  if (kinds.has("workout_completed")) return "completed"
  if (kinds.has("day_protected")) return "protected"
  if (kinds.has("workout_adapted")) return "adapted"
  if (kinds.has("pending")) return "pending"
  if (kinds.has("missed")) return "missed"
  if (day.isToday) return "current"
  return "empty"
}

export function buildGutoPathMonth({
  language,
  memory,
  validationHistory = [],
  today = new Date(),
}: {
  language: SupportedLanguage
  memory?: GutoMemory | null
  validationHistory?: WorkoutValidationRecord[]
  today?: Date
}): GutoPathMonth {
  const todayKey = instantToDateKey(today) ?? toDateKey(today)
  const [todayYear, todayMonth, todayDay] = todayKey.split("-").map(Number)
  const monthStart = startOfMonth(new Date(todayYear, todayMonth - 1, todayDay, 12))
  const gridStart = startOfCalendarGrid(monthStart)
  const days = Array.from({ length: 42 }, (_, index) =>
    createDay(addDays(gridStart, index), monthStart.getMonth(), language, todayKey)
  )
  const byKey = new Map(days.map((day) => [day.dateKey, day]))
  const text = copy[language]

  const addWorkoutEvent = (dateKey: string, sourceId: string) => {
    const day = byKey.get(dateKey)
    pushEvent(day, {
      id: `workout:${sourceId}:${dateKey}`,
      kind: "workout_completed",
      label: text.workoutDone,
      priority: 100,
    })
  }

  for (const dateKey of memory?.completedWorkoutDates || []) {
    addWorkoutEvent(dateKey, "completed")
  }

  for (const record of validationHistory) {
    if (record.status !== "validated") continue
    const dateKey = instantToDateKey(record.createdAt)
    if (dateKey) addWorkoutEvent(dateKey, record.id)
  }

  if (memory?.trainedToday) addWorkoutEvent(todayKey, "trained-today")

  for (const dateKey of memory?.adaptedMissionDates || []) {
    pushEvent(byKey.get(dateKey), {
      id: `adapted:${dateKey}`,
      kind: "workout_adapted",
      label: text.workoutAdapted,
      priority: 90,
    })
  }

  if (memory?.adaptedMissionToday) {
    pushEvent(byKey.get(todayKey), {
      id: `adapted:today:${todayKey}`,
      kind: "workout_adapted",
      label: text.workoutAdapted,
      priority: 90,
    })
  }

  for (const dateKey of memory?.missedMissionDates || []) {
    pushEvent(byKey.get(dateKey), {
      id: `missed:${dateKey}`,
      kind: "missed",
      label: text.workoutMissed,
      priority: 64,
    })
  }

  for (const memoryItem of memory?.proactiveMemories || []) {
    if (!VISIBLE_MEMORY_STATUSES.has(memoryItem.status)) continue
    const date = parseDateKey(memoryItem.dateParsed)
    if (!date) continue
    pushEvent(byKey.get(toDateKey(date)), memoryEvent(memoryItem, language))
  }

  for (const impact of memory?.proactiveImpacts || []) {
    if (!VISIBLE_IMPACT_STATUSES.has(impact.status)) continue
    const event = impactEvent(impact, language)
    if (!event) continue
    for (const dateKey of impact.affectedDates || []) {
      pushEvent(byKey.get(dateKey), event)
    }
  }

  for (const day of days) {
    day.xp = sumXpForDay(memory, day.dateKey)
    if (day.xp > 0) {
      pushEvent(day, {
        id: `xp:${day.dateKey}:${day.xp}`,
        kind: "xp",
        label: text.xp(day.xp),
        priority: 52,
      })
    }
    day.events.sort((a, b) => b.priority - a.priority)
    day.status = statusFromEvents(day)
  }

  return {
    monthLabel: new Intl.DateTimeFormat(language, { month: "long", year: "numeric" }).format(monthStart),
    weekdays: Array.from({ length: 7 }, (_, index) =>
      new Intl.DateTimeFormat(language, { weekday: "short" }).format(addDays(gridStart, index)).toUpperCase()
    ),
    todayKey,
    days,
  }
}
