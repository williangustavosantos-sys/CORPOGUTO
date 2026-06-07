import type { GutoMemory } from "@/lib/api/guto"

/** Estados visuais do avatar do GUTO (default/alerta/crítico/recompensa/super). */
export type GutoAvatarEmotion = "default" | "alert" | "critical" | "reward" | "super"

export type GutoVitalState =
  | "new"
  | "healthy"
  | "alert"
  | "critical"
  | "dying"
  | "dead"
  | "recovering"

export interface GutoVitalStateResult {
  state: GutoVitalState
  totalXp: number
  missedCount: number
  emotion: GutoAvatarEmotion
  opacity: number
  isCritical: boolean
}

const HOUR = 60 * 60 * 1000
const ACTIVE_WINDOW = 12 * HOUR

const STATE_PARAMS: Record<GutoVitalState, Pick<GutoVitalStateResult, "state" | "emotion" | "opacity" | "isCritical">> = {
  new:        { state: "new",        emotion: "default",  opacity: 1.0,  isCritical: false },
  healthy:    { state: "healthy",    emotion: "default",  opacity: 1.0,  isCritical: false },
  alert:      { state: "alert",      emotion: "alert",    opacity: 0.9,  isCritical: false },
  critical:   { state: "critical",   emotion: "critical", opacity: 0.75, isCritical: true  },
  dying:      { state: "dying",      emotion: "critical", opacity: 0.5,  isCritical: true  },
  dead:       { state: "dead",       emotion: "critical", opacity: 0.25, isCritical: true  },
  recovering: { state: "recovering", emotion: "alert",    opacity: 0.65, isCritical: false },
}

const NEW_DEFAULT: GutoVitalStateResult = {
  ...STATE_PARAMS.new,
  totalXp: 100,
  missedCount: 0,
}

export function getGutoVitalState(memory: Partial<GutoMemory> | null | undefined): GutoVitalStateResult {
  if (!memory) return NEW_DEFAULT

  const totalXp = Math.max(0, memory.totalXp ?? 100)
  const missedCount = (memory.missedMissionDates ?? []).length
  const completedCount = (memory.completedWorkoutDates ?? []).length
  const trainedToday = memory.trainedToday === true

  if (totalXp === 100 && missedCount === 0 && completedCount === 0) {
    return { ...STATE_PARAMS.new, totalXp, missedCount }
  }

  const lastActiveTs = memory.lastActiveAt ? new Date(memory.lastActiveAt).getTime() : 0
  const isActiveNow = lastActiveTs > 0 && Date.now() - lastActiveTs < ACTIVE_WINDOW

  let baseState: GutoVitalState
  if (totalXp <= 0) {
    baseState = "dead"
  } else if (totalXp <= 19 || missedCount >= 4) {
    baseState = "dying"
  } else if (totalXp <= 49 || missedCount >= 2) {
    baseState = "critical"
  } else if (totalXp <= 70 || missedCount >= 1) {
    baseState = "alert"
  } else {
    baseState = "healthy"
  }

  const isInBadShape = baseState === "critical" || baseState === "dying" || baseState === "dead"
  if (isInBadShape && isActiveNow && !trainedToday) {
    return { ...STATE_PARAMS.recovering, totalXp, missedCount }
  }

  return { ...STATE_PARAMS[baseState], totalXp, missedCount }
}
