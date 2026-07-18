import type { GutoMemory } from "@/lib/api/guto"

// XP real do dia = presença validada e consequências datadas no ledger.
// O buffer do Pacto vive no XP total/Evolução, mas não representa treino e não
// gera log no Percurso (contrato canônico AR-5/X-4).
export function sumXpForDay(memory: Pick<GutoMemory, "xpEvents"> | null | undefined, dateKey: string): number {
  const events = Array.isArray(memory?.xpEvents) ? memory.xpEvents : []
  return events.reduce(
    (total, event) => (
      event?.date === dateKey && event.type !== "grant_initial_xp"
        ? total + (Number(event.amount) || 0)
        : total
    ),
    0
  )
}
