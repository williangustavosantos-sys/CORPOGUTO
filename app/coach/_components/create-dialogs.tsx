"use client"

import { Building2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useCockpit } from "./cockpit-context"
import { T } from "./control-tokens"
import { Btn, CtrlField, Pill, TextInput, SelectInput } from "./controls"
import { BIOLOGICAL_SEX_LABELS } from "@/lib/format-codes"
import { formatHuman, type TeamDraft } from "./utils"
import { blockCreateStudent, coachesForTeam, studentRequiresCoach } from "@/lib/panel-rules"
import { usePanelI18n } from "@/lib/panel-i18n"

// BUG 5 — responsivo: flex-col + altura limitada (dvh por causa da barra dinâmica
// do Safari iOS). Sem isto, em janela baixa/celular o modal crescia além da tela e
// o footer (botão Criar) ficava recortado e inalcançável. Com o corpo rolável e
// header/footer fixos (shrink-0), a ação principal fica SEMPRE visível.
const dialogClass =
  "p-0 max-w-md gap-0 overflow-hidden border bg-transparent text-slate-900 flex flex-col max-h-[90dvh] sm:max-h-[85dvh]"

const dialogStyle: React.CSSProperties = {
  background: T.surface,
  borderColor: T.border,
  fontFamily: T.ui,
  borderRadius: 16,
  boxShadow: T.shadowFloat,
}

const headerStyle: React.CSSProperties = {
  padding: "20px 24px 16px",
  borderBottom: `1px solid ${T.borderSoft}`,
  background: T.surfaceAlt,
  flexShrink: 0,
}

const bodyStyle: React.CSSProperties = {
  padding: "20px 24px",
  display: "grid",
  gap: 14,
  // Só o corpo rola quando os campos não cabem; header/footer ficam fixos.
  flex: "1 1 auto",
  minHeight: 0,
  overflowY: "auto",
}

const footerStyle: React.CSSProperties = {
  padding: "12px 24px 20px",
  borderTop: `1px solid ${T.border}`,
  display: "flex",
  gap: 10,
  justifyContent: "flex-end",
  background: "rgba(0,0,0,0.2)",
  flexShrink: 0,
}

// ─── CreateStudentDialog ──────────────────────────────────────────────────────

export function CreateStudentDialog() {
  const {
    user,
    showCreateStudent,
    setShowCreateStudent,
    studentDraft,
    setStudentDraft,
    coaches,
    teams,
    isAdmin,
    isSuperAdmin,
    acting,
    studentLimitReached,
    doCreateStudent,
  } = useCockpit()
  const { t } = usePanelI18n()
  const ts = t.dialogs.createStudent

  const isTeamLocked =
    isSuperAdmin && !!studentDraft.teamId && teams.some((t) => t.id === studentDraft.teamId)
  const lockedTeam = teams.find((t) => t.id === studentDraft.teamId)

  // Coaches SEMPRE filtrados pela empresa (super_admin escolhe a empresa; admin
  // já recebe a lista escopada ao próprio time pelo backend) — não vaza coach
  // de outra empresa. Coach é OBRIGATÓRIO para super_admin em empresa cliente
  // (espelha o backend GUTO_COACH_REQUIRED); para admin é recomendado.
  const availableCoaches = isSuperAdmin
    ? coachesForTeam(coaches, studentDraft.teamId)
    : coaches
  const effectiveTeamId = isSuperAdmin ? studentDraft.teamId : user.teamId
  const requiresCoach = isAdmin && studentRequiresCoach(effectiveTeamId)
  const noCoachInTeam = requiresCoach && availableCoaches.length === 0
  const shouldShowCoachSelector = user.role === "admin" || (isSuperAdmin && !!studentDraft.teamId)
  const createBlock = blockCreateStudent({
    name: studentDraft.name,
    email: studentDraft.email,
    needsTeam: isSuperAdmin,
    teamId: effectiveTeamId,
    coachId: studentDraft.coachId,
    teamCoachCount: availableCoaches.length,
    requiresCoach,
  })

  return (
    <AlertDialog open={showCreateStudent} onOpenChange={setShowCreateStudent}>
      <AlertDialogContent className={dialogClass} style={dialogStyle}>
        <AlertDialogHeader style={headerStyle}>
          <Pill tone="cyan">{ts.badge}</Pill>
          <AlertDialogTitle
            style={{
              fontFamily: T.mono,
              fontSize: 18,
              fontWeight: 900,
              color: T.fg,
              marginTop: 8,
            }}
          >
            {ts.title}
          </AlertDialogTitle>
          <AlertDialogDescription
            style={{
              fontFamily: T.mono,
              fontSize: 10,
              color: T.fg3,
              letterSpacing: "0.10em",
              lineHeight: 1.6,
              marginTop: 4,
            }}
          >
            {ts.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div style={bodyStyle}>
          <CtrlField label={ts.fieldName}>
            <TextInput value={studentDraft.name} onChange={(name) => setStudentDraft({ ...studentDraft, name })} />
          </CtrlField>
          <CtrlField label={ts.fieldEmail}>
            <TextInput
              value={studentDraft.email}
              onChange={(email) => setStudentDraft({ ...studentDraft, email })}
            />
          </CtrlField>
          <CtrlField label={ts.fieldPhone}>
            <TextInput
              value={studentDraft.phone}
              onChange={(phone) => setStudentDraft({ ...studentDraft, phone })}
            />
          </CtrlField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <CtrlField label={ts.fieldSex}>
              <SelectInput value={studentDraft.sex} onChange={(v) => setStudentDraft({ ...studentDraft, sex: v })}>
                <option value="" style={{ background: T.ink }}>—</option>
                {Object.entries(t.tabCalibragem.biologicalSex).map(([code, label]) => (
                  <option key={code} value={code} style={{ background: T.ink }}>
                    {label}
                  </option>
                ))}
              </SelectInput>
            </CtrlField>
            <CtrlField label={ts.fieldAge}>
              <TextInput
                type="number"
                value={studentDraft.age}
                onChange={(age) => setStudentDraft({ ...studentDraft, age })}
              />
            </CtrlField>
          </div>
          <CtrlField label={ts.fieldPassword}>
            <TextInput
              type="password"
              value={studentDraft.password}
              onChange={(password) => setStudentDraft({ ...studentDraft, password })}
            />
          </CtrlField>

          {isSuperAdmin && (
            <CtrlField label={ts.fieldCompany}>
              {isTeamLocked && lockedTeam ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: T.cyanSoft,
                    border: `1px solid ${T.cyanLine}`,
                  }}
                >
                  <Building2 className="h-3 w-3" style={{ color: T.cyan }} />
                  <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: T.cyan }}>
                    {lockedTeam.name}
                  </span>
                </div>
              ) : (
                <SelectInput
                  value={studentDraft.teamId}
                  onChange={(v) => setStudentDraft({ ...studentDraft, teamId: v, coachId: "" })}
                >
                  <option value="" style={{ background: T.ink }}>
                    Selecione…
                  </option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id} style={{ background: T.ink }}>
                      {t.name}
                    </option>
                  ))}
                </SelectInput>
              )}
            </CtrlField>
          )}

          {shouldShowCoachSelector && (
            <CtrlField label={ts.fieldCoach}>
              {noCoachInTeam ? (
                <p
                  style={{
                    fontFamily: T.mono,
                    fontSize: 10,
                    color: T.warn,
                    fontWeight: 900,
                    letterSpacing: "0.06em",
                    lineHeight: 1.6,
                  }}
                >
                  ⚠ {ts.noCoachInTeamHint}
                </p>
              ) : (
                <SelectInput
                  value={studentDraft.coachId}
                  onChange={(v) => setStudentDraft({ ...studentDraft, coachId: v })}
                >
                  <option value="" style={{ background: T.ink }}>
                    {requiresCoach ? ts.selectCoach : "—"}
                  </option>
                  {availableCoaches.map((c) => (
                    <option key={c.userId} value={c.userId} style={{ background: T.ink }}>
                      {c.name || c.email || c.userId}
                    </option>
                  ))}
                </SelectInput>
              )}
            </CtrlField>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: T.mono, fontSize: 11, color: T.fg2 }}>
            <input
              type="checkbox"
              checked={studentDraft.active}
              onChange={(e) => setStudentDraft({ ...studentDraft, active: e.target.checked })}
              style={{ accentColor: T.cyan }}
            />
            Ativar acesso agora
          </label>

          {studentLimitReached && (
            <p style={{ fontFamily: T.mono, fontSize: 10, color: T.warn, fontWeight: 900, letterSpacing: "0.10em" }}>
              LIMITE DO PLANO ATINGIDO.
            </p>
          )}
        </div>

        <AlertDialogFooter style={footerStyle}>
          <AlertDialogCancel
            style={{
              height: 36,
              padding: "0 16px",
              borderRadius: 999,
              background: "rgba(232,244,255,0.07)",
              color: T.fg,
              border: `1px solid ${T.border}`,
              fontFamily: T.mono,
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            {ts.cancel}
          </AlertDialogCancel>
          <Btn
            cyan
            sm
            disabled={acting || studentLimitReached || createBlock !== null}
            onClick={() => void doCreateStudent(() => {})}
          >
            {acting ? ts.creating : ts.create}
          </Btn>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ─── CreateCoachDialog ────────────────────────────────────────────────────────

export function CreateCoachDialog() {
  const {
    showCreateCoach,
    setShowCreateCoach,
    coachDraft,
    setCoachDraft,
    teams,
    isSuperAdmin,
    acting,
    coachLimitReached,
    doCreateCoach,
    setCoaches,
  } = useCockpit()
  const { t } = usePanelI18n()
  const tc = t.dialogs.createCoach

  const isTeamLocked = isSuperAdmin && !!coachDraft.teamId && teams.some((t) => t.id === coachDraft.teamId)
  const lockedTeam = teams.find((t) => t.id === coachDraft.teamId)

  return (
    <AlertDialog open={showCreateCoach} onOpenChange={setShowCreateCoach}>
      <AlertDialogContent className={dialogClass} style={dialogStyle}>
        <AlertDialogHeader style={headerStyle}>
          <Pill tone="cyan">{tc.badge}</Pill>
          <AlertDialogTitle
            style={{ fontFamily: T.mono, fontSize: 18, fontWeight: 900, color: T.fg, marginTop: 8 }}
          >
            {tc.title}
          </AlertDialogTitle>
          <AlertDialogDescription
            style={{
              fontFamily: T.mono,
              fontSize: 10,
              color: T.fg3,
              letterSpacing: "0.10em",
              lineHeight: 1.6,
              marginTop: 4,
            }}
          >
            {tc.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div style={bodyStyle}>
          <CtrlField label={tc.fieldName}>
            <TextInput value={coachDraft.name} onChange={(name) => setCoachDraft({ ...coachDraft, name })} />
          </CtrlField>
          <CtrlField label={tc.fieldEmail}>
            <TextInput value={coachDraft.email} onChange={(email) => setCoachDraft({ ...coachDraft, email })} />
          </CtrlField>
          <CtrlField label={tc.fieldPassword}>
            <TextInput
              type="password"
              value={coachDraft.password}
              onChange={(password) => setCoachDraft({ ...coachDraft, password })}
            />
          </CtrlField>

          {isSuperAdmin && (
            <CtrlField label={tc.fieldCompany}>
              {isTeamLocked && lockedTeam ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: T.cyanSoft,
                    border: `1px solid ${T.cyanLine}`,
                  }}
                >
                  <Building2 className="h-3 w-3" style={{ color: T.cyan }} />
                  <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: T.cyan }}>
                    {lockedTeam.name}
                  </span>
                </div>
              ) : (
                <SelectInput value={coachDraft.teamId} onChange={(v) => setCoachDraft({ ...coachDraft, teamId: v })}>
                  <option value="" style={{ background: T.ink }}>
                    {tc.selectCompany}
                  </option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id} style={{ background: T.ink }}>
                      {team.name}
                    </option>
                  ))}
                </SelectInput>
              )}
            </CtrlField>
          )}

          {coachLimitReached && (
            <p style={{ fontFamily: T.mono, fontSize: 10, color: T.warn, fontWeight: 900, letterSpacing: "0.10em" }}>
              LIMITE DE COACHES ATINGIDO.
            </p>
          )}
        </div>

        <AlertDialogFooter style={footerStyle}>
          <AlertDialogCancel
            style={{
              height: 36,
              padding: "0 16px",
              borderRadius: 999,
              background: "rgba(232,244,255,0.07)",
              color: T.fg,
              border: `1px solid ${T.border}`,
              fontFamily: T.mono,
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            {tc.cancel}
          </AlertDialogCancel>
          <Btn
            cyan
            sm
            disabled={
              acting ||
              coachLimitReached ||
              !coachDraft.name.trim() ||
              !coachDraft.email.trim() ||
              (isSuperAdmin && !coachDraft.teamId)
            }
            onClick={() => void doCreateCoach(setCoaches)}
          >
            {acting ? tc.creating : tc.create}
          </Btn>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ─── CreateTeamDialog (Empresa) ──────────────────────────────────────────────

export function CreateTeamDialog() {
  const { showCreateTeam, setShowCreateTeam, teamDraft, setTeamDraft, acting, doCreateTeam, setTeams } =
    useCockpit()
  const { t } = usePanelI18n()
  const te = t.dialogs.createTeam

  return (
    <AlertDialog open={showCreateTeam} onOpenChange={setShowCreateTeam}>
      <AlertDialogContent className={dialogClass} style={dialogStyle}>
        <AlertDialogHeader style={headerStyle}>
          <Pill tone="cyan">{te.badge}</Pill>
          <AlertDialogTitle
            style={{ fontFamily: T.mono, fontSize: 18, fontWeight: 900, color: T.fg, marginTop: 8 }}
          >
            {te.title}
          </AlertDialogTitle>
          <AlertDialogDescription
            style={{
              fontFamily: T.mono,
              fontSize: 10,
              color: T.fg3,
              letterSpacing: "0.10em",
              lineHeight: 1.6,
              marginTop: 4,
            }}
          >
            {te.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div style={bodyStyle}>
          <CtrlField label={te.fieldName}>
            <TextInput value={teamDraft.name} onChange={(name) => setTeamDraft({ ...teamDraft, name })} />
          </CtrlField>

          <CtrlField label={te.fieldEmail}>
            <TextInput value={teamDraft.email} onChange={(email) => setTeamDraft({ ...teamDraft, email })} />
          </CtrlField>

          <CtrlField label={te.fieldPhone}>
            <TextInput value={teamDraft.phone} onChange={(phone) => setTeamDraft({ ...teamDraft, phone })} />
          </CtrlField>

          <CtrlField label={te.fieldAddress}>
            <TextInput value={teamDraft.addressLine} onChange={(addressLine) => setTeamDraft({ ...teamDraft, addressLine })} />
          </CtrlField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <CtrlField label={te.fieldCity}>
              <TextInput value={teamDraft.city} onChange={(city) => setTeamDraft({ ...teamDraft, city })} />
            </CtrlField>
            <CtrlField label={te.fieldCountry}>
              <TextInput value={teamDraft.country} onChange={(country) => setTeamDraft({ ...teamDraft, country })} />
            </CtrlField>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <CtrlField label={te.fieldPlan}>
              <SelectInput
                value={teamDraft.plan}
                onChange={(v) => setTeamDraft({ ...teamDraft, plan: v as TeamDraft["plan"] })}
              >
                {(["start", "pro", "elite", "custom"] as const).map((p) => (
                  <option key={p} value={p} style={{ background: T.surface }}>
                    {p === "start" ? te.planStart : p === "pro" ? te.planPro : p === "elite" ? te.planElite : te.planCustom}
                  </option>
                ))}
              </SelectInput>
            </CtrlField>
            <CtrlField label={te.fieldStatus}>
              <SelectInput
                value={teamDraft.status}
                onChange={(v) => setTeamDraft({ ...teamDraft, status: v as TeamDraft["status"] })}
              >
                {(["active", "paused", "archived"] as const).map((s) => (
                  <option key={s} value={s} style={{ background: T.surface }}>
                    {formatHuman(s)}
                  </option>
                ))}
              </SelectInput>
            </CtrlField>
          </div>

          {teamDraft.plan === "custom" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <CtrlField label={te.fieldMaxStudents} hint="vazio = ilimitado">
                <TextInput
                  type="number"
                  value={teamDraft.maxStudents}
                  onChange={(v) => setTeamDraft({ ...teamDraft, maxStudents: v })}
                />
              </CtrlField>
              <CtrlField label={te.fieldMaxCoaches} hint="vazio = ilimitado">
                <TextInput
                  type="number"
                  value={teamDraft.maxCoaches}
                  onChange={(v) => setTeamDraft({ ...teamDraft, maxCoaches: v })}
                />
              </CtrlField>
            </div>
          )}
        </div>

        <AlertDialogFooter style={footerStyle}>
          <AlertDialogCancel
            style={{
              height: 36,
              padding: "0 16px",
              borderRadius: 999,
              background: "rgba(232,244,255,0.07)",
              color: T.fg,
              border: `1px solid ${T.border}`,
              fontFamily: T.mono,
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            {te.cancel}
          </AlertDialogCancel>
          <Btn
            cyan
            sm
            disabled={acting || !teamDraft.name.trim() || !teamDraft.email.trim()}
            onClick={() => void doCreateTeam(setTeams)}
          >
            <Building2 className="h-3 w-3" />
            {acting ? te.creating : te.create}
          </Btn>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
