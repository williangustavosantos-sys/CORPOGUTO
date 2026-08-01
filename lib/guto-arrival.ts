export async function persistXpRewardBeforeArrival(
  persistXpRewardSeen: (() => void | Promise<void>) | undefined,
  requestArrival: () => void | Promise<void>,
) {
  await persistXpRewardSeen?.()
  await requestArrival()
}
