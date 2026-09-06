"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, X } from "lucide-react"

import {
  completeGutoBeta1Workout,
  recordGutoBeta1ExecutionFeedback,
  recordGutoBeta1SessionFeedback,
  type Beta1DifficultyLabel,
  type Beta1PresenceSummary,
} from "@/lib/api/guto"
import { gutoAudio } from "@/lib/audio-haptics"

// ─── BETA1 EXECUTION PANEL (memory gate) ────────────────────────────────────
// Minimal-friction REAL execution logging: per exercise the user reports load,
// reps per set and one structured difficulty (FÁCIL/BOA/PESADA/DOR → RPE). The
// backend stores set-level rows (never inferring execution from prescription)
// and derives pain-memories + progression snapshots after completion. No
// camera: /workout/validate (selfie) stays untouched for BETA_2.

export interface Beta1PanelExercise {
  id: string
  /** CANONICAL catalog id sent to the backend (workout_plan_items.exercise_id). */
  exerciseId: string
  name: string
  sets: number
  reps: string
  /** Optional structured technique prescribed on the plan item (BETA1). */
  technique?: { type?: string; drops?: number; loadReductionPercent?: number } | null
}

const DIFFICULTY_ORDER: Array<{ label: Beta1DifficultyLabel; text: Record<string, string> }> = [
  { label: "FACIL", text: { "pt-BR": "Fácil", "en-US": "Easy", "it-IT": "Facile" } },
  { label: "BOA", text: { "pt-BR": "Boa", "en-US": "Good", "it-IT": "Buono" } },
  { label: "PESADA", text: { "pt-BR": "Pesada", "en-US": "Heavy", "it-IT": "Pesante" } },
  { label: "DOR", text: { "pt-BR": "Dor", "en-US": "Pain", "it-IT": "Dolore" } },
]

const copy = {
  "pt-BR": {
    title: "Registrar execução",
    load: "Carga (kg)",
    series: "Série",
    difficulty: "Como ficou?",
    close: "Fechar",
    logged: "Registrado",
    finishing: "Concluindo…",
    complete: "CONCLUIR TREINO",
    completeHint: "Sem câmera na Beta 1: o GUTO registra o que você executou.",
    completedTitle: "Treino concluído!",
    completedBody: "O GUTO aprendeu com esta sessão e já considera o histórico no próximo treino.",
    // PRESENCE (Etapa B): the ONE question, GUTO-first — never a form label.
    presenceKicker: "O GUTO viu o que você fez hoje.",
    presenceReplyLabel: "Responde com suas palavras…",
    presenceReplyPlaceholder: "ex: dormindo mal essa semana / o treino tá pesado",
    presenceSend: "ENVIAR",
    presenceThanks: "Anotado. Vou usar isso no teu próximo treino.",
    emptySets: "Informe pelo menos uma série antes de concluir.",
    error: "Não foi possível registrar. Tente novamente.",
  },
  "en-US": {
    title: "Log execution",
    load: "Load (kg)",
    series: "Set",
    difficulty: "How did it feel?",
    close: "Close",
    logged: "Logged",
    finishing: "Finishing…",
    complete: "FINISH WORKOUT",
    completeHint: "No camera in Beta 1: GUTO records what you actually performed.",
    completedTitle: "Workout completed!",
    completedBody: "GUTO learned from this session and will use it in your next workout.",
    presenceKicker: "GUTO saw what you did today.",
    presenceReplyLabel: "Answer in your own words…",
    presenceReplyPlaceholder: "e.g. sleeping badly this week / training is too heavy",
    presenceSend: "SEND",
    presenceThanks: "Noted. I'll use this in your next workout.",
    emptySets: "Log at least one set before finishing.",
    error: "Could not save. Try again.",
  },
  "it-IT": {
    title: "Registra l'esecuzione",
    load: "Carico (kg)",
    series: "Serie",
    difficulty: "Com'è andata?",
    close: "Chiudi",
    logged: "Registrato",
    finishing: "Completamento…",
    complete: "TERMINA ALLENAMENTO",
    completeHint: "Nessuna telecamera nella Beta 1: GUTO registra ciò che hai svolto.",
    completedTitle: "Allenamento completato!",
    completedBody: "GUTO ha imparato da questa sessione e la userà nel prossimo allenamento.",
    presenceKicker: "GUTO ha visto cosa hai fatto oggi.",
    presenceReplyLabel: "Rispondi con le tue parole…",
    presenceReplyPlaceholder: "es. sto dormendo male / l'allenamento è pesante",
    presenceSend: "INVIA",
    presenceThanks: "Annotato. Lo userò nel tuo prossimo allenamento.",
    emptySets: "Registra almeno una serie prima di terminare.",
    error: "Impossibile salvare. Riprova.",
  },
} as const

type Lang = keyof typeof copy

interface Props {
  open: boolean
  language: string
  workoutSessionId: string | null
  exercises: Beta1PanelExercise[]
  onClose: () => void
  /** Fired after the session closes exactly-once (XP + rotation already advanced). */
  onCompleted: () => void
}

export function Beta1ExecutionPanel({ open, language, workoutSessionId, exercises, onClose, onCompleted }: Props) {
  const lang: Lang = language === "en-US" ? "en-US" : language === "it-IT" ? "it-IT" : "pt-BR"
  const t = copy[lang]
  const [exerciseId, setExerciseId] = useState<string | null>(exercises[0]?.id ?? null)
  const [sets, setSets] = useState<Record<string, Array<{ loadKg: string; reps: string }>>>({})
  const [difficulty, setDifficulty] = useState<Record<string, Beta1DifficultyLabel>>({})
  const [saved, setSaved] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  // PRESENCE loop: the backend decides the outcome; the UI only phrases it.
  const [presence, setPresence] = useState<Beta1PresenceSummary | null>(null)
  const [causeText, setCauseText] = useState("")
  const [presenceBusy, setPresenceBusy] = useState(false)
  const [causeAck, setCauseAck] = useState(false)

  const current = useMemo(
    () => exercises.find((exercise) => exercise.id === exerciseId) ?? exercises[0] ?? null,
    [exercises, exerciseId],
  )

  /** Session-level feeling = the label the user reported most this session. */
  const mostReportedDifficulty = (): Beta1DifficultyLabel => {
    const counts = new Map<Beta1DifficultyLabel, number>()
    for (const label of Object.values(difficulty)) counts.set(label, (counts.get(label) ?? 0) + 1)
    let best: Beta1DifficultyLabel = "BOA"
    let bestCount = -1
    for (const [label, count] of counts) {
      if (count > bestCount) { best = label; bestCount = count }
    }
    return best
  }

  if (!open || !workoutSessionId) return null

  const setsFor = (id: string) => {
    const exercise = exercises.find((item) => item.id === id)
    const target = Math.max(1, exercise?.sets ?? 1)
    return sets[id] ?? Array.from({ length: target }, () => ({ loadKg: "", reps: "" }))
  }

  const updateSet = (id: string, index: number, patch: Partial<{ loadKg: string; reps: string }>) => {
    const next = setsFor(id).map((row, position) => (position === index ? { ...row, ...patch } : row))
    setSets((prev) => ({ ...prev, [id]: next }))
  }

  const parseNumber = (value: string): number | undefined => {
    const trimmed = value.trim().replace(",", ".")
    if (!trimmed) return undefined
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
  }

  const buildSetRows = (id: string) =>
    setsFor(id)
      .map((row, index) => ({
        setNumber: index + 1,
        loadKg: parseNumber(row.loadKg),
        reps: parseNumber(row.reps) != null ? Math.trunc(parseNumber(row.reps)!) : undefined,
      }))
      .filter((row) => row.loadKg != null || row.reps != null)

  const saveExercise = async (id: string): Promise<boolean> => {
    const exercise = exercises.find((item) => item.id === id)
    if (!exercise) return true
    const rows = buildSetRows(id)
    if (rows.length === 0) {
      setError(t.emptySets)
      return false
    }
    const label = difficulty[id] ?? "BOA"
    await recordGutoBeta1ExecutionFeedback({
      workoutSessionId,
      exerciseId: exercise.exerciseId,
      difficultyLabel: label,
      pain: label === "DOR",
      sets: rows,
    })
    return true
  }

  const handleLogCurrent = async () => {
    if (!current || busy) return
    setBusy(true)
    setError(null)
    try {
      await saveExercise(current.id)
      gutoAudio.playGutoFeedback("success")
      setSaved((prev) => (prev.includes(current.id) ? prev : [...prev, current.id]))
      const index = exercises.findIndex((item) => item.id === current.id)
      setExerciseId(exercises[index + 1]?.id ?? null)
    } catch {
      setError(t.error)
    } finally {
      setBusy(false)
    }
  }

  const handleComplete = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      // Persist any exercise touched but not saved yet (exactly-once per id).
      for (const exercise of exercises) {
        if (saved.includes(exercise.id)) continue
        if (buildSetRows(exercise.id).length > 0) await saveExercise(exercise.id)
      }
      await completeGutoBeta1Workout({ workoutSessionId })
      gutoAudio.playGutoFeedback("success")
      setDone(true)
      onCompleted()
      // PRESENCE: ask how the session FELT (the only unknown). Answer lands in
      // the session-feedback loop; failures never block the completion.
      try {
        const response = await recordGutoBeta1SessionFeedback({
          workoutSessionId,
          overallDifficulty: mostReportedDifficulty(),
          pain: Object.values(difficulty).some((label) => label === "DOR"),
        })
        setPresence(response.presence)
      } catch { /* presence is additive */ }
    } catch {
      setError(t.error)
    } finally {
      setBusy(false)
    }
  }

  const handleSendCause = async () => {
    if (!presence || presenceBusy) return
    const explanation = causeText.trim()
    if (!explanation) return
    setPresenceBusy(true)
    try {
      const response = await recordGutoBeta1SessionFeedback({
        workoutSessionId,
        overallDifficulty: mostReportedDifficulty(),
        pain: Object.values(difficulty).some((label) => label === "DOR"),
        causeExplanation: explanation,
      })
      setPresence(response.presence)
      setCauseText("")
      setCauseAck(true)
    } catch { /* keep the question; user can retry */ } finally {
      setPresenceBusy(false)
    }
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(13,35,65,0.55)] p-4 backdrop-blur-sm">
        <div className="guto-premium-card w-full max-w-[19rem] px-5 py-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-(--guto-cyan)" strokeWidth={2.2} />
          <h2 className="guto-tab-title mt-3">{t.completedTitle}</h2>
          <p className="guto-tab-subtitle">{t.completedBody}</p>
          {presence && (
            <div className="mt-4 rounded-[0.9rem] border border-[rgba(82,231,255,0.25)] bg-white/60 px-3 py-3 text-left">
              <p className="font-mono text-[8px] font-black uppercase tracking-[0.18em] text-[rgba(13,35,65,0.45)]">
                {t.presenceKicker}
              </p>
              {presence.knownFactsEcho.length > 0 && (
                <p className="mt-1.5 text-[11px] font-semibold leading-snug text-[rgba(13,35,65,0.55)]">
                  {presence.knownFactsEcho.join(" · ")}
                </p>
              )}
              {causeAck ? (
                <p className="mt-2 text-[12px] font-bold leading-snug text-(--guto-navy)">{t.presenceThanks}</p>
              ) : presence.contextualQuestion ? (
                <>
                  <p className="mt-2 text-[13px] font-bold leading-snug text-(--guto-navy)">
                    {presence.contextualQuestion}
                  </p>
                  <textarea
                    value={causeText}
                    onChange={(event) => setCauseText(event.target.value)}
                    placeholder={t.presenceReplyPlaceholder}
                    rows={2}
                    className="guto-slot mt-2 w-full rounded-[0.7rem] px-2.5 py-2 text-[12px] font-semibold text-(--guto-navy) outline-none placeholder:text-[rgba(13,35,65,0.35)]"
                  />
                  <button
                    type="button"
                    onClick={handleSendCause}
                    disabled={presenceBusy || causeText.trim().length === 0}
                    className="guto-cta-ghost mt-2 w-full disabled:opacity-40"
                  >
                    {t.presenceSend}
                  </button>
                </>
              ) : null}
            </div>
          )}
          <button type="button" onClick={onClose} className="guto-cta-primary mt-4">{t.close}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(13,35,65,0.55)] p-4 backdrop-blur-sm">
      <div className="guto-premium-card w-full max-w-[19rem] max-h-[85vh] overflow-y-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <h2 className="guto-tab-kicker">{t.title}</h2>
          <button type="button" onClick={onClose} aria-label={t.close} className="grid h-8 w-8 place-items-center rounded-full">
            <X className="h-4 w-4 text-[rgba(13,35,65,0.5)]" />
          </button>
        </div>

        {exercises.map((exercise) => {
          const isActive = exercise.id === current?.id
          return (
            <button
              key={exercise.id}
              type="button"
              onClick={() => setExerciseId(exercise.id)}
              className={`mt-2 flex w-full items-center gap-2 rounded-[0.9rem] border px-3 py-2 text-left ${isActive ? "border-[rgba(82,231,255,0.55)] bg-white/70" : "border-[rgba(13,35,65,0.08)]"}`}
            >
              {saved.includes(exercise.id) ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-(--guto-cyan)" />
              ) : (
                <span className="h-4 w-4 shrink-0 rounded-full border border-[rgba(13,35,65,0.22)]" />
              )}
              <span className="min-w-0 flex-1 truncate text-[12px] font-black uppercase text-(--guto-navy)">
                {exercise.name}
              </span>
              <span className="shrink-0 font-mono text-[10px] font-bold text-[rgba(13,35,65,0.5)]">
                {exercise.sets}×{exercise.reps}
              </span>
              {exercise.technique?.type && exercise.technique.type !== "STRAIGHT_SET" && (
                <span className="shrink-0 rounded-full bg-[rgba(82,231,255,0.14)] px-1.5 py-0.5 font-mono text-[8px] font-black uppercase tracking-widest text-(--guto-navy)">
                  {exercise.technique.type}
                </span>
              )}
            </button>
          )
        })}

        {current && (
          <div className="mt-3 space-y-2">
            <p className="guto-readable-label">{t.load}</p>
            {setsFor(current.id).map((row, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-10 shrink-0 font-mono text-[10px] font-black uppercase text-[rgba(13,35,65,0.5)]">
                  {t.series} {index + 1}
                </span>
                <input
                  inputMode="decimal"
                  value={row.loadKg}
                  onChange={(event) => updateSet(current.id, index, { loadKg: event.target.value })}
                  placeholder="kg"
                  className="guto-slot min-h-9 w-16 rounded-[0.7rem] px-2 text-center text-[12px] font-bold text-(--guto-navy) outline-none"
                />
                <input
                  inputMode="numeric"
                  value={row.reps}
                  onChange={(event) => updateSet(current.id, index, { reps: event.target.value })}
                  placeholder="reps"
                  className="guto-slot min-h-9 w-16 rounded-[0.7rem] px-2 text-center text-[12px] font-bold text-(--guto-navy) outline-none"
                />
              </div>
            ))}

            <p className="guto-readable-label pt-1">{t.difficulty}</p>
            <div className="flex gap-1.5">
              {DIFFICULTY_ORDER.map((option) => {
                const selected = (difficulty[current.id] ?? "BOA") === option.label
                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => {
                      gutoAudio.playGutoFeedback("select")
                      setDifficulty((prev) => ({ ...prev, [current.id]: option.label }))
                    }}
                    className={`min-h-9 flex-1 rounded-[0.7rem] border text-[11px] font-black uppercase tracking-wide ${selected ? "border-[rgba(82,231,255,0.7)] bg-[rgba(82,231,255,0.18)] text-(--guto-navy)" : "border-[rgba(13,35,65,0.1)] text-[rgba(13,35,65,0.55)]"}`}
                  >
                    {option.text[lang]}
                  </button>
                )
              })}
            </div>

            <button type="button" onClick={handleLogCurrent} disabled={busy} className="guto-cta-ghost w-full disabled:opacity-40">
              {saved.includes(current.id) ? t.logged : t.title}
            </button>
          </div>
        )}

        {error && (
          <p className="mt-2 rounded-[0.85rem] border border-[rgba(157,43,43,0.16)] bg-[rgba(157,43,43,0.06)] px-3 py-2 text-center font-mono text-[10px] font-black uppercase tracking-widest text-destructive">
            {error}
          </p>
        )}

        <button type="button" onClick={handleComplete} disabled={busy} className="guto-cta-primary mt-3 disabled:opacity-40">
          {busy ? t.finishing : t.complete}
        </button>
        <p className="mt-1.5 text-center font-mono text-[8px] uppercase tracking-[0.18em] text-[rgba(13,35,65,0.4)]">
          {t.completeHint}
        </p>
      </div>
    </div>
  )
}
