import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

const apiSource = readFileSync(new URL("../lib/api/guto.ts", import.meta.url), "utf8")
const chatSource = readFileSync(
  new URL("../components/guto/tabs/chat-tab.tsx", import.meta.url),
  "utf8",
)

function sourceBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start)
  assert.notEqual(startIndex, -1, `marcador inicial ausente: ${start}`)
  const endIndex = source.indexOf(end, startIndex + start.length)
  assert.notEqual(endIndex, -1, `marcador final ausente: ${end}`)
  return source.slice(startIndex, endIndex)
}

describe("fronteira de autoridade do chat", () => {
  it("não permite que o contrato do navegador envie perfil ou idioma como estado soberano", () => {
    const requestContract = sourceBetween(
      apiSource,
      "export interface SendGutoMessageRequest {",
      "export type ProactiveMemoryStage",
    )

    assert.doesNotMatch(requestContract, /\bprofile\s*[?:]:/)
    assert.doesNotMatch(requestContract, /\blanguage\s*[?:]:/)
    assert.match(requestContract, /\bmessage:\s*string/)
    assert.match(requestContract, /\binput:\s*string/)
    assert.match(requestContract, /\brequestId:\s*string/)
  })

  it("envia ao /guto apenas a mensagem e os metadados de correlação necessários", () => {
    const chatRequest = sourceBetween(
      chatSource,
      "const data = await sendGutoMessage({",
      "const requestContext = {",
    )

    assert.doesNotMatch(chatRequest, /\bprofile\s*:/)
    assert.doesNotMatch(chatRequest, /\blanguage\s*:/)
    assert.match(chatRequest, /\bmessage:\s*nextPendingTurn\.displayText/)
    assert.match(chatRequest, /\binput:\s*nextPendingTurn\.modelInput/)
    assert.match(chatRequest, /\bhistory:\s*messagesRef\.current/)
    assert.match(chatRequest, /\brequestId:\s*nextPendingTurn\.requestId/)
    assert.match(chatRequest, /\bcontextVersion:\s*nextPendingTurn\.contextVersion/)
  })

  it("no V3 transmite somente texto original e correlacao, sem historico ou estado oficial", () => {
    const v3Branch = sourceBetween(
      apiSource,
      "if (isGutoV3Enabled()) {",
      "return apiRequest<SendGutoMessageResponse>",
    )

    const v3Body = sourceBetween(
      v3Branch,
      "body: JSON.stringify({",
      "}),",
    )

    assert.match(v3Branch, /apiRequest<GutoV3TurnResponse>\("\/guto\/v3"/)
    assert.match(v3Body, /message:\s*payload\.message/)
    assert.match(v3Body, /requestId:\s*payload\.requestId/)
    assert.doesNotMatch(v3Body, /payload\.input/)
    assert.doesNotMatch(v3Body, /payload\.history/)
    assert.doesNotMatch(v3Body, /profile|language|workoutPlan|dietPlan/)
  })

  it("preserva no adaptador V3 a correlação do contexto que originou o turno", () => {
    const v3Branch = sourceBetween(
      apiSource,
      "if (isGutoV3Enabled()) {",
      "return apiRequest<SendGutoMessageResponse>",
    )

    assert.match(v3Branch, /contextVersion:\s*payload\.contextVersion/)
    assert.match(v3Branch, /activeContextType:\s*payload\.activeContextType/)
    assert.match(v3Branch, /activeItemId:\s*payload\.activeItemId/)
  })
})
