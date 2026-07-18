import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

describe("GUTO consent legal links", () => {
  it("não dispara prefetch descartável durante cadastro e calibragem", () => {
    const source = readFileSync(
      new URL("../components/guto/screens/consent-screen.tsx", import.meta.url),
      "utf8",
    )

    const legalLinks = [
      source.match(/<Link\s+href=\{`\/terms\?lang=\$\{safeLanguage\}`\}[\s\S]*?>/),
      source.match(/<Link\s+href=\{`\/privacy\?lang=\$\{safeLanguage\}`\}[\s\S]*?>/),
    ]

    for (const link of legalLinks) {
      assert.ok(link)
      assert.match(link[0], /prefetch=\{false\}/)
    }
  })
})
