import assert from "node:assert/strict"
import { test } from "node:test"
import { trackGutoEvent } from "../lib/api/guto"
import { ApiError } from "../lib/api/client"

test("Preview V3 rejects legacy telemetry before it can reach a V1/V2 route", async () => {
  const previous = process.env.NEXT_PUBLIC_GUTO_V3_ENABLED
  process.env.NEXT_PUBLIC_GUTO_V3_ENABLED = "true"
  try {
    await assert.rejects(
      trackGutoEvent({ event: "first_message_sent" }),
      (error: unknown) => error instanceof ApiError && error.code === "V3_FEATURE_NOT_IMPLEMENTED",
    )
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_GUTO_V3_ENABLED
    else process.env.NEXT_PUBLIC_GUTO_V3_ENABLED = previous
  }
})
