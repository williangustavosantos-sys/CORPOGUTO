import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { acceptConsentOnceAndRecover, type DurableConsentState } from "../lib/guto-consent"

type TestConsentState = DurableConsentState & { source?: string }

describe("acceptConsentOnceAndRecover", () => {
  it("uses the confirmed POST response without an extra read", async () => {
    let reads = 0
    const result = await acceptConsentOnceAndRecover<TestConsentState>({
      accept: async () => ({ consentHealthFitness: true, acceptedTerms: true, source: "post" }),
      read: async () => {
        reads += 1
        return { consentHealthFitness: true, acceptedTerms: true, source: "read" }
      },
    })

    assert.equal(result?.source, "post")
    assert.equal(reads, 0)
  })

  it("recovers when the POST committed but its response was lost", async () => {
    const result = await acceptConsentOnceAndRecover<TestConsentState>({
      accept: async () => {
        throw new Error("lost response")
      },
      read: async () => ({ consentHealthFitness: true, acceptedTerms: true, source: "persisted" }),
    })

    assert.equal(result?.source, "persisted")
  })

  it("does not advance when durable consent is still absent", async () => {
    const result = await acceptConsentOnceAndRecover<TestConsentState>({
      accept: async () => ({ consentHealthFitness: false, acceptedTerms: false }),
      read: async () => ({ consentHealthFitness: true, acceptedTerms: false }),
    })

    assert.equal(result, null)
  })

  it("returns null when both the POST and reconciliation fail", async () => {
    const result = await acceptConsentOnceAndRecover<TestConsentState>({
      accept: async () => {
        throw new Error("post failed")
      },
      read: async () => {
        throw new Error("read failed")
      },
    })

    assert.equal(result, null)
  })
})
