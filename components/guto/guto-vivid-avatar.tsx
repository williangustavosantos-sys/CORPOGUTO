"use client"

/**
 * GutoVividAvatar — AMOSTRA ISOLADA (não integrada na tela principal)
 *
 * Novo avatar do GUTO desenhado 100% em SVG + Framer Motion, no estilo
 * "claro/branco-azul, heróico" enviado pelo usuário (baby bolinha → teen
 * moicano → adult bigode → elite super-herói).
 *
 * NÃO usa vídeo, NÃO usa GIF, NÃO carrega asset de /public.
 * NÃO substitui o avatar de produção (GutoOfficialAvatar / GutoAvatarController)
 * nem é usado por nenhum fluxo (chat/treino/dieta/XP). Existe só para a página
 * de amostra /dev/avatar-novo.
 *
 * Identidade GUTO preservada e alinhada ao app: olhos/núcleo no ciano oficial
 * (#52e7ff). As 4 fases mudam silhueta/acabamento; os olhos azuis nunca mudam
 * de cor.
 *
 * Determinístico de propósito: nenhuma animação usa Math.random/Date.now, então
 * o render é estável em SSR e não causa mismatch de hidratação no Next.
 */

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
const BROW = "#5aa6c2" // traço suave azul-acinzentado
const BLUSH = "#ff9fb6"
const HAIR = "#7fceea" // contorno do cabelo branco (visível no fundo claro do app)
const HAIR_FILL = "#f2fbff"

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

// ── Metadados por fase (posições derivadas dos desenhos enviados) ───────────
type StageMeta = {
  view: [number, number]
  eyes: { lx: number; rx: number; cy: number; r: number }
  core: { cx: number; cy: number; r: number }
  browY: number | null // null = fase sem sobrancelha (baby)
  ground: number // y do chão (origem da respiração)
}

const STAGE_META: Record<GutoVividStage, StageMeta> = {
  baby: {
    view: [160, 160],
    eyes: { lx: 57, rx: 103, cy: 72, r: 16 },
    core: { cx: 80, cy: 112, r: 13 },
    browY: null,
    ground: 154,
  },
  teen: {
    view: [180, 230],
    eyes: { lx: 67, rx: 113, cy: 78, r: 17 },
    core: { cx: 90, cy: 148, r: 17 },
    browY: 52,
    ground: 222,
  },
  adult: {
    view: [200, 260],
    eyes: { lx: 75, rx: 125, cy: 84, r: 19 },
    core: { cx: 100, cy: 162, r: 20 },
    browY: 56,
    ground: 252,
  },
  elite: {
    view: [220, 290],
    eyes: { lx: 82, rx: 138, cy: 84, r: 20 },
    core: { cx: 110, cy: 168, r: 24 },
    browY: 58,
    ground: 284,
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
      <radialGradient id={`${uid}-core`} cx="48%" cy="44%" r="60%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="45%" stopColor={EYE_GLOW} />
        <stop offset="100%" stopColor={EYE_COLOR} />
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

function Brows({
  lx,
  rx,
  y,
  r,
  emotion,
  dy,
}: {
  lx: number
  rx: number
  y: number
  r: number
  emotion: GutoVividEmotion
  dy: number
}) {
  // Forma das sobrancelhas por emoção. Cada lado é um traço curto.
  const w = r * 0.95
  let left: string
  let right: string
  if (emotion === "super") {
    // bravo: cantos internos para baixo (V)
    left = `M ${lx - w} ${y - 3} Q ${lx} ${y + 3} ${lx + w} ${y + 4}`
    right = `M ${rx - w} ${y + 4} Q ${rx} ${y + 3} ${rx + w} ${y - 3}`
  } else if (emotion === "critical") {
    // preocupado: cantos internos para cima
    left = `M ${lx - w} ${y + 4} Q ${lx} ${y - 2} ${lx + w} ${y + 1}`
    right = `M ${rx - w} ${y + 1} Q ${rx} ${y - 2} ${rx + w} ${y + 4}`
  } else if (emotion === "alert") {
    // surpreso: arqueado para cima
    left = `M ${lx - w} ${y + 1} Q ${lx} ${y - 6} ${lx + w} ${y}`
    right = `M ${rx - w} ${y} Q ${rx} ${y - 6} ${rx + w} ${y + 1}`
  } else {
    // neutro/feliz
    left = `M ${lx - w} ${y + 1} Q ${lx} ${y - 3} ${lx + w} ${y}`
    right = `M ${rx - w} ${y} Q ${rx} ${y - 3} ${rx + w} ${y + 1}`
  }
  return (
    <g
      transform={`translate(0 ${dy})`}
      stroke={BROW}
      strokeWidth={r * 0.16}
      strokeLinecap="round"
      fill="none"
    >
      <path d={left} />
      <path d={right} />
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
      <circle cx={cx} cy={cy} r={r} fill="#d6f3ff" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={EYE_COLOR} strokeWidth={1.2} opacity={0.5} />
      <motion.circle
        cx={cx}
        cy={cy}
        r={r * 0.76}
        fill={`url(#${uid}-core)`}
        filter={`url(#${uid}-glow)`}
        style={{ transformOrigin: `${cx}px ${cy}px`, transformBox: "view-box" }}
        animate={{ scale: [1, mood.coreScale, 1], opacity: [mood.coreMin, 1, mood.coreMin] }}
        transition={{ duration: dur, repeat: Infinity, ease: "easeInOut" }}
      />
      <circle cx={cx} cy={cy} r={r * 0.42} fill={EYE_GLOW} />
      <circle cx={cx} cy={cy} r={r * 0.2} fill="#ffffff" />
      {/* anéis de "áudio" quando falando */}
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

// ── Arte por fase (silhueta recolorida + olhos/sobrancelha/núcleo animados) ──

function BabyArt({ uid, mood, speaking }: { uid: string; mood: Mood; speaking: boolean }) {
  const m = STAGE_META.baby
  return (
    <>
      <Defs uid={uid} body={["#ffffff", "#eaf9ff", "#d2f1ff"]} />
      <Aura uid={uid} cx={80} cy={84} r={74} intensity={mood.aura} dur={mood.coreDur * 1.6} />
      <ellipse cx={80} cy={154} rx={36} ry={6} fill="rgba(20,90,130,0.12)" />
      <circle cx={80} cy={78} r={68} fill={`url(#${uid}-body)`} />
      <circle cx={80} cy={78} r={68} fill="none" stroke="#bfe9fb" strokeWidth={1.5} opacity={0.6} />
      <ellipse cx={55} cy={50} rx={20} ry={13} fill="#ffffff" opacity={0.35} transform="rotate(-20 55 50)" />
      <ellipse cx={15} cy={88} rx={12} ry={9} fill={`url(#${uid}-body)`} />
      <ellipse cx={145} cy={88} rx={12} ry={9} fill={`url(#${uid}-body)`} />
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
  emotion,
  speaking,
}: {
  uid: string
  mood: Mood
  emotion: GutoVividEmotion
  speaking: boolean
}) {
  const m = STAGE_META.teen
  return (
    <>
      <Defs uid={uid} body={["#ffffff", "#e4f6ff", "#c9ecfb"]} />
      <Aura uid={uid} cx={90} cy={120} r={92} intensity={mood.aura} dur={mood.coreDur * 1.6} />
      <ellipse cx={90} cy={225} rx={44} ry={6} fill="rgba(20,90,130,0.13)" />
      {/* moicano (contorno ciano p/ destacar do corpo branco) */}
      <path d="M 78 28 Q 82 8 90 4 Q 98 8 102 28 Q 96 20 90 22 Q 84 20 78 28 Z" fill={HAIR_FILL} stroke={HAIR} strokeWidth={1.6} strokeLinejoin="round" />
      <path d="M 70 34 Q 76 12 86 8 Q 80 20 78 28 Z" fill={HAIR_FILL} stroke={HAIR} strokeWidth={1.3} strokeLinejoin="round" />
      <path d="M 110 34 Q 104 12 94 8 Q 100 20 102 28 Z" fill={HAIR_FILL} stroke={HAIR} strokeWidth={1.3} strokeLinejoin="round" />
      <path d="M 64 40 Q 67 22 75 16 Q 72 28 70 34 Z" fill="#f7fdff" stroke={HAIR} strokeWidth={1.1} strokeLinejoin="round" />
      <path d="M 116 40 Q 113 22 105 16 Q 108 28 110 34 Z" fill="#f7fdff" stroke={HAIR} strokeWidth={1.1} strokeLinejoin="round" />
      {/* pernas */}
      <rect x={60} y={194} width={24} height={28} rx={10} fill="#cdeefb" />
      <rect x={96} y={194} width={24} height={28} rx={10} fill="#cdeefb" />
      {/* corpo */}
      <ellipse cx={90} cy={158} rx={52} ry={46} fill={`url(#${uid}-body)`} />
      <path d="M 65 155 Q 90 162 115 155" stroke="#a9def2" strokeWidth={1.5} fill="none" />
      <path d="M 68 168 Q 90 173 112 168" stroke="#a9def2" strokeWidth={1} fill="none" />
      {/* braços */}
      <ellipse cx={34} cy={155} rx={14} ry={26} fill={`url(#${uid}-body)`} transform="rotate(6 34 155)" />
      <ellipse cx={146} cy={155} rx={14} ry={26} fill={`url(#${uid}-body)`} transform="rotate(-6 146 155)" />
      <ellipse cx={30} cy={175} rx={11} ry={10} fill={`url(#${uid}-body)`} />
      <ellipse cx={150} cy={175} rx={11} ry={10} fill={`url(#${uid}-body)`} />
      <circle cx={44} cy={140} r={8} fill="#cdeefb" />
      <circle cx={136} cy={140} r={8} fill="#cdeefb" />
      <ChestCore uid={uid} cx={m.core.cx} cy={m.core.cy} r={m.core.r} mood={mood} speaking={speaking} />
      {/* pescoço + cabeça */}
      <rect x={74} y={100} width={32} height={16} rx={7} fill="#d8f2fc" />
      <ellipse cx={90} cy={82} rx={54} ry={52} fill={`url(#${uid}-body)`} />
      <ellipse cx={65} cy={56} rx={20} ry={12} fill="#ffffff" opacity={0.25} transform="rotate(-25 65 56)" />
      <circle cx={37} cy={82} r={8} fill="#cdeefb" />
      <circle cx={37} cy={82} r={5} fill="#a9def2" />
      <circle cx={143} cy={82} r={8} fill="#cdeefb" />
      <circle cx={143} cy={82} r={5} fill="#a9def2" />
      <ellipse cx={44} cy={92} rx={9} ry={5} fill={BLUSH} opacity={0.25} />
      <ellipse cx={136} cy={92} rx={9} ry={5} fill={BLUSH} opacity={0.25} />
      {m.browY !== null && (
        <Brows lx={m.eyes.lx} rx={m.eyes.rx} y={m.browY} r={m.eyes.r} emotion={emotion} dy={mood.browDy} />
      )}
      <Eyes uid={uid} lx={m.eyes.lx} rx={m.eyes.rx} cy={m.eyes.cy} r={m.eyes.r} mood={mood} />
    </>
  )
}

function AdultArt({
  uid,
  mood,
  emotion,
  speaking,
}: {
  uid: string
  mood: Mood
  emotion: GutoVividEmotion
  speaking: boolean
}) {
  const m = STAGE_META.adult
  return (
    <>
      <Defs uid={uid} body={["#f4fcff", "#dcf3ff", "#bfe7fa"]} />
      <Aura uid={uid} cx={100} cy={130} r={104} intensity={mood.aura} dur={mood.coreDur * 1.6} />
      <ellipse cx={100} cy={255} rx={52} ry={7} fill="rgba(20,90,130,0.14)" />
      {/* cabelo chamas (contorno ciano p/ destacar do corpo branco) */}
      <path d="M 82 28 Q 88 2 100 -2 Q 112 2 118 28 Q 106 14 100 18 Q 94 14 82 28 Z" fill={HAIR_FILL} stroke={HAIR} strokeWidth={1.7} strokeLinejoin="round" />
      <path d="M 70 36 Q 78 6 94 2 Q 86 18 82 28 Z" fill={HAIR_FILL} stroke={HAIR} strokeWidth={1.3} strokeLinejoin="round" />
      <path d="M 130 36 Q 122 6 106 2 Q 114 18 118 28 Z" fill={HAIR_FILL} stroke={HAIR} strokeWidth={1.3} strokeLinejoin="round" />
      <path d="M 60 44 Q 64 18 76 12 Q 72 28 70 36 Z" fill="#f7fdff" stroke={HAIR} strokeWidth={1.1} strokeLinejoin="round" />
      <path d="M 140 44 Q 136 18 124 12 Q 128 28 130 36 Z" fill="#f7fdff" stroke={HAIR} strokeWidth={1.1} strokeLinejoin="round" />
      {/* pernas + botas */}
      <rect x={62} y={216} width={30} height={36} rx={12} fill="#bfe4f6" />
      <rect x={108} y={216} width={30} height={36} rx={12} fill="#bfe4f6" />
      <rect x={60} y={240} width={34} height={12} rx={6} fill="#a6d6ee" />
      <rect x={106} y={240} width={34} height={12} rx={6} fill="#a6d6ee" />
      {/* corpo */}
      <ellipse cx={100} cy={172} rx={64} ry={54} fill={`url(#${uid}-body)`} />
      <path d="M 70 160 L 65 148 L 78 142 L 91 148 L 91 160 L 78 166 Z" fill="#d5effb" opacity={0.7} />
      <path d="M 130 160 L 135 148 L 122 142 L 109 148 L 109 160 L 122 166 Z" fill="#d5effb" opacity={0.7} />
      <path d="M 70 160 Q 100 170 130 160" stroke="#8fd2ee" strokeWidth={2} fill="none" />
      <path d="M 74 175 Q 100 183 126 175" stroke="#8fd2ee" strokeWidth={1.5} fill="none" />
      <path d="M 78 188 Q 100 194 122 188" stroke="#8fd2ee" strokeWidth={1} fill="none" />
      {/* braços fortes */}
      <ellipse cx={28} cy={168} rx={18} ry={32} fill={`url(#${uid}-body)`} transform="rotate(5 28 168)" />
      <ellipse cx={172} cy={168} rx={18} ry={32} fill={`url(#${uid}-body)`} transform="rotate(-5 172 168)" />
      <ellipse cx={24} cy={195} rx={15} ry={13} fill={`url(#${uid}-body)`} />
      <ellipse cx={176} cy={195} rx={15} ry={13} fill={`url(#${uid}-body)`} />
      <ellipse cx={46} cy={150} rx={12} ry={9} fill="#d5effb" transform="rotate(-10 46 150)" />
      <ellipse cx={154} cy={150} rx={12} ry={9} fill="#d5effb" transform="rotate(10 154 150)" />
      <ChestCore uid={uid} cx={m.core.cx} cy={m.core.cy} r={m.core.r} mood={mood} speaking={speaking} />
      {/* pescoço + cabeça */}
      <rect x={82} y={108} width={36} height={18} rx={8} fill="#d3edfa" />
      <ellipse cx={100} cy={88} rx={60} ry={58} fill={`url(#${uid}-body)`} />
      <ellipse cx={72} cy={60} rx={22} ry={13} fill="#ffffff" opacity={0.22} transform="rotate(-25 72 60)" />
      <circle cx={41} cy={88} r={10} fill="#cdeefb" />
      <circle cx={41} cy={88} r={6} fill="#a9def2" />
      <circle cx={159} cy={88} r={10} fill="#cdeefb" />
      <circle cx={159} cy={88} r={6} fill="#a9def2" />
      {m.browY !== null && (
        <Brows lx={m.eyes.lx} rx={m.eyes.rx} y={m.browY} r={m.eyes.r} emotion={emotion} dy={mood.browDy} />
      )}
      <Eyes uid={uid} lx={m.eyes.lx} rx={m.eyes.rx} cy={m.eyes.cy} r={m.eyes.r} mood={mood} />
      {/* bigode */}
      <path d="M 82 106 Q 90 110 100 108" stroke={BROW} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <path d="M 118 106 Q 110 110 100 108" stroke={BROW} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <circle cx={100} cy={108} r={2} fill={BROW} />
    </>
  )
}

function EliteArt({
  uid,
  mood,
  emotion,
  speaking,
}: {
  uid: string
  mood: Mood
  emotion: GutoVividEmotion
  speaking: boolean
}) {
  const m = STAGE_META.elite
  return (
    <>
      <Defs uid={uid} body={["#dff8ff", "#9fe4ff", "#3fb9da"]} />
      <Aura uid={uid} cx={110} cy={150} r={120} intensity={Math.max(mood.aura, 0.4)} dur={mood.coreDur * 1.6} />
      <ellipse cx={110} cy={284} rx={60} ry={8} fill="rgba(15,80,120,0.2)" />
      {/* capa */}
      <path d="M 55 155 Q 30 195 38 240 Q 70 232 110 238 Q 150 232 182 240 Q 190 195 165 155 Z" fill="#2f9ec0" />
      <path d="M 70 160 Q 55 190 60 225 Q 85 220 110 224 Q 135 220 160 225 Q 165 190 150 160 Z" fill="#3fb9da" opacity={0.5} />
      <path d="M 110 160 L 110 235" stroke="#7df0ff" strokeWidth={1} opacity={0.4} />
      {/* pernas */}
      <rect x={70} y={228} width={30} height={42} rx={10} fill="#2f9ec0" />
      <rect x={120} y={228} width={30} height={42} rx={10} fill="#2f9ec0" />
      <rect x={68} y={228} width={34} height={42} rx={10} fill="none" stroke={EYE_COLOR} strokeWidth={1.5} opacity={0.7} />
      <rect x={118} y={228} width={34} height={42} rx={10} fill="none" stroke={EYE_COLOR} strokeWidth={1.5} opacity={0.7} />
      <rect x={68} y={256} width={34} height={14} rx={6} fill="#3fb9da" />
      <rect x={118} y={256} width={34} height={14} rx={6} fill="#3fb9da" />
      {/* corpo armadura */}
      <ellipse cx={110} cy={178} rx={66} ry={56} fill={`url(#${uid}-body)`} />
      <ellipse cx={110} cy={178} rx={66} ry={56} fill="none" stroke={EYE_COLOR} strokeWidth={1.5} opacity={0.5} />
      <path d="M 78 168 L 72 154 L 88 148 L 104 154 L 104 168 L 88 176 Z" fill="#5fcfee" opacity={0.85} />
      <path d="M 142 168 L 148 154 L 132 148 L 116 154 L 116 168 L 132 176 Z" fill="#5fcfee" opacity={0.85} />
      <path d="M 80 185 Q 110 193 140 185" stroke={EYE_COLOR} strokeWidth={2} fill="none" opacity={0.8} />
      <path d="M 84 198 Q 110 205 136 198" stroke={EYE_COLOR} strokeWidth={1.5} fill="none" opacity={0.6} />
      {/* braços */}
      <ellipse cx={34} cy={175} rx={20} ry={36} fill={`url(#${uid}-body)`} transform="rotate(5 34 175)" />
      <ellipse cx={186} cy={175} rx={20} ry={36} fill={`url(#${uid}-body)`} transform="rotate(-5 186 175)" />
      <ellipse cx={28} cy={206} rx={17} ry={15} fill="#2f9ec0" />
      <ellipse cx={192} cy={206} rx={17} ry={15} fill="#2f9ec0" />
      <path d="M 46 148 Q 56 138 68 144 Q 60 152 52 158 Z" fill="#5fcfee" />
      <path d="M 174 148 Q 164 138 152 144 Q 160 152 168 158 Z" fill="#5fcfee" />
      <ChestCore uid={uid} cx={m.core.cx} cy={m.core.cy} r={m.core.r} mood={mood} speaking={speaking} />
      {/* pescoço + capacete */}
      <rect x={92} y={108} width={36} height={20} rx={8} fill="#2f9ec0" />
      <ellipse cx={110} cy={88} rx={62} ry={60} fill={`url(#${uid}-body)`} />
      <ellipse cx={110} cy={88} rx={62} ry={60} fill="none" stroke={EYE_COLOR} strokeWidth={1.5} opacity={0.6} />
      <ellipse cx={49} cy={88} rx={12} ry={14} fill="#2f9ec0" />
      <circle cx={49} cy={88} r={5} fill={EYE_COLOR} opacity={0.85} />
      <ellipse cx={171} cy={88} rx={12} ry={14} fill="#2f9ec0" />
      <circle cx={171} cy={88} r={5} fill={EYE_COLOR} opacity={0.85} />
      {/* chamas azuis */}
      <path d="M 90 26 Q 96 2 110 -4 Q 124 2 130 26 Q 118 10 110 14 Q 102 10 90 26 Z" fill={EYE_GLOW} filter={`url(#${uid}-glow)`} opacity={0.7} />
      <path d="M 90 26 Q 96 2 110 -4 Q 124 2 130 26 Q 118 10 110 14 Q 102 10 90 26 Z" fill={EYE_COLOR} />
      <path d="M 76 34 Q 84 4 100 0 Q 92 18 90 26 Z" fill={EYE_GLOW} opacity={0.9} />
      <path d="M 144 34 Q 136 4 120 0 Q 128 18 130 26 Z" fill={EYE_GLOW} opacity={0.9} />
      <polygon points="110,-2 115,10 110,8 105,10" fill="#dffaff" />
      {m.browY !== null && (
        <Brows lx={m.eyes.lx} rx={m.eyes.rx} y={m.browY} r={m.eyes.r} emotion={emotion} dy={mood.browDy} />
      )}
      <Eyes uid={uid} lx={m.eyes.lx} rx={m.eyes.rx} cy={m.eyes.cy} r={m.eyes.r} mood={mood} />
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
  const mood = MOODS[emotion]
  const [vw, vh] = meta.view
  // ID único por instância+fase+emoção — evita colisão de <defs> na mesma página.
  const uid = `gv-${evolution}-${emotion}-${size}`

  const art = (() => {
    switch (evolution) {
      case "baby":
        return <BabyArt uid={uid} mood={mood} speaking={isSpeaking} />
      case "teen":
        return <TeenArt uid={uid} mood={mood} emotion={emotion} speaking={isSpeaking} />
      case "adult":
        return <AdultArt uid={uid} mood={mood} emotion={emotion} speaking={isSpeaking} />
      case "elite":
        return <EliteArt uid={uid} mood={mood} emotion={emotion} speaking={isSpeaking} />
    }
  })()

  return (
    <div
      className={cn("relative flex select-none flex-col items-center justify-center", className)}
      onClick={onTap}
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
          cursor: onTap ? "pointer" : "default",
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
            {art}
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
