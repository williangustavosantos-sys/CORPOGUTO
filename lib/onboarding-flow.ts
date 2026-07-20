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

/**
 * A calibration write may commit even when its HTTP response is lost or cannot
 * be decoded. Reconcile once from the durable source before keeping the user on
 * the calibration screen. The commit callback is never retried.
 */
export async function commitCalibrationOnceAndRecover<T>(
  commit: () => Promise<T | null>,
  read: () => Promise<T>,
  isComplete: (value: T) => boolean,
): Promise<T | null> {
  const committed = await commit()
  if (committed && isComplete(committed)) return committed

  try {
    const recovered = await read()
    return isComplete(recovered) ? recovered : null
  } catch {
    return null
  }
}
