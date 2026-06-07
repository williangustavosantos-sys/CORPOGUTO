"use client"

/**
 * GutoAvatarController — Avatar interativo com 3D spring tilt + toggle super
 *
 * ARQUITETURA:
 * - GutoVividAvatar (SVG vetorial) roda embaixo na emoção "default"
 * - Camada "super" em overlay com crossfade suave — toggle manual (tap entra, tap sai)
 * - Framer Motion spring tilt no toque/drag e giroscópio no mobile
 * - Squish + glow azul + ripple em ambos os taps
 *
 * O efeito 3D vem de CSS perspective + spring physics — dá profundidade e massa ao avatar SVG.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { animate, motion, useMotionValue, useSpring } from "framer-motion"

import { cn } from "@/lib/utils"
import type { EvolutionStage } from "@/types/contract"
import { GutoVividAvatar } from "./guto-vivid-avatar"

interface GutoAvatarControllerProps {
  stage: EvolutionStage
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  showPlatform?: boolean
  onTap?: () => void
  isActive?: boolean
  interactive?: boolean
}

// Duração do crossfade entrada/saída (ms)
const FADE_MS = 320
// Duração do glow/ripple de feedback (ms)
const REACT_MS = 850
// Evita empilhar troca de vídeo/animação com taps repetidos no celular.
const TAP_COOLDOWN_MS = 700
// Máximo de inclinação 3D em graus (toque manual)
const MAX_TILT_DEG = 16
// Máximo de inclinação 3D em graus (giroscópio — mais sutil)
const MAX_GYRO_DEG = 6

const SPRING_CONFIG = { stiffness: 200, damping: 26, mass: 0.7 }

const sizeClasses = {
  sm: "w-24 h-24",
  md: "w-32 h-32",
  lg: "w-40 h-40",
  xl: "w-[min(96vw,34rem)] h-[min(96vw,34rem)]",
}

export function GutoAvatarController({
  stage,
  size = "lg",
  className,
  showPlatform = true,
  onTap,
  isActive = true,
  interactive = true,
}: GutoAvatarControllerProps) {
  const containerRef   = useRef<HTMLDivElement>(null)
  const glowTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const superUnmountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTapAtRef = useRef(0)
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null)

  // Toggle: true = modo super (roupa) ativo
  const [superOn, setSuperOn]       = useState(false)
  // Lazy mount: só renderiza o super após o primeiro tap (economia de CPU na abertura)
  // Permanece montado para que os taps seguintes sejam instantâneos
  const [superMounted, setSuperMounted] = useState(false)
  // Glow/ripple de feedback visual (dispara em ambos os taps)
  const [glowActive, setGlowActive] = useState(false)
  const [gyroActive, setGyroActive] = useState(false)

  // ── Motion values para tilt 3D ──────────────────────────────────────────────
  const rawX  = useMotionValue(0)
  const rawY  = useMotionValue(0)
  const scaleV = useMotionValue(1)
  const tiltX = useSpring(rawX, SPRING_CONFIG)
  const tiltY = useSpring(rawY, SPRING_CONFIG)

  // ── Giroscópio (DeviceOrientation) ──────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!interactive) return
    if (!("DeviceOrientationEvent" in window)) return
    if (window.matchMedia?.("(pointer: coarse)")?.matches) return

    let active = true

    const onOrientation = (e: DeviceOrientationEvent) => {
      if (!active) return
      const gamma = Math.max(-45, Math.min(45, e.gamma ?? 0))
      const beta  = Math.max(-45, Math.min(45, (e.beta ?? 30) - 30))
      rawY.set((gamma / 45) * MAX_GYRO_DEG)
      rawX.set(-(beta  / 45) * MAX_GYRO_DEG)
    }

    window.addEventListener("deviceorientation", onOrientation, { passive: true })
    setGyroActive(true)

    return () => {
      active = false
      window.removeEventListener("deviceorientation", onOrientation)
    }
  }, [interactive, rawX, rawY])

  // ── Tilt por pointer (mouse/touch drag) ─────────────────────────────────────
  const updateTiltFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const relX = ((clientX - rect.left) / rect.width  - 0.5) * 2
      const relY = ((clientY - rect.top)  / rect.height - 0.5) * 2
      rawY.set(relX *  MAX_TILT_DEG)
      rawX.set(relY * -MAX_TILT_DEG)
    },
    [rawX, rawY]
  )

  const resetTilt = useCallback(() => {
    if (!gyroActive) {
      rawX.set(0)
      rawY.set(0)
    }
  }, [gyroActive, rawX, rawY])

  // ── Toggle super ─────────────────────────────────────────────────────────────
  // Tap 1 → super entra com crossfade natural
  // Tap 2 → super sai com crossfade natural
  // Squish + glow + ripple disparam nos dois taps
  const triggerToggle = useCallback(() => {
    if (!interactive) return
    const now = Date.now()
    if (now - lastTapAtRef.current < TAP_COOLDOWN_MS) return
    lastTapAtRef.current = now

    onTap?.()

    // Haptic feedback — vibra no celular (API Web Vibration, suportado no Android Chrome)
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(superOn ? [18, 22, 28] : [28, 18, 36])
    }

    // Squish spring em ambos os sentidos
    void animate(scaleV, [1, 0.91, 1.07, 1.0], {
      duration: 0.42,
      ease: [0.22, 1, 0.36, 1],
    })

    // Glow / ripple de feedback — sempre
    setGlowActive(true)
    if (glowTimerRef.current) clearTimeout(glowTimerRef.current)
    glowTimerRef.current = setTimeout(() => setGlowActive(false), REACT_MS)

    setSuperOn(prev => {
      const next = !prev
      if (next) {
        // Entrando em modo super: garante que o overlay está montado
        if (superUnmountTimerRef.current) clearTimeout(superUnmountTimerRef.current)
        setSuperMounted(true)
      }
      return next
    })
  }, [interactive, onTap, scaleV, superOn])

  useEffect(() => {
    if (superOn || !superMounted) return
    if (superUnmountTimerRef.current) clearTimeout(superUnmountTimerRef.current)
    superUnmountTimerRef.current = setTimeout(() => setSuperMounted(false), FADE_MS)
    return () => {
      if (superUnmountTimerRef.current) clearTimeout(superUnmountTimerRef.current)
    }
  }, [superMounted, superOn])

  // ── Handlers de pointer ──────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerDownRef.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pointerDownRef.current) return
      updateTiltFromPointer(e.clientX, e.clientY)
    },
    [updateTiltFromPointer]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const down = pointerDownRef.current
      if (down) {
        const dx = Math.abs(e.clientX - down.x)
        const dy = Math.abs(e.clientY - down.y)
        // Só considera tap se o dedo não se moveu mais de 8px (evita disparar no scroll)
        if (dx < 8 && dy < 8) triggerToggle()
      }
      pointerDownRef.current = null
      resetTilt()
    },
    [triggerToggle, resetTilt]
  )

  const handlePointerLeave = useCallback(() => {
    pointerDownRef.current = null
    resetTilt()
  }, [resetTilt])

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (glowTimerRef.current) clearTimeout(glowTimerRef.current)
      if (superUnmountTimerRef.current) clearTimeout(superUnmountTimerRef.current)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex select-none flex-col items-center justify-center",
        className
      )}
      style={{ perspective: "900px" }}
      onPointerDown={interactive ? handlePointerDown : undefined}
      onPointerMove={interactive ? handlePointerMove : undefined}
      onPointerUp={interactive ? handlePointerUp : undefined}
      onPointerLeave={interactive ? handlePointerLeave : undefined}
    >
      {/* ── Bloco 3D: tilt + squish ─────────────────────────────────────────── */}
      <motion.div
        animate={
          glowActive
            ? {
                x: [0, -4, 4, -3, 3, 0],
                rotateZ: [0, -1.2, 1.2, -0.8, 0.8, 0],
              }
            : { x: 0, rotateZ: 0 }
        }
        transition={{ duration: 0.28, ease: "easeOut" }}
        style={{
          rotateX: tiltX,
          rotateY: tiltY,
          scale: scaleV,
          transformStyle: "preserve-3d",
          cursor: interactive ? "pointer" : "default",
        }}
      >
        <div className={cn("relative", sizeClasses[size])}>
          <div
            className="pointer-events-none absolute inset-[5%] z-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.72) 0%, rgba(82,231,255,0.22) 34%, rgba(82,231,255,0.08) 56%, transparent 74%)",
              filter: "blur(10px)",
              transform: "translateZ(0)",
            }}
          />
          <div
            className="pointer-events-none absolute bottom-[4%] left-[18%] z-0 h-[12%] w-[64%] rounded-full"
            style={{
              background:
                "radial-gradient(ellipse, rgba(13,35,65,0.18) 0%, rgba(82,231,255,0.12) 44%, transparent 72%)",
              filter: "blur(7px)",
              transform: "translateZ(0)",
            }}
          />

          {/* Camada 1 — Avatar idle (normal branco/azul, qualidade máxima) */}
          <div
            className="pointer-events-none absolute inset-0 z-10"
            style={{
              opacity: superOn ? 0 : 1,
              transition: `opacity ${FADE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            }}
          >
            <GutoVividAvatar
              size={size}
              evolution={stage}
              emotion="default"
              showPlatform={false}
              isActive={isActive && (!superOn || glowActive)}
              className="pointer-events-none h-full w-full"
            />
          </div>

          {/* Camada 2 — GUTO de roupa (super) com crossfade natural
              Lazy mount: só renderiza após o primeiro tap.
              Permanece montado — taps seguintes são instantâneos.
              O crossfade é feito apenas com opacity + CSS transition,
              sem remount → sem flash, parece que o avatar "muda de roupa". */}
          {superMounted && (
            <div
              className="pointer-events-none absolute inset-0 z-20"
              style={{
                opacity: superOn ? 1 : 0,
                transition: `opacity ${FADE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
              }}
            >
              <GutoVividAvatar
                size={size}
                evolution={stage}
                emotion="super"
                showPlatform={false}
                isActive={isActive && (superOn || glowActive)}
                className="pointer-events-none h-full w-full"
              />
            </div>
          )}

          <div
            className="pointer-events-none absolute inset-[6%] z-[25] rounded-full"
            style={{
              background:
                "linear-gradient(128deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.12) 18%, transparent 38%, transparent 68%, rgba(82,231,255,0.16) 100%)",
              mixBlendMode: "screen",
              opacity: 0.5,
            }}
          />

          {/* Camada 3 — Glow azul no tap (entra e sai) */}
          <motion.div
            className="pointer-events-none absolute inset-0 z-30 rounded-full"
            animate={
              glowActive
                ? { opacity: [0, 0.95, 0.35, 0], scale: [0.72, 1.08, 1.32, 1.55] }
                : { opacity: 0, scale: 1 }
            }
            transition={{ duration: 0.52, ease: "easeOut" }}
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.86) 0%, rgba(82,231,255,0.52) 28%, rgba(82,231,255,0.18) 48%, transparent 70%)",
              boxShadow:
                "0 0 48px rgba(255,255,255,0.72), 0 0 72px rgba(82,231,255,0.48), 0 0 110px rgba(82,231,255,0.22)",
            }}
          />
          {glowActive && (
            <motion.div
              className="pointer-events-none absolute inset-[-2%] z-[35] rounded-full"
              initial={{ opacity: 0, x: "-28%", scale: 0.94 }}
              animate={{ opacity: [0, 0.7, 0], x: "28%", scale: 1.03 }}
              transition={{ duration: 0.34, ease: "easeOut" }}
              style={{
                background:
                  "linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.72) 42%, rgba(82,231,255,0.34) 50%, transparent 62%)",
                mixBlendMode: "screen",
              }}
            />
          )}
          {glowActive && (
            <motion.div
              className="pointer-events-none absolute inset-[10%] z-40 rounded-full"
              initial={{ opacity: 0.9, scale: 0.7 }}
              animate={{ opacity: 0, scale: 1.18 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              style={{
                background:
                  "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(82,231,255,0.62) 34%, transparent 66%)",
                filter: "blur(8px)",
              }}
            />
          )}
        </div>

        {/* Anel de ripple — dispara em tap de entrada E de saída */}
        {glowActive && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-30 rounded-full"
            initial={{ scale: 0.85, opacity: 0.65 }}
            animate={{ scale: 1.4, opacity: 0 }}
            transition={{ duration: 0.85, ease: "easeOut" }}
            style={{ border: "2px solid rgba(82,231,255,0.55)" }}
          />
        )}
      </motion.div>

      {/* ── Plataforma ────────────────────────────────────────────────────────── */}
      {showPlatform && (
        <div className="relative mt-[-0.5rem] flex w-full max-w-[10.5rem] items-center justify-center">
          <div className="absolute h-10 w-[72%] rounded-full bg-[radial-gradient(circle,rgba(82,231,255,0.12)_0%,rgba(82,231,255,0)_76%)] blur-xl" />
          <div className="relative h-5 w-[76%] rounded-full border border-white/82 bg-white/78 shadow-[inset_0_3px_10px_rgba(122,136,154,0.12),inset_0_-6px_10px_rgba(255,255,255,0.94)]">
            <div className="absolute inset-x-[14%] top-[20%] h-[58%] rounded-full border border-white/76 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(220,230,240,0.82)_100%)]" />
            <div className="absolute inset-x-[32%] top-[38%] h-[22%] rounded-full bg-[linear-gradient(90deg,transparent,rgba(82,231,255,0.74),transparent)]" />
          </div>
        </div>
      )}
    </div>
  )
}
