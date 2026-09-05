"use client"

/**
 * GUTO Online — Cockpit
 * --------------------------------------------------------------------------
 * Esta tela é a UI. Toda regra mora em lib/guto-online/*. Aqui:
 *
 *   - Lê estado via useGutoOnlineEngine (state machine, dispatchLock,
 *     idempotência por eventId, dedupe semântico, action history, undo,
 *     storage versionado e retomada de sessão).
 *   - Apresenta os botões corretos por fase (GutoOnlineControls).
 *   - Mostra Rest Mode quando em descanso.
 *   - Abre Quick Talk quando "Falar com GUTO".
 *   - Persiste e respeita o toggle de voz (GUTO fala / GUTO em texto).
 *   - Dispara fala via GutoVoiceQueue (uma fala por vez, abort no
 *     push-to-talk).
 *   - Telemetria leve via gutoOnlineTelemetry.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Clock, RotateCcw, Undo2, X } from "lucide-react"

import type { GutoWorkoutPlan } from "@/lib/api/guto"
import {
  clearActiveExercise,
  isGutoV3Enabled,
  recordGutoV3WorkoutExerciseEvent,
  setActiveExercise,
} from "@/lib/api/guto"
import { deriveWorkoutExerciseRequestId } from "@/lib/guto-v3-execution"
import type { EvolutionStage } from "@/types/contract"
import { GutoVividAvatar } from "@/components/guto/guto-vivid-avatar"

import { useGutoOnlineEngine } from "@/lib/guto-online/use-guto-online-engine"
import { makeEventId, type GutoOnlineEvent } from "@/lib/guto-online/guto-online-events"
import type { GutoOnlineSessionState } from "@/lib/guto-online/guto-online-types"
import {
  voiceFailureText,
  type ContextClassification,
} from "@/lib/guto-online/guto-online-context-guard"
import { GutoVoiceQueue } from "@/lib/guto-online/guto-voice-queue"
import { gutoOnlineTelemetry } from "@/lib/guto-online/guto-online-telemetry"
import { gutoAudio } from "@/lib/audio-haptics"

import {
  GutoOnlineControls,
  GutoOnlineMoreOptions,
} from "@/components/guto/online/guto-online-controls"
import { GutoOnlineRestMode } from "@/components/guto/online/guto-online-rest-mode"
import { GutoOnlineVoiceToggle } from "@/components/guto/online/guto-online-voice-toggle"
import { GutoOnlineQuickTalk } from "@/components/guto/online/guto-online-quick-talk"
import { GutoOnlineChecklist } from "@/components/guto/online/guto-online-checklist"

interface GutoOnlineSessionProps {
  open: boolean
  onClose: () => void
  workoutPlan: GutoWorkoutPlan
  language: string
  userName?: string
  evolution?: EvolutionStage
  /** P0 (workout validation authority): stable logical session id shared by
   * Mission/GUTO Online/ValidationFlow — the V3 official events use it. */
  workoutSessionId?: string | null
  onFinish?: () => void
}

const PT_LIKE = ["pt-BR", "pt"]
const IT_LIKE = ["it-IT", "it"]

function pickLine(language: string, lines: { pt: string; en: string; it: string }) {
  if (PT_LIKE.some((l) => language.startsWith(l))) return lines.pt
  if (IT_LIKE.some((l) => language.startsWith(l))) return lines.it
  return lines.en
}

function defaultName(language: string): string {
  if (PT_LIKE.some((l) => language.startsWith(l))) return "parceiro"
  if (IT_LIKE.some((l) => language.startsWith(l))) return "amico"
  return "buddy"
}

function formatElapsed(startedAt: number, now: number) {
  const diff = Math.max(0, Math.floor((now - startedAt) / 1000))
  const mm = Math.floor(diff / 60)
  const ss = diff % 60
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
}

// Frases por intent — primeira linha que o GUTO fala/escreve.
function intentLine(
  intentKey: string,
  language: string,
  vars: { name?: string; exerciseName?: string; nextExercise?: string; restSeconds?: number } = {},
) {
  const name = (vars.name || defaultName(language)).trim()
  switch (intentKey) {
    case "session.entry.first":
      // PT-BR: "bora", contração "tô" — fala de academia brasileira.
      // EN-US: "locked in", "I've got you" — gym-buddy americano.
      // IT-IT: "ci siamo", "non si molla" — italiano nativo de palestra.
      return pickLine(language, {
        pt: `${name}, bora junto. Hoje a gente não falha — eu tô aqui contigo.`,
        en: `${name}, we're locked in. No skipping today — I've got you.`,
        it: `${name}, ci siamo. Oggi non si molla — sono qui con te.`,
      })
    case "session.entry.resume":
      return pickLine(language, {
        pt: `Voltou. A gente continua de onde parou${vars.exerciseName ? `, em ${vars.exerciseName}` : ""}.`,
        en: `You're back. Picking up right where we stopped${vars.exerciseName ? `, on ${vars.exerciseName}` : ""}.`,
        it: `Sei tornato. Riprendiamo da dove avevamo lasciato${vars.exerciseName ? `, su ${vars.exerciseName}` : ""}.`,
      })
    case "session.warmup.ready":
      return pickLine(language, {
        pt: "Começa pelo aquecimento. Quando terminar, toca em Aquecimento feito.",
        en: "Kick off with the warm-up. When you're done, tap Warm-up done.",
        it: "Parti dal riscaldamento. Quando hai finito, tocca Riscaldamento fatto.",
      })
    case "session.warmup.done":
      return pickLine(language, {
        pt: `Aquecimento fechado. Bora pra ${vars.exerciseName || "o primeiro exercício"}.`,
        en: `Warm-up done. Heading into ${vars.exerciseName || "the first exercise"}.`,
        it: `Riscaldamento fatto. Si va su ${vars.exerciseName || "il primo esercizio"}.`,
      })
    case "set.done.rest":
      return pickLine(language, {
        pt: `Boa. Série anotada. Descansa ${vars.restSeconds ?? 60} segundos e fica comigo.`,
        en: `Nice. Set logged. Take ${vars.restSeconds ?? 60} seconds — I'm right here.`,
        it: `Bene. Serie registrata. Riposa ${vars.restSeconds ?? 60} secondi, io resto qui.`,
      })
    case "set.return.now":
      return pickLine(language, {
        pt: "Volta comigo. Próxima série agora.",
        en: "Back to it. Next set, right now.",
        it: "Si torna. Prossima serie, dai.",
      })
    case "exercise.done.next":
      return pickLine(language, {
        pt: `Exercício fechado. Agora ${vars.nextExercise || "o próximo"}.`,
        en: `Exercise done. Now on to ${vars.nextExercise || "the next one"}.`,
        it: `Esercizio fatto. Ora si passa a ${vars.nextExercise || "il prossimo"}.`,
      })
    case "session.finished":
      return pickLine(language, {
        pt: `Treino fechado, ${name}. Agora valida e guarda isso no percurso.`,
        en: `Workout done, ${name}. Validate it now and lock it in your path.`,
        it: `Allenamento finito, ${name}. Ora valida e mettilo nel percorso.`,
      })
    case "online.exception.pain":
      // GUTO não diagnostica — pergunta antes de seguir.
      return pickLine(language, {
        pt: "Para. Me fala curto: é dor, cansaço ou dúvida de execução?",
        en: "Hold up. Quick answer: pain, fatigue, or unsure about the form?",
        it: "Fermati. Veloce: dolore, stanchezza o dubbio sulla tecnica?",
      })
    case "online.exception.swap":
      return pickLine(language, {
        pt: "Tranquilo. Qual equipamento você tem aí? Me diz e a gente adapta.",
        en: "No worries. What gear do you have right now? Tell me and we adapt.",
        it: "Tranquillo. Che attrezzo hai adesso? Dimmi e adattiamo.",
      })
    case "online.exception.fatigue":
      return pickLine(language, {
        pt: "A gente ajusta. Baixa o ego, segura a técnica e continua comigo.",
        en: "We dial it back. Drop the ego, hold the form, stay with me.",
        it: "Aggiustiamo. Metti via l'ego, tieni la tecnica, vai con me.",
      })
    case "online.voice.noisy":
      return voiceFailureText(language, vars.name)
    case "session.resume.prompt":
      return pickLine(language, {
        pt: "Você tinha uma sessão aberta. Continua daqui ou começa do zero?",
        en: "You have an open session. Pick up here or start over?",
        it: "Hai una sessione aperta. Riprendi da qui o ricominci?",
      })
    default:
      return ""
  }
}

const RESUME_BUTTONS: Record<string, { keep: string; reset: string }> = {
  "pt-BR": { keep: "Continuar daqui", reset: "Começar do zero" },
  "en-US": { keep: "Pick up here", reset: "Start over" },
  "it-IT": { keep: "Riprendi da qui", reset: "Ricomincia" },
}

const CLOSE_LABEL: Record<string, string> = {
  "pt-BR": "Fechar GUTO Online",
  "en-US": "Close GUTO Online",
  "it-IT": "Chiudi GUTO Online",
}

function pickCloseLabel(language: string) {
  if (language in CLOSE_LABEL) return CLOSE_LABEL[language]
  const prefix = language.split("-")[0]
  const found = Object.keys(CLOSE_LABEL).find((key) => key.startsWith(prefix))
  return found ? CLOSE_LABEL[found] : CLOSE_LABEL["pt-BR"]
}

function pickResumeCopy(language: string) {
  if (language in RESUME_BUTTONS) return RESUME_BUTTONS[language]
  const prefix = language.split("-")[0]
  const found = Object.keys(RESUME_BUTTONS).find((key) => key.startsWith(prefix))
  return found ? RESUME_BUTTONS[found] : RESUME_BUTTONS["pt-BR"]
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function GutoOnlineSession({
  open,
  onClose,
  workoutPlan,
  language,
  userName,
  workoutSessionId,
  onFinish,
  evolution = "baby",
}: GutoOnlineSessionProps) {
  // ─── Engine ──────────────────────────────────────────────────────────────
  // O plano traz aquecimento como exercício(s) com muscleGroup === "aquecimento".
  // No GUTO Online, aquecimento é UMA fase só com um botão "Aquecimento feito",
  // então separamos antes de mandar para o engine.
  const enginePlan = useMemo(() => {
    const allExercises = workoutPlan.exercises || []
    const realExercises = allExercises.filter((ex) => ex.muscleGroup !== "aquecimento")
    return { ...workoutPlan, exercises: realExercises }
  }, [workoutPlan])

  const sideEffect = useCallback((event: GutoOnlineEvent, sessionState: GutoOnlineSessionState) => {
    gutoOnlineTelemetry.track(event, sessionState)
  }, [])

  const {
    ready,
    state,
    actionHistory,
    pendingResume,
    acceptResume,
    declineResume,
    dispatch,
    toggleVoiceMode,
    undo,
  } = useGutoOnlineEngine({
    plan: enginePlan,
    language,
    userName,
    enabled: open,
    onSideEffect: sideEffect,
  })

  const exercises = enginePlan.exercises
  const currentExercise = exercises[state.exerciseIndex]
  const totalSets = currentExercise?.sets || 1
  const isLastSet = state.currentSet >= totalSets
  const isPlanFinished = state.phase === "finished"
  const totalExercises = exercises.length

  // ─── Voice Queue ─────────────────────────────────────────────────────────
  // Padrão lazy-init aceito pelo react-hooks/refs: comparar com null explícito.
  const voiceQueueRef = useRef<GutoVoiceQueue | null>(null)
  if (voiceQueueRef.current === null) {
    voiceQueueRef.current = new GutoVoiceQueue()
  }
  useEffect(() => {
    voiceQueueRef.current?.setMode(state.voiceMode)
  }, [state.voiceMode])
  useEffect(() => {
    if (!open) {
      voiceQueueRef.current?.abort()
    }
  }, [open])
  useEffect(() => {
    if (!open || typeof document === "undefined") return
    document.body.classList.add("guto-online-active")
    return () => {
      document.body.classList.remove("guto-online-active")
    }
  }, [open])
  useEffect(() => {
    return () => {
      voiceQueueRef.current?.destroy()
      voiceQueueRef.current = null
    }
  }, [])

  const speak = useCallback(
    (intentKey: string, text: string, opts: { priority?: "interrupt" | "normal" | "low" } = {}) => {
      if (!text) return
      voiceQueueRef.current?.enqueue({
        intentKey,
        text,
        language,
        priority: opts.priority ?? "normal",
        preferStatic: true,
      })
      // Persiste a linha no engine para a UI mostrar.
      dispatch({
        type: "GUTO_SAID",
        eventId: makeEventId("said"),
        at: Date.now(),
        intentKey,
        text,
        source: "system",
      })
    },
    [dispatch, language],
  )

  // ─── Telemetry lifecycle ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    gutoOnlineTelemetry.start()
    return () => {
      void gutoOnlineTelemetry.flush()
      gutoOnlineTelemetry.stop()
    }
  }, [open])

  // ─── Tick (mantém timer e detecta fim de descanso) ───────────────────────
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!open) return
    const timer = window.setInterval(() => {
      const t = Date.now()
      setNow(t)
      // Dispara TICK para o engine sair de descanso quando vencer.
      dispatch({
        type: "TICK",
        eventId: makeEventId("tick"),
        at: t,
        source: "system",
      })
    }, 500)
    return () => window.clearInterval(timer)
  }, [open, dispatch])

  // ─── Greeting na entrada (precisa fluir antes da fala de fase) ──────────
  const greetedRef = useRef(false)
  useEffect(() => {
    if (!open || !ready) {
      greetedRef.current = false
      return
    }
    if (greetedRef.current) return
    greetedRef.current = true

    // "interrupt" porque é o primeiro discurso ao abrir — limpa qualquer
    // resíduo de sessão anterior na fila.
    if (state.phase === "warmup" && !state.warmupCompleted && actionHistory.length === 0) {
      speak("session.entry.first", intentLine("session.entry.first", language, { name: userName }), {
        priority: "interrupt",
      })
    } else if (state.phase !== "briefing" && state.phase !== "finished") {
      speak(
        "session.entry.resume",
        intentLine("session.entry.resume", language, { name: userName, exerciseName: currentExercise?.name }),
        { priority: "interrupt" },
      )
    }
  }, [open, ready, state.phase, state.warmupCompleted, actionHistory.length, language, userName, currentExercise, speak])

  // ─── Fala automática quando muda de fase / exercício / série ────────────
  const lastPhaseRef = useRef<{ phase: string; exerciseIndex: number; currentSet: number; warmupCompleted: boolean }>({
    phase: "",
    exerciseIndex: -1,
    currentSet: 0,
    warmupCompleted: false,
  })

  useEffect(() => {
    if (!open || !ready) return
    const previous = lastPhaseRef.current

    const phaseChanged = previous.phase !== state.phase
    const exerciseChanged = previous.exerciseIndex !== state.exerciseIndex
    const warmupChanged = previous.warmupCompleted !== state.warmupCompleted

    // Todas as transições normais ficam em prioridade "normal" — entram na
    // fila atrás da greeting, mas não atropelam falas que estejam tocando.

    if (state.phase === "warmup" && phaseChanged) {
      speak("session.warmup.ready", intentLine("session.warmup.ready", language, { name: userName }))
    }

    // Só celebra aquecimento concluído se previous.phase era "warmup".
    // Em retomada de sessão (previous.phase==="" inicialmente), não anunciamos.
    if (state.phase === "executing_set" && warmupChanged && state.warmupCompleted && previous.phase === "warmup") {
      speak(
        "session.warmup.done",
        intentLine("session.warmup.done", language, { name: userName, exerciseName: currentExercise?.name }),
      )
    }

    // Só anuncia descanso quando veio de executing_set — não anunciar em
    // retomada de sessão ou em mudanças de fase artificiais.
    if (state.phase === "resting" && phaseChanged && previous.phase === "executing_set") {
      const restSeconds = state.restPlannedSeconds ?? 60
      speak("set.done.rest", intentLine("set.done.rest", language, { restSeconds }))
    }

    if (state.phase === "executing_set" && previous.phase === "resting") {
      // Vibra/som no fim do descanso — funciona mesmo com voz desligada.
      gutoAudio.playGutoFeedback("transition")
      speak("set.return.now", intentLine("set.return.now", language))
    }

    if (exerciseChanged && state.warmupCompleted && state.phase === "executing_set" && previous.exerciseIndex >= 0) {
      const next = exercises[state.exerciseIndex]
      speak(
        "exercise.done.next",
        intentLine("exercise.done.next", language, { name: userName, nextExercise: next?.name }),
      )
    }

    if (state.phase === "finished" && phaseChanged) {
      gutoAudio.playGutoFeedback("success")
      speak("session.finished", intentLine("session.finished", language, { name: userName }))
      onFinish?.()
    }

    // Ponte GUTO Online → cérebro. P0 (V3): /guto/active-exercise é superfície
    // legada (V3_FEATURE_NOT_IMPLEMENTED) — no V3 o Online NÃO chama autoridade
    // legada e NÃO tem unhandled rejection. Os eventos oficiais da sessão são
    // consolidados UMA vez antes da validação (/guto/v3/workout/validate), com o
    // MESMO workoutSessionId estável; o fim do Online não concede XP — leva à
    // mesma validação por selfie.
    const setChanged = previous.currentSet !== state.currentSet
    if (!isGutoV3Enabled()) {
      if (
        currentExercise &&
        state.phase !== "finished" &&
        (exerciseChanged || setChanged || phaseChanged)
      ) {
        void setActiveExercise({
          source: "online",
          name: currentExercise.name,
          muscleGroup: currentExercise.muscleGroup,
          reps: String(currentExercise.reps),
          load: currentExercise.load ?? undefined,
          rest: currentExercise.rest,
          currentSet: state.currentSet,
          totalSets,
        }).catch(() => {})
      }
      if (state.phase === "finished" && phaseChanged) {
        void clearActiveExercise().catch(() => {})
      }
    }

    lastPhaseRef.current = {
      phase: state.phase,
      exerciseIndex: state.exerciseIndex,
      currentSet: state.currentSet,
      warmupCompleted: state.warmupCompleted,
    }
  }, [open, ready, state, exercises, currentExercise, totalSets, language, userName, speak, onFinish])

  // ─── V3 exercise events (P0, founder gate) ──────────────────────────────
  // When an exercise is EFFECTIVELY completed in the Online cockpit (all its
  // prescribed sets recorded), the official V3 event is sent through
  // session-exercises with a DETERMINISTIC requestId (workoutSessionId + plan
  // item + logical order). The validation flow replays the SAME derived ids,
  // so the backend dedupes — exercise history stays exactly-once even when
  // Online and ValidationFlow both describe the same session. No XP, no
  // session completion here — /workout/validate stays the only authority.
  const recordedOnlineEventsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!open || !ready) return
    if (!isGutoV3Enabled()) return
    if (!workoutSessionId) return
    const setsByExercise = new Map<string, number>()
    for (const set of state.completedSets) {
      setsByExercise.set(set.exerciseId, (setsByExercise.get(set.exerciseId) || 0) + 1)
    }
    for (const exercise of exercises) {
      if (!exercise || !exercise.exerciseId || !exercise.id) continue
      const realSets = setsByExercise.get(exercise.id) || 0
      if (realSets < (exercise.sets || 1)) continue // not effectively completed
      const key = `${workoutSessionId}:${exercise.id}:${exercise.order ?? 0}`
      if (recordedOnlineEventsRef.current.has(key)) continue
      recordedOnlineEventsRef.current.add(key)
      // P0 (no fabricated execution data): repetitions only when a real
      // observed count exists — the cockpit has no rep counter, so it is
      // omitted (a prescription range is NOT an execution result).
      void recordGutoV3WorkoutExerciseEvent({
        requestId: deriveWorkoutExerciseRequestId({
          workoutSessionId,
          planItemId: exercise.id,
          order: exercise.order ?? 0,
        }),
        exerciseId: exercise.exerciseId,
        workoutSessionId,
        setsCompleted: realSets,
        completed: true,
        context: { source: "guto_online", order: exercise.order ?? 0, workoutPlanId: workoutPlan.studentId || null },
      }).catch(() => {
        // Rede/backend indisponíveis durante a sessão: não trava o cockpit —
        // a validação final reenvia o MESMO requestId determinístico e o
        // backend deduplica (nunca vira segunda execução histórica).
      })
    }
  }, [open, ready, workoutSessionId, state.completedSets, exercises, workoutPlan.studentId])

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleWarmupDone = useCallback(() => {
    dispatch({
      type: "WARMUP_COMPLETED",
      eventId: makeEventId("warmup"),
      at: Date.now(),
      source: "button",
    })
  }, [dispatch])

  const handleSetDone = useCallback(() => {
    dispatch({
      type: "SET_COMPLETED",
      eventId: makeEventId("set"),
      at: Date.now(),
      source: "button",
    })
  }, [dispatch])

  const handleExerciseDone = useCallback(() => {
    // O engine emite EXERCISE_COMPLETED automaticamente após a última série.
    // Aqui chamamos SET_COMPLETED para fechar a última série + promover o exercício.
    dispatch({
      type: "SET_COMPLETED",
      eventId: makeEventId("set"),
      at: Date.now(),
      source: "button",
    })
  }, [dispatch])

  const handleExtendRest = useCallback(
    (seconds: number) => {
      dispatch({
        type: "REST_EXTENDED",
        eventId: makeEventId("rest_ext"),
        at: Date.now(),
        seconds,
        restEndsAt: (state.restEndsAt ?? Date.now()) + seconds * 1000,
        source: "button",
      })
    },
    [dispatch, state.restEndsAt],
  )

  const handleSkipRest = useCallback(() => {
    dispatch({
      type: "REST_SKIPPED",
      eventId: makeEventId("rest_skip"),
      at: Date.now(),
      source: "button",
    })
  }, [dispatch])

  // ─── Quick Talk ──────────────────────────────────────────────────────────
  const [quickTalkResponse, setQuickTalkResponse] = useState<string>("")

  const handleOpenQuickTalk = useCallback(() => {
    voiceQueueRef.current?.abort()
    setQuickTalkResponse("")
    dispatch({
      type: "QUICK_TALK_OPENED",
      eventId: makeEventId("qt_open"),
      at: Date.now(),
      source: "button",
    })
  }, [dispatch])

  const handleCloseQuickTalk = useCallback(() => {
    dispatch({
      type: "QUICK_TALK_CLOSED",
      eventId: makeEventId("qt_close"),
      at: Date.now(),
      source: "button",
    })
    setQuickTalkResponse("")
  }, [dispatch])

  const handleQuickTalkSubmit = useCallback(
    ({ text, mode, classification }: { text: string; mode: "voice" | "text"; classification: ContextClassification }) => {
      dispatch({
        type: "QUICK_TALK_SUBMITTED",
        eventId: makeEventId("qt_submit"),
        at: Date.now(),
        text,
        inputMode: mode,
        source: mode === "voice" ? "voice" : "button",
      })

      // Despacha o evento de domínio se for o caso (pain/swap/fatigue).
      const now = Date.now()
      let nonExecutiveCommandReply: string | null = null
      if (classification.intent === "pain") {
        dispatch({
          type: "PAIN_REPORTED",
          eventId: makeEventId("pain"),
          at: now,
          message: text,
          source: mode === "voice" ? "voice" : "button",
        })
      } else if (classification.intent === "swap_equipment") {
        dispatch({
          type: "SWAP_REQUESTED",
          eventId: makeEventId("swap"),
          at: now,
          message: text,
          source: mode === "voice" ? "voice" : "button",
        })
      } else if (classification.intent === "fatigue") {
        dispatch({
          type: "FATIGUE_REPORTED",
          eventId: makeEventId("fatigue"),
          at: now,
          message: text,
          source: mode === "voice" ? "voice" : "button",
        })
      } else if (classification.intent === "off_topic" || classification.intent === "emotional") {
        dispatch({
          type: "OFF_TOPIC_REDIRECTED",
          eventId: makeEventId("offtopic"),
          at: now,
          source: mode === "voice" ? "voice" : "button",
        })
      } else if (classification.intent === "command_set_done") {
        nonExecutiveCommandReply = pickLine(language, {
          pt: "Entendi. Para registrar com certeza, toca em Série feita.",
          en: "Got it. To log it with certainty, tap Set done.",
          it: "Capito. Per registrarla con certezza, tocca Serie fatta.",
        })
      } else if (classification.intent === "command_finish") {
        nonExecutiveCommandReply = pickLine(language, {
          pt: "Se é para fechar o treino, confirma no botão Finalizar. Eu não encerro por frase solta.",
          en: "If we're closing the workout, confirm with the Finish button. I don't end it from a loose phrase.",
          it: "Se chiudiamo l'allenamento, conferma col pulsante Fine. Non lo chiudo da una frase al volo.",
        })
      } else if (classification.intent === "command_pause") {
        nonExecutiveCommandReply = pickLine(language, {
          pt: "Fechado. Toca em Pausar para eu segurar a sessão do jeito certo.",
          en: "Got it. Tap Pause so I hold the session the right way.",
          it: "Va bene. Tocca Pausa così blocco la sessione nel modo giusto.",
        })
      } else if (classification.intent === "command_resume") {
        nonExecutiveCommandReply = pickLine(language, {
          pt: "Te ouvi. Confirma no botão para voltar sem eu bagunçar teu treino.",
          en: "I hear you. Confirm with the button so I don't mess up your workout.",
          it: "Ti ho sentito. Conferma col pulsante così non incasino l'allenamento.",
        })
      }

      // Resposta padrão da classificação. Se vier vazia (intenção tratada
      // por evento de domínio), usamos a linha intent.
      const reply = nonExecutiveCommandReply || classification.reply || intentLine(classification.intentKey, language, { name: userName, exerciseName: currentExercise?.name })

      setQuickTalkResponse(reply)
      speak(classification.intentKey, reply, { priority: "interrupt" })

      dispatch({
        type: "QUICK_TALK_RESPONDED",
        eventId: makeEventId("qt_resp"),
        at: now,
        text: reply,
        intent: classification.intent,
        source: "ai",
      })
    },
    [currentExercise, dispatch, language, speak, userName],
  )

  const handleQuickTalkResume = useCallback(() => {
    handleCloseQuickTalk()
    dispatch({
      type: "RESUMED",
      eventId: makeEventId("resume"),
      at: Date.now(),
      source: "button",
    })
  }, [dispatch, handleCloseQuickTalk])

  const handleVoiceFailed = useCallback(() => {
    dispatch({
      type: "VOICE_FAILED_NOISY",
      eventId: makeEventId("noisy"),
      at: Date.now(),
      source: "system",
    })
  }, [dispatch])

  // ─── More options ────────────────────────────────────────────────────────
  const [moreOpen, setMoreOpen] = useState(false)
  const handlePauseFromMore = useCallback(() => {
    setMoreOpen(false)
    dispatch({
      type: "PAUSED",
      eventId: makeEventId("pause"),
      at: Date.now(),
      source: "button",
    })
  }, [dispatch])
  const handleUndoFromMore = useCallback(() => {
    setMoreOpen(false)
    undo()
  }, [undo])
  const handleSkipExerciseFromMore = useCallback(() => {
    setMoreOpen(false)
    dispatch({
      type: "EXERCISE_COMPLETED",
      eventId: makeEventId("skip_ex"),
      at: Date.now(),
      source: "button",
    })
  }, [dispatch])

  // ─── Validar (libera a tela de validação do treino) ─────────────────────
  // P0 (V3): nunca chamar autoridade legada /guto/active-exercise aqui; o fim
  // do Online NÃO concede XP — onFinish leva à MESMA validação por selfie, que
  // consolida os eventos oficiais (workoutSessionId estável) via
  // /guto/v3/workout/validate.
  const handleValidate = useCallback(() => {
    if (!isGutoV3Enabled()) {
      void clearActiveExercise().catch(() => {})
    }
    onFinish?.()
    onClose()
  }, [onClose, onFinish])

  // ─── Texto da resposta de Quick Talk em casos especiais ─────────────────
  const resumeCopy = pickResumeCopy(language)

  if (!open) return null

  const showRestMode = state.phase === "resting"
  const showQuickTalk =
    state.phase === "quick_talk" ||
    state.phase === "thinking" ||
    state.phase === "pain_check" ||
    state.phase === "substitution" ||
    state.phase === "fatigue_adjustment"

  const remainingSets = currentExercise ? Math.max(0, totalSets - state.currentSet + 1) : 0
  const isVoiceEnabled = state.voiceMode === "enabled"

  return (
    <div
      className="fixed inset-0 z-9999 flex bg-[radial-gradient(circle_at_top,rgba(82,231,255,0.22),transparent_34%),linear-gradient(180deg,#f8fcff_0%,#eaf4fb_54%,#dbe8f2_100%)] text-(--guto-navy)"
      // P0 (workout validation authority): a sessão lógica acompanha o cockpit;
      // os eventos oficiais são consolidados antes da validação final.
      data-workout-session-id={workoutSessionId ?? undefined}
    >
      <div className="mx-auto flex h-full w-full max-w-md flex-col px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))]">
        {/* ─── Header ──────────────────────────────────────────────── */}
        <header className="guto-premium-card flex items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="guto-tab-kicker">
              GUTO ONLINE
            </p>
            <h1 className="mt-1 truncate text-[1.15rem] font-black uppercase tracking-[0.06em]">
              {state.phase === "finished"
                ? pickLine(language, { pt: "Treino fechado", en: "Workout done", it: "Allenamento finito" })
                : pickLine(language, { pt: "Presença ativa", en: "Active presence", it: "Presenza attiva" })}
            </h1>
            <p className="guto-readable-label mt-1 flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              {formatElapsed(state.startedAt, now)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <GutoOnlineVoiceToggle
              mode={state.voiceMode}
              onToggle={toggleVoiceMode}
              language={language}
            />
            <button
              type="button"
              onClick={onClose}
              className="guto-slot relative z-10000 grid h-11 w-11 place-items-center rounded-full border border-white/70 bg-white/48"
              aria-label={pickCloseLabel(language)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* ─── Resume prompt (15min–12h) ───────────────────────────── */}
        {pendingResume && (
          <section className="guto-premium-card mt-3 p-3">
            <p className="guto-readable-body">
              {intentLine("session.resume.prompt", language)}{" "}
              {pendingResume.ageMinutes >= 60
                ? `${Math.floor(pendingResume.ageMinutes / 60)}h${pendingResume.ageMinutes % 60 ? ` ${pendingResume.ageMinutes % 60}min` : ""}`
                : `${pendingResume.ageMinutes} min`}
              .
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={acceptResume}
                className="guto-cta-compact"
              >
                {resumeCopy.keep}
              </button>
              <button
                type="button"
                onClick={declineResume}
                className="guto-cta-compact border-white/70 bg-white/55 text-[rgba(13,35,65,0.72)]"
              >
                {resumeCopy.reset}
              </button>
            </div>
          </section>
        )}

        {/* ─── Corpo ──────────────────────────────────────────────── */}
        <main className="flex min-h-0 flex-1 flex-col gap-2.5 py-2.5">
          {/* GUTO luz falante — transparente em Safari e Chrome */}
          <section className="flex w-full flex-col items-center">
            <div className="relative flex items-center justify-center">
              <GutoVividAvatar
                evolution={evolution}
                size="lg"
                isActive={!showQuickTalk}
                isSpeaking={
                  state.phase === "thinking" ||
                  state.phase === "quick_talk" ||
                  state.phase === "substitution" ||
                  state.phase === "pain_check" ||
                  state.phase === "fatigue_adjustment"
                }
              />
            </div>
            {state.lastGutoLine && (
              <p className="guto-readable-body mt-1.5 max-w-sm text-center font-bold">
                {state.lastGutoLine}
              </p>
            )}
            {!isVoiceEnabled && (
              <p className="guto-readable-label mt-1 text-center">
                {pickLine(language, {
                  pt: "Modo texto · vibra no fim do descanso",
                  en: "Text mode · vibrates at rest end",
                  it: "Modo testo · vibra a fine riposo",
                })}
              </p>
            )}
          </section>

          {/* Rest Mode | Exercício atual */}
          {showRestMode ? (
            <GutoOnlineRestMode
              restEndsAt={state.restEndsAt}
              restPlannedSeconds={state.restPlannedSeconds}
              currentExercise={currentExercise}
              nextSetNumber={state.currentSet}
              totalSets={totalSets}
              remainingSetsInExercise={remainingSets}
              language={language}
              onExtend={handleExtendRest}
              onSkip={handleSkipRest}
              onTalk={handleOpenQuickTalk}
            />
          ) : (
            <section className="guto-premium-card w-full p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="guto-readable-label">
                    {pickLine(language, { pt: "Exercício", en: "Exercise", it: "Esercizio" })}{" "}
                    {state.phase === "warmup"
                      ? pickLine(language, { pt: "aquecimento", en: "warm-up", it: "riscaldamento" })
                      : `${Math.min(state.exerciseIndex + 1, totalExercises)}/${totalExercises}`}
                  </p>
                  <h2 className="mt-1 text-[1.25rem] font-black uppercase leading-tight tracking-[0.03em]">
                    {state.phase === "warmup"
                      ? pickLine(language, { pt: "Aquecimento", en: "Warm-up", it: "Riscaldamento" })
                      : currentExercise?.name || workoutPlan.focus}
                  </h2>
                  {state.phase !== "warmup" && currentExercise && (
                    <p className="mt-2 text-[13px] font-semibold text-[rgba(13,35,65,0.62)]">
                      {pickLine(language, { pt: "Série", en: "Set", it: "Serie" })}{" "}
                      {Math.min(state.currentSet, totalSets)} {pickLine(language, { pt: "de", en: "of", it: "di" })}{" "}
                      {totalSets} · {currentExercise.reps || ""} · {currentExercise.load || ""}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Checklist compacto */}
          <GutoOnlineChecklist items={state.checklist} language={language} expanded={false} />

          {/* Controles principais */}
          <div className="mt-auto">
            <GutoOnlineControls
              phase={state.phase}
              isLastSet={isLastSet}
              isPlanFinished={isPlanFinished}
              language={language}
              onWarmupDone={handleWarmupDone}
              onSetDone={handleSetDone}
              onExerciseDone={handleExerciseDone}
              onTalk={handleOpenQuickTalk}
              onValidate={handleValidate}
              onMoreOptions={() => setMoreOpen(true)}
            />
          </div>
        </main>

        {/* ─── Footer ────────────────────────────────────────────── */}
        <footer className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={actionHistory.length === 0}
            className="guto-cta-compact h-11 border-white/70 bg-white/45 text-[rgba(13,35,65,0.62)] disabled:opacity-30"
          >
            <Undo2 className="h-3.5 w-3.5" />
            {pickLine(language, { pt: "Desfazer", en: "Undo", it: "Annulla" })}
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(
                pickLine(language, {
                  pt: "Reiniciar do zero? Você perde o progresso desta sessão.",
                  en: "Restart from scratch? You will lose this session's progress.",
                  it: "Ricominciare da capo? Perdi i progressi della sessione.",
                }),
              )) {
                declineResume()
              }
            }}
            className="guto-cta-compact h-11 border-white/70 bg-white/45 text-[rgba(13,35,65,0.62)]"
            aria-label="Reiniciar sessão"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {pickLine(language, { pt: "Reiniciar", en: "Restart", it: "Ricomincia" })}
          </button>
        </footer>
      </div>

      {/* ─── Quick Talk overlay ───────────────────────────────────── */}
      <GutoOnlineQuickTalk
        open={showQuickTalk}
        language={language}
        userName={userName}
        responseLine={quickTalkResponse}
        onSubmit={handleQuickTalkSubmit}
        onResume={handleQuickTalkResume}
        onCancel={handleCloseQuickTalk}
        onVoiceFailed={handleVoiceFailed}
      />

      {/* ─── More options ─────────────────────────────────────────── */}
      <GutoOnlineMoreOptions
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        onSkipExercise={handleSkipExerciseFromMore}
        onPauseSession={handlePauseFromMore}
        onUndoLast={handleUndoFromMore}
        language={language}
      />

      <span className="sr-only">GUTO Online ativo</span>
    </div>
  )
}
