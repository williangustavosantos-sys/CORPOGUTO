import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { hasDurableSovereignNameConfirmation, stageAfterInviteClaim } from "../lib/onboarding-flow"

describe("GUTO onboarding order", () => {
  it("a fresh invite enters consent before naming", () => {
    assert.equal(stageAfterInviteClaim(), "consent")
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
})
