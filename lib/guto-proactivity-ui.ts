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
  tripQuestion: (dateLabel: string, trainingAdapted?: boolean) => string
  cancelTripQuestion: (dateLabel: string) => string
  btnConfirm: string
  btnCancel: string
  btnConfirmCancel: string
  btnKeepTrip: string
  btnFix: string
  btnSaveDate: string
  btnKeepDate: string
}

const copyByLang: Record<SupportedLanguage, ProactiveMemoryUiCopy> = {
  "pt-BR": {
    pendingConfirm: (label) => `Confirmar: ${label}`,
    pendingTrip: "VIAGEM",
    pendingTripImpact: "VIAGEM",
    pendingValidate: (label) => `Validar: ${label}`,
    hintConfirm: "Confirma aqui, altera a data no card ou cancela se não for isso.",
    hintTripEvent: "Confirmar = a viagem existe. Fechar = descartar. Alterar data = corrigir antes de salvar.",
    hintTripImpact: "",
    hintValidate: "O GUTO quer saber o que aconteceu com este compromisso da semana passada.",
    tripTitle: "Viagem",
    tripQuestion: (dateLabel, trainingAdapted) =>
      trainingAdapted === true
        ? `Confirmar viagem em ${dateLabel} com treino adaptado?`
        : trainingAdapted === false
          ? `Confirmar viagem em ${dateLabel} sem treino adaptado?`
          : `Confirmar viagem em ${dateLabel}?`,
    cancelTripQuestion: (dateLabel) => `Cancelar a viagem de ${dateLabel}?`,
    btnConfirm: "CONFIRMAR",
    btnCancel: "CANCELAR",
    btnConfirmCancel: "CONFIRMAR CANCELAMENTO",
    btnKeepTrip: "MANTER VIAGEM",
    btnFix: "ALTERAR DATA",
    btnSaveDate: "SALVAR DATA",
    btnKeepDate: "VOLTAR",
  },
  "en-US": {
    pendingConfirm: (label) => `Confirm: ${label}`,
    pendingTrip: "TRAVEL",
    pendingTripImpact: "TRAVEL",
    pendingValidate: (label) => `Validate: ${label}`,
    hintConfirm: "Confirm here, change the date in the card, or cancel it if this is wrong.",
    hintTripEvent: "Confirm = the trip exists. Close = discard it. Change date = correct it before saving.",
    hintTripImpact: "",
    hintValidate: "GUTO needs to know what happened with this commitment from last week.",
    tripTitle: "Travel",
    tripQuestion: (dateLabel, trainingAdapted) =>
      trainingAdapted === true
        ? `Confirm travel on ${dateLabel} with an adapted workout?`
        : trainingAdapted === false
          ? `Confirm travel on ${dateLabel} with no adapted workout?`
          : `Confirm travel on ${dateLabel}?`,
    cancelTripQuestion: (dateLabel) => `Cancel the trip on ${dateLabel}?`,
    btnConfirm: "CONFIRM",
    btnCancel: "CANCEL",
    btnConfirmCancel: "CONFIRM CANCEL",
    btnKeepTrip: "KEEP TRIP",
    btnFix: "CHANGE DATE",
    btnSaveDate: "SAVE DATE",
    btnKeepDate: "BACK",
  },
  "it-IT": {
    pendingConfirm: (label) => `Conferma: ${label}`,
    pendingTrip: "VIAGGIO",
    pendingTripImpact: "VIAGGIO",
    pendingValidate: (label) => `Valida: ${label}`,
    hintConfirm: "Conferma qui, cambia la data nella card o annulla se non è corretto.",
    hintTripEvent: "Conferma = il viaggio esiste. Chiudi = scartarlo. Cambia data = correggere prima di salvare.",
    hintTripImpact: "",
    hintValidate: "GUTO vuole sapere cosa è successo con questo impegno della settimana scorsa.",
    tripTitle: "Viaggio",
    tripQuestion: (dateLabel, trainingAdapted) =>
      trainingAdapted === true
        ? `Confermare viaggio il ${dateLabel} con allenamento adattato?`
        : trainingAdapted === false
          ? `Confermare viaggio il ${dateLabel} senza allenamento adattato?`
          : `Confermare viaggio il ${dateLabel}?`,
    cancelTripQuestion: (dateLabel) => `Annullare il viaggio del ${dateLabel}?`,
    btnConfirm: "CONFERMA",
    btnCancel: "ANNULLA",
    btnConfirmCancel: "CONFERMA ANNULLAMENTO",
    btnKeepTrip: "MANTIENI VIAGGIO",
    btnFix: "CAMBIA DATA",
    btnSaveDate: "SALVA DATA",
    btnKeepDate: "INDIETRO",
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

const INTERNAL_PROACTIVE_LABEL_PATTERNS = [
  /Evento proativo devido:/i,
  /Prompt ativo:/i,
  /Card pendente:/i,
  /Treino já planejado para hoje:/i,
  /Decida a fala/i,
  /Não use culpa por streak/i,
  /\bexpectedResponse\b/i,
  /\bmemoryPatch\b/i,
  /\bproactivityContext\b/i,
  /\bWorldStateV?\d*\b/i,
]

function isInternalProactiveLabel(value?: string | null): boolean {
  if (!value?.trim()) return true
  return INTERNAL_PROACTIVE_LABEL_PATTERNS.some((pattern) => pattern.test(value))
}

function fallbackProactiveMemoryLabel(memory: ProactiveMemory): string {
  if (memory.type === "trip") return "Viagem informada"
  if (memory.type === "commitment") return "Compromisso informado"
  if (memory.type === "schedule") return "Agenda informada"
  return "Contexto informado"
}

function safeProactiveMemoryLabelBase(memory: ProactiveMemory): string {
  for (const value of [memory.understood, memory.rawText]) {
    const candidate = value?.replace(/\s+/g, " ").trim().replace(/:\s*$/, "")
    if (candidate && !isInternalProactiveLabel(candidate)) return candidate
  }
  return fallbackProactiveMemoryLabel(memory)
}

export function formatProactiveMemoryLabel(memory: ProactiveMemory): string {
  const base = safeProactiveMemoryLabelBase(memory)
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
