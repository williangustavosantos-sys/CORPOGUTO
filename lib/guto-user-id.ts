export function isValidGutoUserId(userId: unknown): userId is string {
  return typeof userId === "string" && userId.trim().length > 0
}

export function assertValidGutoUserId(userId: unknown): asserts userId is string {
  if (!isValidGutoUserId(userId)) {
    throw new TypeError("A non-empty GUTO userId is required.")
  }
}
