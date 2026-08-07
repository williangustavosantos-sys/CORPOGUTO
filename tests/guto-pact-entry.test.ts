import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { describe, it } from "node:test"

const source = fs.readFileSync(path.join(process.cwd(), "components/guto/guto-app.tsx"), "utf8")

describe("GUTO pact entry", () => {
  it("lets startSystem own the pact completion guard", () => {
    const clickHandler = source.match(/onClick=\{\(\) => \{\n\s+if \(pactCompleteRef\.current\) return([\s\S]*?)\n\s+\}\}\n\s+aria-label=\{locale\.pactHoldAria\}/)?.[1]

    assert.ok(clickHandler, "pact click handler should exist")
    assert.doesNotMatch(clickHandler, /pactCompleteRef\.current\s*=\s*true/)
    assert.match(clickHandler, /void startSystem\(/)
  })
})
