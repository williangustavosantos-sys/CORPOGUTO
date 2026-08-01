"use client"

import { motion } from "framer-motion"
import { Lock, Sparkles, Trophy, Zap } from "lucide-react"

import { getNextGutoEvolutionXp } from "@/lib/guto-evolution"
import type { GutoMemory } from "@/lib/api/guto"
import type { EvolutionStage } from "@/types/contract"

import { GutoAvatarController } from "../guto-avatar-controller"
import { getLanguage, translations } from "../translations"
import { evolutionCardsFixture } from "../view-models"

interface EvolutionsTabProps {
  userName: string
  language: string
  currentEvolution: EvolutionStage
  memory?: GutoMemory | null
}

const evolutionCopy = {
  "pt-BR": {
    home: "Casa do GUTO",
    companion: (name: string) => (name ? `GUTO & ${name}` : "Companheiro ativo"),
    stage: "Estágio atual",
    transformation: "Transformação",
    next: "Próxima evolução",
    maxStage: "Forma máxima atual",
    xp: "XP acumulado",
    unlocks: "Desbloqueios",
    active: "Ativo agora",
    unlocked: "Liberado",
    locked: "Bloqueado",
    workoutsTo: (n: number, stage: string) => `${n} treino${n === 1 ? "" : "s"} para ${stage}`,
    body:
      "Aqui é onde o GUTO cresce com a relação: treino validado, decisão respeitada e semana reorganizada viram evolução visível.",
  },
  "en-US": {
    home: "GUTO Home",
    companion: (name: string) => (name ? `GUTO & ${name}` : "Active companion"),
    stage: "Current stage",
    transformation: "Transformation",
    next: "Next evolution",
    maxStage: "Current max form",
    xp: "Total XP",
    unlocks: "Unlocks",
    active: "Active now",
    unlocked: "Unlocked",
    locked: "Locked",
    workoutsTo: (n: number, stage: string) => `${n} workout${n === 1 ? "" : "s"} to ${stage}`,
    body:
      "This is where GUTO grows with the relationship: validated workouts, respected decisions, and reorganized weeks become visible evolution.",
  },
  "it-IT": {
    home: "Casa di GUTO",
    companion: (name: string) => (name ? `GUTO & ${name}` : "Compagno attivo"),
    stage: "Stadio attuale",
    transformation: "Trasformazione",
    next: "Prossima evoluzione",
    maxStage: "Forma massima attuale",
    xp: "XP totale",
    unlocks: "Sblocchi",
    active: "Attivo ora",
    unlocked: "Sbloccato",
    locked: "Bloccato",
    workoutsTo: (n: number, stage: string) => `${n} allenament${n === 1 ? "o" : "i"} per ${stage}`,
    body:
      "Qui GUTO cresce con la relazione: allenamenti validati, decisioni rispettate e settimane riorganizzate diventano evoluzione visibile.",
  },
} as const

function getFirstName(value?: string) {
  return (value || "").trim().split(/\s+/)[0] || ""
}

export function EvolutionsTab({ userName, language, currentEvolution, memory }: EvolutionsTabProps) {
  const validLang = getLanguage(language)
  const locale = translations[validLang]
  const copy = evolutionCopy[validLang]
  const currentXp = memory?.totalXp ?? 0
  const currentIndex = Math.max(
    0,
    evolutionCardsFixture.findIndex((card) => card.stage === currentEvolution)
  )
  const currentCard = evolutionCardsFixture[currentIndex] ?? evolutionCardsFixture[0]
  const nextCard = evolutionCardsFixture.find((card) => card.requiredXp > currentXp)
  const nextTargetXp = getNextGutoEvolutionXp(currentXp) ?? nextCard?.requiredXp ?? currentXp
  const currentFloorXp = currentCard.requiredXp
  const progressRange = Math.max(1, nextTargetXp - currentFloorXp)
  const progress = nextCard ? Math.max(0, Math.min(100, ((currentXp - currentFloorXp) / progressRange) * 100)) : 100
  const workoutsRemaining =
    nextCard && nextTargetXp > currentXp ? Math.ceil((nextTargetXp - currentXp) / 100) : 0
  const firstName = getFirstName(userName)

  return (
    <div className="flex h-full min-h-0 flex-col pb-3">
      <div className="shrink-0 px-1 pb-3 pt-2 text-center">
        <p className="mb-1 font-mono text-[9px] font-black uppercase tracking-[0.22em] text-(--guto-cyan)">
          {copy.home}
        </p>
        <h1 className="mx-auto max-w-[18rem] text-balance text-[1.25rem] font-black uppercase leading-tight tracking-[0.08em] text-(--guto-navy)">
          {locale.evoTitle}
        </h1>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        <motion.section
          className="guto-deboss-deep relative overflow-hidden rounded-[1.9rem] px-4 pb-5 pt-4"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="pointer-events-none absolute inset-x-8 top-10 h-44 rounded-full bg-[radial-gradient(circle,rgba(82,231,255,0.18)_0%,transparent_68%)]" />

          <div className="relative flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-[rgba(13,35,65,0.42)]">
                {copy.stage}
              </p>
              <h2 className="mt-1 text-2xl font-black uppercase tracking-[0.16em] text-(--guto-navy)">
                {currentCard.label}
              </h2>
            </div>
            <span className="rounded-full border border-[rgba(82,231,255,0.5)] bg-[rgba(82,231,255,0.14)] px-3 py-1.5 font-mono text-[10px] font-black uppercase tracking-[0.14em] text-(--guto-navy)">
              {copy.active}
            </span>
          </div>

          <div className="relative mx-auto mt-1 flex h-[250px] items-center justify-center overflow-visible">
            <GutoAvatarController
              stage={currentEvolution}
              size="lg"
              showPlatform
              className="scale-[1.42]"
            />
          </div>

          <div className="relative text-center">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-(--guto-cyan)">
              {copy.companion(firstName)}
            </p>
            <p className="mx-auto mt-2 max-w-[19rem] text-sm font-semibold leading-snug text-[rgba(13,35,65,0.66)]">
              {copy.body}
            </p>
          </div>
        </motion.section>

        <section className="grid grid-cols-2 gap-3">
          <motion.div
            className="guto-frost-panel rounded-[1.55rem] px-4 py-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <div className="mb-3 flex items-center gap-2 text-(--guto-cyan)">
              <Zap className="h-4 w-4" aria-hidden="true" />
              <span className="font-mono text-[9px] font-black uppercase tracking-[0.14em]">{copy.xp}</span>
            </div>
            <p className="text-2xl font-black leading-none text-(--guto-navy)">
              {currentXp.toLocaleString()}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(13,35,65,0.08)]">
              <motion.div
                className="h-full rounded-full bg-[linear-gradient(90deg,rgba(82,231,255,0.62),rgba(82,231,255,1))]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.85, delay: 0.16 }}
              />
            </div>
          </motion.div>

          <motion.div
            className="guto-frost-panel rounded-[1.55rem] px-4 py-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <div className="mb-3 flex items-center gap-2 text-(--guto-cyan)">
              <Trophy className="h-4 w-4" aria-hidden="true" />
              <span className="font-mono text-[9px] font-black uppercase tracking-[0.14em]">
                {nextCard ? copy.next : copy.maxStage}
              </span>
            </div>
            <p className="text-xl font-black uppercase tracking-[0.12em] text-(--guto-navy)">
              {nextCard?.label ?? currentCard.label}
            </p>
            <p className="mt-2 font-mono text-[10px] font-black uppercase tracking-[0.08em] text-[rgba(13,35,65,0.46)]">
              {workoutsRemaining > 0 && nextCard
                ? copy.workoutsTo(workoutsRemaining, nextCard.label)
                : locale.nextEvolution}
            </p>
          </motion.div>
        </section>

        <section className="guto-frost-panel rounded-[1.75rem] px-4 py-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-(--guto-cyan)" aria-hidden="true" />
            <h2 className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-(--guto-navy)">
              {copy.unlocks}
            </h2>
          </div>

          <div className="space-y-2">
            {evolutionCardsFixture.map((card) => {
              const isCurrent = card.stage === currentEvolution
              const unlocked = currentXp >= card.requiredXp
              return (
                <div
                  key={card.stage}
                  className={
                    isCurrent
                      ? "flex items-center justify-between gap-3 rounded-[1.15rem] border border-[rgba(82,231,255,0.52)] bg-[rgba(82,231,255,0.13)] px-3 py-2.5"
                      : "flex items-center justify-between gap-3 rounded-[1.15rem] border border-white/60 bg-white/42 px-3 py-2.5"
                  }
                >
                  <div className="min-w-0">
                    <p className="text-sm font-black uppercase tracking-[0.12em] text-(--guto-navy)">
                      {card.label}
                    </p>
                    <p className="mt-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[rgba(13,35,65,0.42)]">
                      {card.requiredXp.toLocaleString()} XP
                    </p>
                  </div>
                  {unlocked ? (
                    <span className="font-mono text-[9px] font-black uppercase tracking-[0.12em] text-(--guto-cyan)">
                      {isCurrent ? copy.active : copy.unlocked}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 font-mono text-[9px] font-black uppercase tracking-[0.12em] text-[rgba(13,35,65,0.42)]">
                      <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                      {copy.locked}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
