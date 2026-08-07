import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

describe("GUTO production browser monitoring", () => {
  it("não satura o tunnel com logs, replay e 100% dos traces", () => {
    const source = readFileSync(new URL("../instrumentation-client.ts", import.meta.url), "utf8")
    assert.doesNotMatch(source, /replayIntegration/)
    assert.doesNotMatch(source, /replays(?:Session|OnError)SampleRate/)
    assert.match(source, /enableLogs:\s*false/)
    assert.match(source, /breadcrumb\.category === "console" \? null : breadcrumb/)

    const productionSample = source.match(/NODE_ENV === "production" \? ([0-9.]+) : 1/)
    assert.ok(productionSample)
    assert.equal(Number(productionSample[1]), 0)
  })
})
