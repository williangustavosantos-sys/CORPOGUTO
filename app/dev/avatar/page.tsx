"use client"

/**
 * Página de teste visual do protótipo GutoCssAvatar.
 * Rota: /dev/avatar  (apenas dev — NÃO faz parte da tela principal do GUTO).
 *
 * Não importa nem toca o avatar de produção (GutoOfficialAvatar /
 * GutoAvatarController) nem qualquer fluxo de chat/treino/dieta/XP.
 */

import { useState } from "react"

import {
  GutoCssAvatar,
  type GutoCssAvatarStage,
  type GutoCssAvatarState,
} from "@/components/guto/guto-css-avatar"

const STAGES: GutoCssAvatarStage[] = ["baby", "teen", "adult", "elite"]
const STATES: GutoCssAvatarState[] = [
  "idle",
  "listening",
  "thinking",
  "speaking",
  "happy",
  "resting",
]

export default function AvatarDevPage() {
  const [state, setState] = useState<GutoCssAvatarState>("idle")

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at 50% 0%, #0f172a 0%, #060912 70%)",
        color: "#e2e8f0",
        fontFamily: "system-ui, sans-serif",
        padding: "32px 20px 64px",
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <header style={{ marginBottom: 8 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
            Protótipo — GutoCssAvatar
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 6 }}>
            Avatar 100% SVG/CSS + Framer Motion. Sem vídeo, sem GIF, sem assets.
            Isolado — não substitui o avatar de produção.
          </p>
        </header>

        {/* Botões para trocar o state aplicado à linha de 4 fases */}
        <section style={{ margin: "24px 0" }}>
          <span style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>
            State (linha das 4 fases)
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {STATES.map((s) => {
              const active = s === state
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setState(s)}
                  style={{
                    padding: "8px 16px",
                    minHeight: 44,
                    borderRadius: 10,
                    border: active ? "1px solid #38BDF8" : "1px solid #1e293b",
                    background: active ? "#0c4a6e" : "#0f172a",
                    color: active ? "#e0f2fe" : "#94a3b8",
                    fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </section>

        {/* Linha 1 — todas as fases no state selecionado */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            Fases — state: <span style={{ color: "#38BDF8" }}>{state}</span>
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            {STAGES.map((stage) => (
              <figure
                key={stage}
                style={{
                  margin: 0,
                  background: "#0b1220",
                  border: "1px solid #1e293b",
                  borderRadius: 16,
                  padding: 16,
                  textAlign: "center",
                }}
              >
                <GutoCssAvatar stage={stage} state={state} size={200} />
                <figcaption style={{ marginTop: 8, fontSize: 13, color: "#cbd5e1", textTransform: "capitalize" }}>
                  {stage}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* Matriz completa — todos os states × todas as fases */}
        <section>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            Matriz completa — todos os states × todas as fases
          </h2>
          {STATES.map((s) => (
            <div key={s} style={{ marginBottom: 28 }}>
              <span style={{ fontSize: 13, color: "#38BDF8", fontWeight: 600, textTransform: "capitalize" }}>
                {s}
              </span>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 12,
                  marginTop: 10,
                }}
              >
                {STAGES.map((stage) => (
                  <figure
                    key={`${s}-${stage}`}
                    style={{
                      margin: 0,
                      background: "#0b1220",
                      border: "1px solid #15203a",
                      borderRadius: 12,
                      padding: 10,
                      textAlign: "center",
                    }}
                  >
                    <GutoCssAvatar stage={stage} state={s} size={130} />
                    <figcaption style={{ marginTop: 4, fontSize: 11, color: "#64748b", textTransform: "capitalize" }}>
                      {stage}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
