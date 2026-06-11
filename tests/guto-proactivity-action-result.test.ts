import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  appendProactivityActionFalaMessage,
  getProactivityActionMemoryPatch,
  type ProactivityActionMessage,
} from "../lib/guto-proactivity-action-result"

type TestMessage = ProactivityActionMessage & { id: string }

function makeMessage(text: string): TestMessage {
  return { id: `m-${text.length}`, text, isGuto: true }
}

describe("proactivity action result UI", () => {
  it("renderiza fala de /guto/proactivity/confirm como mensagem do GUTO", () => {
    const next = appendProactivityActionFalaMessage<TestMessage>(
      [],
      { ok: true, fala: "Agora volta comigo para hoje." },
      makeMessage,
    )

    assert.equal(next.length, 1)
    assert.equal(next[0]?.isGuto, true)
    assert.equal(next[0]?.text, "Agora volta comigo para hoje.")
  })

  it("mantem memoryPatch disponivel para aplicacao no estado", () => {
    const patch = { proactiveImpacts: [{ memoryId: "m1" }] }

    assert.equal(getProactivityActionMemoryPatch({ ok: true, memoryPatch: patch }), patch)
  })

  it("sem fala preserva comportamento antigo", () => {
    const previous = [makeMessage("Mensagem anterior")]
    const next = appendProactivityActionFalaMessage(previous, { ok: true }, makeMessage)

    assert.equal(next, previous)
    assert.equal(next.length, 1)
  })

  it("nao duplica fala consecutiva igual", () => {
    const previous = [makeMessage("Agora volta comigo para hoje.")]
    const next = appendProactivityActionFalaMessage(
      previous,
      { ok: true, fala: "  agora volta comigo para hoje.  " },
      makeMessage,
    )

    assert.equal(next, previous)
    assert.equal(next.length, 1)
  })
})
