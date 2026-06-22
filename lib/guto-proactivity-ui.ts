import type { ActiveConversationContext, ProactiveMemory, SupportedLanguage } from "@/lib/api/guto"

export type ProactiveMemoryUiCopy = {
  pendingConfirm: (label: string) => string
  pendingTrip: string
  pendingTripImpact: string
  pendingValidate: (label: string) => string
  hintConfirm: string
  hintTripEvent: string
  hintTripImpact: string
  hintValidate: string
  tripTitle: string
  tripQuestion: string
  btnYes: string
  btnNo: string
  btnFix: string
}

const copyByLang: Record<SupportedLanguage, ProactiveMemoryUiCopy> = {
  "pt-BR": {
    pendingConfirm: (label) => `Confirmar: ${label}`,
    pendingTrip: "VIAGEM",
    pendingTripImpact: "VIAGEM",
    pendingValidate: (label) => `Validar: ${label}`,
    hintConfirm: "Confirma aqui, altera a data no chat ou fecha se não for isso.",
    hintTripEvent: "Confirmar = a viagem existe. Fechar = descartar. Alterar data = corrigir antes de salvar.",
    hintTripImpact: "",
    hintValidate: "O GUTO quer saber o que aconteceu com este compromisso da semana passada.",
    tripTitle: "Viagem",
    tripQuestion: "Treino adaptado na viagem?",
    btnYes: "SIM",
    btnNo: "NÃO",
    btnFix: "ALTERAR DATA",
  },
  "en-US": {
    pendingConfirm: (label) => `Confirm: ${label}`,
    pendingTrip: "TRAVEL",
    pendingTripImpact: "TRAVEL",
    pendingValidate: (label) => `Validate: ${label}`,
    hintConfirm: "Confirm here, change the date in chat, or close it if this is wrong.",
    hintTripEvent: "Confirm = the trip exists. Close = discard it. Change date = correct it before saving.",
    hintTripImpact: "",
    hintValidate: "GUTO needs to know what happened with this commitment from last week.",
    tripTitle: "Travel",
    tripQuestion: "Adapted workout during the trip?",
    btnYes: "YES",
    btnNo: "NO",
    btnFix: "CHANGE DATE",
  },
  "it-IT": {
    pendingConfirm: (label) => `Conferma: ${label}`,
    pendingTrip: "VIAGGIO",
    pendingTripImpact: "VIAGGIO",
    pendingValidate: (label) => `Valida: ${label}`,
    hintConfirm: "Conferma qui, cambia la data in chat o chiudi se non è corretto.",
    hintTripEvent: "Conferma = il viaggio esiste. Chiudi = scartarlo. Cambia data = correggere prima di salvare.",
    hintTripImpact: "",
    hintValidate: "GUTO vuole sapere cosa è successo con questo impegno della settimana scorsa.",
    tripTitle: "Viaggio",
    tripQuestion: "Allenamento adattato durante il viaggio?",
    btnYes: "SÌ",
    btnNo: "NO",
    btnFix: "CAMBIA DATA",
  },
}

export function getProactiveMemoryUiCopy(language: string): ProactiveMemoryUiCopy {
  if (language === "en-US" || language === "it-IT") return copyByLang[language]
  return copyByLang["pt-BR"]
}

function parseProactiveDate(dateParsed?: string): Date | null {
  const match = dateParsed?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)
}

export function formatProactiveDate(memory: ProactiveMemory, language: SupportedLanguage): string {
  const date = parseProactiveDate(memory.dateParsed)
  if (!date) return memory.dateText?.trim() || "—"
  return new Intl.DateTimeFormat(language, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

export function formatProactiveWeekday(memory: ProactiveMemory, language: SupportedLanguage): string {
  const date = parseProactiveDate(memory.dateParsed)
  if (!date) return memory.dateText?.trim() || ""
  const value = new Intl.DateTimeFormat(language, { weekday: "long" }).format(date)
  return value.charAt(0).toLocaleUpperCase(language) + value.slice(1)
}

export function formatProactiveMemoryLabel(memory: ProactiveMemory): string {
  const base = memory.understood?.trim() || memory.rawText?.trim() || memory.type
  const absoluteDate = memory.dateParsed ? formatProactiveDate(memory, "pt-BR") : null
  if (absoluteDate) return `${base} (${absoluteDate})`
  if (memory.dateText?.trim()) return `${base} (${memory.dateText.trim()})`
  return base
}

function dedupeProactiveMemories(memories: ProactiveMemory[]): ProactiveMemory[] {
  const seen = new Set<string>()
  const result: ProactiveMemory[] = []
  for (const memory of memories) {
    const key = [
      memory.type,
      memory.status,
      memory.confirmationStage || "",
      memory.dateParsed || memory.dateText || memory.understood || memory.rawText,
    ].join("|")
    if (seen.has(key)) continue
    seen.add(key)
    result.push(memory)
  }
  return result
}

function selectPrimaryMemory(
  memories: ProactiveMemory[],
  activeContext?: ActiveConversationContext | null
): ProactiveMemory | null {
  if (activeContext?.relatedMemoryId) {
    const match = memories.find((item) => item.id === activeContext.relatedMemoryId)
    if (match) return match
  }
  return memories[0] || null
}

export function getActionableProactiveMemories(
  memories: ProactiveMemory[],
  activeContext?: ActiveConversationContext | null
) {
  const pendingConfirmation = dedupeProactiveMemories(
    memories.filter((item) => {
      if (item.status !== "pending_confirmation") return false
      if (item.type !== "trip") return true
      return item.stage === "impact_confirmation" || (!item.stage && item.confirmationStage === "impact")
    })
  )
  const pendingValidation = dedupeProactiveMemories(
    memories.filter((item) => item.status === "pending_validation")
  )
  const awaitingDiscard = dedupeProactiveMemories(memories.filter(
    (item) =>
      item.discardRequestedAt &&
      ["confirmed", "enriched", "surfaced"].includes(item.status)
  ))
  const primary =
    selectPrimaryMemory(pendingConfirmation, activeContext) ||
    selectPrimaryMemory(awaitingDiscard, activeContext) ||
    selectPrimaryMemory(pendingValidation, activeContext)

  return {
    pendingConfirmation: primary?.status === "pending_confirmation" ? [primary] : [],
    pendingValidation: primary?.status === "pending_validation" ? [primary] : [],
    awaitingDiscard:
      primary?.discardRequestedAt && ["confirmed", "enriched", "surfaced"].includes(primary.status)
        ? [primary]
        : [],
    primary,
  }
}

export function hasActionableProactiveMemories(
  memories: ProactiveMemory[],
  activeContext?: ActiveConversationContext | null
): boolean {
  const { pendingConfirmation, pendingValidation, awaitingDiscard } =
    getActionableProactiveMemories(memories, activeContext)
  return (
    pendingConfirmation.length > 0 ||
    pendingValidation.length > 0 ||
    awaitingDiscard.length > 0
  )
}
