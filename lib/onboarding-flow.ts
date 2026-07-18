export type RequiredOnboardingStage = "consent" | "naming" | "calibration" | "pact" | "system"

/**
 * Claiming an invite authenticates the student; it does not grant consent.
 * Every fresh invite must therefore enter the private flow at consent.
 */
export function stageAfterInviteClaim(): RequiredOnboardingStage {
  return "consent"
}

export function hasDurableSovereignNameConfirmation(
  profile?: { namingConfirmed?: boolean; onboardingComplete?: boolean } | null,
  memory?: { sovereignNameConfirmedAt?: string; initialXpGranted?: boolean } | null,
): boolean {
  return Boolean(
    profile?.namingConfirmed ||
    profile?.onboardingComplete ||
    memory?.sovereignNameConfirmedAt ||
    memory?.initialXpGranted
  )
}

export function resolveDurableCommittedName(
  resolvedName: string,
  profile?: { namingConfirmed?: boolean; onboardingComplete?: boolean } | null,
  memory?: { sovereignNameConfirmedAt?: string; initialXpGranted?: boolean } | null,
): string {
  return hasDurableSovereignNameConfirmation(profile, memory) ? resolvedName : ""
}
