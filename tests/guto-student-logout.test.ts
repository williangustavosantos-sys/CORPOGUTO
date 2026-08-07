import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

const source = readFileSync(new URL("../components/guto/guto-app.tsx", import.meta.url), "utf8")

describe("GUTO student logout", () => {
  it("exposes a normal settings action backed by AuthProvider logout", () => {
    assert.match(source, /logout:\s*logoutSession/)
    assert.match(source, /const handleStudentLogout = useCallback/)
    assert.match(source, /onClick=\{handleStudentLogout\}/)
    assert.match(source, /aria-label=\{locale\.settingsLogout\}/)
  })

  it("keeps the logout label localized", () => {
    assert.match(source, /settingsLogout:\s*"Sair da conta"/)
    assert.match(source, /settingsLogout:\s*"Sign out"/)
    assert.match(source, /settingsLogout:\s*"Esci dall'account"/)
  })
})
