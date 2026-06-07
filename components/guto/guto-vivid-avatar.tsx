"use client"

/**
 * GutoVividAvatar — avatar oficial do GUTO (100% SVG + Framer Motion).
 *
 * Estilo claro/branco-azul, fofo e carismático, com silhuetas distintas por
 * fase (baby bolinha → teen com antena → adult roliço → elite herói com capa
 * e coroa). Olhos e núcleo são esferas de vidro no ciano oficial (#52e7ff);
 * os olhos azuis nunca mudam de cor (identidade GUTO).
 *
 * Usado em produção via GutoAvatarController (Chat/Evoluir/Percurso) e no GUTO
 * Online. Substituiu os antigos avatares em vídeo — sem vídeo/GIF, sem asset de
 * /public: pesa KB e escala sem perder nitidez.
 *
 * Interação: ao tocar, reage (acena os braços, pulinho, olhos felizes, esfera
 * brilha). Determinístico (sem Math.random/Date.now) → estável em SSR/hidratação.
 */

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"
import type { EvolutionStage } from "@/types/contract"

// Emoção própria (superset da de @/types/contract, que não tem "super").
// Mantém o componente isolado — não importa nada do avatar de produção.
export type GutoVividEmotion =
  | "default"
  | "alert"
  | "critical"
  | "reward"
  | "super"

export type GutoVividStage = EvolutionStage // "baby" | "teen" | "adult" | "elite"
export type GutoVividSize = "sm" | "md" | "lg" | "xl"

interface GutoVividAvatarProps {
  evolution?: GutoVividStage
  emotion?: GutoVividEmotion
  size?: GutoVividSize
  /** Lado em px. Sobrepõe `size` quando definido (útil para grades/amostra). */
  px?: number
  isActive?: boolean
  /** Anima boca/núcleo como se estivesse falando (variante online/sessão). */
  isSpeaking?: boolean
  /** Plataforma/base sob o avatar. */
  showPlatform?: boolean
  className?: string
  onTap?: () => void
}

// ── Identidade visual (ciano oficial do app) ────────────────────────────────
const EYE_COLOR = "#52e7ff" // --guto-cyan
const EYE_DARK = "#1ec1de" // ciano profundo (gradiente do app)
const EYE_GLOW = "#7df0ff" // ciano brilho (gradiente do app)
const BLUSH = "#ff9fb6"

// Mesmos tamanhos do avatar oficial (drop-in futuro).
const sizeClasses: Record<GutoVividSize, string> = {
  sm: "w-24 h-24",
  md: "w-32 h-32",
  lg: "w-40 h-40",
  xl: "w-[min(96vw,34rem)] h-[min(96vw,34rem)]",
}

// ── Parâmetros por emoção ────────────────────────────────────────────────────
type Mood = {
  happyEyes: boolean
  eyeOpen: number
  blink: boolean
  browDy: number // desloca sobrancelhas (+ para baixo/preocupado)
  coreDur: number
  coreScale: number
  coreMin: number
  aura: number // 0..1 — intensidade do halo de energia (super/reward)
  breathDur: number
  breathAmp: number
}

const MOODS: Record<GutoVividEmotion, Mood> = {
  default: {
    happyEyes: false, eyeOpen: 1, blink: true, browDy: 0,
    coreDur: 2.6, coreScale: 1.14, coreMin: 0.72, aura: 0,
    breathDur: 3.6, breathAmp: 0.018,
  },
  alert: {
    happyEyes: false, eyeOpen: 1.12, blink: true, browDy: -2.5,
    coreDur: 1.35, coreScale: 1.2, coreMin: 0.82, aura: 0.18,
    breathDur: 2.9, breathAmp: 0.024,
  },
  critical: {
    happyEyes: false, eyeOpen: 0.74, blink: true, browDy: 3,
    coreDur: 3.4, coreScale: 1.06, coreMin: 0.5, aura: 0,
    breathDur: 5, breathAmp: 0.012,
  },
  reward: {
    happyEyes: true, eyeOpen: 1, blink: false, browDy: -3,
    coreDur: 1, coreScale: 1.34, coreMin: 0.86, aura: 0.34,
    breathDur: 2.4, breathAmp: 0.03,
  },
  super: {
    happyEyes: false, eyeOpen: 1.06, blink: true, browDy: -0.5,
    coreDur: 1.05, coreScale: 1.3, coreMin: 0.84, aura: 1,
    breathDur: 2.6, breathAmp: 0.028,
  },
}

// ── Metadados por fase (silhuetas fofas distintas; olhos grandes p/ carisma) ──
type StageMeta = {
  view: [number, number]
  eyes: { lx: number; rx: number; cy: number; r: number }
  core: { cx: number; cy: number; r: number }
  ground: number // y do chão (origem da respiração)
}

const STAGE_META: Record<GutoVividStage, StageMeta> = {
  baby: {
    view: [160, 160],
    eyes: { lx: 57, rx: 103, cy: 72, r: 16 },
    core: { cx: 80, cy: 112, r: 13 },
    ground: 154,
  },
  teen: {
    view: [170, 200],
    eyes: { lx: 63, rx: 107, cy: 100, r: 18 },
    core: { cx: 85, cy: 134, r: 13 },
    ground: 192,
  },
  adult: {
    view: [220, 210],
    eyes: { lx: 82, rx: 138, cy: 104, r: 20 },
    core: { cx: 110, cy: 150, r: 17 },
    ground: 202,
  },
  elite: {
    view: [220, 240],
    eyes: { lx: 85, rx: 135, cy: 122, r: 20 },
    core: { cx: 110, cy: 162, r: 18 },
    ground: 230,
  },
}

// ── Helpers de SVG ───────────────────────────────────────────────────────────

function Defs({ uid, body }: { uid: string; body: [string, string, string] }) {
  return (
    <defs>
      <radialGradient id={`${uid}-body`} cx="35%" cy="30%" r="72%">
        <stop offset="0%" stopColor={body[0]} />
        <stop offset="60%" stopColor={body[1]} />
        <stop offset="100%" stopColor={body[2]} />
      </radialGradient>
      <radialGradient id={`${uid}-eye`} cx="42%" cy="38%" r="68%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="40%" stopColor={EYE_COLOR} />
        <stop offset="100%" stopColor={EYE_DARK} />
      </radialGradient>
      <radialGradient id={`${uid}-core`} cx="36%" cy="30%" r="72%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="30%" stopColor={EYE_GLOW} />
        <stop offset="72%" stopColor={EYE_COLOR} />
        <stop offset="100%" stopColor="#1396b8" />
      </radialGradient>
      <filter id={`${uid}-glow`} x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="3" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  )
}

function Eye({ uid, cx, cy, r }: { uid: string; cx: number; cy: number; r: number }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={r} ry={r} fill={EYE_DARK} />
      <ellipse cx={cx} cy={cy} rx={r * 0.81} ry={r * 0.81} fill={`url(#${uid}-eye)`} />
      <ellipse cx={cx} cy={cy} rx={r * 0.5} ry={r * 0.5} fill={EYE_GLOW} />
      <ellipse cx={cx - r * 0.38} cy={cy - r * 0.45} rx={r * 0.25} ry={r * 0.25} fill="#ffffff" opacity={0.92} />
      <ellipse cx={cx + r * 0.36} cy={cy + r * 0.3} rx={r * 0.13} ry={r * 0.13} fill="#ffffff" opacity={0.5} />
    </g>
  )
}

function Eyes({
  uid,
  lx,
  rx,
  cy,
  r,
  mood,
}: {
  uid: string
  lx: number
  rx: number
  cy: number
  r: number
  mood: Mood
}) {
  const mid = (lx + rx) / 2
  const eo = mood.eyeOpen
  const happyArc = (x: number) =>
    `M ${x - r} ${cy + r * 0.4} Q ${x} ${cy - r} ${x + r} ${cy + r * 0.4}`

  return (
    <motion.g
      style={{ transformOrigin: `${mid}px ${cy}px`, transformBox: "view-box" }}
      animate={mood.blink ? { scaleY: [eo, eo, 0.08, eo, eo] } : { scaleY: eo }}
      transition={
        mood.blink
          ? { duration: 4.2, times: [0, 0.92, 0.95, 0.98, 1], repeat: Infinity, ease: "easeInOut" }
          : { duration: 0.3 }
      }
    >
      <g style={{ opacity: mood.happyEyes ? 0 : 1 }}>
        <Eye uid={uid} cx={lx} cy={cy} r={r} />
        <Eye uid={uid} cx={rx} cy={cy} r={r} />
      </g>
      <g
        style={{ opacity: mood.happyEyes ? 1 : 0 }}
        stroke={EYE_COLOR}
        strokeWidth={r * 0.55}
        strokeLinecap="round"
        fill="none"
        filter={`url(#${uid}-glow)`}
      >
        <path d={happyArc(lx)} />
        <path d={happyArc(rx)} />
      </g>
    </motion.g>
  )
}

// Brilhos fofos (4 pontas) que cintilam — usados no elite/reward p/ carisma.
function Sparkles({ pts, color }: { pts: Array<[number, number, number]>; color: string }) {
  return (
    <g>
      {pts.map(([x, y, s], i) => (
        <motion.g
          key={i}
          style={{ transformOrigin: `${x}px ${y}px`, transformBox: "view-box" }}
          animate={{ opacity: [0.15, 1, 0.15], scale: [0.6, 1.1, 0.6] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.45 }}
        >
          <path
            d={`M ${x} ${y - s} L ${x + s * 0.3} ${y - s * 0.3} L ${x + s} ${y} L ${x + s * 0.3} ${y + s * 0.3} L ${x} ${y + s} L ${x - s * 0.3} ${y + s * 0.3} L ${x - s} ${y} L ${x - s * 0.3} ${y - s * 0.3} Z`}
            fill={color}
          />
        </motion.g>
      ))}
    </g>
  )
}

function ChestCore({
  uid,
  cx,
  cy,
  r,
  mood,
  speaking,
}: {
  uid: string
  cx: number
  cy: number
  r: number
  mood: Mood
  speaking: boolean
}) {
  const dur = speaking ? Math.min(mood.coreDur, 0.7) : mood.coreDur
  return (
    <g>
      {/* halo de energia que respira (luz, sem mover a esfera) */}
      <motion.circle
        cx={cx}
        cy={cy}
        r={r * 1.22}
        fill={EYE_COLOR}
        filter={`url(#${uid}-glow)`}
        style={{ transformOrigin: `${cx}px ${cy}px`, transformBox: "view-box" }}
        animate={{ opacity: [0.12 * mood.coreMin, 0.42, 0.12 * mood.coreMin], scale: [0.9, mood.coreScale, 0.9] }}
        transition={{ duration: dur, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* esfera 3D — volume pelo gradiente (luz no topo-esquerdo, borda escura embaixo) */}
      <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}-core)`} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={EYE_GLOW} strokeWidth={1} opacity={0.55} />
      {/* brilho especular — o que faz ler como esfera, não como disco/bico */}
      <ellipse
        cx={cx - r * 0.32}
        cy={cy - r * 0.36}
        rx={r * 0.36}
        ry={r * 0.24}
        fill="#ffffff"
        opacity={0.9}
        transform={`rotate(-20 ${cx - r * 0.32} ${cy - r * 0.36})`}
      />
      <circle cx={cx + r * 0.34} cy={cy + r * 0.34} r={r * 0.1} fill="#ffffff" opacity={0.4} />
      {/* anéis de comunicação quando falando */}
      {speaking && (
        <>
          <motion.circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={EYE_COLOR}
            strokeWidth={1.4}
            style={{ transformOrigin: `${cx}px ${cy}px`, transformBox: "view-box" }}
            animate={{ scale: [1, 1.9], opacity: [0.55, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={EYE_GLOW}
            strokeWidth={1.2}
            style={{ transformOrigin: `${cx}px ${cy}px`, transformBox: "view-box" }}
            animate={{ scale: [1, 1.9], opacity: [0.45, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut", delay: 0.55 }}
          />
        </>
      )}
    </g>
  )
}

function Aura({
  uid,
  cx,
  cy,
  r,
  intensity,
  dur,
}: {
  uid: string
  cx: number
  cy: number
  r: number
  intensity: number
  dur: number
}) {
  if (intensity <= 0) return null
  return (
    <motion.circle
      cx={cx}
      cy={cy}
      r={r}
      fill={EYE_COLOR}
      filter={`url(#${uid}-glow)`}
      style={{ transformOrigin: `${cx}px ${cy}px`, transformBox: "view-box" }}
      animate={{ opacity: [0.05 * intensity, 0.18 * intensity, 0.05 * intensity], scale: [0.98, 1.04, 0.98] }}
      transition={{ duration: dur, repeat: Infinity, ease: "easeInOut" }}
    />
  )
}

// Braço animável: acena (gira no ombro) quando `reacting`. dir -1 = esquerdo, +1 = direito.
function Arm({
  ox,
  oy,
  dir,
  reacting,
  children,
}: {
  ox: number
  oy: number
  dir: -1 | 1
  reacting: boolean
  children: React.ReactNode
}) {
  return (
    <motion.g
      style={{ transformOrigin: `${ox}px ${oy}px`, transformBox: "view-box" }}
      animate={reacting ? { rotate: [0, dir * 32, dir * 14, dir * 30, 0] } : { rotate: 0 }}
      transition={
        reacting
          ? { duration: 0.85, ease: "easeInOut" }
          : { type: "spring", stiffness: 200, damping: 16 }
      }
    >
      {children}
    </motion.g>
  )
}

// ── Arte por fase (silhuetas fofas + olhos/esfera animados; braços acenam) ──

function BabyArt({
  uid,
  mood,
  speaking,
  reacting,
}: {
  uid: string
  mood: Mood
  speaking: boolean
  reacting: boolean
}) {
  const m = STAGE_META.baby
  return (
    <>
      <Defs uid={uid} body={["#ffffff", "#eaf9ff", "#d2f1ff"]} />
      <Aura uid={uid} cx={80} cy={84} r={74} intensity={mood.aura} dur={mood.coreDur * 1.6} />
      <ellipse cx={80} cy={154} rx={36} ry={6} fill="rgba(20,90,130,0.12)" />
      <circle cx={80} cy={78} r={68} fill={`url(#${uid}-body)`} />
      <circle cx={80} cy={78} r={68} fill="none" stroke="#bfe9fb" strokeWidth={1.5} opacity={0.6} />
      <ellipse cx={55} cy={50} rx={20} ry={13} fill="#ffffff" opacity={0.35} transform="rotate(-20 55 50)" />
      <Arm ox={28} oy={86} dir={-1} reacting={reacting}>
        <ellipse cx={15} cy={88} rx={12} ry={9} fill={`url(#${uid}-body)`} />
      </Arm>
      <Arm ox={132} oy={86} dir={1} reacting={reacting}>
        <ellipse cx={145} cy={88} rx={12} ry={9} fill={`url(#${uid}-body)`} />
      </Arm>
      <ellipse cx={38} cy={92} rx={10} ry={6} fill={BLUSH} opacity={0.32} />
      <ellipse cx={122} cy={92} rx={10} ry={6} fill={BLUSH} opacity={0.32} />
      <Eyes uid={uid} lx={m.eyes.lx} rx={m.eyes.rx} cy={m.eyes.cy} r={m.eyes.r} mood={mood} />
      <ChestCore uid={uid} cx={m.core.cx} cy={m.core.cy} r={m.core.r} mood={mood} speaking={speaking} />
    </>
  )
}

function TeenArt({
  uid,
  mood,
  speaking,
  reacting,
}: {
  uid: string
  mood: Mood
  speaking: boolean
  reacting: boolean
}) {
  const m = STAGE_META.teen
  return (
    <>
      <Defs uid={uid} body={["#ffffff", "#eaf9ff", "#cfeeff"]} />
      <Aura uid={uid} cx={85} cy={106} r={84} intensity={mood.aura} dur={mood.coreDur * 1.6} />
      <ellipse cx={85} cy={192} rx={40} ry={6} fill="rgba(20,90,130,0.12)" />

      {/* antena fofa com ponta brilhante */}
      <path d="M 85 64 Q 76 44 92 34" fill="none" stroke="#bfe9fb" strokeWidth={5} strokeLinecap="round" />
      <circle cx={93} cy={32} r={6} fill={EYE_COLOR} filter={`url(#${uid}-glow)`} />
      <circle cx={93} cy={32} r={3} fill="#ffffff" />

      {/* perninhas */}
      <rect x={66} y={166} width={18} height={28} rx={9} fill="#d6f3ff" />
      <rect x={86} y={166} width={18} height={28} rx={9} fill="#d6f3ff" />

      {/* bracinhos relaxados (acenam ao toque) */}
      <Arm ox={36} oy={108} dir={-1} reacting={reacting}>
        <ellipse cx={30} cy={126} rx={12} ry={22} fill={`url(#${uid}-body)`} transform="rotate(10 30 126)" />
        <circle cx={27} cy={147} r={9} fill={`url(#${uid}-body)`} />
      </Arm>
      <Arm ox={134} oy={108} dir={1} reacting={reacting}>
        <ellipse cx={140} cy={126} rx={12} ry={22} fill={`url(#${uid}-body)`} transform="rotate(-10 140 126)" />
        <circle cx={143} cy={147} r={9} fill={`url(#${uid}-body)`} />
      </Arm>

      {/* corpo (ovo) */}
      <ellipse cx={85} cy={116} rx={50} ry={56} fill={`url(#${uid}-body)`} />
      <ellipse cx={85} cy={116} rx={50} ry={56} fill="none" stroke="#bfe9fb" strokeWidth={1.5} opacity={0.6} />
      <ellipse cx={64} cy={88} rx={16} ry={10} fill="#ffffff" opacity={0.45} transform="rotate(-20 64 88)" />

      {/* blush */}
      <ellipse cx={56} cy={120} rx={10} ry={6} fill={BLUSH} opacity={0.34} />
      <ellipse cx={114} cy={120} rx={10} ry={6} fill={BLUSH} opacity={0.34} />

      <Eyes uid={uid} lx={m.eyes.lx} rx={m.eyes.rx} cy={m.eyes.cy} r={m.eyes.r} mood={mood} />
      <ChestCore uid={uid} cx={m.core.cx} cy={m.core.cy} r={m.core.r} mood={mood} speaking={speaking} />
    </>
  )
}

function AdultArt({
  uid,
  mood,
  speaking,
  reacting,
}: {
  uid: string
  mood: Mood
  speaking: boolean
  reacting: boolean
}) {
  const m = STAGE_META.adult
  return (
    <>
      <Defs uid={uid} body={["#ffffff", "#e6f6ff", "#c4ebfb"]} />
      <Aura uid={uid} cx={110} cy={124} r={98} intensity={mood.aura} dur={mood.coreDur * 1.6} />
      <ellipse cx={110} cy={202} rx={56} ry={7} fill="rgba(20,90,130,0.13)" />

      {/* perninhas curtas e firmes */}
      <rect x={80} y={176} width={24} height={28} rx={11} fill="#cfeefb" />
      <rect x={116} y={176} width={24} height={28} rx={11} fill="#cfeefb" />

      {/* braços + mãos-luva grandes (acenam ao toque) */}
      <Arm ox={50} oy={124} dir={-1} reacting={reacting}>
        <ellipse cx={44} cy={138} rx={14} ry={20} fill={`url(#${uid}-body)`} transform="rotate(8 44 138)" />
        <circle cx={30} cy={154} r={18} fill={`url(#${uid}-body)`} />
        <circle cx={30} cy={154} r={18} fill="none" stroke="#bfe9fb" strokeWidth={1.3} opacity={0.6} />
      </Arm>
      <Arm ox={170} oy={124} dir={1} reacting={reacting}>
        <ellipse cx={176} cy={138} rx={14} ry={20} fill={`url(#${uid}-body)`} transform="rotate(-8 176 138)" />
        <circle cx={190} cy={154} r={18} fill={`url(#${uid}-body)`} />
        <circle cx={190} cy={154} r={18} fill="none" stroke="#bfe9fb" strokeWidth={1.3} opacity={0.6} />
      </Arm>

      {/* corpo largo e fofo */}
      <ellipse cx={110} cy={124} rx={74} ry={60} fill={`url(#${uid}-body)`} />
      <ellipse cx={110} cy={124} rx={74} ry={60} fill="none" stroke="#bfe9fb" strokeWidth={1.5} opacity={0.6} />
      <ellipse cx={82} cy={92} rx={22} ry={12} fill="#ffffff" opacity={0.4} transform="rotate(-20 82 92)" />

      {/* blush */}
      <ellipse cx={70} cy={132} rx={11} ry={6.5} fill={BLUSH} opacity={0.32} />
      <ellipse cx={150} cy={132} rx={11} ry={6.5} fill={BLUSH} opacity={0.32} />

      <Eyes uid={uid} lx={m.eyes.lx} rx={m.eyes.rx} cy={m.eyes.cy} r={m.eyes.r} mood={mood} />
      <ChestCore uid={uid} cx={m.core.cx} cy={m.core.cy} r={m.core.r} mood={mood} speaking={speaking} />
    </>
  )
}

function EliteArt({
  uid,
  mood,
  speaking,
  reacting,
}: {
  uid: string
  mood: Mood
  speaking: boolean
  reacting: boolean
}) {
  const m = STAGE_META.elite
  return (
    <>
      <Defs uid={uid} body={["#eafdff", "#bdf0ff", "#74d8f2"]} />
      <Aura uid={uid} cx={110} cy={140} r={112} intensity={Math.max(mood.aura, 0.5)} dur={mood.coreDur * 1.5} />
      <ellipse cx={110} cy={230} rx={56} ry={8} fill="rgba(15,80,120,0.18)" />

      {/* capinha fofa (atrás do corpo) */}
      <path d="M 72 118 Q 40 168 54 220 Q 110 206 166 220 Q 180 168 148 118 Z" fill="#49c1e6" />
      <path d="M 84 122 Q 60 162 70 206 Q 110 196 150 206 Q 160 162 136 122 Z" fill="#7fdcff" opacity={0.55} />

      {/* perninhas */}
      <rect x={86} y={190} width={22} height={28} rx={10} fill={`url(#${uid}-body)`} />
      <rect x={112} y={190} width={22} height={28} rx={10} fill={`url(#${uid}-body)`} />

      {/* bracinhos (acenam ao toque) */}
      <Arm ox={54} oy={132} dir={-1} reacting={reacting}>
        <ellipse cx={50} cy={150} rx={13} ry={24} fill={`url(#${uid}-body)`} transform="rotate(8 50 150)" />
        <circle cx={45} cy={174} r={11} fill={`url(#${uid}-body)`} />
      </Arm>
      <Arm ox={166} oy={132} dir={1} reacting={reacting}>
        <ellipse cx={170} cy={150} rx={13} ry={24} fill={`url(#${uid}-body)`} transform="rotate(-8 170 150)" />
        <circle cx={175} cy={174} r={11} fill={`url(#${uid}-body)`} />
      </Arm>

      {/* corpo */}
      <ellipse cx={110} cy={140} rx={56} ry={58} fill={`url(#${uid}-body)`} />
      <ellipse cx={110} cy={140} rx={56} ry={58} fill="none" stroke={EYE_COLOR} strokeWidth={1.5} opacity={0.5} />
      <ellipse cx={90} cy={114} rx={18} ry={11} fill="#ffffff" opacity={0.4} transform="rotate(-20 90 114)" />

      {/* blush */}
      <ellipse cx={82} cy={146} rx={10} ry={6} fill={BLUSH} opacity={0.3} />
      <ellipse cx={138} cy={146} rx={10} ry={6} fill={BLUSH} opacity={0.3} />

      <Eyes uid={uid} lx={m.eyes.lx} rx={m.eyes.rx} cy={m.eyes.cy} r={m.eyes.r} mood={mood} />
      <ChestCore uid={uid} cx={m.core.cx} cy={m.core.cy} r={m.core.r} mood={mood} speaking={speaking} />

      {/* coroa flutuante fofa */}
      <g filter={`url(#${uid}-glow)`}>
        <path
          d="M 92 80 L 92 62 L 102 72 L 110 58 L 118 72 L 128 62 L 128 80 Z"
          fill={EYE_GLOW}
          stroke={EYE_COLOR}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <circle cx={110} cy={58} r={3} fill="#ffffff" />
      </g>

      {/* brilhos */}
      <Sparkles pts={[[52, 96, 6], [168, 100, 5], [110, 44, 5]]} color={EYE_GLOW} />
    </>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────

export function GutoVividAvatar({
  evolution = "baby",
  emotion = "default",
  size = "lg",
  px,
  isActive = true,
  isSpeaking = false,
  showPlatform = false,
  className,
  onTap,
}: GutoVividAvatarProps) {
  const meta = STAGE_META[evolution]
  const [vw, vh] = meta.view

  // Reação ao toque: pulinho + braços acenam + olhos felizes + esfera brilha.
  const [reacting, setReacting] = useState(false)
  const reactTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (reactTimer.current) clearTimeout(reactTimer.current) }, [])

  const handleClick = () => {
    onTap?.()
    setReacting(true)
    if (reactTimer.current) clearTimeout(reactTimer.current)
    reactTimer.current = setTimeout(() => setReacting(false), 950)
  }

  // Durante a reação, usa o humor "reward" (olhos felizes + esfera forte).
  const mood = reacting ? MOODS.reward : MOODS[emotion]
  // ID único por instância — evita colisão de <defs> na mesma página.
  const uid = `gv-${evolution}-${emotion}-${size}`

  const art = (() => {
    switch (evolution) {
      case "baby":
        return <BabyArt uid={uid} mood={mood} speaking={isSpeaking} reacting={reacting} />
      case "teen":
        return <TeenArt uid={uid} mood={mood} speaking={isSpeaking} reacting={reacting} />
      case "adult":
        return <AdultArt uid={uid} mood={mood} speaking={isSpeaking} reacting={reacting} />
      case "elite":
        return <EliteArt uid={uid} mood={mood} speaking={isSpeaking} reacting={reacting} />
    }
  })()

  return (
    <div
      className={cn("relative flex select-none flex-col items-center justify-center", className)}
      onClick={handleClick}
      role="img"
      aria-label={`GUTO ${evolution} — ${emotion}`}
      data-guto-vivid-avatar
      data-stage={evolution}
      data-emotion={emotion}
    >
      <div
        className={cn("relative", px ? "" : sizeClasses[size])}
        style={{
          ...(px ? { width: px, height: px } : null),
          opacity: isActive ? 1 : 0.5,
          transition: "opacity 0.4s ease",
          cursor: "pointer",
        }}
      >
        <svg
          viewBox={`0 0 ${vw} ${vh}`}
          width="100%"
          height="100%"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: "block", overflow: "visible" }}
        >
          <motion.g
            style={{ transformOrigin: `${vw / 2}px ${meta.ground}px`, transformBox: "view-box" }}
            animate={{ scale: [1, 1 + mood.breathAmp, 1], y: [0, -3, 0] }}
            transition={{ duration: mood.breathDur, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* pulinho de comemoração ao toque */}
            <motion.g
              style={{ transformOrigin: `${vw / 2}px ${meta.ground}px`, transformBox: "view-box" }}
              animate={
                reacting
                  ? { y: [0, -16, 0, -7, 0], scaleX: [1, 1.06, 0.96, 1.02, 1], scaleY: [1, 0.94, 1.05, 0.98, 1] }
                  : { y: 0, scaleX: 1, scaleY: 1 }
              }
              transition={reacting ? { duration: 0.9, ease: "easeOut" } : { duration: 0.3 }}
            >
              {art}
            </motion.g>
            {reacting && (
              <Sparkles
                pts={[
                  [vw * 0.18, vh * 0.34, 6],
                  [vw * 0.82, vh * 0.34, 6],
                  [vw * 0.5, vh * 0.12, 6],
                  [vw * 0.26, vh * 0.6, 5],
                  [vw * 0.74, vh * 0.6, 5],
                ]}
                color={EYE_GLOW}
              />
            )}
          </motion.g>
        </svg>
      </div>

      {showPlatform && (
        <div className="relative mt-[-0.5rem] flex w-full max-w-[10.5rem] items-center justify-center">
          <div className="absolute h-10 w-[72%] rounded-full bg-[radial-gradient(circle,rgba(82,231,255,0.16)_0%,rgba(82,231,255,0)_76%)] blur-xl" />
          <div className="relative h-4 w-[72%] rounded-full border border-white/80 bg-white/80 shadow-[inset_0_2px_8px_rgba(82,231,255,0.18)]" />
        </div>
      )}
    </div>
  )
}

export default GutoVividAvatar
