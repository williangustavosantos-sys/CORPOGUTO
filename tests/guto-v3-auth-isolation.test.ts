import assert from "node:assert/strict"
import { afterEach, test } from "node:test"

import {
  claimInvite,
  deleteOwnAccount,
  getInvite,
  getMe,
  loginAdmin,
  loginCoach,
  loginUser,
  logout,
  revokeConsent,
} from "../lib/api/auth"
import {
  ApiError,
  getApiAuthTokenStorageKey,
  setApiAuthToken,
} from "../lib/api/client"

const originalFetch = globalThis.fetch
const originalV3Flag = process.env.NEXT_PUBLIC_GUTO_V3_ENABLED

afterEach(() => {
  globalThis.fetch = originalFetch
  setApiAuthToken(null)
  if (originalV3Flag === undefined) delete process.env.NEXT_PUBLIC_GUTO_V3_ENABLED
  else process.env.NEXT_PUBLIC_GUTO_V3_ENABLED = originalV3Flag
})

test("Preview V3 usa somente login, sessão e logout próprios", async () => {
  process.env.NEXT_PUBLIC_GUTO_V3_ENABLED = "true"
  const requests: Array<{ url: string; method: string; authorization: string | null; body?: string }> = []

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    requests.push({
      url,
      method: init?.method || "GET",
      authorization: new Headers(init?.headers).get("authorization"),
      body: typeof init?.body === "string" ? init.body : undefined,
    })

    if (url.endsWith("/guto/v3/auth/login")) {
      return new Response(JSON.stringify({
        token: "v3-session-token",
        userId: "v3-stable-user",
        role: "student",
        name: "Fundador",
      }), { status: 200, headers: { "content-type": "application/json" } })
    }
    if (url.endsWith("/guto/v3/auth/me")) {
      return new Response(JSON.stringify({
        userId: "v3-stable-user",
        role: "student",
        name: "Fundador",
      }), { status: 200, headers: { "content-type": "application/json" } })
    }
    return new Response(null, { status: 204 })
  }) as typeof fetch

  const session = await loginUser(" Founder@Example.Invalid ", "synthetic-password")
  setApiAuthToken(session.token)
  const me = await getMe()
  await logout(session.token)

  assert.equal(session.userId, "v3-stable-user")
  assert.equal(me.userId, session.userId)
  assert.deepEqual(requests.map((request) => new URL(request.url).pathname), [
    "/guto/v3/auth/login",
    "/guto/v3/auth/me",
    "/guto/v3/auth/logout",
  ])
  assert.deepEqual(JSON.parse(requests[0]?.body || "{}"), {
    emailOrId: "founder@example.invalid",
    password: "synthetic-password",
  })
  assert.equal(requests[1]?.authorization, "Bearer v3-session-token")
  assert.equal(requests[2]?.authorization, "Bearer v3-session-token")
  assert.equal(requests.some((request) => new URL(request.url).pathname.startsWith("/auth/")), false)
})

test("Preview V3 rejeita superfícies de auth legadas sem fazer fetch", async () => {
  process.env.NEXT_PUBLIC_GUTO_V3_ENABLED = "true"
  let fetchCount = 0
  globalThis.fetch = (async () => {
    fetchCount += 1
    return new Response(null, { status: 500 })
  }) as typeof fetch

  const rejectsAsV3Only = (error: unknown) =>
    error instanceof ApiError && error.status === 409 && error.code === "V3_LEGACY_AUTH_DISABLED"

  await assert.rejects(() => loginAdmin("admin@example.invalid", "password"), rejectsAsV3Only)
  await assert.rejects(() => loginCoach("coach@example.invalid", "password"), rejectsAsV3Only)
  await assert.rejects(() => getInvite("legacy-invite"), rejectsAsV3Only)
  await assert.rejects(() => claimInvite("legacy-invite", "password"), rejectsAsV3Only)
  await assert.rejects(() => deleteOwnAccount(), rejectsAsV3Only)
  await assert.rejects(() => revokeConsent(), rejectsAsV3Only)

  assert.equal(fetchCount, 0)
})

test("Preview V3 isola o token local da sessão legada", () => {
  process.env.NEXT_PUBLIC_GUTO_V3_ENABLED = "true"
  assert.equal(getApiAuthTokenStorageKey(), "guto-v3-auth-token")

  process.env.NEXT_PUBLIC_GUTO_V3_ENABLED = "false"
  assert.equal(getApiAuthTokenStorageKey(), "guto-auth-token")
})
