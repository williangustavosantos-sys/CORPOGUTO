import type { GutoMemory, GutoWorkoutExercise, GutoWorkoutPlan, WorkoutFocus } from "@/lib/api/guto"
import { getMissingCalibrationFields, hasCompleteGutoCalibration, isSupportedGutoLanguage, type GutoLanguage } from "@/lib/guto-profile"
import { normalizeWorkoutLocationMode } from "@/lib/workout-location"

const todayKey = () => new Date().toISOString().slice(0, 10)

const exerciseCatalog: Record<string, GutoWorkoutExercise> = {
  esteira: {
    id: "caminhada_esteira_inclinada",
    name: "Caminhada na esteira inclinada",
    canonicalNamePt: "Caminhada na esteira inclinada",
    muscleGroup: "aquecimento",
    sets: 1,
    reps: "6 min",
    rest: "30s",
    cue: "Ritmo firme. Aquece sem gastar a missão.",
    note: "Aumente a inclinação só se estiver sem dor.",
    videoUrl: "/exercise/visuals/aquecimento-aerobico/caminhada_esteira_inclinada.mp4",
    videoProvider: "local",
    sourceFileName: "caminhada_esteira_inclinada.mp4",
  },
  supino: {
    id: "supino_reto",
    name: "Supino reto",
    canonicalNamePt: "Supino reto",
    muscleGroup: "peito",
    sets: 4,
    reps: "8-10",
    rest: "75s",
    cue: "Controle a descida. Empurra sem perder postura.",
    note: "Carga forte, execução limpa.",
    videoUrl: "/exercise/visuals/peito/supino_reto.mp4",
    videoProvider: "local",
    sourceFileName: "supino_reto.mp4",
  },
  remada: {
    id: "remada_baixa_polia",
    name: "Remada baixa na polia",
    canonicalNamePt: "Remada baixa na polia",
    muscleGroup: "costas",
    sets: 4,
    reps: "10-12",
    rest: "75s",
    cue: "Puxa com as costas, não com pressa.",
    note: "Pausa curta no fim do movimento.",
    videoUrl: "/exercise/visuals/costas/remada_baixa_polia.mp4",
    videoProvider: "local",
    sourceFileName: "remada_baixa_polia.mp4",
  },
  legpress: {
    id: "legpress_45",
    name: "Leg press 45",
    canonicalNamePt: "Leg press 45",
    muscleGroup: "pernas",
    sets: 4,
    reps: "10-12",
    rest: "90s",
    cue: "Amplitude segura. Joelho acompanha a ponta do pé.",
    note: "Se houver dor no joelho, reduza amplitude e carga.",
    videoUrl: "/exercise/visuals/pernas-gluteos-panturrilha/legpress_45.mp4",
    videoProvider: "local",
    sourceFileName: "legpress_45.mp4",
  },
  ombro: {
    id: "desenvolvimento_sentado",
    name: "Desenvolvimento sentado",
    canonicalNamePt: "Desenvolvimento sentado",
    muscleGroup: "ombro",
    sets: 3,
    reps: "8-10",
    rest: "75s",
    cue: "Tronco firme. Sobe sem compensar lombar.",
    note: "Pare antes de transformar técnica em ego.",
    videoUrl: "/exercise/visuals/ombro/desenvolvimento_sentado.mp4",
    videoProvider: "local",
    sourceFileName: "desenvolvimento_sentado.mp4",
  },
  prancha: {
    id: "prancha_isometrica",
    name: "Prancha isométrica",
    canonicalNamePt: "Prancha isométrica",
    muscleGroup: "abdomen",
    sets: 3,
    reps: "35-45s",
    rest: "45s",
    cue: "Quadril firme. Respira e segura.",
    note: "Missão termina com controle, não com desespero.",
    videoUrl: "/exercise/visuals/abdomen-core/prancha_isomentrica.mp4",
    videoProvider: "local",
    sourceFileName: "prancha_isomentrica.mp4",
  },
  flexao: {
    id: "flexao",
    name: "Flexão",
    canonicalNamePt: "Flexão",
    muscleGroup: "peito",
    sets: 4,
    reps: "8-15",
    rest: "60s",
    cue: "Corpo em bloco. Desce com controle.",
    note: "Use apoio no joelho se precisar manter execução.",
    videoUrl: "/exercise/visuals/peito/flexao.mp4",
    videoProvider: "local",
    sourceFileName: "flexao.mp4",
  },
}

const WORKOUT_FOCUS_TITLES: Record<WorkoutFocus, Record<GutoLanguage, string>> = {
  full_body: {
    "pt-BR": "Força total",
    "it-IT": "Forza totale",
    "en-US": "Full-body strength",
  },
  legs_core: {
    "pt-BR": "Inferiores e core",
    "it-IT": "Gambe e core",
    "en-US": "Legs and core",
  },
  chest_triceps: {
    "pt-BR": "Peito, ombro e tríceps",
    "it-IT": "Petto, spalle e tricipiti",
    "en-US": "Chest, shoulders and triceps",
  },
  back_biceps: {
    "pt-BR": "Costas e bíceps",
    "it-IT": "Schiena e bicipiti",
    "en-US": "Back and biceps",
  },
  shoulders_abs: {
    "pt-BR": "Ombros e abdômen",
    "it-IT": "Spalle e addome",
    "en-US": "Shoulders and abs",
  },
}

const GENERIC_WORKOUT_TITLES = new Set([
  "treino do dia",
  "today's workout",
  "allenamento del giorno",
  "entrenamiento del dia",
  "missao do dia",
  "mission of the day",
  "missione del giorno",
  "mision del dia",
])

type ExerciseCopy = Partial<Pick<GutoWorkoutExercise, "name" | "cue" | "note">>

const EXERCISE_COPY_BY_ID: Record<string, Record<GutoLanguage, ExerciseCopy>> = {
  "aquecimento-esteira": {
    "pt-BR": { name: "Caminhada na esteira inclinada", cue: "Ritmo firme. Aquece sem gastar a missão.", note: "Aumente a inclinação só se estiver sem dor." },
    "it-IT": { name: "Camminata sul tapis roulant in salita", cue: "Ritmo deciso. Scalda senza bruciare la missione.", note: "Aumenta l'inclinazione solo se non hai dolore." },
    "en-US": { name: "Incline treadmill walk", cue: "Firm pace. Warm up without spending the mission.", note: "Increase the incline only if there is no pain." },
  },
  "peito-supino-reto": {
    "pt-BR": { name: "Supino reto", cue: "Controle a descida. Empurra sem perder postura.", note: "Carga forte, execução limpa." },
    "it-IT": { name: "Panca piana", cue: "Controlla la discesa. Spingi senza perdere postura.", note: "Carico serio, esecuzione pulita." },
    "en-US": { name: "Bench press", cue: "Control the way down. Press without losing position.", note: "Strong load, clean execution." },
  },
  "costas-remada-baixa": {
    "pt-BR": { name: "Remada baixa na polia", cue: "Puxa com as costas, não com pressa.", note: "Pausa curta no fim do movimento." },
    "it-IT": { name: "Rematore basso al cavo", cue: "Tira con la schiena, non con la fretta.", note: "Pausa breve alla fine del movimento." },
    "en-US": { name: "Cable row", cue: "Pull with your back, not with haste.", note: "Short pause at the end of the movement." },
  },
  "pernas-legpress-45": {
    "pt-BR": { name: "Leg press 45", cue: "Amplitude segura. Joelho acompanha a ponta do pé.", note: "Se houver dor no joelho, reduza amplitude e carga." },
    "it-IT": { name: "Leg press 45", cue: "Ampiezza sicura. Il ginocchio segue la punta del piede.", note: "Se il ginocchio dà fastidio, riduci ampiezza e carico." },
    "en-US": { name: "Leg press 45", cue: "Safe range. Knee tracks over the toes.", note: "If the knee hurts, reduce range and load." },
  },
  "ombro-desenvolvimento": {
    "pt-BR": { name: "Desenvolvimento sentado", cue: "Tronco firme. Sobe sem compensar lombar.", note: "Pare antes de transformar técnica em ego." },
    "it-IT": { name: "Military press seduto", cue: "Busto fermo. Sali senza compensare con la lombare.", note: "Fermati prima che la tecnica diventi ego." },
    "en-US": { name: "Seated shoulder press", cue: "Firm torso. Press without arching the low back.", note: "Stop before technique turns into ego." },
  },
  "abdomen-prancha": {
    "pt-BR": { name: "Prancha isométrica", cue: "Quadril firme. Respira e segura.", note: "Missão termina com controle, não com desespero." },
    "it-IT": { name: "Plank isometrico", cue: "Bacino fermo. Respira e tieni.", note: "La missione finisce con controllo, non con disperazione." },
    "en-US": { name: "Plank", cue: "Hips firm. Breathe and hold.", note: "The mission ends with control, not desperation." },
  },
  "peito-flexao": {
    "pt-BR": { name: "Flexão", cue: "Corpo em bloco. Desce com controle.", note: "Use apoio no joelho se precisar manter execução." },
    "it-IT": { name: "Flessioni", cue: "Corpo compatto. Scendi con controllo.", note: "Usa le ginocchia se serve per mantenere l'esecuzione." },
    "en-US": { name: "Push-up", cue: "Body as one block. Lower with control.", note: "Use knee support if needed to keep execution clean." },
  },
}

const EXERCISE_COPY_ALIASES: Record<string, keyof typeof EXERCISE_COPY_BY_ID> = {
  caminhada_esteira_inclinada: "aquecimento-esteira",
  supino_reto: "peito-supino-reto",
  remada_baixa_polia: "costas-remada-baixa",
  legpress_45: "pernas-legpress-45",
  desenvolvimento_sentado: "ombro-desenvolvimento",
  prancha_isometrica: "abdomen-prancha",
  flexao: "peito-flexao",
}

function normalizeLanguage(language: string): GutoLanguage {
  return isSupportedGutoLanguage(language) ? language : "pt-BR"
}

function normalizeTitle(value?: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR")
}

// Espelha o backend (server.ts resolveFullBodyTitle): corpo inteiro só é
// "Força total" para objetivo de força (muscle_gain/hypertrophy). Os demais
// objetivos recebem rótulo neutro — a calibragem manda que o objetivo molde a
// missão, então o título não pode afirmar "força" para fat_loss/condicionamento.
const FULL_BODY_TITLE_BY_GOAL: Record<"strength" | "neutral", Record<GutoLanguage, string>> = {
  strength: { "pt-BR": "Força total", "it-IT": "Forza totale", "en-US": "Full-body strength" },
  neutral: { "pt-BR": "Corpo inteiro", "it-IT": "Corpo intero", "en-US": "Full body" },
}

// Sem focusKey o frontend NÃO inventa "corpo inteiro/força": usa título neutro do
// dia (Regra: frontend não inventa treino — GUTO_CHAT_E_CEREBRO §9).
const GENERIC_DAY_TITLE: Record<GutoLanguage, string> = {
  "pt-BR": "Treino do dia",
  "it-IT": "Allenamento del giorno",
  "en-US": "Today's workout",
}

export function getLocalizedWorkoutTitle(focusKey: WorkoutFocus | undefined, language: string, goal?: string) {
  const validLang = normalizeLanguage(language)
  if (!focusKey) return GENERIC_DAY_TITLE[validLang]
  if (focusKey === "full_body") {
    const isStrengthGoal = goal === "muscle_gain" || goal === "hypertrophy"
    return FULL_BODY_TITLE_BY_GOAL[isStrengthGoal ? "strength" : "neutral"][validLang]
  }
  return WORKOUT_FOCUS_TITLES[focusKey][validLang]
}

export function localizeGutoWorkoutPlan(plan: GutoWorkoutPlan | null | undefined, language: string): GutoWorkoutPlan | null {
  if (!plan) return null
  const validLang = normalizeLanguage(language)
  const normalizedFocus = normalizeTitle(plan.focus)
  const shouldReplaceFocus = Boolean(plan.focusKey) || GENERIC_WORKOUT_TITLES.has(normalizedFocus)
  const localizedFocus = shouldReplaceFocus ? getLocalizedWorkoutTitle(plan.focusKey, validLang, plan.goal) : plan.focus
  const localizedExercises = plan.exercises.map((exercise) => {
    const copyKey = EXERCISE_COPY_BY_ID[exercise.id] ? exercise.id : EXERCISE_COPY_ALIASES[exercise.id]
    const copy = copyKey ? EXERCISE_COPY_BY_ID[copyKey]?.[validLang] : undefined
    return copy ? { ...exercise, ...copy } : exercise
  })

  if (process.env.NODE_ENV === "development") {
    console.info("[GUTO_WORKOUT] localized plan language", validLang)
  }

  return {
    ...plan,
    focus: localizedFocus,
    dateLabel: plan.scheduledFor
      ? new Date(plan.scheduledFor).toLocaleDateString(validLang, { weekday: "long", day: "2-digit", month: "2-digit" })
      : plan.dateLabel,
    exercises: localizedExercises,
  }
}

export function getWorkoutMissingFields(memory?: GutoMemory | null) {
  return getMissingCalibrationFields(memory)
}

export function createLocalWorkoutPlan(memory: GutoMemory, language: string): GutoWorkoutPlan | null {
  if (!hasCompleteGutoCalibration(memory)) return null

  const validLang = normalizeLanguage(language)
  const locationMode = normalizeWorkoutLocationMode(memory.preferredTrainingLocation)
  if (!locationMode) return null
  const isGym = locationMode === "gym"
  const focusKey: WorkoutFocus = memory.trainingGoal === "muscle_gain" && isGym ? "full_body" : "full_body"
  const pathology = `${memory.trainingPathology || ""} ${memory.trainingLimitations || ""}`.toLocaleLowerCase("pt-BR")
  const avoidLegLoad = /joelho|knee|rodilla|ginocchio|quadril|anca/.test(pathology)

  const base = isGym
    ? ["esteira", "supino", "remada", avoidLegLoad ? "prancha" : "legpress", "ombro", "prancha"]
    : ["esteira", "flexao", "remada", "ombro", "prancha"]

  const exercises = base.map((key) => {
    const exercise = { ...exerciseCatalog[key] }
    const copyKey = EXERCISE_COPY_BY_ID[exercise.id] ? exercise.id : EXERCISE_COPY_ALIASES[exercise.id]
    const copy = copyKey ? EXERCISE_COPY_BY_ID[copyKey]?.[validLang] : undefined
    return copy ? { ...exercise, ...copy } : exercise
  })

  return {
    focus: getLocalizedWorkoutTitle(focusKey, validLang),
    focusKey,
    locationMode,
    location: locationMode,
    dateLabel: new Date().toLocaleDateString(validLang, { weekday: "long", day: "2-digit", month: "2-digit" }),
    scheduledFor: todayKey(),
    summary: validLang === "en-US" ? "Local plan based on your calibration." :
             validLang === "it-IT" ? "Piano locale basato sulla tua calibrazione." :
             "Plano local gerado a partir da calibragem salva.",
    exercises,
  }
}
