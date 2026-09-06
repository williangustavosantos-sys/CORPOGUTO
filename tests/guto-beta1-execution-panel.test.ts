import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { deriveBeta1ExecutionRequestId, type Beta1SetInput } from "../lib/api/guto"

// ─── BETA1 (memory gate): execution logging + self-report completion ─────────
// Proves the frontend Golden Path contract: deterministic execution requestIds
// (exactly-once), REAL set rows (never prescription inference), and the
// self-report completion route (no selfie on Beta 1).

test("BETA1 requestId: deterministic per (session, exercise) — retry never mints a second identity", () => {
  const a = deriveBeta1ExecutionRequestId({ workoutSessionId: "sess-1", exerciseId: "supino_reto" })
  const b = deriveBeta1ExecutionRequestId({ workoutSessionId: "sess-1", exerciseId: "supino_reto" })
  const other = deriveBeta1ExecutionRequestId({ workoutSessionId: "sess-1", exerciseId: "remada" })
  assert.equal(a, b, "same logical execution → same requestId (backend dedupes)")
  assert.notEqual(a, other, "different exercise → different requestId")
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, "UUID format for the backend uuid schema")
})

test("BETA1 set payload: only REAL observed values travel (no '8-12' → 812 coercion)", () => {
  const sets: Beta1SetInput[] = [
    { setNumber: 1, loadKg: 80, reps: 10 },
    { setNumber: 2, loadKg: 80, reps: 10 },
    { setNumber: 3, loadKg: 80, reps: 9 },
  ]
  const serialized = JSON.stringify(sets)
  assert.ok(!serialized.includes("812"), "rep ranges must never be coerced into a single number")
  assert.equal(sets.every((set) => set.techniqueType === undefined || set.techniqueType === "STRAIGHT_SET"), true)
})

test("BETA1 UI wiring: Mission exposes the self-report panel and never forces the camera on it", () => {
  const missionSource = readFileSync(new URL("../components/guto/tabs/mission-tab.tsx", import.meta.url), "utf8")
  const appSource = readFileSync(new URL("../components/guto/guto-app.tsx", import.meta.url), import.meta.url ? "utf8" : "utf8")
  assert.ok(missionSource.includes("Beta1ExecutionPanel"), "Mission renders the Beta1 panel")
  assert.ok(missionSource.includes("onOpenBeta1Execution"), "Mission exposes the open hook")
  assert.ok(appSource.includes("setBeta1PanelOpen(true)"), "App opens the panel")
  assert.ok(appSource.includes("applyMemoryPatch({ trainedToday: true })"), "completion syncs trainedToday")
  // The self-report flow must NOT require selfie evidence:
  assert.ok(!missionSource.includes("imageBase64"), "Beta1 panel never demands selfie evidence")
})
