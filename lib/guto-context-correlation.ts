import type { ActiveContext, ActiveContextType, SendGutoMessageResponse } from "@/lib/api/guto"

export interface GutoRequestContextSnapshot {
  turnId: string
  requestId: string
  contextId: string | null
  contextVersion: number | null
  activeContextType: ActiveContextType | null
  activeItemId: string | null
}

export function isGutoResponseCorrelated(
  request: GutoRequestContextSnapshot,
  currentContext: ActiveContext | null,
  response: SendGutoMessageResponse,
): boolean {
  return Boolean(
    response.discardedReason !== "stale_context" &&
    response.turnId === request.turnId &&
    response.requestId === request.requestId &&
    (response.contextId ?? null) === request.contextId &&
    (response.contextVersion ?? null) === request.contextVersion &&
    (response.activeContextType ?? null) === request.activeContextType &&
    (response.activeItemId ?? null) === request.activeItemId &&
    (request.contextId === null || currentContext?.id === request.contextId)
  )
}
