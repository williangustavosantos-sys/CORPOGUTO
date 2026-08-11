import assert from "node:assert/strict"
import { afterEach, test } from "node:test"

import { apiRequest, setApiAuthToken } from "../lib/api/client"

const originalFetch = globalThis.fetch

afterEach(() => {
  setApiAuthToken(null)
  globalThis.fetch = originalFetch
})

test("apiRequest keeps the authenticated Bearer token when browser storage is unavailable", async () => {
  let authorization: string | null = null
  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    authorization = new Headers(init?.headers).get("authorization")
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  }) as typeof fetch

  setApiAuthToken("preview-session-token")
  const result = await apiRequest<{ ok: boolean }>("/guto/v3/state")

  assert.deepEqual(result, { ok: true })
  assert.equal(authorization, "Bearer preview-session-token")
})

test("a 401 clears the in-memory token before the next request", async () => {
  const authorizationHeaders: Array<string | null> = []
  let requestCount = 0
  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    authorizationHeaders.push(new Headers(init?.headers).get("authorization"))
    requestCount += 1
    return requestCount === 1
      ? new Response(JSON.stringify({ message: "Autenticação necessária." }), {
          status: 401,
          headers: { "content-type": "application/json" },
        })
      : new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
  }) as typeof fetch

  setApiAuthToken("expired-preview-token")
  await assert.rejects(() => apiRequest("/guto/v3/state"))
  await apiRequest("/guto/v3/state")

  assert.deepEqual(authorizationHeaders, ["Bearer expired-preview-token", null])
})
