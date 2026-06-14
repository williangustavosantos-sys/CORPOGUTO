"use client"

import { motion } from "framer-motion"
import { Lock } from "lucide-react"

import { GutoAvatarController } from "../guto-avatar-controller"
import { getLanguage, translations } from "../translations"
import { evolutionCardsFixture } from "../view-models"
import { getNextGutoEvolutionXp } from "@/lib/guto-evolution"
import type { EvolutionStage } from "@/types/contract"
import type { GutoMemory } from "@/lib/api/guto"

interface EvolutionsTabProps {
  userName: string
  language: string
  currentEvolution: EvolutionStage
  memory?: GutoMemory | null
}

const evolutionCopy = {
  "pt-BR": {
    desire: "Desejo em camadas", active: "Ativo",
    released: "Forma liberada. Nitidez total no presente.", blocked: "Bloqueado até",
    workoutsTo: (n: number, stage: string) => `${n} treino${n === 1 ? "" : "s"} para ${stage}`,
  },
  "en-US": {
    desire: "Desire in layers", active: "Active",
    released: "Form unlocked. Full sharpness in the present.", blocked: "Locked until",
    workoutsTo: (n: number, stage: string) => `${n} workout${n === 1 ? "" : "s"} to ${stage}`,
  },
  "it-IT": {
    desire: "Desiderio a strati", active: "Attivo",
    released: "Forma sbloccata. Nitidezza totale nel presente.", blocked: "Bloccato fino a",
    workoutsTo: (n: number, stage: string) => `${n} allenament${n === 1 ? "o" : "i"} per ${stage}`,
  },
} as const

export function EvolutionsTab({ language, currentEvolution, memory }: EvolutionsTabProps) {
  const validLang = getLanguage(language)
  const locale = translations[validLang]
  const copy = evolutionCopy[validLang]
  const currentXp = memory?.totalXp ?? 0
  const nextTargetXp = getNextGutoEvolutionXp(currentXp) ?? currentXp
  const progress = nextTargetXp > 0 ? Math.min(100, (currentXp / nextTargetXp) * 100) : 100
  const nextCard = evolutionCardsFixture.find((card) => card.requiredXp > currentXp)
  const workoutsRemaining = nextCard && nextTargetXp > currentXp
    ? Math.ceil((nextTargetXp - currentXp) / 100)
    : 0

  return (
    <div className="flex h-full flex-col pb-4">
      <div className="px-1 pb-4 pt-2 text-center shrink-0">
        <p className="font-mono text-[9px] font-black uppercase tracking-[0.22em] text-(--guto-cyan) mb-1">
          {locale.evoSubtitle}
        </p>
        <h1 className="mx-auto max-w-[18rem] text-balance text-[1.25rem] font-black uppercase leading-tight tracking-[0.08em] text-(--guto-navy)">
          {locale.evoTitle}
        </h1>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {evolutionCardsFixture.map((card, index) => {
          const isCurrent = card.stage === currentEvolution

          return (
            <motion.div
              key={card.stage}
              className={
                isCurrent
                  ? "guto-deboss-deep relative overflow-hidden rounded-[1.9rem] px-4 py-4"
                  : "guto-deboss relative overflow-hidden rounded-[1.9rem] px-4 py-4"
              }
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
            >
              <div className="absolute inset-y-0 right-0 w-24 bg-[radial-gradient(circle_at_center,rgba(82,231,255,0.14)_0%,transparent_74%)]" />

              <div className="relative flex items-center gap-4">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.6rem]">
                  {isCurrent ? (
                    <GutoAvatarController
                      stage={card.stage}
                      size="md"
                      showPlatform={false}
                      className="w-full"
                      interactive={false}
                    />
                  ) : (
                    <>
                      {/* avatar da fase, porém apagado (preview do que vem) */}
                      <div className="h-full w-full opacity-45 grayscale">
                        <GutoAvatarController
                          stage={card.stage}
                          size="md"
                          showPlatform={false}
                          className="w-full"
                          interactive={false}
                          isActive={false}
                        />
                      </div>
                      {/* cadeado na frente */}
                      <div className="absolute inset-0 flex items-center justify-center bg-[rgba(244,249,253,0.35)]">
                        <div className="guto-deboss flex h-9 w-9 items-center justify-center rounded-full">
                          <Lock className="h-4 w-4 text-[rgba(13,35,65,0.5)]" />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[rgba(13,35,65,0.38)]">
                        {locale.level}
                      </p>
                      <h2 className="mt-1 text-xl font-black tracking-[0.16em] text-(--guto-navy)">
                        {card.label}
                      </h2>
                    </div>

                    {isCurrent ? (
                      <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-(--guto-cyan)">
                        {copy.active}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-2 text-sm text-[rgba(13,35,65,0.64)]">
                    {isCurrent
                      ? copy.released
                      : `${copy.blocked} ${card.requiredXp.toLocaleString()} XP.`}
                  </p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="guto-deboss mt-4 rounded-[1.9rem] px-4 py-4">
        <div className="flex items-center gap-4">
          <div className="relative h-24 w-24 shrink-0">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(13,35,65,0.1)" strokeWidth="8" />
              <motion.circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="rgba(82,231,255,0.95)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="264"
                initial={{ strokeDashoffset: 264 }}
                animate={{ strokeDashoffset: 264 * (1 - progress / 100) }}
                transition={{ duration: 0.9 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[rgba(13,35,65,0.38)]">
                XP
              </span>
              <span className="text-xl font-black text-(--guto-navy)">
                {currentXp.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm text-[rgba(13,35,65,0.68)]">{locale.evoAuto1}</p>
            <p className="mt-1 text-sm font-semibold text-(--guto-navy)">{locale.evoAuto2}</p>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[rgba(13,35,65,0.08)]">
              <motion.div
                className="h-full rounded-full bg-[linear-gradient(90deg,rgba(82,231,255,0.65),rgba(82,231,255,1))]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.85, delay: 0.2 }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-[rgba(13,35,65,0.4)]">
              <span>
                {workoutsRemaining > 0 && nextCard
                  ? copy.workoutsTo(workoutsRemaining, nextCard.label)
                  : locale.nextEvolution}
              </span>
              <span>{nextTargetXp.toLocaleString()} XP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
