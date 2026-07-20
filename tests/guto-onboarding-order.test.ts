import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"
import { commitCalibrationOnceAndRecover, hasDurableSovereignNameConfirmation, resolveDurableCommittedName, stageAfterInviteClaim } from "../lib/onboarding-flow"

const gutoAppSource = readFileSync(new URL("../components/guto/guto-app.tsx", import.meta.url), "utf8")

describe("GUTO onboarding order", () => {
  it("a fresh invite enters consent before naming", () => {
    assert.equal(stageAfterInviteClaim(), "consent")
  })

  it("keeps the post-claim transition isolated from hydration timer cleanup", () => {
    assert.match(gutoAppSource, /const scheduleInviteTransition = useCallback/)
    assert.match(gutoAppSource, /scheduleInviteTransition\(\(\) => \{\s*login\(/)
    assert.doesNotMatch(gutoAppSource, /schedule\(\(\) => \{\s*login\(/)
  })

  it("recovers a committed calibration after the POST response is lost without retrying the POST", async () => {
    let commits = 0
    let reads = 0
    const durable = { trainingGoal: "muscle_gain", complete: true }

    const recovered = await commitCalibrationOnceAndRecover(
      async () => {
        commits += 1
        return null
      },
      async () => {
        reads += 1
        return durable
      },
      (memory) => memory.complete,
    )

    assert.equal(recovered, durable)
    assert.equal(commits, 1)
    assert.equal(reads, 1)
  })

  it("a confirmação soberana persiste entre browsers antes do pacto", () => {
    assert.equal(
      hasDurableSovereignNameConfirmation(null, {
        sovereignNameConfirmedAt: "2026-07-18T12:00:00.000Z",
        initialXpGranted: false,
      }),
      true,
    )
  })

  it("o nome sugerido pelo convite não conta como confirmação", () => {
    assert.equal(hasDurableSovereignNameConfirmation(null, { initialXpGranted: false }), false)
  })

  it("reidrata o nome confirmado pelo backend em um browser limpo", () => {
    assert.equal(
      resolveDurableCommittedName("AuditorPT", null, {
        sovereignNameConfirmedAt: "2026-07-18T12:00:00.000Z",
        initialXpGranted: true,
      }),
      "AuditorPT",
    )
  })
})
