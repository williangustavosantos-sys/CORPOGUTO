"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { createPortal } from "react-dom"
import { translations, type ValidLanguage } from "../translations"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalibrationProfile {
  userAge?: number
  biologicalSex?: "female" | "male"
  trainingLevel?: "beginner" | "returning" | "consistent" | "advanced"
  trainingGoal?: "consistency" | "fat_loss" | "muscle_gain" | "conditioning" | "mobility_health"
  trainingFrequencyDaysPerWeek?: number
  heightCm?: number
  weightKg?: number
}

type TrainingStatus = "beginner" | "returning" | "consistent" | "advanced"
type GoalKey = "consistency" | "fat_loss" | "muscle_gain" | "conditioning" | "mobility_health"
type SelectOption = { value: string; label: string }

export function isCalibrationProfileComplete(profile: CalibrationProfile): boolean {
  return Boolean(
    profile.biologicalSex &&
    profile.userAge && profile.userAge >= 14 && profile.userAge <= 99 &&
    profile.trainingLevel &&
    profile.trainingGoal &&
    profile.trainingFrequencyDaysPerWeek &&
    profile.trainingFrequencyDaysPerWeek >= 1 && profile.trainingFrequencyDaysPerWeek <= 7 &&
    profile.heightCm && profile.heightCm >= 100 && profile.heightCm <= 250 &&
    profile.weightKg && profile.weightKg >= 30 && profile.weightKg <= 300
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CalibrationScreen({
  language,
  onComplete,
  initialProfile,
  title,
}: {
  language: ValidLanguage
  onComplete: (profile: CalibrationProfile) => void
  initialProfile?: CalibrationProfile | null
  title?: string
}) {
  const t = translations[language].calibration
  const scanLabel = {
    "pt-BR": "ESCANEAMENTO GUTO",
    "en-US": "GUTO SCAN",
    "it-IT": "SCANSIONE GUTO",
  }[language]

  const [biologicalSex, setBiologicalSex] = useState<"male" | "female" | null>(() => {
    const saved = initialProfile?.biologicalSex
    return saved === "male" || saved === "female" ? saved : null
  })
  const [ageInput, setAgeInput] = useState(initialProfile?.userAge ? String(initialProfile.userAge) : "")
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus | null>(initialProfile?.trainingLevel ?? null)
  const [goal, setGoal] = useState<GoalKey | null>(initialProfile?.trainingGoal ?? null)
  const [trainingFrequency, setTrainingFrequency] = useState<number | null>(
    initialProfile?.trainingFrequencyDaysPerWeek ?? null
  )
  const [heightInput, setHeightInput] = useState(initialProfile?.heightCm ? String(initialProfile.heightCm) : "")
  const [weightInput, setWeightInput] = useState(initialProfile?.weightKg ? String(initialProfile.weightKg) : "")

  const ageNum = parseInt(ageInput, 10)
  const isAgeValid = !isNaN(ageNum) && ageNum >= 14 && ageNum <= 99
  const heightNum = parseInt(heightInput, 10)
  const isHeightValid = !isNaN(heightNum) && heightNum >= 100 && heightNum <= 250
  const weightNum = parseFloat(weightInput.replace(",", "."))
  const isWeightValid = !isNaN(weightNum) && weightNum >= 30 && weightNum <= 300
  const isComplete = Boolean(
    biologicalSex &&
    isAgeValid &&
    trainingStatus &&
    goal &&
    trainingFrequency &&
    isHeightValid &&
    isWeightValid
  )

  const handleSubmit = () => {
    if (!isComplete) return

    onComplete({
      biologicalSex: biologicalSex ?? undefined,
      userAge: ageNum,
      trainingLevel: trainingStatus ?? undefined,
      trainingGoal: goal ?? undefined,
      trainingFrequencyDaysPerWeek: trainingFrequency ?? undefined,
      heightCm: isHeightValid ? heightNum : undefined,
      weightKg: isWeightValid ? weightNum : undefined,
    })
  }

  const ageOptions = useMemo(() => {
    return Array.from({ length: 86 }, (_, index) => {
      const age = String(index + 14)
      return { value: age, label: age }
    })
  }, [])
  const weightOptions = useMemo(() => {
    return Array.from({ length: 2701 }, (_, index) => {
      const value = (30 + index / 10).toFixed(1)
      const label = language === "en-US" ? value : value.replace(".", ",")
      return { value, label }
    })
  }, [language])
  const heightOptions = useMemo(() => {
    return Array.from({ length: 151 }, (_, index) => {
      const height = String(index + 100)
      return { value: height, label: height }
    })
  }, [])
  const scanTitle = {
    "pt-BR": "CALIBRAGEM INICIAL",
    "en-US": "INITIAL CALIBRATION",
    "it-IT": "CALIBRAZIONE INIZIALE",
  }[language]
  const doneLabel = {
    "pt-BR": "Pronto",
    "en-US": "Done",
    "it-IT": "Fatto",
  }[language]
  const searchLabel = {
    "pt-BR": "Digite para buscar",
    "en-US": "Type to search",
    "it-IT": "Scrivi per cercare",
  }[language]
  const noOptionsLabel = {
    "pt-BR": "Nenhuma opção encontrada",
    "en-US": "No options found",
    "it-IT": "Nessuna opzione trovata",
  }[language]
  const objectiveEntries = Object.entries(t.objectiveChips) as [GoalKey, string][]
  const calibrationBodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scrollHost = calibrationBodyRef.current
    if (!scrollHost) return

    const scrollFocusedFieldIntoView = (event: FocusEvent) => {
      const target = event.target
      if (!(target instanceof HTMLElement) || !scrollHost.contains(target)) return
      window.requestAnimationFrame(() => {
        target.scrollIntoView({ block: "center", behavior: "smooth" })
      })
    }

    scrollHost.addEventListener("focusin", scrollFocusedFieldIntoView)
    return () => scrollHost.removeEventListener("focusin", scrollFocusedFieldIntoView)
  }, [])

  return (
    <div className="guto-calibration-stage relative h-full min-h-0 w-full overflow-hidden px-3.5 pb-[max(env(safe-area-inset-bottom),0.55rem)] pt-[max(env(safe-area-inset-top),0.5rem)] font-tech">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-md flex-col gap-1.5">
        <motion.header
          className="shrink-0 text-center"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32 }}
        >
          <p className="font-mono text-[8px] font-black uppercase tracking-[0.26em] text-[rgba(13,35,65,0.38)]">
            {scanLabel}
          </p>
          <h1 className="mt-0.5 text-[18px] font-black uppercase leading-none tracking-[0.16em] text-(--guto-navy)">
            {title ?? scanTitle}
          </h1>
          <p className="mx-auto mt-0.5 max-w-[19rem] text-[10px] font-semibold leading-tight text-[rgba(13,35,65,0.56)]">
            {t.subtitle}
          </p>
        </motion.header>

        <motion.div
          ref={calibrationBodyRef}
          className="guto-calibration-body flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain pb-4 pr-0.5 [-webkit-overflow-scrolling:touch]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, delay: 0.08 }}
        >
          <div className="grid shrink-0 grid-cols-[92px_minmax(0,1fr)_92px] items-stretch gap-1.5 min-[390px]:grid-cols-[98px_minmax(0,1fr)_98px]">
            <CalibrationPlate className="flex min-w-0 flex-col justify-center gap-2 p-2">
              <div className="grid grid-cols-1 gap-1">
                <MiniChip label={t.sexOptions.female} active={biologicalSex === "female"} onClick={() => setBiologicalSex("female")} />
                <MiniChip label={t.sexOptions.male} active={biologicalSex === "male"} onClick={() => setBiologicalSex("male")} />
              </div>
              <Divider />
              <SearchSelect
                label={t.ageLabel}
                value={ageInput}
                options={ageOptions}
                placeholder="--"
                searchPlaceholder={searchLabel}
                closeLabel={doneLabel}
                emptyLabel={noOptionsLabel}
                onSelect={(option) => setAgeInput(option.value)}
              />
            </CalibrationPlate>

            <div className="guto-calibration-hero relative grid min-h-[clamp(184px,34dvh,232px)] min-w-0 place-items-center overflow-hidden rounded-[24px]">
              <div className="absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_55%,rgba(82,231,255,0.32),transparent_72%)] blur-[8px]" />
              <div className="absolute bottom-2 left-1/2 h-2.5 w-[130px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(82,231,255,0.6),transparent_70%)] blur-[3px]" />
              <motion.div
                className="relative z-10"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Image
                  src="/assets/guto/guto-usuario.png"
                  alt=""
                  aria-hidden="true"
                  width={132}
                  height={320}
                  className="h-[clamp(190px,35dvh,238px)] w-auto object-contain drop-shadow-[0_0_18px_rgba(82,231,255,0.65)]"
                  priority
                />
              </motion.div>
            </div>

            <CalibrationPlate className="flex min-w-0 flex-col justify-center gap-2 p-2">
              <SearchSelect
                label={t.weightLabel}
                value={weightInput}
                options={weightOptions}
                placeholder="70"
                searchPlaceholder={searchLabel}
                closeLabel={doneLabel}
                emptyLabel={noOptionsLabel}
                onSelect={(option) => setWeightInput(option.value)}
              />
              <Divider />
              <SearchSelect
                label={t.heightLabel}
                value={heightInput}
                options={heightOptions}
                placeholder="170"
                searchPlaceholder={searchLabel}
                closeLabel={doneLabel}
                emptyLabel={noOptionsLabel}
                onSelect={(option) => setHeightInput(option.value)}
              />
            </CalibrationPlate>
          </div>

          <CalibrationPlate className="flex shrink-0 flex-col gap-2 p-2.5">
            <div>
              <CyanLabel text={`${t.statusLabel}:`} />
              <div className="mt-1 grid grid-cols-4 gap-1">
                <MiniChip label={t.statusChips.paused} active={trainingStatus === "beginner"} onClick={() => setTrainingStatus("beginner")} />
                <MiniChip label={t.statusChips.returning} active={trainingStatus === "returning"} onClick={() => setTrainingStatus("returning")} />
                <MiniChip label={t.statusChips.active} active={trainingStatus === "consistent"} onClick={() => setTrainingStatus("consistent")} />
                <MiniChip label={t.statusChips.advanced} active={trainingStatus === "advanced"} onClick={() => setTrainingStatus("advanced")} />
              </div>
            </div>

            <div>
              <CyanLabel text={`${t.frequencyLabel}:`} />
              <div className="mt-1 grid grid-cols-7 gap-1">
                {t.frequencyOptions.map((label, index) => {
                  const days = index + 1
                  return (
                    <MiniChip
                      key={days}
                      label={label}
                      active={trainingFrequency === days}
                      onClick={() => setTrainingFrequency(days)}
                    />
                  )
                })}
              </div>
            </div>

            <div>
              <CyanLabel text={t.objectiveSection} />
              <div className="mt-1 grid grid-cols-2 gap-1">
                {objectiveEntries.map(([key, label], index) => (
                  <MiniChip
                    key={key}
                    label={label}
                    active={goal === key}
                    onClick={() => setGoal(key)}
                    className={
                      objectiveEntries.length % 2 === 1 && index === objectiveEntries.length - 1
                        ? "col-span-2 mx-auto w-[calc(50%-0.125rem)]"
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>
          </CalibrationPlate>

          <motion.button
            type="button"
            whileTap={isComplete ? { scale: 0.97 } : {}}
            disabled={!isComplete}
            onClick={handleSubmit}
            className="mt-auto h-10 w-full shrink-0 rounded-full border font-black uppercase tracking-[0.26em] text-[10px] transition-all duration-300"
            style={
              isComplete
                ? {
                    borderColor: "var(--guto-cyan)",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.85), rgba(214,243,255,0.65))",
                    color: "var(--guto-navy)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.92), 0 0 14px rgba(82,231,255,0.32)",
                  }
                : {
                    borderColor: "rgba(90,124,168,0.24)",
                    background: "rgba(255,255,255,0.58)",
                    color: "rgba(13,35,65,0.3)",
                  }
            }
          >
            {t.submit}
          </motion.button>
        </motion.div>
      </div>
    </div>
  )

}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CalibrationPlate({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-[20px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.96),inset_0_-1px_0_rgba(193,212,232,0.45),0_12px_28px_rgba(90,124,168,0.10)] backdrop-blur-xl ${className}`}
      style={{
        background: "linear-gradient(180deg,rgba(255,255,255,.85),rgba(245,250,255,.62))",
        borderColor: "rgba(255,255,255,.94)",
      }}
    >
      {children}
    </section>
  )
}

function Divider() {
  return <div className="h-px bg-[rgba(82,231,255,0.4)]" />
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function SearchSelect({
  label,
  value,
  options,
  placeholder,
  searchPlaceholder,
  closeLabel,
  emptyLabel,
  onSelect,
  disabled = false,
  allowCustom = false,
}: {
  label: string
  value: string
  options: SelectOption[]
  placeholder: string
  searchPlaceholder: string
  closeLabel: string
  emptyLabel: string
  onSelect: (option: SelectOption) => void
  disabled?: boolean
  allowCustom?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [viewportHeight, setViewportHeight] = useState(0)
  const [keyboardOffset, setKeyboardOffset] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    // Trava scroll do body sem usar overflow:hidden — no iOS Safari, overflow:hidden
    // em <body> pode congelar o visualViewport e impedir o resize quando o teclado abre.
    const scrollY = window.scrollY
    const body = document.body
    const previous = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    }
    body.style.position = "fixed"
    body.style.top = `-${scrollY}px`
    body.style.width = "100%"

    const sync = () => {
      const vv = window.visualViewport
      if (!vv) {
        setViewportHeight(window.innerHeight)
        setKeyboardOffset(0)
        return
      }
      const vh = Math.round(vv.height)
      const offsetTop = Math.max(0, Math.round(vv.offsetTop))
      const kbOffset = Math.max(0, Math.round(window.innerHeight - vh - offsetTop))
      setViewportHeight(vh)
      setKeyboardOffset(kbOffset)
    }

    sync()
    const vv = window.visualViewport
    vv?.addEventListener("resize", sync)
    vv?.addEventListener("scroll", sync)
    window.addEventListener("focusin", sync)
    window.addEventListener("focusout", sync)
    // iOS dispara visualViewport.resize com delay (até ~400ms) depois que o
    // teclado começa a abrir. Polling curto garante que o painel encolhe antes
    // da lista ficar atrás do teclado.
    const pollId = window.setInterval(sync, 80)
    const stopPollId = window.setTimeout(() => window.clearInterval(pollId), 1600)

    return () => {
      body.style.position = previous.position
      body.style.top = previous.top
      body.style.width = previous.width
      window.scrollTo(0, scrollY)
      vv?.removeEventListener("resize", sync)
      vv?.removeEventListener("scroll", sync)
      window.removeEventListener("focusin", sync)
      window.removeEventListener("focusout", sync)
      window.clearInterval(pollId)
      window.clearTimeout(stopPollId)
      setKeyboardOffset(0)
      setViewportHeight(0)
    }
  }, [open])

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query.trim())
    const matches = normalizedQuery
      ? options.filter((option) => normalizeSearchText(option.label).includes(normalizedQuery))
      : options
    const hasExactMatch = matches.some((option) => normalizeSearchText(option.label) === normalizedQuery)
    if (allowCustom && query.trim().length >= 2 && !hasExactMatch) {
      return [{ value: query.trim(), label: query.trim() }, ...matches]
    }
    return matches
  }, [allowCustom, options, query])

  const close = () => {
    setOpen(false)
    setQuery("")
  }

  const keyboardOpen = keyboardOffset > 60

  return (
    <div className="block min-w-0">
      <CyanLabel text={label} size="xs" />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="mt-1 flex h-7 w-full min-w-0 items-center justify-center rounded-full border bg-white/80 px-2 text-center font-mono text-[10px] font-extrabold text-(--guto-navy) outline-none disabled:opacity-45"
        style={{
          borderColor: "var(--guto-cyan)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95), 0 0 8px rgba(82,231,255,0.18)",
        }}
      >
        <span className={value ? "truncate" : "truncate text-[rgba(13,35,65,0.24)]"}>
          {value || placeholder}
        </span>
      </button>

      {open && typeof document !== "undefined" &&
        createPortal(
          <motion.div
            className={`guto-calibration-select-overlay fixed inset-x-0 top-0 z-[9999] flex flex-col bg-[rgba(13,35,65,0.28)] px-3 pt-[max(env(safe-area-inset-top),0.5rem)] backdrop-blur-[2px] sm:px-4 ${
              keyboardOpen ? "justify-start pb-3" : "justify-end pb-[max(env(safe-area-inset-bottom),0.5rem)] sm:justify-center sm:pb-[max(env(safe-area-inset-bottom),1rem)]"
            }`}
            style={{
              // Altura medida pelo visualViewport — exclui o teclado iOS quando aberto.
              height: viewportHeight ? `${viewportHeight}px` : "100dvh",
            }}
            role="presentation"
            onClick={close}
          >
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label={label}
              className="mx-auto flex w-full max-w-[398px] min-h-0 flex-col rounded-[28px] border border-white/80 bg-white/95 p-3 shadow-[0_24px_60px_rgba(13,35,65,0.24)]"
              style={{
                // Painel sempre cabe na área visível (sem teclado), com folgas pra safe-area.
                maxHeight: viewportHeight
                  ? `calc(${viewportHeight}px - max(env(safe-area-inset-top), 0.75rem) - max(env(safe-area-inset-bottom), 0.75rem))`
                  : "92dvh",
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <CyanLabel text={label} />
                <button
                  type="button"
                  onClick={close}
                  className="h-8 rounded-full px-3 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[rgba(13,35,65,0.62)]"
                >
                {closeLabel}
                </button>
              </div>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                autoFocus
                enterKeyHint="search"
                autoComplete="off"
                className="h-10 w-full shrink-0 rounded-full border border-[rgba(82,231,255,0.55)] bg-white px-4 font-mono text-[12px] font-bold text-(--guto-navy) outline-none placeholder:text-[rgba(13,35,65,0.28)]"
              />
              <div className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
                {filteredOptions.map((option, index) => (
                  <button
                    key={`${label}-${option.value}-${option.label}-${index}`}
                    type="button"
                    onClick={() => {
                      onSelect(option)
                      close()
                    }}
                    className="mb-1 flex min-h-10 w-full items-center rounded-2xl px-3 text-left font-mono text-[12px] font-extrabold text-(--guto-navy)"
                    style={{
                      background: option.label === value || option.value === value ? "rgba(82,231,255,0.18)" : "rgba(245,250,255,0.72)",
                      border: option.label === value || option.value === value ? "1px solid rgba(82,231,255,0.75)" : "1px solid rgba(193,212,232,0.36)",
                    }}
                  >
                    {option.label}
                  </button>
                ))}
                {filteredOptions.length === 0 && (
                  <p className="py-4 text-center font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[rgba(13,35,65,0.4)]">
                    {emptyLabel}
                  </p>
                )}
              </div>
            </div>
          </motion.div>,
          document.body
        )}
    </div>
  )
}

function CyanLabel({
  text,
  size = "sm",
}: {
  text: string
  size?: "xs" | "sm"
}) {
  return (
    <p
      className="truncate font-mono font-bold uppercase leading-none text-(--guto-cyan)"
      style={{
        fontSize: size === "xs" ? 8 : 9,
        letterSpacing: size === "xs" ? "0.24em" : "0.28em",
        textShadow: "0 0 6px rgba(82,231,255,0.55)",
      }}
    >
      {text}
    </p>
  )
}

function MiniChip({
  label,
  active,
  onClick,
  className,
}: {
  label: string
  active: boolean
  onClick: () => void
  className?: string
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={[
        "flex h-6 min-w-0 items-center justify-center truncate rounded-full px-1 text-center font-mono text-[7.5px] font-bold uppercase leading-none transition-all duration-200 min-[390px]:text-[8px]",
        className,
      ].filter(Boolean).join(" ")}
      style={
        active
          ? {
              border: "1.5px solid var(--guto-cyan)",
              background: "rgba(82,231,255,0.18)",
              color: "var(--guto-navy)",
              boxShadow: "0 0 10px rgba(82,231,255,0.38)",
              letterSpacing: "0.10em",
            }
          : {
              border: "1px solid rgba(90,124,168,0.28)",
              background: "rgba(255,255,255,0.78)",
              color: "rgba(13,35,65,0.74)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)",
              letterSpacing: "0.10em",
            }
      }
    >
      <span className="truncate">{label}</span>
    </motion.button>
  )
}
