import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const chatTabSource = readFileSync("components/guto/tabs/chat-tab.tsx", "utf8")
const pathTabSource = readFileSync("components/guto/tabs/path-tab.tsx", "utf8")

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

describe("ChatTab operational state", () => {
  it("bloqueia o input enquanto há card obrigatório pendente", () => {
    assert.match(chatTabSource, /hasBlockingProactiveCard/)
    assert.match(chatTabSource, /data-testid="guto-chat-card-block"/)
    assert.match(chatTabSource, /blockingProactiveCardRef\.current/)
    assert.match(chatTabSource, /Confirma o card para eu seguir\./)
  })

  it("preserva e retoma turno pendente ao navegar e voltar", () => {
    assert.match(chatTabSource, /interface PendingChatTurn/)
    assert.match(chatTabSource, /pendingTurn:/)
    assert.match(chatTabSource, /resumePending/)
    assert.match(chatTabSource, /turnId:\s*nextPendingTurn\.turnId/)
  })

  it("aguarda persistência do contexto, confirma o chip e nunca encerra correlação inválida sem fallback", () => {
    assert.match(chatTabSource, /await activeContextWriteRef\.current/)
    assert.match(chatTabSource, /activeContextActivationRef/)
    assert.match(chatTabSource, /activeContextActivationRef\.current === activationId/)
    assert.match(chatTabSource, /const persisted = await setActiveContext\(context\)/)
    assert.match(chatTabSource, /setContextChip\(\{\s*type: persisted\.type/)
    assert.match(chatTabSource, /resolveGutoResponseForRender\(/)
    assert.match(chatTabSource, /text: renderDecision\.speech/)
  })

  it("alterar data fica no card ou Percurso sem mandar o usuário ao chat", () => {
    assert.doesNotMatch(chatTabSource, /changeProactiveMemoryDate/)
    assert.doesNotMatch(pathTabSource, /changeProactiveMemoryDate/)
    assert.doesNotMatch(pathTabSource, /onOpenChat\?\.\(\)/)
    assert.match(chatTabSource, /type="date"/)
    assert.match(pathTabSource, /type="date"/)
  })
})
