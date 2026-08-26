import assert from "node:assert/strict"
import { afterEach, test } from "node:test"

import { gutoVoice } from "../lib/guto-voice/guto-voice-service"

const originalFetch = globalThis.fetch
const originalWarn = console.warn
const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window")
const originalV3Flag = process.env.NEXT_PUBLIC_GUTO_V3_ENABLED

afterEach(() => {
  globalThis.fetch = originalFetch
  console.warn = originalWarn
  if (originalWindowDescriptor) Object.defineProperty(globalThis, "window", originalWindowDescriptor)
  else Reflect.deleteProperty(globalThis, "window")
  if (originalV3Flag === undefined) delete process.env.NEXT_PUBLIC_GUTO_V3_ENABLED
  else process.env.NEXT_PUBLIC_GUTO_V3_ENABLED = originalV3Flag
})

test("voz do chat não chama /voz no Preview V3", async () => {
  process.env.NEXT_PUBLIC_GUTO_V3_ENABLED = "true"
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { speechSynthesis: { cancel() {} } },
  })

  let fetchCount = 0
  const warnings: unknown[][] = []
  globalThis.fetch = (async () => {
    fetchCount += 1
    return new Response(null, { status: 500 })
  }) as typeof fetch
  console.warn = (...args: unknown[]) => { warnings.push(args) }

  const result = await gutoVoice.speak({
    text: "Resposta real do Cérebro V3.",
    language: "pt-BR",
    source: "chat",
  })

  assert.equal(result.mode, "silent")
  assert.equal(fetchCount, 0)
  assert.equal(warnings.some(([event]) => event === "[GUTO_V3_LEGACY_VOICE_BLOCKED]"), true)
})
