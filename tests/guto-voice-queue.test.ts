import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { GutoVoiceQueue } from "../lib/guto-online/guto-voice-queue"
import { createChatVoiceItem, resolveChatVoiceLanguage } from "../lib/guto-chat-voice"

const nextTick = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

describe("GutoVoiceQueue", () => {
  it("interrupts the current audio and does not let the aborted item release overlap", async () => {
    const events: string[] = []
    let activeSpeaks = 0
    let maxActiveSpeaks = 0
    const pendingResolves: Array<() => void> = []

    const queue = new GutoVoiceQueue({
      speaker: {
        speak: async ({ text, language, source }) => {
          activeSpeaks += 1
          maxActiveSpeaks = Math.max(maxActiveSpeaks, activeSpeaks)
          events.push(`speak:${text}:${language}:${source}`)
          await new Promise<void>((resolve) => {
            pendingResolves.push(resolve)
          })
          activeSpeaks -= 1
        },
        stop: () => {
          events.push("stop")
          pendingResolves.shift()?.()
        },
      },
      source: "chat",
    })

    queue.enqueue({
      intentKey: "old",
      text: "fala antiga",
      language: "pt-BR",
      priority: "normal",
      onEnd: () => events.push("end:old"),
    })
    await nextTick()

    queue.enqueue({
      intentKey: "new",
      text: "fala nova",
      language: "it-IT",
      priority: "interrupt",
      onEnd: () => events.push("end:new"),
    })
    await nextTick()

    queue.enqueue({
      intentKey: "third",
      text: "terceira fala",
      language: "pt-BR",
      priority: "normal",
      onEnd: () => events.push("end:third"),
    })
    await nextTick()

    assert.deepEqual(events.slice(0, 3), [
      "speak:fala antiga:pt-BR:chat",
      "stop",
      "speak:fala nova:it-IT:chat",
    ])
    assert.equal(maxActiveSpeaks, 1, "não pode haver duas falas ativas ao mesmo tempo")
    assert.equal(events.includes("end:old"), false, "fala abortada não pode acionar onEnd antigo depois")

    pendingResolves.shift()?.()
    await nextTick()
    pendingResolves.shift()?.()
    await nextTick()

    assert.ok(events.includes("end:new"))
    assert.ok(events.includes("speak:terceira fala:pt-BR:chat"))
  })
})

describe("chat voice language", () => {
  it("keeps pt-BR canonical and never turns it into Italian", () => {
    assert.equal(resolveChatVoiceLanguage("pt-BR"), "pt-BR")
    assert.notEqual(resolveChatVoiceLanguage("pt-BR"), "it-IT")
  })

  it("keeps it-IT canonical for Italian users", () => {
    assert.equal(resolveChatVoiceLanguage("it-IT"), "it-IT")
  })

  it("builds the TTS request through the canonical chat voice path", () => {
    assert.deepEqual(
      createChatVoiceItem("Dimmi cosa ti serve", "it-IT"),
      {
        intentKey: "chat:it-IT:dimmi cosa ti serve",
        text: "Dimmi cosa ti serve",
        language: "it-IT",
        source: "chat",
        priority: "interrupt",
        preferStatic: false,
      },
    )
  })
})
