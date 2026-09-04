"use client"

import { Loader2, RefreshCw, ShieldCheck } from "lucide-react"

import type { GutoMemory, SupportedLanguage } from "@/lib/api/guto"

interface ContextReconfirmGateProps {
  open: boolean
  language: SupportedLanguage
  memory: GutoMemory | null
  isConfirming: boolean
  errorMessage: string | null
  onConfirm: () => void
  onCorrect: () => void
}

const gateCopy: Record<
  SupportedLanguage,
  {
    eyebrow: string
    title: string
    body: string
    regenerate: string
    weight: string
    height: string
    age: string
    frequency: string
    goal: string
    confirm: string
    correct: string
    confirming: string
  }
> = {
  "pt-BR": {
    eyebrow: "Cérebro V3 • Ajustes",
    title: "Confirma teus ajustes?",
    body:
      "Mudei teu perfil depois do último contexto confirmado. Antes de atualizar treino e dieta, preciso confirmar esta nova versão de você.",
    regenerate: "Treino e dieta serão recalculados nesta nova versão — nada do teu histórico é apagado.",
    weight: "Peso",
    height: "Altura",
    age: "Idade",
    frequency: "Frequência",
    goal: "Objetivo",
    confirm: "CONFIRMAR AJUSTES",
    correct: "CORRIGIR",
    confirming: "Confirmando…",
  },
  "en-US": {
    eyebrow: "GUTO Brain V3 • Adjustments",
    title: "Confirm your adjustments?",
    body:
      "Your profile changed after the last confirmed context. Before updating workout and diet, I need to confirm this new version of you.",
    regenerate: "Workout and diet will be recalculated in this new version — nothing from your history is erased.",
    weight: "Weight",
    height: "Height",
    age: "Age",
    frequency: "Frequency",
    goal: "Goal",
    confirm: "CONFIRM ADJUSTMENTS",
    correct: "CORRECT",
    confirming: "Confirming…",
  },
  "it-IT": {
    eyebrow: "Cervello V3 • Modifiche",
    title: "Confermi le modifiche?",
    body:
      "Il tuo profilo è cambiato dopo l'ultimo contesto confermato. Prima di aggiornare allenamento e dieta, devo confermare questa nuova versione di te.",
    regenerate: "Allenamento e dieta saranno ricalcolati in questa nuova versione — nulla della tua storia viene cancellato.",
    weight: "Peso",
    height: "Altezza",
    age: "Età",
    frequency: "Frequenza",
    goal: "Obiettivo",
    confirm: "CONFERMA MODIFICHE",
    correct: "CORREGGI",
    confirming: "Confermo…",
  },
}

const goalLabels: Record<SupportedLanguage, Record<string, string>> = {
  "pt-BR": {
    consistency: "Constância",
    fat_loss: "Perda de gordura",
    muscle_gain: "Ganho muscular",
    conditioning: "Condicionamento",
    mobility_health: "Mobilidade e saúde",
  },
  "en-US": {
    consistency: "Consistency",
    fat_loss: "Fat loss",
    muscle_gain: "Muscle gain",
    conditioning: "Conditioning",
    mobility_health: "Mobility & health",
  },
  "it-IT": {
    consistency: "Costanza",
    fat_loss: "Perdita di grasso",
    muscle_gain: "Massa muscolare",
    conditioning: "Condizionamento",
    mobility_health: "Mobilità e salute",
  },
}

function formatFrequency(days?: number, language?: SupportedLanguage): string {
  if (typeof days !== "number" || !Number.isFinite(days)) return "—"
  if (language === "pt-BR") return days === 1 ? "1x por semana" : `${days}x por semana`
  if (language === "it-IT") return days === 1 ? "1x a settimana" : `${days}x a settimana`
  return days === 1 ? "1x per week" : `${days}x per week`
}

export function ContextReconfirmGate({
  open,
  language,
  memory,
  isConfirming,
  errorMessage,
  onConfirm,
  onCorrect,
}: ContextReconfirmGateProps) {
  if (!open) return null

  const copy = gateCopy[language]
  const goalCode = memory?.trainingGoal
  const goalLabel = goalCode ? goalLabels[language][goalCode] || goalCode : "—"

  const rows = [
    { label: copy.weight, value: typeof memory?.weightKg === "number" ? `${memory.weightKg} kg` : "—" },
    { label: copy.height, value: typeof memory?.heightCm === "number" ? `${memory.heightCm} cm` : "—" },
    { label: copy.age, value: typeof memory?.userAge === "number" ? String(memory.userAge) : "—" },
    { label: copy.frequency, value: formatFrequency(memory?.trainingFrequencyDaysPerWeek, language) },
    { label: copy.goal, value: goalLabel },
  ]

  return (
    <div
      data-testid="guto-v3-context-reconfirm-gate"
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(5,16,36,0.82)] px-4 pb-[max(env(safe-area-inset-bottom),1.5rem)] backdrop-blur-[2px] sm:items-center sm:pb-6"
    >
      <div className="guto-slot flex max-h-[86dvh] w-full max-w-sm flex-col overflow-y-auto rounded-[28px] px-6 py-6 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
        <div className="mb-1 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-(--guto-cyan)" strokeWidth={2.2} />
          <p className="font-mono text-[9px] font-black uppercase tracking-[0.22em] text-[rgba(13,35,65,0.45)]">
            {copy.eyebrow}
          </p>
        </div>
        <h2 className="mb-2 font-mono text-[15px] font-black uppercase tracking-[0.06em] text-(--guto-navy)">
          {copy.title}
        </h2>
        <p className="mb-4 font-mono text-[10px] font-black uppercase leading-relaxed tracking-[0.04em] text-[rgba(13,35,65,0.66)]">
          {copy.body}
        </p>

        <div className="guto-deboss mb-4 rounded-2xl p-4">
          <div className="flex flex-col gap-2">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3">
                <span className="font-mono text-[9px] font-black uppercase tracking-[0.14em] text-[rgba(13,35,65,0.5)]">
                  {row.label}
                </span>
                <span className="text-right font-mono text-[11px] font-black uppercase tracking-[0.04em] text-(--guto-navy)">
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="mb-4 flex items-start gap-2 font-mono text-[8px] font-black uppercase leading-relaxed tracking-[0.1em] text-[rgba(13,35,65,0.42)]">
          <RefreshCw className="mt-0.5 h-3 w-3 shrink-0 text-(--guto-cyan)" strokeWidth={2.4} />
          {copy.regenerate}
        </p>

        {errorMessage && (
          <p
            data-testid="guto-v3-context-reconfirm-error"
            className="mb-3 rounded-xl border border-[rgba(255,60,60,0.28)] bg-[rgba(255,60,60,0.07)] px-3 py-2 text-center font-mono text-[9px] font-black uppercase leading-snug tracking-[0.08em] text-[rgba(200,30,30,0.85)]"
          >
            {errorMessage}
          </p>
        )}

        <div className="mt-auto flex flex-col gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            data-testid="guto-v3-context-reconfirm-confirm"
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-(--guto-cyan) font-mono text-[11px] font-black uppercase tracking-[0.18em] text-(--guto-navy) shadow-[0_4px_20px_rgba(82,231,255,0.3)] transition-all active:scale-95 disabled:opacity-50"
          >
            {isConfirming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {copy.confirming}
              </>
            ) : (
              copy.confirm
            )}
          </button>
          <button
            type="button"
            onClick={onCorrect}
            disabled={isConfirming}
            data-testid="guto-v3-context-reconfirm-correct"
            className="flex min-h-[48px] w-full items-center justify-center rounded-full border border-[rgba(13,35,65,0.14)] bg-white/55 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[rgba(13,35,65,0.65)] transition-all active:scale-95 disabled:opacity-50"
          >
            {copy.correct}
          </button>
        </div>
      </div>
    </div>
  )
}
