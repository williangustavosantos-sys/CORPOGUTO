export interface DurableConsentState {
  consentHealthFitness?: boolean
  acceptedTerms?: boolean
}

function hasDurableConsent<T extends DurableConsentState>(value: T | null | undefined): value is T {
  return Boolean(value?.consentHealthFitness && value?.acceptedTerms)
}

export async function acceptConsentOnceAndRecover<T extends DurableConsentState>(options: {
  accept: () => Promise<T>
  read: () => Promise<T>
}): Promise<T | null> {
  try {
    const accepted = await options.accept()
    if (hasDurableConsent(accepted)) return accepted
  } catch {
    // The POST is idempotent and may have committed even if its response was lost.
  }

  try {
    const persisted = await options.read()
    return hasDurableConsent(persisted) ? persisted : null
  } catch {
    return null
  }
}
