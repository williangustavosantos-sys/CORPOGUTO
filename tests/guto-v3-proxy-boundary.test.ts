import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import { NextRequest } from "next/server"

import { POST } from "../app/api/guto/[...path]/route"
import { isGutoV3PanelProxyPathAllowed, isGutoV3ProxyPathAllowed } from "../lib/api/guto-proxy-host"

const originalFetch = globalThis.fetch
const originalV3Flag = process.env.NEXT_PUBLIC_GUTO_V3_ENABLED

afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalV3Flag === undefined) delete process.env.NEXT_PUBLIC_GUTO_V3_ENABLED
  else process.env.NEXT_PUBLIC_GUTO_V3_ENABLED = originalV3Flag
})

test("allowlist do proxy V3 contém somente Cérebro V3 e health V3", () => {
  assert.equal(isGutoV3ProxyPathAllowed(["guto", "v3"]), true)
  assert.equal(isGutoV3ProxyPathAllowed(["guto", "v3", "auth", "login"]), true)
  assert.equal(isGutoV3ProxyPathAllowed(["guto", "v3", "state"]), true)
  assert.equal(isGutoV3ProxyPathAllowed(["health", "v3"]), true)

  assert.equal(isGutoV3ProxyPathAllowed(["auth", "user", "login"]), false)
  assert.equal(isGutoV3ProxyPathAllowed(["guto"]), false)
  assert.equal(isGutoV3ProxyPathAllowed(["guto", "account"]), false)
  assert.equal(isGutoV3ProxyPathAllowed(["guto/v3"]), false)
  assert.equal(isGutoV3ProxyPathAllowed(["health/v3"]), false)
  assert.equal(isGutoV3ProxyPathAllowed(["guto", "v3", "..", "auth", "user", "login"]), false)
  assert.equal(isGutoV3ProxyPathAllowed(["guto", "v3", "auth/user/login"]), false)
  assert.equal(isGutoV3ProxyPathAllowed(["voz"]), false)
  assert.equal(isGutoV3ProxyPathAllowed(undefined), false)
})

test("painel é uma exceção administrativa explícita, nunca fallback do Companion", () => {
  assert.equal(isGutoV3PanelProxyPathAllowed(["admin", "students"]), true)
  assert.equal(isGutoV3PanelProxyPathAllowed(["auth", "admin", "login"]), true)
  assert.equal(isGutoV3PanelProxyPathAllowed(["auth", "user", "login"]), false)
  assert.equal(isGutoV3PanelProxyPathAllowed(["guto", "memory"]), false)
})

test("proxy Preview bloqueia rota legada antes de qualquer fetch upstream", async () => {
  process.env.NEXT_PUBLIC_GUTO_V3_ENABLED = "true"
  let fetchCount = 0
  globalThis.fetch = (async () => {
    fetchCount += 1
    return new Response(null, { status: 500 })
  }) as typeof fetch

  const request = new NextRequest("https://corpoguto-preview.vercel.app/api/guto/auth/user/login", {
    method: "POST",
    headers: { host: "corpoguto-preview.vercel.app" },
  })
  const response = await POST(request, {
    params: Promise.resolve({ path: ["auth", "user", "login"] }),
  })
  const body = await response.json()

  assert.equal(response.status, 409)
  assert.equal(body.error, "V3_LEGACY_AUTHORITY_DISABLED")
  assert.equal(body.brainVersion, "guto-cerebro-v3")
  assert.equal(fetchCount, 0)
})
