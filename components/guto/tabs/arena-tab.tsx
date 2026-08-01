"use client"

import { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Flame, Medal, Swords, Star, TrendingUp, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getArenaWeekly,
  getArenaMonthly,
  getArenaIndividual,
  ArenaRankingItem,
  ArenaRankingResponse,
} from "@/lib/api/guto"
import { TranslationDictionary } from "@/components/guto/translations"
import { gutoAudio } from "@/lib/audio-haptics"

type ArenaSubTab = "week" | "month" | "individual"

interface ArenaTabProps {
  userId: string
  language: string
  translations: TranslationDictionary
  refreshKey?: number
  currentUserName?: string
}

// ARENA_GROUP removido: as funções getArenaWeekly/Monthly/Individual
// já não enviam arenaGroupId — o backend resolve via userId autenticado.

const avatarStageColor: Record<string, string> = {
  baby: "text-[rgba(13,35,65,0.38)]",
  teen: "text-(--guto-cyan)",
  adult: "text-(--guto-cyan)",
  elite: "text-yellow-500",
}

const avatarStageLabel: Record<string, Record<string, string>> = {
  baby: { "pt-BR": "BABY", "en-US": "BABY", "it-IT": "BABY" },
  teen: { "pt-BR": "GUTIM", "en-US": "GUTIM", "it-IT": "GUTIM" },
  adult: { "pt-BR": "ADULTO", "en-US": "ADULT", "it-IT": "ADULTO" },
  elite: { "pt-BR": "Elite", "en-US": "Elite", "it-IT": "Elite" },
}

const arenaStatusLabels: Record<string, Record<string, string>> = {
  "arena.status.on_fire":     { "pt-BR": "EM CHAMAS",    "en-US": "ON FIRE",      "it-IT": "IN FIAMMA" },
  "arena.status.rising":      { "pt-BR": "SUBINDO",      "en-US": "RISING",       "it-IT": "IN ASCESA" },
  "arena.status.consistent":  { "pt-BR": "CONSISTENTE",  "en-US": "CONSISTENT",   "it-IT": "COSTANTE" },
  "arena.status.needs_action":{ "pt-BR": "PRECISA REAGIR","en-US": "NEEDS ACTION", "it-IT": "REAGIRE" },
}

function translateArenaStatus(statusKey: string | undefined, language: string): string {
  if (!statusKey) return ""
  return arenaStatusLabels[statusKey]?.[language] ?? statusKey
}

const positionIcons = [Trophy, Star, TrendingUp]

function RankingCard({
  item,
  language,
  t,
  currentUserName,
  currentUserId,
}: {
  item: ArenaRankingItem
  language: string
  t: TranslationDictionary
  currentUserName?: string
  currentUserId: string
}) {
  const PositionIcon = positionIcons[item.position - 1] ?? null
  const stageColor = avatarStageColor[item.avatarStage] ?? "text-(--guto-cyan)"
  const stageName = avatarStageLabel[item.avatarStage]?.[language] ?? item.avatarStage.toUpperCase()
  const translatedStatus = translateArenaStatus(item.status, language)
  const isOnFire = item.status === "arena.status.on_fire" || item.status === "EM CHAMAS" || item.status === "ON FIRE"
  const pairName = item.pairName || ""
  const rawName = pairName.toUpperCase().startsWith("GUTO & ")
    ? pairName.slice(7).trim()
    : pairName
  const isGenericName = /^operador\s*#?\d*$/i.test(rawName || "") || /^operator\s*#?\d*$/i.test(rawName || "")
  const displayName = item.userId === currentUserId && currentUserName && isGenericName
    ? currentUserName
    : rawName || "USUÁRIO"

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: (item.position - 1) * 0.06 }}
      className="guto-premium-card relative overflow-hidden px-4 py-4"
    >
      {/* top-3 glow accent */}
      {item.position <= 3 && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[1.6rem]"
          style={{
            background:
              item.position === 1
                ? "radial-gradient(circle at 10% 50%, rgba(82,231,255,0.14), transparent 55%)"
                : "radial-gradient(circle at 10% 50%, rgba(82,231,255,0.07), transparent 55%)",
          }}
        />
      )}

      <div className="relative flex items-center gap-3.5">
        {/* Position icon */}
        <div className="guto-slot flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
          {PositionIcon ? (
            <PositionIcon
              className={cn(
                "h-6 w-6",
                item.position === 1
                  ? "text-yellow-500"
                  : item.position === 2
                  ? "text-[rgba(13,35,65,0.4)]"
                  : "text-amber-600"
              )}
            />
          ) : (
            <span className="text-sm font-black text-[rgba(13,35,65,0.52)]">#{item.position}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            {/* Name */}
            <div className="min-w-0 flex-1 flex flex-col">
              <p className="truncate text-[16px] font-black tracking-[0.04em] text-(--guto-navy)">
                {displayName}
              </p>
              <p className="guto-readable-label mt-0.5">
                {t.arena.pairWithGuto}
              </p>
            </div>
            {/* XP */}
            <div className="shrink-0 text-right">
              <p className="text-[17px] font-black leading-none text-(--guto-cyan)">
                {item.xp.toLocaleString()}{" "}
                <span className="text-[10px] font-black tracking-widest">{t.arena.xp}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 mt-2">
            {/* Stage */}
            <p className={cn("guto-readable-label", stageColor)}>
              {stageName}
            </p>
            {/* Workouts */}
            <p className="guto-readable-label text-right">
              {item.validatedWorkouts} {t.arena.workoutsValidated}
            </p>
          </div>
        </div>
      </div>

      {/* Status row */}
      <div className="relative mt-3 flex min-h-8 items-center gap-2 rounded-full bg-white/42 px-3">
        {isOnFire ? (
          <Flame className="h-4 w-4 text-orange-500" />
        ) : (
          <TrendingUp className="h-4 w-4 text-[rgba(82,231,255,0.76)]" />
        )}
        <span className="guto-readable-label">
          {translatedStatus}
        </span>
        {item.currentStreak !== undefined && item.currentStreak > 0 && (
          <span className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] font-black text-[rgba(13,35,65,0.48)]">
            <Flame className="h-3.5 w-3.5 text-orange-500" /> {item.currentStreak}d
          </span>
        )}
      </div>

      {/* XP to next evolution (individual tab) */}
      {item.xpToNextEvolution !== null && item.xpToNextEvolution !== undefined && (
        <div className="relative mt-3">
          <div className="guto-readable-label mb-1.5 flex justify-between text-[8px]">
            <span>{t.arena.nextEvolution}</span>
            <span>
              {item.xpToNextEvolution.toLocaleString()} {t.arena.xpMissing}
            </span>
          </div>
          <div className="h-1 rounded-full bg-[rgba(13,35,65,0.08)]">
            <div
              className="h-1 rounded-full bg-(--guto-cyan) transition-all"
              style={{
                width: item.nextEvolutionXp
                  ? `${Math.min(100, (item.xp / item.nextEvolutionXp) * 100)}%`
                  : "100%",
              }}
            />
          </div>
        </div>
      )}
    </motion.div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="guto-premium-card flex flex-col items-center gap-3 px-5 py-10 text-center">
      <Swords className="h-11 w-11 text-[rgba(82,231,255,0.58)]" />
      <p className="guto-readable-body max-w-[220px]">{message}</p>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-[1.6rem] bg-[rgba(13,35,65,0.05)]"
        />
      ))}
    </div>
  )
}

export function ArenaTab({ userId, language, translations: t, refreshKey, currentUserName }: ArenaTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<ArenaSubTab>("week")
  const [data, setData] = useState<ArenaRankingResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRanking = useCallback(
    async (sub: ArenaSubTab) => {
      setLoading(true)
      setError(null)
      try {
        let result: ArenaRankingResponse
        if (sub === "week") result = await getArenaWeekly()
        else if (sub === "month") result = await getArenaMonthly()
        else result = await getArenaIndividual()
        setData(result)
      } catch {
        setError(t.arena.emptyState)
      } finally {
        setLoading(false)
      }
    },
    [t.arena.emptyState]
  )

  useEffect(() => {
    fetchRanking(activeSubTab)
  }, [activeSubTab, fetchRanking, refreshKey])

  const subTabs: { id: ArenaSubTab; label: string }[] = [
    { id: "week", label: t.arena.week },
    { id: "month", label: t.arena.month },
    { id: "individual", label: t.arena.individual },
  ]

  const headline =
    activeSubTab === "week"
      ? t.arena.weeklyHeadline
      : activeSubTab === "month"
      ? t.arena.monthlyHeadline
      : t.arena.individualHeadline

  const resetLabel =
    activeSubTab === "week"
      ? t.arena.restartsMonday
      : activeSubTab === "month"
      ? t.arena.restartsNextMonth
      : null

  return (
    <div className="guto-tab-shell">
      {/* Header */}
      <div className="guto-tab-header">
        <p className="guto-tab-kicker">
          {t.arena.subtitle}
        </p>
        <h1 className="guto-tab-title">
          {t.arena.tab}
        </h1>
      </div>

      {/* Sub-tab strip */}
      <div className="shrink-0 px-1 pb-3">
        <div className="guto-segmented-control grid-cols-3">
          {subTabs.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => { gutoAudio.playGutoFeedback('tap'); setActiveSubTab(sub.id) }}
              className="guto-segment-button"
              data-active={activeSubTab === sub.id}
              aria-pressed={activeSubTab === sub.id}
            >
              {sub.label}
            </button>
          ))}
        </div>
      </div>

      {/* Headline */}
      <div className="guto-premium-card mb-3 shrink-0 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="guto-slot grid h-11 w-11 shrink-0 place-items-center rounded-full text-(--guto-cyan)">
            {activeSubTab === "individual" ? <Medal className="h-5 w-5" /> : <Trophy className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <p className="guto-readable-label text-(--guto-navy)">
              {headline}
            </p>
            {resetLabel && (
              <p className="mt-1 text-[12px] font-semibold leading-snug text-[rgba(13,35,65,0.52)]">{resetLabel}</p>
            )}
          </div>
        </div>
      </div>

      {/* Ranking list */}
      <div className="guto-tab-scroll pb-6">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LoadingState />
            </motion.div>
          ) : error ? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EmptyState message={error} />
            </motion.div>
          ) : !data || !data.items || data.items.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EmptyState message={t.arena.emptyState} />
            </motion.div>
          ) : (
            <motion.div
              key={activeSubTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              {data.items.map((item) => (
                <RankingCard
                  key={item.userId}
                  item={item}
                  language={language}
                  t={t}
                  currentUserId={userId}
                  currentUserName={currentUserName}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
