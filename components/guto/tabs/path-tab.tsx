"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { AlertCircle, Check, Flame, Lock, Quote, Zap } from "lucide-react"

import type { GutoMemory, GutoWorkoutPlan, WorkoutValidationRecord } from "@/lib/api/guto"
import { API_URL } from "@/lib/api/client"
import { GutoAvatarController } from "../guto-avatar-controller"
import { getLanguage, translations } from "../translations"
import type { EvolutionStage } from "@/types/contract"
import type { PathDay, PathDayStatus } from "../view-models"
import { getGutoVitalState } from "@/lib/guto-vital-state"
import { sumXpForDay } from "@/lib/xp-events"
import { gutoAudio } from "@/lib/audio-haptics"

interface PathTabProps {
  userName: string
  language: string
  memory?: GutoMemory | null
  workoutPlan?: GutoWorkoutPlan | null
  currentEvolution: EvolutionStage
  validationHistory?: WorkoutValidationRecord[]
}

const pathCopy = {
  "pt-BR": {
    active: "Percurso ativo",
    unlocked: "Desbloqueado",
    adapted: "Rota reduzida aceita",
    waitingMission: "Missão ainda não definida",
    waitingMissionBody: "O GUTO precisa fechar o treino no chat antes de cravar execução no caminho.",
    noXp: "0 XP hoje",
    noStreak: "Sequência ainda zerada",
    close: "FECHAR",
    xpToday: (xp: number) => `+${xp} XP hoje`,
    streakDays: "dias na sequência",
  },
  "en-US": {
    active: "Active path",
    unlocked: "Unlocked",
    adapted: "Reduced route accepted",
    waitingMission: "Mission not locked yet",
    waitingMissionBody: "GUTO needs to close the workout in chat before carving execution into the path.",
    noXp: "0 XP today",
    noStreak: "Streak still at zero",
    close: "CLOSE",
    xpToday: (xp: number) => `+${xp} XP today`,
    streakDays: "day streak",
  },
  "it-IT": {
    active: "Percorso attivo",
    unlocked: "Sbloccato",
    adapted: "Rotta ridotta accettata",
    waitingMission: "Missione non ancora definita",
    waitingMissionBody: "GUTO deve chiudere l'allenamento in chat prima di incidere l'esecuzione nel percorso.",
    noXp: "0 XP oggi",
    noStreak: "Sequenza ancora a zero",
    close: "CHIUDI",
    xpToday: (xp: number) => `+${xp} XP oggi`,
    streakDays: "giorni di fila",
  },
} as const

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function buildPathDays(
  language: string,
  memory?: GutoMemory | null,
  validationHistory?: WorkoutValidationRecord[]
): PathDay[] {
  const today = new Date()
  const todayKey = toDateKey(today)
  const completedDays = new Set(memory?.completedWorkoutDates || [])
  const validatedDays = new Set(
    (validationHistory || [])
      .filter((record) => record.status === "validated")
      .map((record) => {
        const createdAt = new Date(record.createdAt)
        return Number.isNaN(createdAt.getTime()) ? null : toDateKey(createdAt)
      })
      .filter((day): day is string => Boolean(day))
  )
  const adaptedDays = new Set(memory?.adaptedMissionDates || [])
  const missedDays = new Set(memory?.missedMissionDates || [])

  return [-2, -1, 0, 1, 2].map((offset) => {
    const date = addDays(today, offset)
    const dateKey = toDateKey(date)
    let status: PathDayStatus = "locked"

    if (completedDays.has(dateKey) || validatedDays.has(dateKey) || (offset === 0 && memory?.trainedToday)) {
      status = "completed"
    } else if (adaptedDays.has(dateKey) || (offset === 0 && memory?.adaptedMissionToday)) {
      status = "adapted"
    } else if (dateKey === todayKey) {
      status = "current"
    } else if (missedDays.has(dateKey) || date < today) {
      status = "missed"
    }

    return {
      day: String(date.getDate()).padStart(2, "0"),
      label: new Intl.DateTimeFormat(language, { weekday: "short" }).format(date).toUpperCase(),
      status,
    }
  })
}

export function PathTab({ language, memory, workoutPlan, currentEvolution, validationHistory }: PathTabProps) {
  const validLang = getLanguage(language)
  const locale = translations[validLang]
  const copy = pathCopy[validLang]
  const pathDays = useMemo(() => buildPathDays(validLang, memory, validationHistory), [memory, validLang, validationHistory])
  const currentDay = pathDays[2] ?? pathDays[0]
  const completedCount = pathDays.filter((day) => day.status === "completed").length
  const monthLabel = new Intl.DateTimeFormat(validLang, { month: "long", year: "numeric" }).format(new Date()).toUpperCase()
  const hasWorkoutPlan = Boolean(workoutPlan?.exercises?.length)
  const focus = workoutPlan?.focus || copy.waitingMission
  const streak = memory?.streak ?? 0
  const isAdaptedToday = Boolean(memory?.adaptedMissionToday)
  const todayKey = toDateKey(new Date())
  const hasValidatedToday = Boolean(
    memory?.trainedToday ||
    memory?.completedWorkoutDates?.includes(todayKey) ||
    validationHistory?.some((record) => {
      if (record.status !== "validated") return false
      const createdAt = new Date(record.createdAt)
      return !Number.isNaN(createdAt.getTime()) && toDateKey(createdAt) === todayKey
    })
  )
  // XP do dia vem do ledger (xpEvents); flags de validação ficam como piso para
  // memórias antigas sem evento datado — nunca regride o que já era exibido.
  const flagFallbackXp = hasValidatedToday ? 100 : isAdaptedToday ? 50 : 0
  const todayXp = Math.max(sumXpForDay(memory, todayKey), flagFallbackXp)
  const xpReward = todayXp > 0 ? `+${todayXp} XP` : "0 XP"
  const vitalState = useMemo(() => getGutoVitalState(memory), [memory])
  const [selectedPoster, setSelectedPoster] = useState<string | null>(null)

  const validationSectionLabel = {
    "pt-BR": "Últimos treinos validados",
    "en-US": "Last validated workouts",
    "it-IT": "Ultimi allenamenti validati",
  }[validLang]

  return (
    <div className="flex h-full min-h-0 flex-col pb-3">
      <div className="px-1 pb-4 pt-2 text-center shrink-0">
        <p className="font-mono text-[9px] font-black uppercase tracking-[0.22em] text-(--guto-cyan) mb-1">
          {monthLabel}
        </p>
        <h1 className="mx-auto max-w-[18rem] text-balance text-[1.25rem] font-black uppercase leading-tight tracking-[0.08em] text-(--guto-navy)">
          {locale.pathTitle}
        </h1>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.9rem] px-3 pb-3 pt-4">
        <div className="pointer-events-none absolute inset-0 rounded-[1.9rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.36),rgba(255,255,255,0.08))]" />
        <div className="pointer-events-none absolute inset-x-4 top-[8.6rem] h-[2px] bg-[linear-gradient(90deg,transparent,rgba(82,231,255,0.66),transparent)]" />

        <div className="relative grid grid-cols-5 items-end gap-2">
          {pathDays.map((day, index) => {
            const isCompleted = day.status === "completed"
            const isAdapted = day.status === "adapted"
            const isCurrent = day.status === "current"
            const isMissed = day.status === "missed"

            return (
              <motion.div
                key={`${day.label}-${day.day}`}
                className="flex flex-col items-center gap-1"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div
                  className={
                    isCurrent
                      ? "guto-deboss-deep grid h-[4.35rem] w-[4.35rem] place-items-center rounded-full border border-[rgba(82,231,255,0.42)]"
                      : isCompleted
                        ? "guto-deboss grid h-12 w-12 place-items-center rounded-full border border-[rgba(82,231,255,0.32)]"
                        : isAdapted
                          ? "guto-deboss grid h-12 w-12 place-items-center rounded-full border border-[rgba(117,165,211,0.24)] opacity-80"
                        : isMissed
                          ? "grid h-12 w-12 place-items-center rounded-full border border-[rgba(13,35,65,0.08)] bg-[rgba(152,163,177,0.2)] shadow-[inset_4px_4px_12px_rgba(95,105,119,0.14)]"
                          : "grid h-10 w-10 place-items-center rounded-full border border-white/60 bg-white/35 text-[rgba(13,35,65,0.28)]"
                  }
                >
                  <span
                    className={
                      isCurrent
                        ? "text-xl font-black text-[rgba(13,35,65,0.66)]"
                        : "font-mono text-sm font-black text-[rgba(13,35,65,0.46)]"
                    }
                  >
                    {day.day}
                  </span>
                </div>

                <div className="h-5">
                  {isCompleted ? (
                    <Check className="h-4 w-4 rounded-full bg-[rgba(117,165,211,0.8)] p-[2px] text-white" />
                  ) : isAdapted ? (
                    <Zap className="h-4 w-4 text-[rgba(117,165,211,0.95)]" />
                  ) : isMissed ? (
                    <AlertCircle className="h-4 w-4 text-[rgba(13,35,65,0.32)]" />
                  ) : day.status === "locked" ? (
                    <Lock className="h-3.5 w-3.5 text-[rgba(13,35,65,0.26)]" />
                  ) : null}
                </div>
              </motion.div>
            )
          })}
        </div>

        <div
          className="relative mt-3 flex flex-1 flex-col items-center justify-center transition-opacity duration-1000"
          style={{ opacity: vitalState.opacity }}
        >
          <div className="absolute h-44 w-44 rounded-full border border-[rgba(82,231,255,0.18)] bg-[radial-gradient(circle,rgba(82,231,255,0.12)_0%,transparent_64%)]" />
          <GutoAvatarController
            stage={currentEvolution}
            size="lg"
            showPlatform
            className="relative z-10"
            interactive={false}
          />
          <div className="guto-slot relative z-10 mt-[-0.4rem] rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[rgba(13,35,65,0.58)]">
            {copy.unlocked}
          </div>
        </div>

        <motion.div
          className="guto-frost-panel relative rounded-[1.75rem] px-4 py-4"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-10 place-items-center rounded-full bg-[rgba(117,165,211,0.78)] text-sm font-black text-white">
                  {currentDay.day}
                </span>
                <h2 className="truncate text-sm font-black text-(--guto-navy)">
                  {hasWorkoutPlan ? (workoutPlan?.focus || locale.pathDayLabel) : copy.waitingMission}
                </h2>
              </div>

              <div className="mt-3 space-y-2 font-mono text-[11px] leading-tight text-[rgba(13,35,65,0.64)]">
                <p className="flex items-center gap-2">
                  <Check className="h-4 w-4 rounded-full bg-[rgba(117,165,211,0.8)] p-[2px] text-white" />
                  {isAdaptedToday && !memory?.trainedToday
                    ? copy.adapted
                    : hasValidatedToday
                      ? `${locale.pathWorkoutDone} ${focus}`
                      : hasWorkoutPlan
                        ? `${copy.active}: ${focus}`
                      : copy.waitingMissionBody}
                </p>
                <p className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-[rgba(117,165,211,0.95)]" />
                  {todayXp > 0 ? copy.xpToday(todayXp) : copy.noXp}
                </p>
                <p className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-[rgba(117,165,211,0.95)]" />
                  {streak > 0 ? `+${streak} ${copy.streakDays}` : copy.noStreak}
                </p>
              </div>
            </div>

            <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.18em] text-(--guto-cyan)">
              {xpReward}
            </span>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[rgba(13,35,65,0.08)]">
            <motion.div
              className="h-full rounded-full bg-[linear-gradient(90deg,rgba(117,165,211,0.6),rgba(82,231,255,0.95))]"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, completedCount * 26 + 18)}%` }}
              transition={{ duration: 0.8, delay: 0.25 }}
            />
          </div>

          <blockquote className="mt-4 flex items-start gap-2 text-center text-xs leading-relaxed text-[rgba(13,35,65,0.66)]">
            <Quote className="mt-0.5 h-4 w-4 shrink-0 text-[rgba(117,165,211,0.56)]" />
            <span>{locale.pathQuote}</span>
          </blockquote>
        </motion.div>
      </div>

      {validationHistory && validationHistory.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-[rgba(13,35,65,0.42)]">
            {validationSectionLabel}
          </p>
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
            {validationHistory.slice(0, 5).map((record) => (
              <button
                key={record.id}
                type="button"
                onClick={() => { gutoAudio.playGutoFeedback('tap'); setSelectedPoster(`${API_URL}${record.posterUrl}`) }}
                className="shrink-0 text-left"
              >
                <div className="h-[72px] w-[54px] overflow-hidden rounded-[0.85rem] border border-[rgba(82,231,255,0.35)] bg-white/40">
                  <Image
                    src={`${API_URL}${record.thumbUrl}`}
                    alt={record.dateLabel}
                    width={54}
                    height={72}
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.08em] text-[rgba(13,35,65,0.5)]">
                  {record.dateLabel}
                </p>
                <p className="font-mono text-[8px] font-black text-(--guto-cyan)">
                  +{record.xp} XP
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Poster modal */}
      {selectedPoster && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6"
          style={{ background: "rgba(237,242,247,0.92)", backdropFilter: "blur(16px)" }}
          onClick={() => setSelectedPoster(null)}
        >
          <Image
            src={selectedPoster}
            alt="Validation poster"
            width={900}
            height={1200}
            className="max-h-[80vh] max-w-full rounded-3xl object-contain shadow-[0_8px_40px_rgba(13,35,65,0.18)]"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => { gutoAudio.playGutoFeedback('tap'); setSelectedPoster(null) }}
            className="mt-5 rounded-full border border-[rgba(82,231,255,0.4)] bg-white/70 px-8 py-2.5 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-(--guto-navy)"
            style={{ boxShadow: "0 2px 12px rgba(13,35,65,0.08)" }}
          >
            {copy.close}
          </button>
        </div>
      )}
    </div>
  )
}
