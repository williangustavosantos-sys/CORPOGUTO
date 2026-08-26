import { ApiError, apiRequest } from "./client"

function isGutoV3AuthEnabled() {
  return process.env.NEXT_PUBLIC_GUTO_V3_ENABLED === "true"
}

function isGutoV3PanelEnabled() {
  return process.env.NEXT_PUBLIC_GUTO_V3_PANEL_ENABLED === "true"
}

function rejectLegacyAuthSurface(feature: string): never {
  throw new ApiError(
    `A funcionalidade ${feature} não está disponível na autenticação isolada do Cérebro V3.`,
    409,
    { feature, brainVersion: "guto-cerebro-v3" },
    "V3_LEGACY_AUTH_DISABLED",
  )
}

function normalizeLoginIdentifier(value: string) {
  const trimmed = value.trim()
  return trimmed.includes("@") ? trimmed.toLowerCase() : trimmed
}

export interface AuthUser {
  userId: string
  name?: string
  email?: string
  role: "admin" | "coach" | "student" | "super_admin"
  coachId?: string
  teamId?: string
  active?: boolean
  subscriptionStatus?: string
  subscriptionEndsAt?: string | null
}

export interface LoginResponse {
  token: string
  role: AuthUser["role"]
  userId: string
  coachId?: string
  teamId?: string
  name?: string
  email?: string
  subscriptionStatus?: string
  subscriptionEndsAt?: string | null
}

export interface InvitePreview {
  name: string
  legalName?: string
  userId: string
  coachId: string
}

export async function loginAdmin(email: string, password: string): Promise<LoginResponse> {
  if (isGutoV3AuthEnabled() && !isGutoV3PanelEnabled()) rejectLegacyAuthSurface("login administrativo legado")
  return apiRequest<LoginResponse>("/auth/admin/login", {
    method: "POST",
    body: JSON.stringify({ email: normalizeLoginIdentifier(email), password }),
  })
}

export async function loginCoach(email: string, password: string): Promise<LoginResponse> {
  if (isGutoV3AuthEnabled() && !isGutoV3PanelEnabled()) rejectLegacyAuthSurface("login de coach legado")
  return apiRequest<LoginResponse>("/auth/coach/login", {
    method: "POST",
    body: JSON.stringify({ email: normalizeLoginIdentifier(email), password }),
  })
}

export async function loginUser(emailOrId: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>(isGutoV3AuthEnabled() ? "/guto/v3/auth/login" : "/auth/user/login", {
    method: "POST",
    body: JSON.stringify({ emailOrId: normalizeLoginIdentifier(emailOrId), password }),
  })
}

export async function getMe(): Promise<AuthUser> {
  return apiRequest<AuthUser>(isGutoV3AuthEnabled() ? "/guto/v3/auth/me" : "/auth/me", {
    suppressAuthRedirect: true,
  })
}

export async function getInvite(token: string): Promise<InvitePreview> {
  if (isGutoV3AuthEnabled()) rejectLegacyAuthSurface("convite legado")
  return apiRequest<InvitePreview>(`/auth/invite/${token}`)
}

export async function claimInvite(token: string, password: string): Promise<LoginResponse> {
  if (isGutoV3AuthEnabled()) rejectLegacyAuthSurface("ativação de convite legado")
  return apiRequest<LoginResponse>(`/auth/invite/${token}/claim`, {
    method: "POST",
    body: JSON.stringify({ password }),
  })
}

export async function logout(token?: string | null): Promise<void> {
  await apiRequest(isGutoV3AuthEnabled() ? "/guto/v3/auth/logout" : "/auth/logout", {
    method: "POST",
    token: token || undefined,
    suppressAuthRedirect: true,
  })
}

export async function deleteOwnAccount(): Promise<void> {
  if (isGutoV3AuthEnabled()) rejectLegacyAuthSurface("exclusão de conta legada")
  await apiRequest("/guto/account", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirmation: "EXCLUIR" }),
  })
}

// GDPR — Revoke consent on the server (P2-D from GUTO_SPRINT_ZERO).
// Clears sensitive health/fitness fields from the user's memory and flips
// consentHealthFitness to false. The account itself stays alive.
export async function revokeConsent(): Promise<void> {
  if (isGutoV3AuthEnabled()) rejectLegacyAuthSurface("revogação de consentimento legada")
  await apiRequest("/guto/consent/revoke", { method: "POST" })
}
