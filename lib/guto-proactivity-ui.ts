import type { ProactiveMemory, SupportedLanguage } from "@/lib/api/guto"

export type ProactiveMemoryUiCopy = {
  pendingConfirm: (label: string) => string
  pendingValidate: (label: string) => string
  hintConfirm: string
  hintValidate: string
  btnConfirm: string
  btnClose: string
  btnChangeDate: string
}

const copyByLang: Record<SupportedLanguage, ProactiveMemoryUiCopy> = {
  "pt-BR": {
    pendingConfirm: (label) => `Confirmar: ${label}`,
    pendingValidate: (label) => `Validar: ${label}`,
    hintConfirm: "Confirma aqui ou corrige no chat antes do GUTO seguir.",
    hintValidate: "O GUTO quer saber o que aconteceu com este compromisso da semana passada.",
    btnConfirm: "Confirmar",
    btnClose: "Fechar",
    btnChangeDate: "Alterar data",
  },
  "en-US": {
    pendingConfirm: (label) => `Confirm: ${label}`,
    pendingValidate: (label) => `Validate: ${label}`,
    hintConfirm: "Confirm here or correct in chat before GUTO moves on.",
    hintValidate: "GUTO needs to know what happened with this commitment from last week.",
    btnConfirm: "Confirm",
    btnClose: "Close",
    btnChangeDate: "Change date",
  },
  "it-IT": {
    pendingConfirm: (label) => `Conferma: ${label}`,
    pendingValidate: (label) => `Valida: ${label}`,
    hintConfirm: "Conferma qui o correggi in chat prima che GUTO vada avanti.",
    hintValidate: "GUTO vuole sapere cosa è successo con questo impegno della settimana scorsa.",
    btnConfirm: "Conferma",
    btnClose: "Chiudi",
    btnChangeDate: "Cambia data",
  },
}

export function getProactiveMemoryUiCopy(language: string): ProactiveMemoryUiCopy {
  if (language === "en-US" || language === "it-IT") return copyByLang[language]
  return copyByLang["pt-BR"]
}

function formatDateParsedLabel(dateParsed?: string): string | null {
  if (!dateParsed || !/^\d{4}-\d{2}-\d{2}$/.test(dateParsed)) return null
  const [, month, day] = dateParsed.split("-")
  return `${day}/${month}`
}

export function formatProactiveMemoryLabel(memory: ProactiveMemory): string {
  const base = memory.understood?.trim() || memory.rawText?.trim() || memory.type
  const resolvedDate = formatDateParsedLabel(memory.dateParsed)
  const rawDate = memory.dateText?.trim()
  const dateLabel = resolvedDate || rawDate
  if (!dateLabel) return base
  if (base.toLocaleLowerCase().includes(dateLabel.toLocaleLowerCase())) return base
  if (rawDate && base.toLocaleLowerCase().includes(rawDate.toLocaleLowerCase())) {
    return resolvedDate ? `${base} (${resolvedDate})` : base
  }
  return `${base} (${dateLabel})`
}

export function getActionableProactiveMemories(memories: ProactiveMemory[]) {
  const pendingConfirmation = memories.filter((item) => {
    if (item.status !== "pending_confirmation") return false
    if (item.type !== "trip") return true
    return item.stage === "impact_confirmation" || (!item.stage && item.confirmationStage === "impact")
  })
  const pendingValidation = memories.filter((item) => item.status === "pending_validation")
  const awaitingDiscard = memories.filter(
    (item) =>
      item.discardRequestedAt &&
      ["confirmed", "enriched", "surfaced"].includes(item.status)
  )
  return { pendingConfirmation, pendingValidation, awaitingDiscard }
}

export function hasActionableProactiveMemories(memories: ProactiveMemory[]): boolean {
  const { pendingConfirmation, pendingValidation, awaitingDiscard } =
    getActionableProactiveMemories(memories)
  return (
    pendingConfirmation.length > 0 ||
    pendingValidation.length > 0 ||
    awaitingDiscard.length > 0
  )
}
