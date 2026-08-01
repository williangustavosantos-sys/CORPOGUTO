import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { getVolatileGutoStorageKeys } from "../lib/guto-local-state"

describe("GUTO local state migration", () => {
  it("seleciona somente estado volátil do usuário atual", () => {
    const keys = [
      "guto-auth-token",
      "guto-white-lab-profile:u-1",
      "guto-chat-state:u-1",
      "guto-first-message-sent:u-1",
      "guto-voice-enabled-u-1",
      "guto-proactivity-extracted:u-1:2026-W28",
      "guto-arrival-delivered:u-1:2026-07-11",
      "guto-proactivity-action:u-1:confirm:m1:none",
      "guto-chat-state:u-2",
      "guto-proactivity-action:u-2:confirm:m2:none",
    ]

    assert.deepEqual(getVolatileGutoStorageKeys(keys, "u-1").sort(), [
      "guto-arrival-delivered:u-1:2026-07-11",
      "guto-chat-state:u-1",
      "guto-first-message-sent:u-1",
      "guto-proactivity-action:u-1:confirm:m1:none",
      "guto-proactivity-extracted:u-1:2026-W28",
      "guto-voice-enabled-u-1",
    ].sort())
  })

  it("não apaga token, perfil nem estado de outro usuário", () => {
    const keys = [
      "guto-auth-token",
      "guto-white-lab-profile:u-1",
      "guto-selected-language",
      "guto-chat-state:u-2",
    ]

    assert.deepEqual(getVolatileGutoStorageKeys(keys, "u-1"), [])
  })
})
