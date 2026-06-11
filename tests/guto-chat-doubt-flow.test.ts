import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const chatTabSource = readFileSync("components/guto/tabs/chat-tab.tsx", "utf8")

describe("ChatTab doubt button flow", () => {
  it("exercise doubt click prepares context without sending a hidden model prompt", () => {
    assert.equal(chatTabSource.includes("copy.exerciseDoubtTrigger"), false)
    assert.equal(chatTabSource.includes("sendTextToGuto(trigger, wrapWithActiveContext(trigger), { hideUserBubble: true })"), false)
  })

  it("diet doubt click prepares context without sending a hidden model prompt", () => {
    assert.equal(chatTabSource.includes("copy.mealDoubtTrigger"), false)
    assert.equal(chatTabSource.includes("sendTextToGuto(trigger, wrapWithActiveContext(trigger), { hideUserBubble: true })"), false)
  })
})
