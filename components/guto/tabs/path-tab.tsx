"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Clock3,
  Plane,
  RotateCcw,
  Shield,
  Trophy,
  UtensilsCrossed,
  X,
  Zap,
} from "lucide-react"

import { API_URL } from "@/lib/api/client"
import {
  changeProactiveMemoryDate,
  confirmProactiveMemory,
  discardProactiveMemory,
} from "@/lib/api/guto"
import type { GutoMemory, GutoWorkoutPlan, WorkoutValidationRecord } from "@/lib/api/guto"
import {
  buildGutoPathMonth,
  type GutoPathDayStatus,
  type GutoPathEvent,
} from "@/lib/guto-path-calendar"
import { gutoAudio } from "@/lib/audio-haptics"
import type { EvolutionStage } from "@/types/contract"

import { getLanguage, translations } from "../translations"

interface PathTabProps {
  userName: string
  language: string
  memory?: GutoMemory | null
  workoutPlan?: GutoWorkoutPlan | null
  currentEvolution: EvolutionStage
  validationHistory?: WorkoutValidationRecord[]
  onMemoryPatch?: (patch: Partial<GutoMemory>) => void
  onOpenChat?: () => void
}

const pathCopy = {
  "pt-BR": {
    memory: "Memória visual",
    today: "Hoje",
    selected: "Dia selecionado",
    emptyTitle: "Nenhum evento registrado",
    emptyBody: "Quando você falar de viagem, dor, adaptação, treino ou dieta, o GUTO deixa a decisão marcada aqui.",
    missionReady: "Missão do dia pronta",
    xpToday: (xp: number) => `+${xp} XP hoje`,
    noXp: "0 XP hoje",
    streakDays: "dias na sequência",
    noStreak: "Sequência ainda zerada",
    close: "FECHAR",
    validated: "Últimos treinos validados",
    alter: "ALTERAR",
    changeDate: "DATA",
    adaptedYes: "TREINO SIM",
    adaptedNo: "TREINO NÃO",
    cancelTrip: "CANCELAR",
    status: {
      completed: "Treino concluído",
      adapted: "Treino adaptado",
      protected: "Dia protegido",
      pending: "Decisão pendente",
      current: "Hoje",
      missed: "Treino perdido",
      empty: "Sem evento",
    },
  },
  "en-US": {
    memory: "Visual memory",
    today: "Today",
    selected: "Selected day",
    emptyTitle: "No event registered",
    emptyBody: "When you mention travel, pain, adaptation, workout, or diet, GUTO keeps the decision visible here.",
    missionReady: "Daily mission ready",
    xpToday: (xp: number) => `+${xp} XP today`,
    noXp: "0 XP today",
    streakDays: "day streak",
    noStreak: "Streak still at zero",
    close: "CLOSE",
    validated: "Last validated workouts",
    alter: "CHANGE",
    changeDate: "DATE",
    adaptedYes: "WORKOUT YES",
    adaptedNo: "WORKOUT NO",
    cancelTrip: "CANCEL",
    status: {
      completed: "Workout completed",
      adapted: "Workout adapted",
      protected: "Day protected",
      pending: "Decision pending",
      current: "Today",
      missed: "Workout missed",
      empty: "No event",
    },
  },
  "it-IT": {
    memory: "Memoria visiva",
    today: "Oggi",
    selected: "Giorno selezionato",
    emptyTitle: "Nessun evento registrato",
    emptyBody: "Quando parli di viaggio, dolore, adattamento, allenamento o dieta, GUTO lascia qui la decisione visibile.",
    missionReady: "Missione del giorno pronta",
    xpToday: (xp: number) => `+${xp} XP oggi`,
    noXp: "0 XP oggi",
    streakDays: "giorni di fila",
    noStreak: "Sequenza ancora a zero",
    close: "CHIUDI",
    validated: "Ultimi allenamenti validati",
    alter: "MODIFICA",
    changeDate: "DATA",
    adaptedYes: "ALLENAMENTO SÌ",
    adaptedNo: "ALLENAMENTO NO",
    cancelTrip: "ANNULLA",
    status: {
      completed: "Allenamento completato",
      adapted: "Allenamento adattato",
      protected: "Giorno protetto",
      pending: "Decisione pendente",
      current: "Oggi",
      missed: "Allenamento perso",
      empty: "Nessun evento",
    },
  },
} as const

function PathEventIcon({ event, className = "h-4 w-4" }: { event: Pick<GutoPathEvent, "kind">; className?: string }) {
  if (event.kind === "workout_completed") return <Check className={className} aria-hidden="true" />
  if (event.kind === "workout_adapted") return <RotateCcw className={className} aria-hidden="true" />
  if (event.kind === "day_protected") return <Shield className={className} aria-hidden="true" />
  if (event.kind === "travel") return <Plane className={className} aria-hidden="true" />
  if (event.kind === "pain") return <AlertTriangle className={className} aria-hidden="true" />
  if (event.kind === "commitment") return <CalendarDays className={className} aria-hidden="true" />
  if (event.kind === "missed") return <X className={className} aria-hidden="true" />
  if (event.kind === "diet") return <UtensilsCrossed className={className} aria-hidden="true" />
  if (event.kind === "evolution") return <Trophy className={className} aria-hidden="true" />
  if (event.kind === "pending") return <Clock3 className={className} aria-hidden="true" />
  return <Zap className={className} aria-hidden="true" />
}

function statusClasses(status: GutoPathDayStatus, selected: boolean) {
  const base =
    "min-h-[48px] rounded-[1rem] border px-1.5 py-1.5 text-left transition active:scale-[0.98]"
  const selectedClasses = selected
    ? " border-[rgba(82,231,255,0.86)] bg-[rgba(82,231,255,0.17)] shadow-[0_0_18px_rgba(82,231,255,0.18)]"
    : ""

  if (status === "completed") {
    return `${base} border-[rgba(82,231,255,0.46)] bg-white/78${selectedClasses}`
  }
  if (status === "adapted") {
    return `${base} border-[rgba(82,231,255,0.42)] bg-[rgba(230,252,255,0.72)]${selectedClasses}`
  }
  if (status === "protected") {
    return `${base} border-[rgba(255,181,71,0.52)] bg-[rgba(255,244,222,0.78)]${selectedClasses}`
  }
  if (status === "pending") {
    return `${base} border-[rgba(90,124,168,0.34)] bg-[rgba(236,243,250,0.8)]${selectedClasses}`
  }
  if (status === "missed") {
    return `${base} border-[rgba(13,35,65,0.12)] bg-[rgba(230,234,240,0.74)]${selectedClasses}`
  }
  if (status === "current") {
    return `${base} border-[rgba(82,231,255,0.56)] bg-white/70${selectedClasses}`
  }
  return `${base} border-white/52 bg-white/34${selectedClasses}`
}

function eventColor(kind: GutoPathEvent["kind"]) {
  if (kind === "day_protected") return "text-[rgba(184,111,38,0.9)]"
  if (kind === "pain" || kind === "missed") return "text-[rgba(167,70,70,0.82)]"
  if (kind === "pending" || kind === "commitment") return "text-[rgba(90,124,168,0.92)]"
  return "text-(--guto-cyan)"
}

export function PathTab({ language, memory, workoutPlan, validationHistory, onMemoryPatch, onOpenChat }: PathTabProps) {
  const validLang = getLanguage(language)
  const locale = translations[validLang]
  const copy = pathCopy[validLang]
  const [selectedPoster, setSelectedPoster] = useState<string | null>(null)
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null)
  const [updatingMemoryId, setUpdatingMemoryId] = useState<string | null>(null)
  const pathMonth = useMemo(
    () =>
      buildGutoPathMonth({
        language: validLang,
        memory,
        validationHistory: validationHistory || memory?.validationHistory || [],
      }),
    [memory, validLang, validationHistory]
  )
  const selectedDay =
    pathMonth.days.find((day) => day.dateKey === (selectedDateKey || pathMonth.todayKey)) ||
    pathMonth.days.find((day) => day.dateKey === pathMonth.todayKey) ||
    pathMonth.days[0]
  const todayDay = pathMonth.days.find((day) => day.dateKey === pathMonth.todayKey)
  const streak = memory?.streak ?? 0
  const history = validationHistory || memory?.validationHistory || []
  const selectedDateLabel = new Intl.DateTimeFormat(validLang, {
    day: "2-digit",
    month: "long",
  }).format(selectedDay.date)
  const todayXp = todayDay?.xp ?? 0
  const hasWorkoutPlan = Boolean(workoutPlan?.exercises?.length)

  const runTripAction = async (
    memoryId: string,
    action: "date" | "adapted" | "protected" | "cancel"
  ) => {
    setUpdatingMemoryId(memoryId)
    const result = action === "date"
      ? await changeProactiveMemoryDate(memoryId)
      : action === "adapted"
        ? await confirmProactiveMemory(memoryId, true)
        : action === "protected"
          ? await confirmProactiveMemory(memoryId, false)
          : await discardProactiveMemory(memoryId, true)
    if (result.memoryPatch) onMemoryPatch?.(result.memoryPatch)
    setUpdatingMemoryId(null)
    setEditingMemoryId(null)
    if (action === "date" && result.ok) onOpenChat?.()
  }

  return (
    <div className="flex h-full min-h-0 flex-col pb-3">
      <div className="shrink-0 px-1 pb-3 pt-2 text-center">
        <p className="mb-1 font-mono text-[9px] font-black uppercase tracking-[0.22em] text-(--guto-cyan)">
          {copy.memory}
        </p>
        <h1 className="mx-auto max-w-[18rem] text-balance text-[1.25rem] font-black uppercase leading-tight tracking-[0.08em] text-(--guto-navy)">
          {locale.pathTitle}
        </h1>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        <motion.section
          className="guto-frost-panel rounded-[1.75rem] px-3 py-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-(--guto-cyan)">
                {pathMonth.monthLabel}
              </p>
              <p className="mt-1 text-xs font-semibold text-[rgba(13,35,65,0.58)]">
                {todayXp > 0 ? copy.xpToday(todayXp) : copy.noXp}
              </p>
            </div>
            <div className="rounded-full border border-[rgba(82,231,255,0.42)] bg-white/58 px-3 py-1.5 text-right">
              <p className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-[rgba(13,35,65,0.42)]">
                {copy.today}
              </p>
              <p className="text-sm font-black text-(--guto-navy)">
                {streak > 0 ? `+${streak} ${copy.streakDays}` : copy.noStreak}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 px-1 pb-2">
            {pathMonth.weekdays.map((day) => (
              <span
                key={day}
                className="text-center font-mono text-[8px] font-black uppercase tracking-[0.08em] text-[rgba(13,35,65,0.38)]"
              >
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {pathMonth.days.map((day) => {
              const selected = day.dateKey === selectedDay.dateKey
              return (
                <button
                  key={day.dateKey}
                  type="button"
                  onClick={() => {
                    gutoAudio.playGutoFeedback("tap")
                    setSelectedDateKey(day.dateKey)
                  }}
                  className={`${statusClasses(day.status, selected)} ${day.isCurrentMonth ? "" : "opacity-35"}`}
                  aria-label={`${day.dayNumber} ${copy.status[day.status]}`}
                  aria-pressed={selected}
                >
                  <span className="block font-mono text-[11px] font-black leading-none text-(--guto-navy)">
                    {day.dayNumber}
                  </span>
                  <span className="mt-1 flex min-h-4 flex-wrap items-center gap-0.5">
                    {day.events.slice(0, 3).map((event) => (
                      <span key={event.id} className={eventColor(event.kind)}>
                        <PathEventIcon event={event} className="h-3.5 w-3.5" />
                      </span>
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
        </motion.section>

        <motion.section
          className="guto-deboss rounded-[1.75rem] px-4 py-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-[rgba(13,35,65,0.42)]">
                {copy.selected}
              </p>
              <h2 className="mt-1 text-lg font-black uppercase tracking-[0.08em] text-(--guto-navy)">
                {selectedDateLabel}
              </h2>
            </div>
            <span className="shrink-0 rounded-full border border-[rgba(82,231,255,0.45)] bg-[rgba(82,231,255,0.12)] px-3 py-1.5 font-mono text-[9px] font-black uppercase tracking-[0.12em] text-(--guto-navy)">
              {copy.status[selectedDay.status]}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {selectedDay.events.length > 0 ? (
              selectedDay.events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 rounded-[1.1rem] border border-white/62 bg-white/48 px-3 py-2.5"
                >
                  <span className={`mt-0.5 shrink-0 ${eventColor(event.kind)}`}>
                    <PathEventIcon event={event} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-(--guto-navy)">{event.label}</p>
                    {event.detail ? (
                      <p className="mt-0.5 text-xs font-semibold leading-snug text-[rgba(13,35,65,0.56)]">
                        {event.detail}
                      </p>
                    ) : null}
                    {event.editable && event.memoryId ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingMemoryId((current) => current === event.memoryId ? null : event.memoryId!)}
                          className="mt-2 min-h-11 rounded-full border border-[rgba(82,231,255,0.48)] bg-white/58 px-4 py-2 font-mono text-[9px] font-black tracking-[0.12em] text-(--guto-navy)"
                        >
                          {copy.alter}
                        </button>
                        {editingMemoryId === event.memoryId ? (
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <button type="button" disabled={updatingMemoryId === event.memoryId} onClick={() => void runTripAction(event.memoryId!, "date")} className="min-h-11 rounded-full border border-white/70 bg-white/70 px-2 font-mono text-[8px] font-black tracking-[0.08em] text-(--guto-navy) disabled:opacity-45">{copy.changeDate}</button>
                            <button type="button" disabled={updatingMemoryId === event.memoryId} onClick={() => void runTripAction(event.memoryId!, "adapted")} className="min-h-11 rounded-full border border-white/70 bg-white/70 px-2 font-mono text-[8px] font-black tracking-[0.08em] text-(--guto-navy) disabled:opacity-45">{copy.adaptedYes}</button>
                            <button type="button" disabled={updatingMemoryId === event.memoryId} onClick={() => void runTripAction(event.memoryId!, "protected")} className="min-h-11 rounded-full border border-white/70 bg-white/70 px-2 font-mono text-[8px] font-black tracking-[0.08em] text-(--guto-navy) disabled:opacity-45">{copy.adaptedNo}</button>
                            <button type="button" disabled={updatingMemoryId === event.memoryId} onClick={() => void runTripAction(event.memoryId!, "cancel")} className="min-h-11 rounded-full border border-[rgba(167,70,70,0.24)] bg-white/70 px-2 font-mono text-[8px] font-black tracking-[0.08em] text-[rgba(167,70,70,0.82)] disabled:opacity-45">{copy.cancelTrip}</button>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.1rem] border border-white/62 bg-white/42 px-3 py-3">
                <p className="text-sm font-black text-(--guto-navy)">
                  {selectedDay.isToday && hasWorkoutPlan ? copy.missionReady : copy.emptyTitle}
                </p>
                <p className="mt-1 text-xs font-semibold leading-snug text-[rgba(13,35,65,0.58)]">
                  {selectedDay.isToday && hasWorkoutPlan
                    ? workoutPlan?.focus || locale.pathDayLabel
                    : copy.emptyBody}
                </p>
              </div>
            )}
          </div>
        </motion.section>

        {history.length > 0 && (
          <section>
            <p className="mb-2 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-[rgba(13,35,65,0.42)]">
              {copy.validated}
            </p>
            <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
              {history.slice(0, 5).map((record) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => {
                    gutoAudio.playGutoFeedback("tap")
                    setSelectedPoster(`${API_URL}${record.posterUrl}`)
                  }}
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
                  <p className="font-mono text-[8px] font-black text-(--guto-cyan)">+{record.xp} XP</p>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

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
            onClick={(event) => event.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => {
              gutoAudio.playGutoFeedback("tap")
              setSelectedPoster(null)
            }}
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
