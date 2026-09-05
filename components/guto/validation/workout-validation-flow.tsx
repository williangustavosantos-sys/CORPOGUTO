"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Zap } from "lucide-react"

import type {
  ArenaAwardResult,
  GutoWorkoutPlan,
  SupportedLanguage,
  WorkoutFeedbackDifficulty,
  WorkoutFeedbackEnergy,
  WorkoutLocationMode,
  WorkoutValidationRecord,
} from "@/lib/api/guto"
import { isGutoV3Enabled, isV3ContextReconfirmationError, recordGutoV3WorkoutSessionExercises, validateWorkout } from "@/lib/api/guto"

interface WorkoutValidationFlowProps {
  language: SupportedLanguage
  userId: string
  workoutFocus: string
  workoutLabel: string
  locationMode: WorkoutLocationMode | null
  workoutPlan?: GutoWorkoutPlan | null
  /** P0 (workout validation authority): stable logical session id shared by
   * Mission/GUTO Online/ValidationFlow — required on the V3 path. */
  workoutSessionId?: string
  onComplete: (validationHistory: WorkoutValidationRecord[]) => void
  onClose: () => void
}

type FlowStep = "intro" | "ready" | "camera" | "countdown" | "speaking" | "feedback" | "uploading" | "success"

const copy = {
  "pt-BR": {
    title: "Validar treino",
    badge: "GUTO VALIDATION",
    instructions: [
      "Autorize a câmera quando solicitado",
      "Posicione o rosto dentro do círculo",
      "Aguarde a contagem 3, 2, 1",
      "Fale a frase em voz alta",
    ],
    cta: "COMEÇAR",
    readyTitle: "Posicione o rosto",
    faceHint: "Encaixe o rosto no círculo",
    ready: "ESTOU PRONTO",
    phrase: "TREINO FEITO, GUTO",
    phraseHint: "Fale em voz alta",
    uploading: "Validando missão...",
    validated: "VALIDADO",
    pending: "PENDENTE",
    xpLabel: "XP conquistado",
    pendingXpLabel: "Sem XP pleno",
    seeInJourney: "VER NO PERCURSO",
    faceStable: "Segure firme...",
    noCamera: "Câmera não autorizada. Permita o acesso nas configurações do dispositivo.",
    retry: "TENTAR NOVAMENTE",
    cameraError: "Não foi possível acessar a câmera.",
    cameraTimeout: "Câmera não detectou o rosto. Tente novamente.",
    errorTitle: "Algo deu errado",
    missingLocation: "Local do treino não está fechado. Volte e ajuste o local antes de validar.",
    incompleteWorkout: "Este treino está incompleto. GUTO precisa corrigir os exercícios antes de validar.",
    reconfirmationRequired: "Seus dados mudaram. GUTO precisa confirmar os ajustes antes de fechar o treino.",
    feedbackTitle: "Como foi o treino?",
    feedbackSubtitle: "Responde curto. O GUTO usa isso para ajustar o próximo.",
    feedbackOptions: {
      easy: "Foi leve",
      ok: "Na medida",
      hard: "Pesado",
      pain: "Senti dor",
    },
    energyLabel: "Energia",
    energyOptions: { low: "Baixa", normal: "Normal", high: "Alta" },
    painPlaceholder: "Onde doeu? Ex: joelho, lombar, ombro",
    notePlaceholder: "Algum detalhe rápido? Opcional.",
    feedbackContinue: "FECHAR MISSÃO",
  },
  "en-US": {
    title: "Validate workout",
    badge: "GUTO VALIDATION",
    instructions: [
      "Allow camera access when prompted",
      "Position your face in the circle",
      "Wait for the 3, 2, 1 countdown",
      "Say the phrase out loud",
    ],
    cta: "START",
    readyTitle: "Position your face",
    faceHint: "Fit your face in the circle",
    ready: "I AM READY",
    phrase: "WORKOUT DONE, GUTO",
    phraseHint: "Say it out loud",
    uploading: "Validating mission...",
    validated: "VALIDATED",
    pending: "PENDING",
    xpLabel: "XP earned",
    pendingXpLabel: "No full XP",
    seeInJourney: "SEE IN JOURNEY",
    faceStable: "Hold still...",
    noCamera: "Camera not allowed. Enable access in your device settings.",
    retry: "TRY AGAIN",
    cameraError: "Could not access the camera.",
    cameraTimeout: "Camera couldn't detect your face. Please try again.",
    errorTitle: "Something went wrong",
    missingLocation: "Workout location is not locked. Go back and set the location before validating.",
    incompleteWorkout: "This workout is incomplete. GUTO must fix the exercises before validation.",
    reconfirmationRequired: "Your data changed. GUTO needs to confirm the adjustments before closing the workout.",
    feedbackTitle: "How did it feel?",
    feedbackSubtitle: "Keep it short. GUTO uses this to adjust the next one.",
    feedbackOptions: {
      easy: "Too easy",
      ok: "Right dose",
      hard: "Heavy",
      pain: "Pain",
    },
    energyLabel: "Energy",
    energyOptions: { low: "Low", normal: "Normal", high: "High" },
    painPlaceholder: "Where did it hurt? Knee, back, shoulder...",
    notePlaceholder: "Any quick detail? Optional.",
    feedbackContinue: "CLOSE MISSION",
  },
  "it-IT": {
    title: "Valida allenamento",
    badge: "GUTO VALIDATION",
    instructions: [
      "Autorizza la fotocamera quando richiesto",
      "Posiziona il viso nel cerchio",
      "Aspetta il conto alla rovescia 3, 2, 1",
      "Di' la frase ad alta voce",
    ],
    cta: "INIZIA",
    readyTitle: "Posiziona il viso",
    faceHint: "Inserisci il viso nel cerchio",
    ready: "SONO PRONTO",
    phrase: "ALLENAMENTO FATTO, GUTO",
    phraseHint: "Dillo ad alta voce",
    uploading: "Convalidando missione...",
    validated: "VALIDATO",
    pending: "PENDENTE",
    xpLabel: "XP guadagnato",
    pendingXpLabel: "Niente XP pieno",
    seeInJourney: "VEDI NEL PERCORSO",
    faceStable: "Tieni fermo...",
    noCamera: "Fotocamera non autorizzata. Abilita l'accesso nelle impostazioni del dispositivo.",
    retry: "RIPROVA",
    cameraError: "Impossibile accedere alla fotocamera.",
    cameraTimeout: "La fotocamera non ha rilevato il viso. Riprova.",
    errorTitle: "Qualcosa è andato storto",
    missingLocation: "Il luogo dell'allenamento non è definito. Torna indietro e impostalo prima di validare.",
    incompleteWorkout: "Questo allenamento è incompleto. GUTO deve correggere gli esercizi prima di validare.",
    reconfirmationRequired: "I tuoi dati sono cambiati. GUTO deve confermare gli aggiustamenti prima di chiudere l'allenamento.",
    feedbackTitle: "Com'è andata?",
    feedbackSubtitle: "Risposta corta. GUTO la usa per regolare il prossimo.",
    feedbackOptions: {
      easy: "Leggero",
      ok: "Giusto",
      hard: "Pesante",
      pain: "Dolore",
    },
    energyLabel: "Energia",
    energyOptions: { low: "Bassa", normal: "Normale", high: "Alta" },
    painPlaceholder: "Dove hai sentito dolore? Ginocchio, schiena...",
    notePlaceholder: "Dettaglio rapido? Opzionale.",
    feedbackContinue: "CHIUDI MISSIONE",
  },
} as const

function hasLocalWorkoutVideos(plan?: GutoWorkoutPlan | null): boolean {
  return Boolean(
    plan?.exercises?.length &&
      plan.exercises.every((exercise) =>
        Boolean(
          exercise.id &&
          exercise.videoProvider === "local" &&
          exercise.videoUrl?.startsWith("/exercise/visuals/")
        )
      )
  )
}

// Light app background — matches .sala-guto gradient
const APP_BG = "linear-gradient(180deg, #edf2f7 0%, #dfe7f0 100%)"

export function WorkoutValidationFlow({
  language,
  userId,
  workoutFocus,
  workoutLabel,
  locationMode,
  workoutPlan,
  workoutSessionId,
  onComplete,
  onClose,
}: WorkoutValidationFlowProps) {
  const locale = copy[language] ?? copy["pt-BR"]

  const [step, setStep] = useState<FlowStep>("intro")
  const [countdown, setCountdown] = useState<number | null>(null)
  const [faceProgress, setFaceProgress] = useState(0) // 0-100, progresso de detecção
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [feedbackDifficulty, setFeedbackDifficulty] = useState<WorkoutFeedbackDifficulty>("ok")
  const [feedbackEnergy, setFeedbackEnergy] = useState<WorkoutFeedbackEnergy>("normal")
  const [feedbackPainArea, setFeedbackPainArea] = useState("")
  const [feedbackNote, setFeedbackNote] = useState("")
  const [validationResult, setValidationResult] = useState<{
    validation: WorkoutValidationRecord
    validationHistory: WorkoutValidationRecord[]
  } | null>(null)
  const [arenaResult, setArenaResult] = useState<ArenaAwardResult | null>(null)
  const isPendingValidation = validationResult?.validation.status === "pending"

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const imageBase64Ref = useRef<string>("")
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const speakingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cameraTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // face-detection refs
  const rafRef = useRef<number | null>(null)
  const faceStableCountRef = useRef(0)
  const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null)
  const faceLockedRef = useRef(false)

  const clearTimers = useCallback(() => {
    if (countdownTimerRef.current !== null) {
      clearTimeout(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
    if (speakingTimerRef.current !== null) {
      clearTimeout(speakingTimerRef.current)
      speakingTimerRef.current = null
    }
    if (cameraTimeoutRef.current !== null) {
      clearTimeout(cameraTimeoutRef.current)
      cameraTimeoutRef.current = null
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    clearTimers()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [clearTimers])

  useEffect(() => {
    return () => { stopCamera() }
  }, [stopCamera])

  // Camera step: force timeout error after 20s if camera doesn't initialize.
  // Sem skip-camera: selfie é obrigatória (decisão do fundador, ver doc X-7/O-7).
  useEffect(() => {
    if (step !== "camera") return
    cameraTimeoutRef.current = setTimeout(() => {
      stopCamera()
      setCameraError(locale.cameraTimeout)
    }, 20000)
    return () => {
      if (cameraTimeoutRef.current !== null) clearTimeout(cameraTimeoutRef.current)
    }
  }, [step, locale.cameraTimeout, stopCamera])

  const capturePhoto = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return ""
    canvas.width = video.videoWidth || 1080
    canvas.height = video.videoHeight || 1440
    const ctx = canvas.getContext("2d")
    if (!ctx) return ""
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL("image/jpeg", 0.8)
  }, [])

  const startCameraCountdown = useCallback(() => {
    setStep("countdown")
    setCountdown(3)

    let count = 3
    const tick = () => {
      count -= 1
      if (count > 0) {
        setCountdown(count)
        countdownTimerRef.current = setTimeout(tick, 1000)
      } else {
        setCountdown(0)
        setStep("speaking")
        speakingTimerRef.current = setTimeout(() => {
          speakingTimerRef.current = null
          const dataUrl = capturePhoto()
          imageBase64Ref.current = dataUrl
          stopCamera()
          setStep("feedback")
        }, 3000)
      }
    }
    countdownTimerRef.current = setTimeout(tick, 1000)
  }, [capturePhoto, stopCamera])

  const openCamera = useCallback(async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError(copy[language]?.noCamera ?? copy["pt-BR"].noCamera)
      return
    }
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1440 } },
        audio: false,
      })
      // Stream ready BEFORE advancing — garante que streamRef nunca é null no step "camera"
      streamRef.current = stream
      setStep("ready")
    } catch (err) {
      const msg = copy[language] ?? copy["pt-BR"]
      setCameraError(
        err instanceof Error && err.name === "NotAllowedError" ? msg.noCamera : msg.cameraError
      )
    }
  }, [language])

  // Detecção de presença por análise de pixel na região central do frame.
  // Sem ML — verifica luminosidade (rosto presente) + estabilidade (parado).
  // Quando estável por ~1s, ring chega a 100% e countdown começa.
  const startFaceDetection = useCallback((video: HTMLVideoElement) => {
    const ac = document.createElement("canvas")
    ac.width = 20
    ac.height = 20
    const ctx = ac.getContext("2d", { willReadFrequently: true })

    faceStableCountRef.current = 0
    faceLockedRef.current = false
    prevFrameDataRef.current = null
    setFaceProgress(0)

    // ~1.7s a 30 fps — tempo suficiente para o usuário estabilizar o rosto
    const TOTAL = 50
    let warmupFrames = 20 // descarta os primeiros frames enquanto a câmera calibra

    if (!ctx) {
      // Fallback sem canvas: inicia direto após 3 s
      countdownTimerRef.current = setTimeout(() => {
        if (streamRef.current) startCameraCountdown()
      }, 3000)
      return
    }

    const analyze = () => {
      if (!streamRef.current || faceLockedRef.current) return

      const vw = video.videoWidth || 640
      const vh = video.videoHeight || 480
      const size = Math.min(vw, vh) * 0.38
      const sx = (vw - size) / 2
      const sy = (vh - size) / 2

      try {
        ctx.drawImage(video, sx, sy, size, size, 0, 0, 20, 20)
        const { data } = ctx.getImageData(0, 0, 20, 20)
        const prev = prevFrameDataRef.current

        prevFrameDataRef.current = new Uint8ClampedArray(data)

        // Descarta frames iniciais — câmera ainda ajustando exposição
        if (warmupFrames > 0) {
          warmupFrames--
          rafRef.current = requestAnimationFrame(analyze)
          return
        }

        let bright = 0
        let motion = 0
        let lumSum = 0
        let lumSumSq = 0
        for (let i = 0; i < data.length; i += 4) {
          const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
          if (lum > 40) bright++
          lumSum += lum
          lumSumSq += lum * lum
          if (prev) {
            motion +=
              Math.abs(data[i] - prev[i]) +
              Math.abs(data[i + 1] - prev[i + 1]) +
              Math.abs(data[i + 2] - prev[i + 2])
          }
        }

        const N = 400
        const lumMean = lumSum / N
        // variância de luminosidade — faces têm sombras e gradientes, fundos lisos não
        const lumVariance = lumSumSq / N - lumMean * lumMean

        // Rosto presente: região central claramente iluminada (>40% de pixels > lum 40)
        //   e com variação de luz (não é um fundo liso)
        const hasFace = bright / N > 0.42 && lumVariance > 180
        // Estável: deve haver frame anterior para comparar + movimento pequeno
        const isStable = prev !== null && motion / N < 14

        if (hasFace && isStable) {
          faceStableCountRef.current = Math.min(TOTAL, faceStableCountRef.current + 1)
        } else {
          faceStableCountRef.current = Math.max(0, faceStableCountRef.current - 4)
        }

        const pct = Math.round((faceStableCountRef.current / TOTAL) * 100)
        setFaceProgress(pct)

        if (faceStableCountRef.current >= TOTAL) {
          faceLockedRef.current = true
          // 400 ms de feedback visual antes de iniciar contagem
          countdownTimerRef.current = setTimeout(() => {
            if (streamRef.current) startCameraCountdown()
          }, 400)
          return
        }
      } catch {
        // frame ainda não disponível
      }

      rafRef.current = requestAnimationFrame(analyze)
    }

    rafRef.current = requestAnimationFrame(analyze)
  }, [startCameraCountdown])

  // Ref callback no <video> — conecta stream no momento exato da montagem.
  // AnimatePresence mode="wait" atrasa a montagem do step "camera" até a
  // animação de saída do "ready" terminar; useEffect dispararia cedo demais.
  const videoCallbackRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node
    if (!node || !streamRef.current) return
    node.srcObject = streamRef.current
    void node.play().catch(() => {})
    const onReady = () => { if (streamRef.current) startFaceDetection(node) }
    if (node.readyState >= 2) {
      onReady()
    } else {
      node.addEventListener("canplay", onReady, { once: true })
    }
  }, [startFaceDetection])

  // Call API when uploading
  useEffect(() => {
    if (step !== "uploading") return
    if (!locationMode) {
      setUploadError(locale.missingLocation)
      return
    }
    if (!hasLocalWorkoutVideos(workoutPlan)) {
      setUploadError(locale.incompleteWorkout)
      return
    }
    // P0 (selfie é core): sem a foto capturada NÃO há validação — o fluxo V3
    // não tem skip-camera e a autoridade backend também rejeita sem evidência.
    if (!imageBase64Ref.current) {
      setUploadError(locale.incompleteWorkout)
      return
    }
    let cancelled = false
    const runValidation = async () => {
      // P0 (workout validation authority): consolida os exercícios oficiais na
      // sessão lógica ANTES da validação final (uma única fonte de eventos),
      // depois fecha via /guto/v3/workout/validate (sessão + XP + rotação
      // atômicas no backend, com prova).
      if (isGutoV3Enabled()) {
        if (!workoutSessionId) {
          throw new Error("Sessão de treino ausente. Reabra a missão e tente novamente.")
        }
        await recordGutoV3WorkoutSessionExercises({
          workoutSessionId,
          workoutPlan: workoutPlan!,
          feedbackDifficulty,
        })
      }
      return validateWorkout({
        userId,
        // P0 FIX: only send imageBase64 when user captured a photo.
        // Empty string = skip-camera path — backend handles it without image.
        imageBase64: imageBase64Ref.current || undefined,
        workoutSessionId,
        workoutFocus,
        workoutLabel,
        locationMode,
        language,
        workoutPlan,
        feedback: {
          difficulty: feedbackDifficulty,
          energy: feedbackEnergy,
          painArea: feedbackDifficulty === "pain" ? feedbackPainArea.trim() : undefined,
          note: feedbackNote.trim() || undefined,
        },
      })
    }
    runValidation()
      .then((result) => {
        if (cancelled) return
        setValidationResult({ validation: result.validation, validationHistory: result.validationHistory })
        if (result.arena) setArenaResult(result.arena)
        setStep("success")
      })
      .catch((err) => {
        if (cancelled) return
        // P0 (409 runtime recovery): V3_CONTEXT_RECONFIRMATION_REQUIRED não é
        // erro técnico — fecha o overlay para o gate de re-confirmação abrir
        // (derivado do estado oficial no guto-app) e orienta o usuário.
        if (isV3ContextReconfirmationError(err)) {
          setUploadError(locale.reconfirmationRequired)
          onClose()
          return
        }
        setUploadError(err instanceof Error ? err.message : "Erro ao validar missão.")
      })
    return () => { cancelled = true }
  }, [step, userId, workoutFocus, workoutLabel, locationMode, language, locale.missingLocation, locale.incompleteWorkout, locale.reconfirmationRequired, onClose, workoutPlan, workoutSessionId, feedbackDifficulty, feedbackEnergy, feedbackPainArea, feedbackNote])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: APP_BG }}
    >
      <AnimatePresence mode="wait">

        {/* ── INTRO ─────────────────────────────────────────────────────── */}
        {step === "intro" && (
          <motion.div
            key="intro"
            className="relative flex h-full flex-col items-center justify-center px-6"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.32 }}
          >
            <button
              type="button"
              onClick={onClose}
              className="guto-slot absolute right-5 top-[max(env(safe-area-inset-top),1.1rem)] grid h-9 w-9 place-items-center rounded-full"
              aria-label="Fechar"
            >
              <X className="h-4 w-4 text-(--guto-navy)" />
            </button>

            <div className="guto-frost-panel w-full max-w-[22rem] rounded-[2rem] p-6">
              <span className="block text-center font-mono text-[9px] font-black uppercase tracking-[0.24em] text-(--guto-cyan)">
                {locale.badge}
              </span>
              <h1 className="mb-5 mt-1 text-center text-[1.3rem] font-black uppercase leading-tight tracking-[0.08em] text-(--guto-navy)">
                {locale.title}
              </h1>

              <ol className="space-y-3">
                {locale.instructions.map((inst, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="guto-deboss-deep mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full font-mono text-[10px] font-black text-(--guto-cyan)">
                      {i + 1}
                    </span>
                    <span className="text-[13px] leading-snug text-[rgba(13,35,65,0.7)]">
                      {inst}
                    </span>
                  </li>
                ))}
              </ol>

              {cameraError && (
                <p className="mt-5 rounded-[0.85rem] border border-[rgba(157,43,43,0.18)] bg-[rgba(157,43,43,0.07)] px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-destructive">
                  {cameraError}
                </p>
              )}

              <button
                type="button"
                onClick={() => void openCamera()}
                className="guto-deboss-deep mt-6 h-[3.25rem] w-full rounded-[1.2rem] border border-[rgba(82,231,255,0.42)] font-mono text-[11px] font-black uppercase tracking-[0.2em] text-(--guto-cyan)"
              >
                {locale.cta}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── READY ─────────────────────────────────────────────────────── */}
        {step === "ready" && (
          <motion.div
            key="ready"
            className="relative flex h-full flex-col items-center justify-center px-6"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.32 }}
          >
            <button
              type="button"
              onClick={onClose}
              className="guto-slot absolute right-5 top-[max(env(safe-area-inset-top),1.1rem)] grid h-9 w-9 place-items-center rounded-full"
              aria-label="Fechar"
            >
              <X className="h-4 w-4 text-(--guto-navy)" />
            </button>

            <div className="guto-frost-panel w-full max-w-[22rem] rounded-[2rem] p-6">
              <span className="block text-center font-mono text-[9px] font-black uppercase tracking-[0.24em] text-(--guto-cyan)">
                {locale.badge}
              </span>
              <h1 className="mb-5 mt-1 text-center text-[1.3rem] font-black uppercase leading-tight tracking-[0.08em] text-(--guto-navy)">
                {locale.readyTitle}
              </h1>

              {/* Phrase */}
              <div className="guto-slot rounded-[1.2rem] px-5 py-5 text-center">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[rgba(13,35,65,0.38)]">
                  {locale.phraseHint}
                </p>
                <p className="mt-2 font-black uppercase leading-tight tracking-[0.06em] text-(--guto-navy)" style={{ fontSize: "clamp(1rem,5vw,1.25rem)" }}>
                  {locale.phrase}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStep("camera")}
                className="guto-deboss-deep mt-5 h-[3.25rem] w-full rounded-[1.2rem] border border-[rgba(82,231,255,0.42)] font-mono text-[11px] font-black uppercase tracking-[0.2em] text-(--guto-cyan)"
              >
                {locale.ready}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── CAMERA / COUNTDOWN / SPEAKING ─────────────────────────────── */}
        {(step === "camera" || step === "countdown" || step === "speaking") && (
          <motion.div
            key="camera-view"
            className="relative flex h-full flex-col items-center justify-center overflow-hidden"
            style={{ background: "#050d1a" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
          >
            <canvas ref={canvasRef} className="hidden" />

            {/* Camera feed */}
            <video
              ref={videoCallbackRef}
              autoPlay
              muted
              playsInline
              className="absolute inset-0 h-full w-full object-cover opacity-90"
              style={{ transform: "scaleX(-1)" }}
            />

            {/* Vignette profunda */}
            <div className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(ellipse 70% 80% at 50% 46%, transparent 30%, rgba(5,13,26,0.82) 75%)" }} />

            {/* Scanline texture sutil */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(82,231,255,0.6) 2px,rgba(82,231,255,0.6) 3px)", backgroundSize: "100% 3px" }} />

            {/* Top status bar */}
            <div className="absolute top-[max(env(safe-area-inset-top),1.2rem)] inset-x-0 z-30 flex items-center justify-between px-5">
              <div className="flex items-center gap-2">
                <motion.div
                  className="h-2 w-2 rounded-full bg-(--guto-cyan)"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                />
                <span className="font-mono text-[9px] font-black uppercase tracking-[0.22em] text-[rgba(82,231,255,0.8)]">
                  GUTO VALIDATION
                </span>
              </div>
              <button
                type="button"
                onClick={() => { stopCamera(); onClose() }}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/8"
                aria-label="Fechar"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <X className="h-4 w-4 text-white/70" />
              </button>
            </div>

            {/* ── Área demarcada (oval de rosto) com progresso ── */}
            {(() => {
              const OW = 230; const OH = 290
              const CX = OW / 2; const CY = OH / 2
              const RX = CX - 3; const RY = CY - 3
              // Circunferência da elipse (Ramanujan)
              const hh = Math.pow(RX - RY, 2) / Math.pow(RX + RY, 2)
              const CIRC = Math.PI * (RX + RY) * (1 + (3 * hh) / (10 + Math.sqrt(4 - 3 * hh)))
              const locked = faceProgress >= 100
              const dashOffset = CIRC * (1 - faceProgress / 100)
              const glowColor = locked ? "rgba(82,231,255,0.7)" : "rgba(82,231,255,0.28)"

              return (
                <div className="pointer-events-none relative z-10 flex flex-col items-center" style={{ marginTop: "-24px" }}>
                  <div style={{ width: OW, height: OH, position: "relative" }}>

                    {/* Brilho externo ao travar */}
                    <div className="absolute inset-0" style={{
                      borderRadius: "50%",
                      boxShadow: locked ? `0 0 48px 8px ${glowColor}` : "none",
                      transition: "box-shadow 0.4s ease",
                    }} />

                    {/* SVG: trilho + arco de progresso (elipse) */}
                    <svg width={OW} height={OH} className="absolute inset-0"
                      style={{ transform: `rotate(-90deg) scaleX(-1)` }}>
                      {/* trilho */}
                      <ellipse cx={CX} cy={CY} rx={RX} ry={RY}
                        fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                      {/* progresso */}
                      <ellipse cx={CX} cy={CY} rx={RX} ry={RY}
                        fill="none"
                        stroke={locked ? "#52e7ff" : "rgba(82,231,255,0.85)"}
                        strokeWidth="3.5" strokeLinecap="round"
                        strokeDasharray={CIRC}
                        strokeDashoffset={dashOffset}
                        style={{ transition: "stroke-dashoffset 0.08s linear, stroke 0.35s ease, filter 0.35s ease",
                          filter: locked ? "drop-shadow(0 0 6px rgba(82,231,255,0.9))" : "none" }}
                      />
                    </svg>

                    {/* Borda interna oval (formato cabeça/rosto) */}
                    <div className="absolute inset-0"
                      style={{
                        borderRadius: "50% 50% 46% 46% / 55% 55% 45% 45%",
                        border: `2px solid ${locked ? "rgba(82,231,255,0.45)" : "rgba(255,255,255,0.1)"}`,
                        transition: "border-color 0.35s ease",
                      }}
                    />

                    {/* Cantos futuristas (targeting brackets) */}
                    {[
                      { top: -8, left: -8, borderTop: "2px solid", borderLeft: "2px solid", borderRight: "none", borderBottom: "none", borderRadius: "4px 0 0 0" },
                      { top: -8, right: -8, borderTop: "2px solid", borderRight: "2px solid", borderLeft: "none", borderBottom: "none", borderRadius: "0 4px 0 0" },
                      { bottom: -8, left: -8, borderBottom: "2px solid", borderLeft: "2px solid", borderRight: "none", borderTop: "none", borderRadius: "0 0 0 4px" },
                      { bottom: -8, right: -8, borderBottom: "2px solid", borderRight: "2px solid", borderLeft: "none", borderTop: "none", borderRadius: "0 0 4px 0" },
                    ].map((s, i) => (
                      <div key={i} className="absolute h-5 w-5"
                        style={{ ...s, borderColor: locked ? "rgba(82,231,255,0.9)" : "rgba(82,231,255,0.5)", transition: "border-color 0.35s ease" }} />
                    ))}

                    {/* Texto centralizado dentro da área demarcada */}
                    {step === "camera" && (
                      <div className="absolute inset-0 flex items-center justify-center px-6">
                        <p className="text-center font-mono font-black uppercase"
                          style={{
                            fontSize: "10px",
                            letterSpacing: "0.18em",
                            lineHeight: 1.5,
                            color: locked ? "rgba(82,231,255,0.95)" : faceProgress > 0 ? "rgba(82,231,255,0.85)" : "rgba(255,255,255,0.55)",
                            transition: "color 0.3s ease",
                            textShadow: locked ? "0 0 12px rgba(82,231,255,0.6)" : "none",
                          }}>
                          {locked ? "✓" : faceProgress > 0 ? locale.faceStable : locale.faceHint}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Bottom: hint label (sem skip-camera: selfie obrigatória) */}
            {step === "camera" && (
              <div className="absolute bottom-[max(env(safe-area-inset-bottom),2rem)] z-20 flex flex-col items-center gap-3">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[rgba(255,255,255,0.3)]">
                  {locale.faceHint}
                </p>
              </div>
            )}

            {/* Countdown overlay */}
            <AnimatePresence mode="wait">
              {step === "countdown" && countdown !== null && countdown > 0 && (
                <motion.div
                  key={`count-${countdown}`}
                  className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
                  initial={{ opacity: 0, scale: 1.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.24 }}
                >
                  <span className="font-black text-white"
                    style={{ fontSize: "8rem", lineHeight: 1,
                      textShadow: "0 0 0 transparent, 0 0 40px rgba(82,231,255,0.7), 0 0 80px rgba(82,231,255,0.3)" }}>
                    {countdown}
                  </span>
                </motion.div>
              )}

              {step === "speaking" && (
                <motion.div
                  key="phrase"
                  className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-4"
                  style={{ background: "rgba(5,13,26,0.72)", backdropFilter: "blur(2px)" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-[rgba(82,231,255,0.6)]">
                    {locale.phraseHint}
                  </p>
                  <p className="px-8 text-center font-black uppercase"
                    style={{
                      fontSize: "clamp(1.6rem, 7vw, 2.2rem)",
                      letterSpacing: "0.1em", color: "#52e7ff",
                      textShadow: "0 0 32px rgba(82,231,255,0.65), 0 0 64px rgba(82,231,255,0.25)",
                    }}>
                    {locale.phrase}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Camera error */}
            {cameraError && (
              <div className="absolute inset-x-6 bottom-20 z-30 rounded-3xl px-6 py-5 text-center"
                style={{ background: "rgba(5,13,26,0.92)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}>
                <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[rgba(255,130,130,0.9)]">
                  {cameraError}
                </p>
                <button type="button"
                  onClick={() => { setCameraError(null); stopCamera(); setStep("intro") }}
                  className="rounded-full border border-[rgba(82,231,255,0.3)] bg-[rgba(82,231,255,0.1)] px-6 py-2.5 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-(--guto-cyan)">
                  {locale.retry}
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── FEEDBACK ──────────────────────────────────────────────────── */}
        {step === "feedback" && (
          <motion.div
            key="feedback"
            className="relative flex h-full flex-col justify-center px-5"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28 }}
          >
            <div className="guto-frost-panel mx-auto w-full max-w-[23rem] rounded-[2rem] p-5">
              <p className="font-mono text-[9px] font-black uppercase tracking-[0.22em] text-(--guto-cyan)">
                {locale.badge}
              </p>
              <h2 className="mt-2 text-[1.35rem] font-black uppercase leading-tight tracking-[0.04em] text-(--guto-navy)">
                {locale.feedbackTitle}
              </h2>
              <p className="mt-2 text-[13px] font-semibold leading-relaxed text-[rgba(13,35,65,0.62)]">
                {locale.feedbackSubtitle}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2">
                {(Object.entries(locale.feedbackOptions) as [WorkoutFeedbackDifficulty, string][]).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFeedbackDifficulty(value)}
                    className={[
                      "min-h-12 rounded-[1rem] border px-3 py-2 font-mono text-[10px] font-black uppercase tracking-[0.12em] transition",
                      feedbackDifficulty === value
                        ? "border-[rgba(82,231,255,0.7)] bg-[rgba(82,231,255,0.18)] text-(--guto-navy)"
                        : "border-white/70 bg-white/45 text-[rgba(13,35,65,0.55)]",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                <p className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-[rgba(13,35,65,0.45)]">
                  {locale.energyLabel}
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(Object.entries(locale.energyOptions) as [WorkoutFeedbackEnergy, string][]).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFeedbackEnergy(value)}
                      className={[
                        "min-h-10 rounded-[0.9rem] border px-2 py-2 font-mono text-[9px] font-black uppercase tracking-[0.1em] transition",
                        feedbackEnergy === value
                          ? "border-[rgba(82,231,255,0.65)] bg-[rgba(82,231,255,0.14)] text-(--guto-navy)"
                          : "border-white/70 bg-white/42 text-[rgba(13,35,65,0.5)]",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {feedbackDifficulty === "pain" && (
                <input
                  value={feedbackPainArea}
                  onChange={(event) => setFeedbackPainArea(event.target.value)}
                  placeholder={locale.painPlaceholder}
                  className="mt-4 min-h-12 w-full rounded-[1rem] border border-[rgba(157,43,43,0.16)] bg-white/68 px-4 text-[16px] font-bold text-(--guto-navy) outline-none placeholder:text-[rgba(13,35,65,0.38)]"
                />
              )}

              <textarea
                value={feedbackNote}
                onChange={(event) => setFeedbackNote(event.target.value)}
                placeholder={locale.notePlaceholder}
                rows={2}
                className="mt-4 w-full resize-none rounded-[1rem] border border-white/70 bg-white/58 px-4 py-3 text-[16px] font-semibold leading-snug text-(--guto-navy) outline-none placeholder:text-[rgba(13,35,65,0.38)]"
              />

              <button
                type="button"
                onClick={() => setStep("uploading")}
                className="guto-cta-primary mt-5"
              >
                {locale.feedbackContinue}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── UPLOADING ─────────────────────────────────────────────────── */}
        {step === "uploading" && (
          <motion.div
            key="uploading"
            className="relative flex h-full flex-col items-center justify-center px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
          >
            {uploadError ? (
              <div className="guto-frost-panel w-full max-w-[22rem] rounded-[2rem] p-6 text-center">
                <p className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-(--guto-cyan)">
                  {locale.badge}
                </p>
                <h2 className="mt-2 mb-4 text-[1.1rem] font-black uppercase tracking-[0.06em] text-(--guto-navy)">
                  {locale.errorTitle}
                </h2>
                <p className="mb-5 text-[12px] leading-relaxed text-[rgba(13,35,65,0.62)]">
                  {uploadError}
                </p>
                <button
                  type="button"
                  onClick={() => { setUploadError(null); setStep("intro") }}
                  className="guto-deboss-deep h-[3.25rem] w-full rounded-[1.2rem] border border-[rgba(82,231,255,0.42)] font-mono text-[11px] font-black uppercase tracking-[0.2em] text-(--guto-cyan)"
                >
                  {locale.retry}
                </button>
              </div>
            ) : (
              <div className="guto-frost-panel flex w-full max-w-[22rem] flex-col items-center gap-5 rounded-[2rem] px-6 py-10">
                <motion.div
                  className="h-14 w-14 rounded-full border-[3px] border-[rgba(13,35,65,0.1)] border-t-[var(--guto-cyan)]"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <p className="font-mono text-[11px] font-black uppercase tracking-[0.22em] text-[rgba(13,35,65,0.5)]">
                  {locale.uploading}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* ── SUCCESS ───────────────────────────────────────────────────── */}
        {step === "success" && validationResult && (
          <motion.div
            key="success"
            className="relative flex h-full flex-col items-stretch overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            {/* Ambient glow background */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <motion.div
                className="absolute left-1/2 top-[22%] h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(82,231,255,0.18) 0%, transparent 70%)" }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              />
              {/* Ray bursts */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
                <motion.div
                  key={deg}
                  className="absolute left-1/2 top-[22%] h-[1px] origin-left"
                  style={{
                    width: 110,
                    background: "linear-gradient(90deg, rgba(82,231,255,0.35), transparent)",
                    transform: `translate(-50%, -50%) rotate(${deg}deg)`,
                  }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ delay: 0.18 + i * 0.04, duration: 0.5, ease: "easeOut" }}
                />
              ))}
            </div>

            {/* Top status pill */}
            <motion.div
              className="mx-auto mt-8 flex items-center gap-2 rounded-full px-5 py-2"
              style={{ background: "rgba(82,231,255,0.1)", border: "1px solid rgba(82,231,255,0.28)" }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-(--guto-cyan)" style={{ boxShadow: "0 0 6px rgba(82,231,255,0.8)" }} />
              <span className="font-mono text-[9px] font-black uppercase tracking-[0.22em] text-(--guto-cyan)">
                {locale.badge}
              </span>
            </motion.div>

            {/* Central achievement icon */}
            <div className="relative mx-auto mt-7 flex flex-col items-center">
              <motion.div
                className="guto-deboss-deep relative grid h-[108px] w-[108px] place-items-center rounded-full border border-[rgba(82,231,255,0.5)]"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.12, duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Outer pulsing ring */}
                <motion.div
                  className="absolute inset-0 rounded-full border border-[rgba(82,231,255,0.3)]"
                  animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  initial={{ scale: 0, rotate: -30, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ delay: 0.28, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Zap
                    className="h-11 w-11 text-(--guto-cyan)"
                    style={{ filter: "drop-shadow(0 0 12px rgba(82,231,255,0.7))" }}
                  />
                </motion.div>
              </motion.div>
            </div>

            {/* VALIDADO big heading */}
            <motion.div
              className="mt-6 flex flex-col items-center gap-1 px-6 text-center"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1
                className="font-mono text-[2.1rem] font-black uppercase leading-none tracking-widest text-(--guto-navy)"
                style={{ textShadow: "0 0 32px rgba(82,231,255,0.22)" }}
              >
                {isPendingValidation ? locale.pending : locale.validated}
              </h1>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[rgba(13,35,65,0.45)]">
                {isPendingValidation ? locale.pendingXpLabel : locale.xpLabel}
              </p>
            </motion.div>

            {/* XP counter */}
            <motion.div
              className="mx-auto mt-4"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className="guto-slot flex items-baseline gap-1 rounded-[1.4rem] px-8 py-3"
              >
                <span
                  className="font-mono text-[2.4rem] font-black leading-none tracking-[-0.02em] text-(--guto-cyan)"
                  style={{ textShadow: "0 0 24px rgba(82,231,255,0.5)" }}
                >
                  +{validationResult.validation.xp}
                </span>
                <span className="font-mono text-[1rem] font-black tracking-[0.08em] text-[rgba(82,231,255,0.65)]">
                  XP
                </span>
              </div>
            </motion.div>

            {/* Arena XP badge */}
            {arenaResult && (
              <motion.div
                className="mx-auto mt-3 flex flex-col items-center gap-1"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.45 }}
              >
                <span className="rounded-full border border-[rgba(82,231,255,0.3)] bg-[rgba(82,231,255,0.08)] px-4 py-1.5 font-mono text-xs font-black tracking-widest text-(--guto-cyan)">
                  +{arenaResult.xpAwarded} XP · ARENA
                </span>
                {arenaResult.leveledUp && (
                  <span className="mt-1 rounded-full bg-yellow-400/15 px-3 py-1 font-mono text-[10px] font-black tracking-widest text-yellow-300">
                    GUTO EVOLUIU ⚡
                  </span>
                )}
              </motion.div>
            )}

            {/* GUTO message card */}
            {validationResult.validation.gutoMessage && (
              <motion.div
                className="mx-6 mt-5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.38 }}
              >
                <div
                  className="guto-frost-panel rounded-3xl px-5 py-4 text-center"
                  style={{ border: "1px solid rgba(82,231,255,0.2)" }}
                >
                  <p className="mb-1.5 font-mono text-[9px] font-black uppercase tracking-[0.22em] text-[rgba(82,231,255,0.7)]">
                    GUTO
                  </p>
                  <p className="text-[12.5px] leading-[1.6] text-[rgba(13,35,65,0.68)]">
                    {validationResult.validation.gutoMessage}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* CTA */}
            <motion.div
              className="px-6 pb-8"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.46 }}
            >
              <motion.button
                type="button"
                onClick={() => onComplete(validationResult.validationHistory)}
                className="guto-deboss-deep h-[3.4rem] w-full rounded-[1.3rem] border border-[rgba(82,231,255,0.5)] font-mono text-[11px] font-black uppercase tracking-[0.22em] text-(--guto-cyan)"
                style={{ boxShadow: "0 0 20px rgba(82,231,255,0.08)" }}
                whileTap={{ scale: 0.97 }}
              >
                {locale.seeInJourney}
              </motion.button>
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
