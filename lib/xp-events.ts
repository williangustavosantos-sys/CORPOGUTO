import type { GutoMemory } from "@/lib/api/guto"

// XP real do dia = soma dos xpEvents datados com o dia (fonte: GET /guto/memory).
// Substitui os literais "+100/+50/0 XP" do Percurso, que ignoravam o ledger e
// deixavam o XP do pacto invisível (bug DUDAAA: Evolução 100, Percurso "0 XP hoje").
export function sumXpForDay(memory: Pick<GutoMemory, "xpEvents"> | null | undefined, dateKey: string): number {
  const events = Array.isArray(memory?.xpEvents) ? memory.xpEvents : []
  return events.reduce(
    (total, event) => (event?.date === dateKey ? total + (Number(event.amount) || 0) : total),
    0
  )
}
