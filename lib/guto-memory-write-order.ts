export function applyIfLatestMemoryWrite<T>(
  writeId: number,
  latestWriteId: number,
  value: T,
  apply: (value: T) => void,
): boolean {
  if (writeId !== latestWriteId) return false
  apply(value)
  return true
}
