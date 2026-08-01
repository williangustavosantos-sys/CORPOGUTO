import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { isGutoProxyHostAllowed } from "../lib/api/guto-proxy-host"

describe("GUTO API proxy host contract", () => {
  it("permite o frontend publicado encaminhar /api/guto/* para o backend", () => {
    assert.equal(isGutoProxyHostAllowed("corpoguto.vercel.app"), true)
    assert.equal(isGutoProxyHostAllowed("corpoguto.vercel.app:443"), true)
  })

  it("permite previews Vercel e desenvolvimento local", () => {
    assert.equal(isGutoProxyHostAllowed("corpoguto-abc123.vercel.app"), true)
    assert.equal(isGutoProxyHostAllowed("localhost:3000"), true)
    assert.equal(isGutoProxyHostAllowed("127.0.0.1:3000"), true)
  })

  it("bloqueia hosts que não pertencem ao app/proxy esperado", () => {
    assert.equal(isGutoProxyHostAllowed("example.com"), false)
    assert.equal(isGutoProxyHostAllowed(null), false)
  })
})
