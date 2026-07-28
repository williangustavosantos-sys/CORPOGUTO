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

export type GutoResponseRenderDecision =
  | { kind: "accepted"; speech: string }
  | { kind: "fallback"; speech: string; reason: "stale_context" | "correlation_mismatch" | "empty_response" }

export function resolveGutoResponseForRender(
  request: GutoRequestContextSnapshot,
  currentContext: ActiveContext | null,
  response: SendGutoMessageResponse,
  fallbackSpeech: string,
): GutoResponseRenderDecision {
  if (!isGutoResponseCorrelated(request, currentContext, response)) {
    return {
      kind: "fallback",
      speech: fallbackSpeech,
      reason: response.discardedReason === "stale_context" ? "stale_context" : "correlation_mismatch",
    }
  }
  const speech = response.fala?.trim()
  return speech
    ? { kind: "accepted", speech }
    : { kind: "fallback", speech: fallbackSpeech, reason: "empty_response" }
}

export function shouldHydrateActiveContext(
  currentContext: ActiveContext | null,
  incomingContext: ActiveContext,
): boolean {
  if (!currentContext) return true

  if (currentContext.id === incomingContext.id) {
    return incomingContext.version >= currentContext.version
  }

  const currentUpdatedAt = Date.parse(currentContext.updatedAt)
  const incomingUpdatedAt = Date.parse(incomingContext.updatedAt)
  if (!Number.isFinite(incomingUpdatedAt)) return false
  if (!Number.isFinite(currentUpdatedAt)) return true
  return incomingUpdatedAt >= currentUpdatedAt
}

export function buildGutoModelInputWithActiveContext(
  text: string,
  context: ActiveContext | null,
): string {
  if (!context) return text
  const item = context.currentItem
  const confirmedSubstitute = context.lastSuggestedItem
    ? ` Last confirmed substitute: "${context.lastSuggestedItem.name}" (id=${context.lastSuggestedItem.id}).`
    : ""
  if (context.type === "workout") {
    return `[ACTIVE WORKOUT CONTEXT id=${context.id} version=${context.version}] Exercise: "${item.name}" (id=${item.id}).${confirmedSubstitute} Prescription: ${item.sets ?? "?"} sets x ${item.reps || "?"}, rest ${item.rest || "?"}. User message: ${text}`
  }
  return `[ACTIVE DIET CONTEXT id=${context.id} version=${context.version}] Food: "${item.name}" (id=${item.id}, quantity=${item.quantity || "?"}) in meal "${item.mealName || "?"}".${confirmedSubstitute} User question: ${text}`
}
