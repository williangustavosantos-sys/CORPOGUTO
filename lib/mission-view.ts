import type { MissionExercise } from "@/components/guto/view-models"

// Lógica pura da lista compacta da Missão (smoke test DUDAAA: cards gigantes
// com vídeo autoplay deixavam ~1,5 exercício visível por tela). O componente
// é renderizador fino do que está testado aqui.

export interface CompactExerciseRow {
  id: string
  /** Ordem de execução exibida (1-based, aquecimento antes da parte principal). */
  order: number
  name: string
  muscleGroup: string
  sets: number
  repsLabel: string
  rest: string
  done: boolean
}

// Normaliza faixas para um único token com en dash ("12-15" → "12–15").
// A quebra "12-"/"15" vinha do hífen ser ponto válido de quebra de linha numa
// célula estreita; o bloqueio real é o whitespace-nowrap no CSS — aqui só
// garantimos que a faixa não carrega espaços internos quebráveis.
export function formatRepsLabel(reps: number | string): string {
  return String(reps).trim().replace(/\s*[-–—]\s*/g, "–")
}

export function buildCompactRows(
  exercises: MissionExercise[],
  completedExerciseIds: string[],
  trainedToday: boolean
): { warmup: CompactExerciseRow[]; main: CompactExerciseRow[] } {
  const doneIds = new Set(completedExerciseIds)
  let order = 0
  const toRow = (exercise: MissionExercise): CompactExerciseRow => ({
    id: exercise.id,
    order: ++order,
    name: exercise.name,
    muscleGroup: exercise.muscleGroup,
    sets: exercise.sets,
    repsLabel: formatRepsLabel(exercise.reps),
    rest: exercise.rest,
    done: trainedToday || doneIds.has(exercise.id),
  })
  return {
    warmup: exercises.filter((e) => e.muscleGroup === "aquecimento").map(toRow),
    main: exercises.filter((e) => e.muscleGroup !== "aquecimento").map(toRow),
  }
}
