"use client"

/**
 * Amostra visual do novo avatar SVG — GutoVividAvatar.
 * Rota: /dev/avatar-novo  (APENAS dev — NÃO faz parte da tela principal do GUTO).
 *
 * Não importa nem toca o avatar de produção (GutoOfficialAvatar /
 * GutoAvatarController / GutoOnlineLightAvatar) nem qualquer fluxo de
 * chat/treino/dieta/XP. Não altera a /dev/avatar antiga.
 *
 * Objetivo: o usuário avaliar no iPhone como o app ficaria com os novos
 * avatares — galeria animada + mockups de tela (chat e evoluir).
 */

import { useState } from "react"

import {
  GutoVividAvatar,
  type GutoVividEmotion,
  type GutoVividStage,
} from "@/components/guto/guto-vivid-avatar"

const CYAN = "#52e7ff"
const NAVY = "#0d2341"
const CYAN_DEEP = "#1ec1de"

const STAGES: GutoVividStage[] = ["baby", "teen", "adult", "elite"]
const EMOTIONS: GutoVividEmotion[] = ["default", "alert", "critical", "reward", "super"]

const STAGE_LABEL: Record<GutoVividStage, string> = {
  baby: "BABY",
  teen: "TEEN",
  adult: "ADULT",
  elite: "ELITE",
}
const STAGE_XP: Record<GutoVividStage, string> = {
  baby: "0–1.500 XP",
  teen: "1.500–5.000 XP",
  adult: "5.000–12.000 XP",
  elite: "12.000+ XP",
}

export default function AvatarNovoDevPage() {
  const [emotion, setEmotion] = useState<GutoVividEmotion>("default")
  const [speaking, setSpeaking] = useState(false)
  const [heroStage, setHeroStage] = useState<GutoVividStage>("teen")
  const [chatSuper, setChatSuper] = useState(false)

  return (
    <main
      style={{
        // RootFrame envolve as rotas em max-w-[430px] h-dvh overflow-hidden;
        // aqui rolamos DENTRO do frame (senão galeria/mockups/matriz ficam cortados).
        flex: "1 1 0%",
        minHeight: 0,
        height: "100%",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        background: "linear-gradient(180deg, #ffffff 0%, #eaf6ff 60%, #dcefff 100%)",
        color: NAVY,
        fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif",
        padding: "28px 18px 80px",
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        {/* Header */}
        <header style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: 2, color: CYAN_DEEP }}>GUTO</span>
            <span style={{ fontSize: 13, color: "#5a7ca8", fontWeight: 700 }}>& WILL</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "8px 0 4px" }}>
            Amostra — novo avatar SVG
          </h1>
          <p style={{ color: "#5a7ca8", fontSize: 13, margin: 0, lineHeight: 1.5 }}>
            100% SVG + animação, alinhado ao ciano do app (#52e7ff). Sem vídeo, sem asset.
            Isolado — não substitui o avatar de produção.
          </p>
        </header>

        {/* Controles globais */}
        <section
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            alignItems: "center",
            background: "#ffffff",
            border: "1px solid #d6ecf8",
            borderRadius: 16,
            padding: 14,
            marginBottom: 24,
            boxShadow: "0 6px 20px rgba(13,35,65,0.06)",
          }}
        >
          <div>
            <span style={labelStyle}>Emoção (galeria)</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {EMOTIONS.map((e) => (
                <button key={e} type="button" onClick={() => setEmotion(e)} style={chip(e === emotion)}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span style={labelStyle}>Falando (online)</span>
            <div style={{ marginTop: 8 }}>
              <button type="button" onClick={() => setSpeaking((s) => !s)} style={chip(speaking)}>
                {speaking ? "falando: ON" : "falando: OFF"}
              </button>
            </div>
          </div>
        </section>

        {/* Galeria — 4 fases na emoção selecionada */}
        <SectionTitle>
          Fases — emoção: <span style={{ color: CYAN_DEEP }}>{emotion}</span>
          {speaking ? <span style={{ color: CYAN_DEEP }}> · falando</span> : null}
        </SectionTitle>
        <p style={{ fontSize: 12, color: "#7799bb", margin: "-8px 0 14px" }}>
          Toque em qualquer GUTO — ele acena os braços, dá um pulinho e fica feliz.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 16,
            marginBottom: 44,
          }}
        >
          {STAGES.map((stage) => (
            <figure key={stage} style={card}>
              <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <GutoVividAvatar evolution={stage} emotion={emotion} isSpeaking={speaking} size="lg" />
              </div>
              <figcaption style={{ marginTop: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, color: CYAN_DEEP }}>
                  {STAGE_LABEL[stage]}
                </div>
                <div style={{ fontSize: 11, color: "#7799bb" }}>{STAGE_XP[stage]}</div>
              </figcaption>
            </figure>
          ))}
        </div>

        {/* Mockups de tela */}
        <SectionTitle>Como ficaria no app</SectionTitle>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 20,
            marginBottom: 44,
          }}
        >
          {/* MOCKUP CHAT */}
          <div style={phone}>
            <div style={phoneTop}>
              <span style={{ fontSize: 13, fontWeight: 800, color: NAVY }}>GUTO</span>
              <span style={{ fontSize: 11, color: "#7799bb" }}>& Will</span>
              <span style={{ marginLeft: "auto", ...badge }}>{STAGE_LABEL[heroStage]}</span>
            </div>
            <div style={{ display: "flex", gap: 8, padding: "10px 6px 0" }}>
              {STAGES.map((s) => (
                <button key={s} type="button" onClick={() => setHeroStage(s)} style={miniChip(s === heroStage)}>
                  {STAGE_LABEL[s]}
                </button>
              ))}
            </div>
            <div
              style={{
                position: "relative",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                alignItems: "center",
                padding: "8px 14px 18px",
                minHeight: 360,
              }}
            >
              <div style={bubble}>
                Bora pro treino, Will? Hoje é peito e a gente não falha.
              </div>
              <GutoVividAvatar
                evolution={heroStage}
                emotion={chatSuper ? "super" : "default"}
                isActive
                size="xl"
                onTap={() => setChatSuper((v) => !v)}
              />
              <div style={{ fontSize: 10, color: "#9ab6cc", marginTop: 4 }}>
                toque no GUTO — ele reage e troca para o modo {chatSuper ? "normal" : "super"}
              </div>
            </div>
            <div style={inputBar}>
              <span style={{ color: "#9ab6cc", fontSize: 13 }}>Fala com o GUTO…</span>
            </div>
          </div>

          {/* MOCKUP EVOLUIR */}
          <div style={phone}>
            <div style={phoneTop}>
              <span style={{ fontSize: 13, fontWeight: 800, color: NAVY }}>Evoluir</span>
              <span style={{ marginLeft: "auto", ...badge }}>{STAGE_LABEL[heroStage]}</span>
            </div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={evoCard}>
                <div style={{ height: 150, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <GutoVividAvatar evolution={heroStage} emotion="reward" size="md" />
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, color: CYAN_DEEP }}>
                    {STAGE_LABEL[heroStage]}
                  </div>
                  <div style={{ fontSize: 11, color: "#7799bb", marginBottom: 10 }}>{STAGE_XP[heroStage]}</div>
                  <div style={{ height: 8, borderRadius: 8, background: "#e3f1fa", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: "64%",
                        borderRadius: 8,
                        background: "linear-gradient(90deg, #7df0ff, #52e7ff, #1ec1de)",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 10, color: "#9ab6cc", marginTop: 6 }}>
                    Continue treinando para evoluir
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {STAGES.map((s) => (
                  <button key={s} type="button" onClick={() => setHeroStage(s)} style={miniChip(s === heroStage)}>
                    {STAGE_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Matriz completa — emoções × fases */}
        <SectionTitle>Matriz completa — emoções × fases</SectionTitle>
        {EMOTIONS.map((e) => (
          <div key={e} style={{ marginBottom: 22 }}>
            <span style={{ fontSize: 12, color: CYAN_DEEP, fontWeight: 800, textTransform: "capitalize" }}>{e}</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 8 }}>
              {STAGES.map((stage) => (
                <figure key={`${e}-${stage}`} style={{ ...card, padding: 8 }}>
                  <div style={{ height: 96, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <GutoVividAvatar evolution={stage} emotion={e} px={72} />
                  </div>
                  <figcaption style={{ fontSize: 10, color: "#7799bb", textAlign: "center", marginTop: 2 }}>
                    {STAGE_LABEL[stage]}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

// ── Estilos auxiliares ───────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#7799bb",
  textTransform: "uppercase",
  letterSpacing: 1,
  fontWeight: 700,
}

const card: React.CSSProperties = {
  margin: 0,
  background: "#ffffff",
  border: "1px solid #dcecf7",
  borderRadius: 16,
  padding: 14,
  textAlign: "center",
  boxShadow: "0 6px 18px rgba(13,35,65,0.05)",
}

const badge: React.CSSProperties = {
  background: CYAN,
  color: "#0d2341",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: 1.5,
  padding: "3px 12px",
  borderRadius: 14,
}

const phone: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  background: "linear-gradient(180deg, #ffffff 0%, #f1f9ff 100%)",
  border: "1px solid #d6ecf8",
  borderRadius: 26,
  overflow: "hidden",
  boxShadow: "0 12px 36px rgba(13,35,65,0.1)",
  minHeight: 520,
}

const phoneTop: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "14px 16px",
  borderBottom: "1px solid #e6f2fa",
  background: "rgba(255,255,255,0.7)",
}

const bubble: React.CSSProperties = {
  alignSelf: "flex-start",
  maxWidth: "85%",
  background: "#ffffff",
  border: "1px solid #d6ecf8",
  borderRadius: "16px 16px 16px 4px",
  padding: "10px 14px",
  fontSize: 13,
  color: "#1a3a5c",
  lineHeight: 1.45,
  boxShadow: "0 4px 14px rgba(13,35,65,0.06)",
  marginBottom: 4,
}

const inputBar: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "12px 16px",
  borderTop: "1px solid #e6f2fa",
  background: "#ffffff",
}

const evoCard: React.CSSProperties = {
  background: "linear-gradient(160deg, #ffffff, #eaf6ff)",
  border: "1px solid #d6ecf8",
  borderRadius: 18,
  padding: 16,
  boxShadow: "0 6px 18px rgba(13,35,65,0.06)",
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14, color: "#0d2341" }}>{children}</h2>
  )
}

function chip(active: boolean): React.CSSProperties {
  return {
    padding: "8px 16px",
    minHeight: 44,
    borderRadius: 12,
    border: active ? `1px solid ${CYAN}` : "1px solid #d6ecf8",
    background: active ? CYAN : "#ffffff",
    color: active ? "#0d2341" : "#5a7ca8",
    fontSize: 13,
    fontWeight: active ? 800 : 500,
    cursor: "pointer",
    textTransform: "capitalize",
  }
}

function miniChip(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: "7px 0",
    borderRadius: 10,
    border: active ? `1px solid ${CYAN}` : "1px solid #dcecf7",
    background: active ? CYAN : "#ffffff",
    color: active ? "#0d2341" : "#7799bb",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 1,
    cursor: "pointer",
  }
}
