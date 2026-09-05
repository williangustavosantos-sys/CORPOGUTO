// ─── V3 EXECUTION PAYLOAD HELPERS (pure, testable) ──────────────────────────
// P0 (founder gate): the exercise-event requestId must be a STABLE identity
// for one logical execution of one plan exercise inside one workout session.
// Same workoutSessionId + same plan-item identity + same logical occurrence
// must ALWAYS derive the same UUID, so a validation retry / reload / network
// failure can never create a second historical execution. Date.now / Math.
// random / fresh randomUUID are forbidden here on purpose.
//
// P0 (no fabricated execution data): a prescription range like "8-12" is NOT
// an execution result. Unless a REAL observed count exists, repetitions must
// be omitted — never coerced into 812, 10, 12, min or max.

export interface V3ExercisePayloadSource {
  /** Stable logical-session id (created when the execution starts). */
  workoutSessionId: string
  /** Plan-item identity that stays stable across Mission/GUTO Online/
   * ValidationFlow replays (plan item id — never a Date.now/random value). */
  planItemId: string
  /** 0-based logical occurrence of this item inside the plan. */
  order: number
}

/**
 * Deterministic UUIDv4-format string for one logical exercise execution.
 * Not cryptographically random — it is an IDENTITY, derived purely from the
 * logical inputs, so replays always reproduce the same value. The backend
 * dedupes session-exercises on requestId, which turns every retry/reload into
 * an exactly-once history row (never a duplicate progression signal).
 */
export function deriveWorkoutExerciseRequestId(source: V3ExercisePayloadSource): string {
  const seed = `${source.workoutSessionId}|${source.planItemId}|${String(source.order)}`
  // cyrb128: deterministic 128-bit string hash (no Date.now, no Math.random).
  let h1 = 1779033703 ^ seed.length
  let h2 = 3144134277
  let h3 = 1013904242
  let h4 = 2773480762
  for (let i = 0; i < seed.length; i += 1) {
    const k = seed.charCodeAt(i)
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067)
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233)
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213)
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179)
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067)
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233)
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213)
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179)
  const bytes = new Uint8Array(16)
  new DataView(bytes.buffer).setUint32(0, h1 >>> 0)
  new DataView(bytes.buffer).setUint32(4, h2 >>> 0)
  new DataView(bytes.buffer).setUint32(8, h3 >>> 0)
  new DataView(bytes.buffer).setUint32(12, h4 >>> 0)
  // Force UUIDv4 markers (valid format for the backend uuid schema).
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * Reps rule (P0): only a REAL observed execution count may be sent. Accepts a
 * plain positive integer (number or digit-only string ≤ 200). Returns
 * undefined for prescription ranges ("8-12", "10-15"), timed warmups
 * ("5-8 min"), anything non-numeric or out of range — callers omit the field.
 */
export function resolveActualRepetitions(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 && value <= 200 ? value : undefined
  }
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return undefined
  const parsed = Number(trimmed)
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 200 ? parsed : undefined
}
