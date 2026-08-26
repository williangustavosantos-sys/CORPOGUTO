import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { isCalibrationProfileComplete } from "../components/guto/screens/calibration-screen"
import {
  buildGutoV3CalibrationRequest,
  hasConfirmedV3Context,
  plansShareConfirmedV3Context,
} from "../lib/api/guto"

const calibrationSource = readFileSync(
  new URL("../components/guto/screens/calibration-screen.tsx", import.meta.url),
  "utf8",
)
const apiSource = readFileSync(new URL("../lib/api/guto.ts", import.meta.url), "utf8")
const chatSource = readFileSync(new URL("../components/guto/tabs/chat-tab.tsx", import.meta.url), "utf8")
const dietSource = readFileSync(new URL("../components/guto/tabs/diet-tab.tsx", import.meta.url), "utf8")
const appSource = readFileSync(new URL("../components/guto/guto-app.tsx", import.meta.url), "utf8")

const completeCalibration = {
  biologicalSex: "male" as const,
  userAge: 33,
  trainingLevel: "consistent" as const,
  trainingGoal: "muscle_gain" as const,
  trainingFrequencyDaysPerWeek: 4,
  heightCm: 181,
  weightKg: 82,
}

test("V3.2 calibration accepts exactly the seven objective answers", () => {
  assert.equal(isCalibrationProfileComplete(completeCalibration), true)

  for (const field of Object.keys(completeCalibration)) {
    const withoutOne = { ...completeCalibration, [field]: undefined }
    assert.equal(isCalibrationProfileComplete(withoutOne), false, `${field} must be required`)
  }

  const request = buildGutoV3CalibrationRequest({
    biologicalSex: "male",
    age: 33,
    weightKg: 82,
    heightCm: 181,
    trainingLevel: "consistent",
    trainingGoal: "muscle_gain",
    trainingFrequencyDaysPerWeek: 4,
  })

  assert.deepEqual(Object.keys(request.profile).sort(), [
    "age",
    "biologicalSex",
    "heightCm",
    "trainingStatus",
    "weeklyFrequencyDaysPerWeek",
    "weightKg",
  ])
  assert.deepEqual(request.goal, { code: "muscle_gain" })
  assert.equal(request.profile.trainingStatus, "active")
  assert.equal(request.profile.weeklyFrequencyDaysPerWeek, 4)
  assert.equal("trainingFrequencyDaysPerWeek" in request.profile, false)
})

test("V3.2 calibration UI does not collect declarations or training location", () => {
  for (const removedField of [
    "foodRestrictions",
    "trainingPathology",
    "preferredTrainingLocation",
    "trainingLocation",
    "city",
    "country",
  ]) {
    assert.equal(
      new RegExp(`\\b${removedField}\\b`).test(calibrationSource),
      false,
      `${removedField} must not be reachable from calibration UI`,
    )
  }
  assert.match(calibrationSource, /trainingFrequencyDaysPerWeek/)
})

test("V3.2 First Contact client contract exposes only V3 state endpoints", () => {
  assert.match(apiSource, /"\/guto\/v3\/first-contact\/start"/)
  assert.match(apiSource, /"\/guto\/v3\/first-contact\/respond"/)
  assert.match(apiSource, /"\/guto\/v3\/first-contact\/confirm"/)
  assert.match(apiSource, /GutoV3FirstContactStatus\s*=\s*"NOT_STARTED"\s*\|\s*"IN_PROGRESS"\s*\|\s*"COMPLETED"/)
  assert.match(apiSource, /GutoV3FirstContactStep\s*=\s*"food_restrictions"\s*\|\s*"training_limitations"\s*\|\s*"confirmation"\s*\|\s*"completed"/)
  assert.match(apiSource, /answer, expectedStep/)
})

test("V3.2 First Contact renders the official prompt and survives reload without repeating completion", () => {
  assert.match(chatSource, /if \(v3Enabled && isGutoV3FirstContactActive\(firstContact\)\)/)
  assert.match(chatSource, /const prompt = firstContact\?\.currentPrompt\?\.trim\(\)/)
  assert.match(chatSource, /if \(!v3Enabled \|\| !shouldStartGutoV3FirstContact\(memory\?\.firstContact\)\) return/)
  assert.match(chatSource, /respondGutoV3FirstContact\(displayText, expectedStep\)/)
  assert.match(chatSource, /applyOfficialFirstContactState\(await getGutoV3State/)
  assert.doesNotMatch(chatSource, /isNotStarted\s*\?\s*\[localOpeningMessage\]/)
})

test("V3.2 Preview does not generate plans before the confirmed shared context", () => {
  assert.match(dietSource, /if \(v3Enabled\) return/)
  assert.match(dietSource, /const sharedPlanContextReady = confirmedContextReady && plansShareConfirmedV3Context\(memory\)/)
  assert.match(appSource, /const sharedContextReady = hasConfirmedV3Context\(official\) && plansShareConfirmedV3Context\(official\)/)
  assert.match(chatSource, /if \(!v3Enabled && dietReadyFromBackend/)
})

test("V3.2 considers context ready only after First Contact completion and matching version", () => {
  const base = {
    firstContact: {
      status: "COMPLETED" as const,
      step: "completed" as const,
      foodDeclaration: "Sem restricoes",
      limitationDeclaration: "Sem limitacoes",
      startedAt: "2026-08-13T10:00:00.000Z",
      completedAt: "2026-08-13T10:02:00.000Z",
      currentPrompt: null,
      summary: "Contexto confirmado",
      confirmedContextVersion: 7,
    },
    confirmedContext: {
      id: "context-7",
      version: 7,
      confirmedAt: "2026-08-13T10:02:00.000Z",
    },
  }

  assert.equal(hasConfirmedV3Context(base), true)
  assert.equal(hasConfirmedV3Context({ ...base, firstContact: { ...base.firstContact, status: "IN_PROGRESS" } }), false)
  assert.equal(hasConfirmedV3Context({ ...base, confirmedContext: { ...base.confirmedContext, version: 8 } }), false)
  assert.equal(hasConfirmedV3Context({ ...base, confirmedContext: null }), false)
})

test("V3.2 workout and diet are valid together only on the same confirmed context version", () => {
  const base = {
    confirmedContext: { id: "context-3", version: 3, confirmedAt: "2026-08-13T10:02:00.000Z" },
    lastWorkoutPlan: { confirmedContextVersion: 3 },
    lastDietPlan: { confirmedContextVersion: 3 },
  }

  assert.equal(plansShareConfirmedV3Context(base), true)
  assert.equal(plansShareConfirmedV3Context({ ...base, lastDietPlan: { confirmedContextVersion: 2 } }), false)
  assert.equal(plansShareConfirmedV3Context({ ...base, lastWorkoutPlan: { confirmedContextVersion: null } }), false)
  assert.equal(plansShareConfirmedV3Context({ ...base, confirmedContext: null }), false)
})
