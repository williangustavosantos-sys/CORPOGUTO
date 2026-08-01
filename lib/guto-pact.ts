import type { GutoMemory } from "@/lib/api/guto"

export function hasDurablePostPactArtifacts(memory: GutoMemory | null | undefined): memory is GutoMemory {
  return Boolean(
    memory?.initialXpGranted &&
    memory.lastWorkoutPlan?.exercises?.length &&
    memory.lastDietPlan?.meals?.length
  )
}

export async function recoverDurablePostPactArtifacts(options: {
  read: () => Promise<GutoMemory>
  attempts?: number
  wait?: () => Promise<void>
}): Promise<GutoMemory | null> {
  const attempts = options.attempts ?? 45
  const wait = options.wait ?? (() => new Promise<void>((resolve) => window.setTimeout(resolve, 1500)))
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const fresh = await options.read()
      if (hasDurablePostPactArtifacts(fresh)) return fresh
    } catch {
      // A resposta pode falhar enquanto o commit durável já foi concluído.
    }
    await wait()
  }
  return null
}

export async function commitPactOnceAndRecover(options: {
  commit: () => Promise<GutoMemory | null>
  read: () => Promise<GutoMemory>
  attempts?: number
  wait?: () => Promise<void>
  onPolling?: () => void
}): Promise<GutoMemory | null> {
  const committed = await options.commit()
  if (hasDurablePostPactArtifacts(committed)) return committed
  options.onPolling?.()
  return recoverDurablePostPactArtifacts(options)
}
