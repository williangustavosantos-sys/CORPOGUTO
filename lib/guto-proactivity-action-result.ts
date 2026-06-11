export interface ProactivityActionMessage {
  text: string
  isGuto: boolean
}

export interface ProactivityActionResultUi<TMemoryPatch extends object = Record<string, unknown>> {
  ok?: boolean
  fala?: string | null
  memoryPatch?: TMemoryPatch
}

function normalizeMessageText(value: string) {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase()
}

export function getProactivityActionMemoryPatch<TMemoryPatch extends object>(
  result?: ProactivityActionResultUi<TMemoryPatch> | null,
): TMemoryPatch | null {
  if (!result?.memoryPatch || Object.keys(result.memoryPatch).length === 0) return null
  return result.memoryPatch
}

export function appendProactivityActionFalaMessage<TMessage extends ProactivityActionMessage>(
  previous: TMessage[],
  result: { ok?: boolean; fala?: string | null } | null | undefined,
  createMessage: (fala: string) => TMessage,
): TMessage[] {
  const fala = result?.ok && typeof result.fala === "string" ? result.fala.trim() : ""
  if (!fala) return previous

  const last = previous[previous.length - 1]
  if (last?.isGuto && normalizeMessageText(last.text) === normalizeMessageText(fala)) {
    return previous
  }

  return [...previous, createMessage(fala)]
}
