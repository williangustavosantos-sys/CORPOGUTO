"use client"

/**
 * GutoCssAvatar — PROTÓTIPO ISOLADO (não integrado na tela principal)
 *
 * Novo avatar do GUTO desenhado 100% em SVG + CSS + Framer Motion leve.
 * NÃO usa vídeo, NÃO usa GIF, NÃO carrega nenhum asset de /public.
 * NÃO substitui o avatar de produção (GutoOfficialAvatar / GutoAvatarController).
 *
 * Mantém a identidade visual do GUTO: cápsula/robô, olhos azuis e núcleo
 * azul pulsante. As 4 fases de evolução (baby → teen → adult → elite) só
 * mudam proporções e acabamentos; os olhos azuis nunca mudam de cor.
 *
 * Tipos próprios e locais de propósito (decoupling total). `GutoCssAvatarStage`
 * é estruturalmente igual a `EvolutionStage` de `@/types/contract`, mas não
 * importamos nada da produção para manter o protótipo isolado.
 *
 * Este componente não lê XP nem `memory`. Quem for integrá-lo no futuro deve
 * derivar `stage` a partir de `resolveGutoEvolutionStage(memory.totalXp)`.
 */

import { motion } from "framer-motion"

export type GutoCssAvatarStage = "baby" | "teen" | "adult" | "elite"

export type GutoCssAvatarState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "happy"
  | "resting"

interface GutoCssAvatarProps {
  stage: GutoCssAvatarStage
  /** Estado de animação. Default: "idle". */
  state?: GutoCssAvatarState
  /** Lado do quadrado em px. Default: 220. */
  size?: number
  className?: string
}

// ── Identidade visual fixa do GUTO ──────────────────────────────────────────
const EYE_COLOR = "#7DD3FC" // azul-claro dos olhos (nunca muda entre fases)
const EYE_GLOW = "#38BDF8"
const CORE_COLOR = "#3B82F6" // núcleo azul

// ── Configuração por fase de evolução ───────────────────────────────────────
type StageConfig = {
  headW: number
  headH: number
  eyeR: number
  eyeGap: number
  torsoW: number
  torsoH: number
  accent: string // brilho de borda / núcleo / detalhes (mantém família azul)
  antennaH: number
  ball: number
  crown: boolean
  shoulders: boolean
  glow: number
}

const STAGE_CONFIG: Record<GutoCssAvatarStage, StageConfig> = {
  baby: {
    headW: 118, headH: 104, eyeR: 13, eyeGap: 26,
    torsoW: 90, torsoH: 78, accent: "#7DD3FC",
    antennaH: 28, ball: 7, crown: false, shoulders: false, glow: 0.5,
  },
  teen: {
    headW: 116, headH: 114, eyeR: 11.5, eyeGap: 25,
    torsoW: 102, torsoH: 92, accent: "#38BDF8",
    antennaH: 30, ball: 6, crown: false, shoulders: true, glow: 0.68,
  },
  adult: {
    headW: 122, headH: 118, eyeR: 11, eyeGap: 27,
    torsoW: 118, torsoH: 100, accent: "#22D3EE",
    antennaH: 22, ball: 5.5, crown: false, shoulders: true, glow: 0.84,
  },
  elite: {
    headW: 126, headH: 120, eyeR: 11.5, eyeGap: 28,
    torsoW: 126, torsoH: 104, accent: "#5EEAD4",
    antennaH: 18, ball: 5.5, crown: true, shoulders: true, glow: 1,
  },
}

// ── Parâmetros de animação por estado ───────────────────────────────────────
type StateParams = {
  breathDur: number
  breathAmp: number
  headBob: number
  coreDur: number
  coreScale: number
  coreMin: number
  eyeOpen: number // escala vertical base dos olhos (atenção)
  blink: boolean
  lookUp: boolean
  happyEyes: boolean
  speaking: boolean
}

const STATE_PARAMS: Record<GutoCssAvatarState, StateParams> = {
  idle: {
    breathDur: 3.8, breathAmp: 0.02, headBob: 0,
    coreDur: 2.6, coreScale: 1.12, coreMin: 0.7,
    eyeOpen: 1, blink: true, lookUp: false, happyEyes: false, speaking: false,
  },
  listening: {
    breathDur: 3.2, breathAmp: 0.024, headBob: 0,
    coreDur: 1.9, coreScale: 1.18, coreMin: 0.78,
    eyeOpen: 1.2, blink: true, lookUp: false, happyEyes: false, speaking: false,
  },
  thinking: {
    breathDur: 3.4, breathAmp: 0.018, headBob: 0,
    coreDur: 0.95, coreScale: 1.24, coreMin: 0.82,
    eyeOpen: 0.9, blink: true, lookUp: true, happyEyes: false, speaking: false,
  },
  speaking: {
    breathDur: 2.6, breathAmp: 0.03, headBob: 1.8,
    coreDur: 1.4, coreScale: 1.2, coreMin: 0.8,
    eyeOpen: 1.04, blink: true, lookUp: false, happyEyes: false, speaking: true,
  },
  happy: {
    breathDur: 2.4, breathAmp: 0.045, headBob: 1.2,
    coreDur: 1.1, coreScale: 1.3, coreMin: 0.85,
    eyeOpen: 1, blink: false, lookUp: false, happyEyes: true, speaking: false,
  },
  resting: {
    breathDur: 5, breathAmp: 0.014, headBob: 0,
    coreDur: 3.6, coreScale: 1.06, coreMin: 0.55,
    eyeOpen: 0.16, blink: false, lookUp: false, happyEyes: false, speaking: false,
  },
}

const VIEW = 240

export function GutoCssAvatar({
  stage,
  state = "idle",
  size = 220,
  className,
}: GutoCssAvatarProps) {
  const cfg = STAGE_CONFIG[stage]
  const p = STATE_PARAMS[state]

  const cx = VIEW / 2
  const headTop = 44
  const headLeft = cx - cfg.headW / 2
  const headCenterY = headTop + cfg.headH / 2
  const eyeCY = headTop + cfg.headH * 0.52
  const eyeLeftX = cx - cfg.eyeGap
  const eyeRightX = cx + cfg.eyeGap

  const torsoTop = headTop + cfg.headH - 12
  const torsoLeft = cx - cfg.torsoW / 2
  const coreCY = torsoTop + cfg.torsoH * 0.46
  const coreR = cfg.torsoW * 0.13

  const antennaTopY = headTop - cfg.antennaH

  // IDs únicos por fase para não colidir defs entre instâncias na mesma página.
  const uid = `guto-css-${stage}`

  return (
    <div
      className={className}
      style={{ width: size, height: size, display: "inline-block", lineHeight: 0 }}
      role="img"
      aria-label={`GUTO ${stage} — ${state}`}
      data-guto-css-avatar
      data-stage={stage}
      data-state={state}
    >
      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id={`${uid}-body`} cx="50%" cy="34%" r="75%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="55%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0b1220" />
          </radialGradient>
          <radialGradient id={`${uid}-eye`} cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="35%" stopColor={EYE_COLOR} />
            <stop offset="100%" stopColor={EYE_GLOW} />
          </radialGradient>
          <radialGradient id={`${uid}-core`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#DBEAFE" />
            <stop offset="45%" stopColor={CORE_COLOR} />
            <stop offset="100%" stopColor="#1E3A8A" />
          </radialGradient>
          <filter id={`${uid}-glow`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* halo de fundo — intensidade cresce com a fase */}
        <motion.circle
          cx={cx}
          cy={headCenterY + 18}
          r={cfg.headW * 0.86}
          fill={cfg.accent}
          style={{ transformOrigin: "center", transformBox: "fill-box" }}
          animate={{ opacity: [0.05 * cfg.glow, 0.14 * cfg.glow, 0.05 * cfg.glow] }}
          transition={{ duration: p.coreDur * 1.6, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* GRUPO RESPIRAÇÃO + BOB — toda a figura sobe/desce e respira de leve */}
        <motion.g
          style={{ transformOrigin: `${cx}px ${torsoTop}px`, transformBox: "view-box" }}
          animate={{
            scale: [1, 1 + p.breathAmp, 1],
            y: p.headBob ? [0, -p.headBob, 0] : 0,
          }}
          transition={{ duration: p.breathDur, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* sombra/plataforma sutil sob o avatar */}
          <ellipse
            cx={cx}
            cy={torsoTop + cfg.torsoH + 10}
            rx={cfg.torsoW * 0.5}
            ry={9}
            fill="#000000"
            opacity={0.28}
          />

          {/* antena + luz */}
          <line
            x1={cx}
            y1={headTop + 6}
            x2={cx}
            y2={antennaTopY + cfg.ball}
            stroke="#475569"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <motion.circle
            cx={cx}
            cy={antennaTopY}
            r={cfg.ball}
            fill={cfg.accent}
            filter={`url(#${uid}-glow)`}
            style={{ transformOrigin: "center", transformBox: "fill-box" }}
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{ duration: p.coreDur, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* coroa/halo da fase elite */}
          {cfg.crown && (
            <path
              d={`M ${cx - 26} ${headTop + 4} L ${cx - 14} ${headTop - 14} L ${cx} ${headTop - 2} L ${cx + 14} ${headTop - 14} L ${cx + 26} ${headTop + 4} Z`}
              fill={cfg.accent}
              opacity={0.9}
              filter={`url(#${uid}-glow)`}
            />
          )}

          {/* torso */}
          <rect
            x={torsoLeft}
            y={torsoTop}
            width={cfg.torsoW}
            height={cfg.torsoH}
            rx={cfg.torsoW * 0.3}
            fill={`url(#${uid}-body)`}
            stroke={cfg.accent}
            strokeOpacity={0.35}
            strokeWidth={1.5}
          />

          {/* ombros/detalhes laterais (teen+) */}
          {cfg.shoulders && (
            <>
              <rect
                x={torsoLeft - 10}
                y={torsoTop + 8}
                width={16}
                height={cfg.torsoH * 0.42}
                rx={8}
                fill="#1e293b"
                stroke={cfg.accent}
                strokeOpacity={0.3}
                strokeWidth={1}
              />
              <rect
                x={torsoLeft + cfg.torsoW - 6}
                y={torsoTop + 8}
                width={16}
                height={cfg.torsoH * 0.42}
                rx={8}
                fill="#1e293b"
                stroke={cfg.accent}
                strokeOpacity={0.3}
                strokeWidth={1}
              />
            </>
          )}

          {/* núcleo azul pulsante */}
          <motion.circle
            cx={cx}
            cy={coreCY}
            r={coreR}
            fill={`url(#${uid}-core)`}
            filter={`url(#${uid}-glow)`}
            style={{ transformOrigin: "center", transformBox: "fill-box" }}
            animate={{
              scale: [1, p.coreScale, 1],
              opacity: [p.coreMin, 1, p.coreMin],
            }}
            transition={{ duration: p.coreDur, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* cabeça/cápsula */}
          <rect
            x={headLeft}
            y={headTop}
            width={cfg.headW}
            height={cfg.headH}
            rx={cfg.headW * 0.42}
            fill={`url(#${uid}-body)`}
            stroke={cfg.accent}
            strokeOpacity={0.4}
            strokeWidth={1.5}
          />

          {/* visor escuro da face */}
          <rect
            x={headLeft + cfg.headW * 0.13}
            y={headTop + cfg.headH * 0.22}
            width={cfg.headW * 0.74}
            height={cfg.headH * 0.56}
            rx={cfg.headW * 0.3}
            fill="#0a0f1c"
            opacity={0.85}
          />

          {/* OLHOS — atenção (eyeOpen) é a escala externa que transiciona com o estado */}
          <motion.g
            style={{ transformOrigin: `${cx}px ${eyeCY}px`, transformBox: "view-box" }}
            animate={{ scaleY: p.eyeOpen }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
          >
            {/* piscar — escala vertical em loop determinístico */}
            <motion.g
              style={{ transformOrigin: `${cx}px ${eyeCY}px`, transformBox: "view-box" }}
              animate={p.blink ? { scaleY: [1, 1, 0.1, 1, 1] } : { scaleY: 1 }}
              transition={
                p.blink
                  ? {
                      duration: 4.2,
                      times: [0, 0.9, 0.94, 0.98, 1],
                      repeat: Infinity,
                      ease: "easeInOut",
                    }
                  : { duration: 0.3 }
              }
            >
              {/* olhos redondos (idle/listening/thinking/speaking/resting) */}
              <g style={{ opacity: p.happyEyes ? 0 : 1 }}>
                <motion.ellipse
                  cx={eyeLeftX}
                  cy={eyeCY}
                  rx={cfg.eyeR}
                  ry={cfg.eyeR}
                  fill={`url(#${uid}-eye)`}
                  filter={`url(#${uid}-glow)`}
                  animate={{ y: p.lookUp ? -cfg.eyeR * 0.35 : 0 }}
                  transition={{ type: "spring", stiffness: 180, damping: 18 }}
                />
                <motion.ellipse
                  cx={eyeRightX}
                  cy={eyeCY}
                  rx={cfg.eyeR}
                  ry={cfg.eyeR}
                  fill={`url(#${uid}-eye)`}
                  filter={`url(#${uid}-glow)`}
                  animate={{ y: p.lookUp ? -cfg.eyeR * 0.35 : 0 }}
                  transition={{ type: "spring", stiffness: 180, damping: 18 }}
                />
              </g>

              {/* olhos felizes (happy) — arcos ^ ^ */}
              <g
                style={{ opacity: p.happyEyes ? 1 : 0 }}
                stroke={EYE_COLOR}
                strokeWidth={cfg.eyeR * 0.7}
                strokeLinecap="round"
                fill="none"
                filter={`url(#${uid}-glow)`}
              >
                <path
                  d={`M ${eyeLeftX - cfg.eyeR} ${eyeCY + cfg.eyeR * 0.4} Q ${eyeLeftX} ${eyeCY - cfg.eyeR} ${eyeLeftX + cfg.eyeR} ${eyeCY + cfg.eyeR * 0.4}`}
                />
                <path
                  d={`M ${eyeRightX - cfg.eyeR} ${eyeCY + cfg.eyeR * 0.4} Q ${eyeRightX} ${eyeCY - cfg.eyeR} ${eyeRightX + cfg.eyeR} ${eyeCY + cfg.eyeR * 0.4}`}
                />
              </g>
            </motion.g>
          </motion.g>

          {/* boca — micro movimento ao falar; linha discreta nos demais estados */}
          <motion.rect
            x={cx - cfg.eyeR}
            y={eyeCY + cfg.headH * 0.22}
            width={cfg.eyeR * 2}
            height={4}
            rx={2}
            fill={EYE_GLOW}
            opacity={p.speaking ? 0.95 : 0.4}
            style={{ transformOrigin: `${cx}px ${eyeCY + cfg.headH * 0.22}px`, transformBox: "view-box" }}
            animate={p.speaking ? { scaleY: [0.4, 1.8, 0.6, 1.4, 0.4] } : { scaleY: 0.6 }}
            transition={
              p.speaking
                ? { duration: 0.62, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.3 }
            }
          />
        </motion.g>
      </svg>
    </div>
  )
}

export default GutoCssAvatar
