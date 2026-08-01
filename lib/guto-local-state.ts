const CHAT_STATE_KEY_PREFIX = "guto-chat-state"
const FIRST_MESSAGE_SENT_KEY_PREFIX = "guto-first-message-sent"
const PROACTIVITY_EXTRACTION_KEY_PREFIX = "guto-proactivity-extracted"
const ARRIVAL_BRIEFING_DELIVERED_KEY_PREFIX = "guto-arrival-delivered"
const PROACTIVITY_ACTION_KEY_PREFIX = "guto-proactivity-action"
const VOICE_ENABLED_KEY_PREFIX = "guto-voice-enabled"

type LocalStorageLike = {
  readonly length: number
  key(index: number): string | null
  removeItem(key: string): void
}

export function getVolatileGutoStorageKeys(keys: string[], userId: string) {
  const exactKeys = new Set([
    `${CHAT_STATE_KEY_PREFIX}:${userId}`,
    `${FIRST_MESSAGE_SENT_KEY_PREFIX}:${userId}`,
    `${VOICE_ENABLED_KEY_PREFIX}-${userId}`,
  ])
  const keyPrefixes = [
    `${PROACTIVITY_EXTRACTION_KEY_PREFIX}:${userId}:`,
    `${ARRIVAL_BRIEFING_DELIVERED_KEY_PREFIX}:${userId}:`,
    `${PROACTIVITY_ACTION_KEY_PREFIX}:${userId}:`,
  ]

  return keys.filter((key) => exactKeys.has(key) || keyPrefixes.some((prefix) => key.startsWith(prefix)))
}

export function clearVolatileGutoStorage(userId: string, storage?: LocalStorageLike) {
  if (!userId) return
  const target = storage || (typeof window !== "undefined" ? window.localStorage : null)
  if (!target) return

  const keys: string[] = []
  for (let index = 0; index < target.length; index += 1) {
    const key = target.key(index)
    if (key) keys.push(key)
  }

  for (const key of getVolatileGutoStorageKeys(keys, userId)) {
    try {
      target.removeItem(key)
    } catch {
      // Storage cleanup is best-effort; backend state remains the source of truth.
    }
  }
}
