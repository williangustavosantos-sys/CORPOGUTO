import type { AuthUser } from "@/lib/api/auth"
import type { GutoMemory } from "@/lib/api/guto"

export type GutoLanguage = "pt-BR" | "it-IT" | "en-US"
export type GutoLanguageScope = "onboarding" | "private"

export type StoredGutoProfile = {
  language?: string
  userName?: string
  onboardingComplete?: boolean
  calibrationComplete?: boolean
  pactAccepted?: boolean
}

export type ResolvedGutoProfile = {
  userId: string
  displayName: string
  hasName: boolean
  hasCalibration: boolean
  missingCalibrationFields: string[]
}

const GENERIC_NAMES = new Set(["", "operador", "operator", "usuário", "usuario", "user", "guto"])
const SUPPORTED_GUTO_LANGUAGES: GutoLanguage[] = ["pt-BR", "it-IT", "en-US"]

export const NO_PAIN_PATHOLOGY_BY_LANGUAGE: Record<GutoLanguage, string> = {
  "pt-BR": "sem dor",
  "en-US": "no pain or injury",
  "it-IT": "nessun dolore",
}

export const NO_FOOD_RESTRICTION_BY_LANGUAGE: Record<GutoLanguage, string> = {
  "pt-BR": "nenhuma",
  "en-US": "none",
  "it-IT": "nessuna",
}

const NO_PAIN_PATHOLOGY_VALUES = new Set(
  Object.values(NO_PAIN_PATHOLOGY_BY_LANGUAGE).map((value) => value.toLocaleLowerCase("en-US"))
)

export function defaultNoPainPathology(language?: string | null): string {
  return isSupportedGutoLanguage(language) ? NO_PAIN_PATHOLOGY_BY_LANGUAGE[language] : NO_PAIN_PATHOLOGY_BY_LANGUAGE["pt-BR"]
}

export function defaultNoFoodRestriction(language?: string | null): string {
  return isSupportedGutoLanguage(language) ? NO_FOOD_RESTRICTION_BY_LANGUAGE[language] : NO_FOOD_RESTRICTION_BY_LANGUAGE["pt-BR"]
}

export function isNoPainPathology(value?: string | null): boolean {
  const normalized = (value || "").trim().toLocaleLowerCase("en-US")
  if (!normalized) return true
  return NO_PAIN_PATHOLOGY_VALUES.has(normalized)
}

export function isSupportedGutoLanguage(value?: string | null): value is GutoLanguage {
  return SUPPORTED_GUTO_LANGUAGES.includes(value as GutoLanguage)
}

export function resolveGutoLanguage({
  scope = "private",
  sessionLanguage,
  onboardingLanguage,
  localProfileLanguage,
  memoryLanguage,
  globalStoredLanguage,
  fallbackLanguage,
}: {
  scope?: GutoLanguageScope
  sessionLanguage?: string | null
  onboardingLanguage?: string | null
  localProfileLanguage?: string | null
  memoryLanguage?: string | null
  globalStoredLanguage?: string | null
  fallbackLanguage?: string | null
}): GutoLanguage {
  const candidates =
    scope === "onboarding"
      ? [onboardingLanguage, localProfileLanguage, memoryLanguage, globalStoredLanguage, fallbackLanguage]
      : [sessionLanguage, localProfileLanguage, memoryLanguage, onboardingLanguage, globalStoredLanguage, fallbackLanguage]

  for (const candidate of candidates) {
    if (isSupportedGutoLanguage(candidate)) return candidate
  }

  return "pt-BR"
}

export function formatGutoDisplayName(value?: string | null) {
  return (value || "").replace(/\s+/g, " ").trimStart().toLocaleUpperCase()
}

export function firstGutoGivenName(value?: string | null) {
  return formatGutoDisplayName(value).split(/\s+/).find(Boolean) || ""
}

export function isGenericGutoName(value?: string | null) {
  const normalized = (value || "").replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR")
  if (GENERIC_NAMES.has(normalized)) return true
  return /^operador\s*#?\d*$/i.test(normalized) || /^operator\s*#?\d*$/i.test(normalized)
}

export function firstRealGutoName(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (!isGenericGutoName(value)) return formatGutoDisplayName(value)
  }
  return ""
}

export function getMissingCalibrationFields(memory?: GutoMemory | null) {
  const missing: string[] = []
  if (!memory?.userAge) missing.push("idade")
  if (!memory?.biologicalSex) missing.push("sexo")
  if (!memory?.trainingGoal) missing.push("objetivo")
  if (!(memory?.trainingLevel || memory?.trainingStatus)) missing.push("nível")
  if (!memory?.trainingFrequencyDaysPerWeek) missing.push("frequência")
  if (!memory?.heightCm) missing.push("altura")
  if (!memory?.weightKg) missing.push("peso")
  return missing
}

export function hasCompleteGutoCalibration(memory?: GutoMemory | null) {
  return getMissingCalibrationFields(memory).length === 0
}

export function resolveGutoProfile({
  user,
  stored,
  memory,
  inviteName,
  fallbackName,
}: {
  user?: (AuthUser & { name?: string; email?: string }) | null
  stored?: StoredGutoProfile | null
  memory?: GutoMemory | null
  inviteName?: string | null
  fallbackName?: string | null
}): ResolvedGutoProfile {
  const displayName = firstRealGutoName(
    stored?.userName,
    fallbackName,
    memory?.name,
    inviteName,
    user?.name
  )
  const missingCalibrationFields = getMissingCalibrationFields(memory)

  return {
    userId: user?.userId || memory?.userId || "guest",
    displayName,
    hasName: Boolean(displayName),
    hasCalibration: missingCalibrationFields.length === 0,
    missingCalibrationFields,
  }
}
