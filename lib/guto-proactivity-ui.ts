import type { ProactiveMemory, SupportedLanguage } from "@/lib/api/guto"

export type ProactiveMemoryUiCopy = {
  pendingConfirm: (label: string) => string
  pendingTrip: string
  pendingValidate: (label: string) => string
  hintConfirm: string
  hintValidate: string
  btnYes: string
  btnNo: string
  btnFix: string
}

const copyByLang: Record<SupportedLanguage, ProactiveMemoryUiCopy> = {
  "pt-BR": {
    pendingConfirm: (label) => `Confirmar: ${label}`,
    pendingTrip: "VIAGEM DETECTADA",
    pendingValidate: (label) => `Validar: ${label}`,
    hintConfirm: "Confirma aqui, altera a data no chat ou fecha se não for isso.",
    hintValidate: "O GUTO quer saber o que aconteceu com este compromisso da semana passada.",
    btnYes: "Confirmar",
    btnNo: "Fechar",
    btnFix: "Alterar data",
  },
  "en-US": {
    pendingConfirm: (label) => `Confirm: ${label}`,
    pendingTrip: "TRAVEL DETECTED",
    pendingValidate: (label) => `Validate: ${label}`,
    hintConfirm: "Confirm here, change the date in chat, or close it if this is wrong.",
    hintValidate: "GUTO needs to know what happened with this commitment from last week.",
    btnYes: "Confirm",
    btnNo: "Close",
    btnFix: "Change date",
  },
  "it-IT": {
    pendingConfirm: (label) => `Conferma: ${label}`,
    pendingTrip: "VIAGGIO RILEVATO",
    pendingValidate: (label) => `Valida: ${label}`,
    hintConfirm: "Conferma qui, cambia la data in chat o chiudi se non è corretto.",
    hintValidate: "GUTO vuole sapere cosa è successo con questo impegno della settimana scorsa.",
    btnYes: "Conferma",
    btnNo: "Chiudi",
    btnFix: "Cambia data",
  },
}

export function getProactiveMemoryUiCopy(language: string): ProactiveMemoryUiCopy {
  if (language === "en-US" || language === "it-IT") return copyByLang[language]
  return copyByLang["pt-BR"]
}

function formatDateParsedLabel(dateParsed?: string): string | null {
  const match = dateParsed?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  return `${match[3]}/${match[2]}`
}

export function formatProactiveMemoryLabel(memory: ProactiveMemory): string {
  const base = memory.understood?.trim() || memory.rawText?.trim() || memory.type
  const absoluteDate = formatDateParsedLabel(memory.dateParsed)
  if (absoluteDate) return `${base} (${absoluteDate})`
  if (memory.dateText?.trim()) return `${base} (${memory.dateText.trim()})`
  return base
}

export function getActionableProactiveMemories(memories: ProactiveMemory[]) {
  const pendingConfirmation = memories.filter((item) => item.status === "pending_confirmation")
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
