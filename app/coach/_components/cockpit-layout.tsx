"use client"

import { useState, type ReactNode } from "react"
import {
  Activity,
  Building2,
  ChevronLeft,
  ChevronRight,
  Database,
  Gavel,
  Globe,
  Menu,
  Settings,
  Shield,
  Signal,
  Users,
  X,
  Zap,
} from "lucide-react"
import { useCockpit } from "./cockpit-context"
import { T } from "./control-tokens"
import { Btn, TelemetryStamp } from "./controls"
import type { Screen } from "./utils"
import { activeClientTeams, headerCtaForScreen } from "@/lib/panel-rules"
import { usePanelI18n, PANEL_LANGUAGES, type PanelLang } from "@/lib/panel-i18n"

// ─── Sidebar config ───────────────────────────────────────────────────────────

// "minha_empresa" não é uma Screen — é um atalho que abre o drawer da própria
// empresa do admin. Tratado especialmente no clique do Sidebar.
type NavId = Screen | "minha_empresa"

// Chave de tradução estável por item da nav. Lê em `t.nav.*`.
type NavKey =
  | "dashboard" | "approvals" | "companies" | "myCompany"
  | "students" | "arena" | "bank" | "logs"

interface NavItem {
  id: NavId
  labelKey: NavKey
  groupKey: "operation" | "registry" | "analysis" | "system"
  icon: ReactNode
  adminOnly?: boolean // admin OU super_admin
  superAdminOnly?: boolean // apenas super_admin
  adminCompanyOnly?: boolean // admin da empresa (não super_admin)
  showsBadge?: boolean
}

// Hierarquia operacional: Coaches vivem DENTRO da empresa (drawer), não como aba
// global. Treino/Dieta vivem DENTRO do aluno (drawer), não como abas globais.
const NAV_ITEMS: NavItem[] = [
  { id: "hoje", labelKey: "dashboard", groupKey: "operation", icon: <Zap className="h-[18px] w-[18px]" /> },
  { id: "aprovacoes", labelKey: "approvals", groupKey: "operation", icon: <Gavel className="h-[18px] w-[18px]" />, adminOnly: true, showsBadge: true },
  { id: "empresas", labelKey: "companies", groupKey: "registry", icon: <Building2 className="h-[18px] w-[18px]" />, superAdminOnly: true },
  { id: "minha_empresa", labelKey: "myCompany", groupKey: "registry", icon: <Building2 className="h-[18px] w-[18px]" />, adminCompanyOnly: true },
  { id: "students", labelKey: "students", groupKey: "registry", icon: <Users className="h-[18px] w-[18px]" /> },
  { id: "arena", labelKey: "arena", groupKey: "analysis", icon: <Activity className="h-[18px] w-[18px]" /> },
  { id: "banco", labelKey: "bank", groupKey: "system", icon: <Database className="h-[18px] w-[18px]" />, superAdminOnly: true },
  { id: "logs", labelKey: "logs", groupKey: "system", icon: <Settings className="h-[18px] w-[18px]" />, superAdminOnly: true },
]

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  collapsed,
  onToggle,
  onClose,
}: {
  collapsed: boolean
  onToggle: () => void
  onClose?: () => void
}) {
  const { user, isAdmin, isSuperAdmin, activeScreen, setActiveScreen, pendingExercises, teams, openEmpresa } = useCockpit()
  const { t } = usePanelI18n()

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.superAdminOnly) return isSuperAdmin
    if (item.adminCompanyOnly) return isAdmin && !isSuperAdmin
    if (item.adminOnly) return isAdmin
    return true
  })

  // "Minha Empresa" abre o drawer da própria empresa do admin; demais itens
  // trocam a screen. Coaches/treinos/dietas não são mais navegação global.
  const handleNav = (item: NavItem) => {
    if (item.id === "minha_empresa") {
      const myTeam = teams[0]
      if (myTeam) void openEmpresa(myTeam)
      return
    }
    setActiveScreen(item.id as Screen)
  }

  // Preserve declaration order while grouping under section headers.
  const groups: { name: string; items: NavItem[] }[] = []
  for (const item of visibleItems) {
    const groupName = t.nav[item.groupKey]
    const existing = groups.find((g) => g.name === groupName)
    if (existing) existing.items.push(item)
    else groups.push({ name: groupName, items: [item] })
  }

  const pendingTotal = pendingExercises.length

  return (
    <aside
      className="flex h-full flex-col"
      style={{
        width: collapsed ? 64 : 248,
        flexShrink: 0,
        background: T.sidebar,
        transition: "width 200ms ease",
        overflow: "hidden",
        boxShadow: "2px 0 16px rgba(0,0,0,0.18)",
      }}
    >
      {/* Brand strip */}
      <div
        style={{
          height: 66,
          display: "flex",
          alignItems: "center",
          padding: collapsed ? "0 0 0 17px" : "0 16px 0 18px",
          borderBottom: `1px solid ${T.sidebarBorder}`,
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: "linear-gradient(135deg, #52e7ff 0%, #0891B2 100%)",
            display: "grid",
            placeItems: "center",
            color: "#04131e",
            boxShadow: "0 0 18px rgba(82,231,255,0.35)",
            flexShrink: 0,
          }}
        >
          <Shield className="h-4 w-4" />
        </div>
        {!collapsed && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: T.ui,
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#FFFFFF",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.15,
                }}
              >
                {t.brand.title}
              </div>
              <div
                style={{
                  fontFamily: T.ui,
                  fontSize: 10.5,
                  color: T.sidebarFgMuted,
                  lineHeight: 1.2,
                  marginTop: 1,
                  letterSpacing: "0.04em",
                }}
              >
                {t.brand.subtitle}
              </div>
            </div>
            <button
              onClick={onToggle}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: T.sidebarFgMuted,
                padding: 5,
                display: "flex",
                alignItems: "center",
                borderRadius: 6,
              }}
              aria-label={t.nav.collapse}
            >
              <ChevronLeft className="h-[15px] w-[15px]" />
            </button>
          </>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
        {groups.map((group) => (
          <div key={group.name} style={{ marginBottom: 6 }}>
            {!collapsed && (
              <div
                style={{
                  padding: "10px 20px 4px",
                  fontFamily: T.ui,
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: T.sidebarFgGroup,
                }}
              >
                {group.name}
              </div>
            )}
            {group.items.map((item) => {
              const active = activeScreen === item.id
              const badge = item.showsBadge && pendingTotal > 0 ? pendingTotal : null
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    handleNav(item)
                    onClose?.()
                  }}
                  title={collapsed ? t.nav[item.labelKey] : undefined}
                  style={{
                    width: collapsed ? "100%" : "calc(100% - 12px)",
                    margin: collapsed ? "0" : "1px 6px",
                    height: 38,
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    padding: collapsed ? "0 0 0 18px" : "0 12px",
                    background: active ? T.sidebarActive : "transparent",
                    border: "none",
                    borderLeft: active && !collapsed ? `2px solid ${T.sidebarCyan}` : "2px solid transparent",
                    cursor: "pointer",
                    borderRadius: collapsed ? 0 : 8,
                    color: active ? T.sidebarFgActive : T.sidebarFg,
                    fontFamily: T.ui,
                    fontSize: 13.5,
                    fontWeight: active ? 600 : 400,
                    textAlign: "left",
                    position: "relative",
                    transition: "background 120ms ease, color 120ms ease",
                  }}
                >
                  <span style={{ opacity: active ? 1 : 0.7, display: "flex" }}>{item.icon}</span>
                  {!collapsed && <span style={{ flex: 1 }}>{t.nav[item.labelKey]}</span>}
                  {!collapsed && badge && (
                    <span
                      style={{
                        background: "#B45309",
                        color: "#fff",
                        borderRadius: 999,
                        padding: "1px 7px",
                        fontFamily: T.ui,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {badge}
                    </span>
                  )}
                  {collapsed && badge && (
                    <span
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 10,
                        width: 7,
                        height: 7,
                        borderRadius: 999,
                        background: "#F59E0B",
                        boxShadow: "0 0 6px #F59E0B",
                      }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer / user stamp */}
      {!collapsed ? (
        <div
          style={{
            borderTop: `1px solid ${T.sidebarBorder}`,
            padding: "12px 14px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: "#4ade80",
                boxShadow: "0 0 8px rgba(74,222,128,0.6)",
                flexShrink: 0,
              }}
            />
            <div
              style={{
                fontFamily: T.ui,
                fontSize: 12.5,
                fontWeight: 500,
                color: T.sidebarFg,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user.email || user.name || user.userId}
            </div>
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 22,
              padding: "0 9px",
              borderRadius: 999,
              background: "rgba(82,231,255,0.13)",
              color: T.sidebarCyan,
              border: "1px solid rgba(82,231,255,0.30)",
              fontFamily: T.ui,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
          >
            {(user.role || "").toUpperCase().replace("_", " ")}
          </span>
        </div>
      ) : (
        <button
          onClick={onToggle}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: T.sidebarFgMuted,
            padding: "14px 0",
            display: "flex",
            justifyContent: "center",
          }}
          aria-label={t.nav.expand}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </aside>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({ onMobileMenu }: { onMobileMenu: () => void }) {
  const {
    isAdmin,
    isSuperAdmin,
    activeScreen,
    teams,
    students,
    pendingExercises,
    studentLimitReached,
    setShowCreateStudent,
    setStudentDraft,
    setShowCreateTeam,
    selectedTeamId,
  } = useCockpit()
  const { t, lang, setLang } = usePanelI18n()

  const meta = { t: t.header.screenTitle[activeScreen], sub: t.header.screenSub[activeScreen] }
  const pendingTotal = pendingExercises.length

  // CTA contextual baseado na screen. O Dashboard ("hoje") NÃO cria aluno solto:
  // aluno só nasce na lista de Alunos (com empresa+coach exigidos) ou dentro do
  // drawer da empresa. Regra centralizada em headerCtaForScreen.
  const ctaKind = headerCtaForScreen(activeScreen, { isSuperAdmin, isAdmin })
  const cta = (() => {
    if (ctaKind === "empresa") {
      return (
        <Btn cyan sm onClick={() => setShowCreateTeam(true)}>
          {t.header.ctaCompany}
        </Btn>
      )
    }
    if (ctaKind === "aluno") {
      const limitTitle = studentLimitReached
        ? lang === "en-US"
          ? "Student limit reached for this company"
          : lang === "it-IT"
            ? "Limite di allievi raggiunto per questa azienda"
            : "Limite de alunos atingido para esta empresa"
        : undefined
      return (
        <Btn
          cyan
          sm
          disabled={studentLimitReached}
          title={limitTitle}
          onClick={() => {
            setStudentDraft({
              name: "",
              email: "",
              phone: "",
              password: "",
              active: true,
              coachId: "",
              teamId: selectedTeamId || "",
              sex: "",
              age: "",
            })
            setShowCreateStudent(true)
          }}
        >
          {t.header.ctaStudent}
        </Btn>
      )
    }
    return null
  })()

  return (
    <header
      style={{
        height: 62,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        background: T.surface,
        borderBottom: `1px solid ${T.border}`,
        position: "sticky",
        top: 0,
        zIndex: 20,
        gap: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
        {/* Mobile menu */}
        <button
          onClick={onMobileMenu}
          className="lg:hidden"
          style={{
            background: "none",
            border: "none",
            color: T.fg3,
            padding: 6,
            cursor: "pointer",
            display: "flex",
          }}
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: T.ui,
              fontSize: 10.5,
              fontWeight: 600,
              color: T.brand,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            {t.brand.subtitle}
          </div>
          <div
            style={{
              fontFamily: T.ui,
              fontSize: 18,
              fontWeight: 600,
              color: T.fg,
              letterSpacing: "-0.01em",
              lineHeight: 1,
            }}
          >
            {meta.t}
          </div>
        </div>
        <div className="hidden md:block" style={{ height: 32, width: 1, background: T.border }} />
        <div
          className="hidden md:block"
          style={{
            fontFamily: T.ui,
            fontSize: 13,
            color: T.fg3,
            maxWidth: 340,
          }}
        >
          {meta.sub}
        </div>
      </div>

      {/* Telemetry strip */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div className="hidden xl:flex" style={{ alignItems: "center", gap: 10 }}>
          <TelemetryStamp icon={<Signal className="h-2.5 w-2.5" />} label="SYS" value={t.header.online} tone="ok" />
          {isSuperAdmin && (
            <TelemetryStamp
              icon={<Globe className="h-2.5 w-2.5" />}
              label={t.header.companiesLabel}
              value={String(activeClientTeams(teams).length)}
            />
          )}
          <TelemetryStamp
            icon={<Users className="h-2.5 w-2.5" />}
            label={t.header.studentsLabel}
            value={String(students.length)}
          />
          {isAdmin && (
            <TelemetryStamp
              icon={<Gavel className="h-2.5 w-2.5" />}
              label={t.header.pendingLabel}
              value={String(pendingTotal)}
              tone={pendingTotal > 0 ? "warn" : "ok"}
            />
          )}
        </div>
        {/* Seletor de idioma do painel — compartilha localStorage com /admin/login */}
        <PanelLanguageSwitcher value={lang} onChange={setLang} />
        {cta && (
          <>
            <div style={{ width: 1, height: 24, background: T.border, margin: "0 4px" }} />
            {cta}
          </>
        )}
      </div>
    </header>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export function CockpitLayout({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div
      style={{
        display: "flex",
        // 100dvh (não 100vh): no celular o 100vh ignora a barra do navegador e
        // empurra o fim do conteúdo pra fora da área visível — a tela não rolava.
        height: "100dvh",
        overflow: "hidden",
        background: T.bg,
        color: T.fg,
        fontFamily: T.ui,
      }}
    >
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:flex-shrink-0" style={{ position: "relative", zIndex: 2 }}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((v) => !v)} />
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div style={{ flexShrink: 0 }}>
            <Sidebar
              collapsed={false}
              onToggle={() => setMobileMenuOpen(false)}
              onClose={() => setMobileMenuOpen(false)}
            />
          </div>
          <div style={{ flex: 1, background: "rgba(15,23,42,0.45)" }} onClick={() => setMobileMenuOpen(false)} />
          <button
            style={{
              position: "absolute",
              right: 16,
              top: 16,
              background: "none",
              border: "none",
              color: "#FFFFFF",
              cursor: "pointer",
            }}
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Main */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
          position: "relative",
          zIndex: 2,
        }}
      >
        <Header onMobileMenu={() => setMobileMenuOpen(true)} />
        <main style={{ flex: 1, overflowY: "auto" }}>{children}</main>
      </div>
    </div>
  )
}

// ─── Panel language switcher ─────────────────────────────────────────────────

function PanelLanguageSwitcher({ value, onChange }: { value: PanelLang; onChange: (next: PanelLang) => void }) {
  return (
    <div
      className="hidden md:flex"
      style={{
        gap: 2,
        background: T.bg,
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: 2,
      }}
      role="group"
      aria-label="Painel — idioma"
    >
      {PANEL_LANGUAGES.map((lang) => {
        const active = value === lang.code
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => onChange(lang.code)}
            title={lang.label}
            aria-pressed={active}
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              border: "none",
              background: active ? T.surface : "transparent",
              color: active ? T.fg : T.fg3,
              fontFamily: T.mono,
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: "0.12em",
              cursor: "pointer",
              boxShadow: active ? `0 1px 2px ${T.border}` : "none",
            }}
          >
            {lang.short}
          </button>
        )
      })}
    </div>
  )
}
