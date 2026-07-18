"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { Activity, ArrowLeft, Check, CheckCircle2, Download, Fingerprint, Languages, Loader2, Send, Settings, Shield, Trash2, UserRound, Volume2 } from "lucide-react"
import { Country } from "country-state-city"

import { BottomNavigation, type TabType } from "./bottom-navigation"
import { createGutoEffectRegistry } from "./effects"
import { ArenaTab } from "./tabs/arena-tab"
import { ChatTab } from "./tabs/chat-tab"
import { DietTab } from "./tabs/diet-tab"
import { EvolutionsTab } from "./tabs/evolutions-tab"
import { MissionTab } from "./tabs/mission-tab"
import { PathTab } from "./tabs/path-tab"
import { CalibrationScreen } from "./screens/calibration-screen"
import { ConsentScreen } from "./screens/consent-screen"
import { LanguageScreen } from "./screens/language-screen"
import type { MissionExercise } from "./view-models"
import { WorkoutValidationFlow } from "./validation/workout-validation-flow"
import { getApiErrorMessage } from "@/lib/api/client"
import { acceptGutoConsent, generateDietPlan, getGutoMemory, saveGutoMemory, trackGutoEvent, validateGutoName, type DietFood, type DietMeal, type DietPlan, type GutoMemory, type GutoNameValidation, type GutoTelemetryEvent, type GutoWorkoutPlan } from "@/lib/api/guto"
import { useAuth } from "@/components/auth-provider"
import { getInvite, claimInvite, logout, deleteOwnAccount, revokeConsent, type InvitePreview } from "@/lib/api/auth"
import type { EvolutionStage, SupportedLanguage } from "@/types/contract"
import { resolveGutoEvolutionStage } from "@/lib/guto-evolution"
import { getGutoVitalState } from "@/lib/guto-vital-state"
import { isPushSupported, getCurrentSubscription, subscribePush, unsubscribePush } from "@/lib/push-client"
import { createPortalSession, getBillingStatus, type BillingStatus } from "@/lib/api/billing"
import { translations } from "./translations"
import { gutoAudio } from "@/lib/audio-haptics"
import {
  firstGutoGivenName,
  firstRealGutoName,
  formatGutoDisplayName,
  hasCompleteGutoCalibration,
  isGenericGutoName,
  resolveGutoLanguage,
  isSupportedGutoLanguage,
  isNoPainPathology,
  resolveGutoProfile,
  type StoredGutoProfile,
} from "@/lib/guto-profile"
import { getWorkoutMissingFields, localizeGutoWorkoutPlan } from "@/lib/workout-plan"
import { resolveWorkoutValidationLocationMode } from "@/lib/workout-location"
import { hasDurableSovereignNameConfirmation, stageAfterInviteClaim } from "@/lib/onboarding-flow"

type AppStage = "intro" | "language" | "invite_claim" | "consent" | "naming" | "calibration" | "pact" | "system" | "settings"
type SettingsMode = "menu" | "language" | "name" | "data" | "profile" | "goal" | "location" | "pathology" | "physicaldata" | "residence" | "food_restrictions" | "privacy"
type IntroPlaybackState = "idle" | "starting" | "playing" | "finishing" | "finished"

const PENDING_INVITE_TOKEN_KEY = "guto-pending-invite-token"
const ENTRY_MODE_KEY = "guto-entry-mode"
const SELECTED_LANGUAGE_KEY = "guto-selected-language"
const ONBOARDING_LANGUAGE_KEY = "guto-onboarding-language"
const PRIVATE_STAGES = new Set<AppStage>(["consent", "naming", "calibration", "pact", "system", "settings"])

interface StoredProfile extends StoredGutoProfile {
  language: SupportedLanguage
  userName: string
  onboardingComplete: boolean
  namingConfirmed?: boolean
  calibrationComplete?: boolean
  pactAccepted?: boolean
  consentHealthFitness?: boolean
  acceptedTerms?: boolean
  consentAcceptedAt?: string
}

interface PendingExerciseQuestion {
  id: string
  exercise: MissionExercise
}

interface NameGate {
  status: "invalid" | "confirm"
  normalized: string
  message: string
  target: "onboarding" | "settings"
}

type GutoMemoryPayload = Parameters<typeof saveGutoMemory>[0]

const STORAGE_KEY = "guto-white-lab-profile"
const STORAGE_VERSION = 2  // bump aqui para forçar reset em todos os dispositivos
const STORAGE_VERSION_KEY = "guto-storage-version"
const DEBUG_RESET_KEY = "guto-debug-reset"
const HOLD_INTERVAL_MS = 16
const HOLD_INCREMENT = (HOLD_INTERVAL_MS / 1600) * 100
const INTRO_VIDEO_MS = 4000

const languages = [
  { id: "pt-BR" as const, label: "Português", asset: "/assets/guto/idioma-portugues.svg" },
  { id: "en-US" as const, label: "English", asset: "/assets/guto/idioma-english.svg" },
  { id: "it-IT" as const, label: "Italiano", asset: "/assets/guto/idioma-italiano.svg" },
]

const pactVeins = [0.16, 0.31, 0.5, 0.7, 0.84]
const pactNodes = [
  { left: 0.2, top: 0.28 },
  { left: 0.78, top: 0.32 },
  { left: 0.14, top: 0.62 },
  { left: 0.84, top: 0.66 },
]

const stageCopy: Record<
  SupportedLanguage,
  {
    namingTitle: string
    namingPlaceholder: string
    complete: string
    noReturn: string
    hold: string
    pactSealing: string
    pactConnecting: string
    status: string
    connection: string
    settingsTitle: string
    settingsLanguage: string
    settingsName: string
    settingsData: string
    settingsNamePlaceholder: string
    settingsSaveName: string
    settingsClose: string
    settingsBack: string
    settingsProfile: string
    settingsGoal: string
    settingsLocation: string
    settingsPathology: string
    settingsPhysicalData: string
    settingsResidence: string
    settingsFoodRestrictions: string
    settingsSave: string
    settingsSavedMsg: string
    profileSaveError: string
    settingsFoodIntolerances: string
    settingsPrivacy: string
    settingsPrivacySubtext: string
    privacyConsentTitle: string
    privacyHealthConsentLabel: string
    privacyTermsConsentLabel: string
    privacyAccepted: string
    privacyNotAccepted: string
    privacyAcceptedAt: string
    privacyDownload: string
    privacyCorrect: string
    privacyRevoke: string
    privacyDelete: string
    privacyCancel: string
    privacyRevokeWarning: string
    privacyRevokeConfirm: string
    privacyRevokedMsg: string
    privacyCorrectToast: string
    privacyDeleteStep1: string
    privacyDeleteStep2Label: string
    privacyDeleteConfirmWord: string
    privacyDeleteBtn: string
    privacyDeleteError: string
    privacyDeleteBetaTitle: string
    privacyDeleteBetaMsg: string
    pushTitle: string
    pushSubtitle: string
    pushEnable: string
    pushDisable: string
    pushDenied: string
    pushUnsupported: string
    nameConfirm: string
    nameChange: string
    nameTooShort: string
    nameTooLong: string
    nameInvalidChars: string
    nameConfirmPrompt: string
    nameAccepted: string
    submitNameAria: string
    billingTitle: string
    billingManage: string
    billingNoSubscription: string
    pactHoldAria: string
    startIntro: string
  }
> = {
  "pt-BR": {
    namingTitle: "GUTO & ________",
    namingPlaceholder: "SEU NOME",
    complete: "Complete.",
    noReturn: "Tem certeza? Depois que apertar, o jogo fica sério.",
    hold: "Pressione e segure",
    pactSealing: "SELANDO O PACTO...",
    pactConnecting: "CONECTANDO COM O GUTO...",
    status: "Status: Ativo",
    connection: "Conexão: Estável",
    settingsTitle: "Ajustes",
    settingsLanguage: "Idioma",
    settingsName: "Nome",
    settingsData: "Dados",
    settingsNamePlaceholder: "SEU NOME",
    settingsSaveName: "Salvar nome",
    settingsClose: "Fechar ajustes",
    settingsBack: "Voltar",
    settingsProfile: "Perfil",
    settingsGoal: "Objetivo",
    settingsLocation: "Local",
    settingsPathology: "Limitações",
    settingsPhysicalData: "Peso / Altura",
    settingsResidence: "Onde Mora",
    settingsFoodRestrictions: "Restrições",
    settingsSave: "Salvar",
    settingsSavedMsg: "Configurações salvas.",
    profileSaveError: "Não consegui salvar agora. Tente de novo.",
    settingsFoodIntolerances: "Intolerâncias",
    settingsPrivacy: "Privacidade e dados",
    settingsPrivacySubtext: "Baixe, corrija ou exclua seus dados.",
    privacyConsentTitle: "Consentimento",
    privacyHealthConsentLabel: "Dados de saúde/fitness",
    privacyTermsConsentLabel: "Termos e privacidade",
    privacyAccepted: "Aceito",
    privacyNotAccepted: "Não aceito",
    privacyAcceptedAt: "Data do aceite",
    privacyDownload: "Baixar meus dados",
    privacyCorrect: "Corrigir meus dados pessoais",
    privacyRevoke: "Revogar consentimentos",
    privacyDelete: "Excluir minha conta e meus dados",
    privacyCancel: "Cancelar",
    privacyRevokeWarning: "Se você revogar, o GUTO não poderá usar seus dados de saúde/fitness para gerar treino, dieta e acompanhamento.",
    privacyRevokeConfirm: "Revogar consentimentos",
    privacyRevokedMsg: "Consentimentos revogados.",
    privacyCorrectToast: "Você pode corrigir seus dados nas seções abaixo.",
    privacyDeleteStep1: "Esta ação remove seus dados pessoais, histórico, treino, dieta e progresso do GUTO, exceto dados que precisem ser mantidos por obrigação legal.",
    privacyDeleteStep2Label: "Digite EXCLUIR para confirmar",
    privacyDeleteConfirmWord: "EXCLUIR",
    privacyDeleteBtn: "Excluir definitivamente",
    privacyDeleteError: "Não foi possível excluir agora. Tente novamente.",
    privacyDeleteBetaTitle: "Solicitação registrada",
    privacyDeleteBetaMsg: "No beta, sua solicitação de exclusão foi registrada. Para exclusão imediata no servidor, entre em contato com o suporte do GUTO.",
    pushTitle: "Notificações do GUTO",
    pushSubtitle: "GUTO te lembra no horário e cobra ausência. Sem spam.",
    pushEnable: "Ativar notificações",
    pushDisable: "Desativar notificações",
    pushDenied: "Permissão bloqueada. Libere nas configurações do navegador.",
    pushUnsupported: "Este dispositivo não suporta notificações push.",
    nameConfirm: "Confirmar",
    nameChange: "Alterar",
    nameTooShort: "Nome curto demais. Me dá um nome real.",
    nameTooLong: "Nome longo demais. Usa até 20 caracteres.",
    nameInvalidChars: "Nome não precisa de número nem símbolo. Só letras.",
    nameConfirmPrompt: "Esse é o nome que você quer que eu use com você: {name}?",
    nameAccepted: "Nome aceito.",
    submitNameAria: "Enviar nome",
    billingTitle: "Assinatura",
    billingManage: "Gerenciar assinatura",
    billingNoSubscription: "Você ainda não tem uma assinatura ativa.",
    pactHoldAria: "Segurar para selar o pacto",
    startIntro: "Iniciar GUTO",
  },
  "en-US": {
    namingTitle: "GUTO & ________",
    namingPlaceholder: "YOUR NAME",
    complete: "Complete.",
    noReturn: "Are you sure? Once you tap, it gets serious.",
    hold: "Press and hold",
    pactSealing: "SEALING THE PACT...",
    pactConnecting: "CONNECTING WITH GUTO...",
    status: "Status: Active",
    connection: "Connection: Stable",
    settingsTitle: "Settings",
    settingsLanguage: "Language",
    settingsName: "Name",
    settingsData: "Data",
    settingsNamePlaceholder: "YOUR NAME",
    settingsSaveName: "Save name",
    settingsClose: "Close settings",
    settingsBack: "Back",
    settingsProfile: "Profile",
    settingsGoal: "Goal",
    settingsLocation: "Location",
    settingsPathology: "Limitations",
    settingsPhysicalData: "Weight / Height",
    settingsResidence: "Where You Live",
    settingsFoodRestrictions: "Restrictions",
    settingsSave: "Save",
    settingsSavedMsg: "Settings saved.",
    profileSaveError: "I could not save it right now. Try again.",
    settingsFoodIntolerances: "Intolerances",
    settingsPrivacy: "Privacy & Data",
    settingsPrivacySubtext: "Download, correct or delete your data.",
    privacyConsentTitle: "Consent",
    privacyHealthConsentLabel: "Health/fitness data",
    privacyTermsConsentLabel: "Terms & privacy",
    privacyAccepted: "Accepted",
    privacyNotAccepted: "Not accepted",
    privacyAcceptedAt: "Accepted on",
    privacyDownload: "Download my data",
    privacyCorrect: "Correct my personal data",
    privacyRevoke: "Revoke consents",
    privacyDelete: "Delete my account and data",
    privacyCancel: "Cancel",
    privacyRevokeWarning: "If you revoke, GUTO will not be able to use your health/fitness data to generate workouts, diet plans and tracking.",
    privacyRevokeConfirm: "Revoke consents",
    privacyRevokedMsg: "Consents revoked.",
    privacyCorrectToast: "You can correct your data in the sections below.",
    privacyDeleteStep1: "This action removes your personal data, history, workouts, diet and progress from GUTO, except data that must be kept by legal obligation.",
    privacyDeleteStep2Label: "Type DELETE to confirm",
    privacyDeleteConfirmWord: "DELETE",
    privacyDeleteBtn: "Delete permanently",
    privacyDeleteError: "Could not delete right now. Try again.",
    privacyDeleteBetaTitle: "Request registered",
    privacyDeleteBetaMsg: "In beta, your deletion request has been registered. For immediate server deletion, contact GUTO support.",
    pushTitle: "GUTO notifications",
    pushSubtitle: "GUTO reminds you on time and calls you out when you ghost. No spam.",
    pushEnable: "Enable notifications",
    pushDisable: "Disable notifications",
    pushDenied: "Permission blocked. Allow it in your browser settings.",
    pushUnsupported: "This device does not support push notifications.",
    nameConfirm: "Confirm",
    nameChange: "Change",
    nameTooShort: "Name is too short. Give me a real one.",
    nameTooLong: "Name is too long. Use up to 20 characters.",
    nameInvalidChars: "No numbers or symbols. Letters only.",
    nameConfirmPrompt: "Is this the name you want me to use with you: {name}?",
    nameAccepted: "Name accepted.",
    submitNameAria: "Submit name",
    billingTitle: "Subscription",
    billingManage: "Manage subscription",
    billingNoSubscription: "You don't have an active subscription yet.",
    pactHoldAria: "Hold to seal the pact",
    startIntro: "Start GUTO",
  },
  "it-IT": {
    namingTitle: "GUTO & ________",
    namingPlaceholder: "IL TUO NOME",
    complete: "Completa.",
    noReturn: "Sei sicuro? Dopo che tocchi, si fa sul serio.",
    hold: "Tieni premuto",
    pactSealing: "SIGILLANDO IL PATTO...",
    pactConnecting: "CONNESSIONE CON GUTO...",
    status: "Stato: Attivo",
    connection: "Connessione: Stabile",
    settingsTitle: "Impostazioni",
    settingsLanguage: "Lingua",
    settingsName: "Nome",
    settingsData: "Dati",
    settingsNamePlaceholder: "IL TUO NOME",
    settingsSaveName: "Salva nome",
    settingsClose: "Chiudi impostazioni",
    settingsBack: "Indietro",
    settingsProfile: "Profilo",
    settingsGoal: "Obiettivo",
    settingsLocation: "Luogo",
    settingsPathology: "Limitazioni",
    settingsPhysicalData: "Peso / Altezza",
    settingsResidence: "Dove Abiti",
    settingsFoodRestrictions: "Restrizioni",
    settingsSave: "Salva",
    settingsSavedMsg: "Impostazioni salvate.",
    profileSaveError: "Non sono riuscito a salvare ora. Riprova.",
    settingsFoodIntolerances: "Intolleranze",
    settingsPrivacy: "Privacy e dati",
    settingsPrivacySubtext: "Scarica, correggi o elimina i tuoi dati.",
    privacyConsentTitle: "Consenso",
    privacyHealthConsentLabel: "Dati salute/fitness",
    privacyTermsConsentLabel: "Termini e privacy",
    privacyAccepted: "Accettato",
    privacyNotAccepted: "Non accettato",
    privacyAcceptedAt: "Data di accettazione",
    privacyDownload: "Scarica i miei dati",
    privacyCorrect: "Correggi i miei dati personali",
    privacyRevoke: "Revoca i consensi",
    privacyDelete: "Elimina il mio account e i miei dati",
    privacyCancel: "Annulla",
    privacyRevokeWarning: "Se revochi, GUTO non potrà usare i tuoi dati salute/fitness per generare allenamenti, dieta e monitoraggio.",
    privacyRevokeConfirm: "Revoca i consensi",
    privacyRevokedMsg: "Consensi revocati.",
    privacyCorrectToast: "Puoi correggere i tuoi dati nelle sezioni qui sotto.",
    privacyDeleteStep1: "Questa azione rimuove i tuoi dati personali, la cronologia, gli allenamenti, la dieta e i progressi da GUTO, tranne i dati che devono essere conservati per obbligo legale.",
    privacyDeleteStep2Label: "Scrivi ELIMINA per confermare",
    privacyDeleteConfirmWord: "ELIMINA",
    privacyDeleteBtn: "Elimina definitivamente",
    privacyDeleteError: "Non è stato possibile eliminare ora. Riprova.",
    privacyDeleteBetaTitle: "Richiesta registrata",
    privacyDeleteBetaMsg: "In beta, la tua richiesta di eliminazione è stata registrata. Per l'eliminazione immediata dal server, contatta il supporto GUTO.",
    pushTitle: "Notifiche GUTO",
    pushSubtitle: "GUTO ti ricorda in orario e ti richiama quando sparisci. Niente spam.",
    pushEnable: "Attiva notifiche",
    pushDisable: "Disattiva notifiche",
    pushDenied: "Permesso bloccato. Abilitalo nelle impostazioni del browser.",
    pushUnsupported: "Questo dispositivo non supporta le notifiche push.",
    nameConfirm: "Conferma",
    nameChange: "Modifica",
    nameTooShort: "Nome troppo corto. Dammi un nome vero.",
    nameTooLong: "Nome troppo lungo. Usa al massimo 20 caratteri.",
    nameInvalidChars: "Niente numeri o simboli. Solo lettere.",
    nameConfirmPrompt: "È questo il nome che vuoi che usi con te: {name}?",
    nameAccepted: "Nome accettato.",
    submitNameAria: "Invia nome",
    billingTitle: "Abbonamento",
    billingManage: "Gestisci abbonamento",
    billingNoSubscription: "Non hai ancora un abbonamento attivo.",
    pactHoldAria: "Tieni premuto per sigillare il patto",
    startIntro: "Avvia GUTO",
  },
}

const inviteClaimCopy: Record<SupportedLanguage, {
  title: string; greetingPrefix: string; invited: string; createPass: string; confirmPass: string
  mismatch: string; tooShort: string; cta: string; activated: string; starting: string; back: string
  invalid: string; activationFailed: string
}> = {
  "pt-BR": {
    title: "Ativar acesso",
    greetingPrefix: "Ol\u00e1,", invited: "Voc\u00ea foi convidado para entrar no GUTO.",
    createPass: "Criar Senha", confirmPass: "Confirmar Senha",
    mismatch: "As senhas n\u00e3o coincidem.", tooShort: "A senha deve ter pelo menos 6 caracteres.",
    cta: "ATIVAR MEU GUTO", activated: "CONTA ATIVADA COM SUCESSO.", starting: "Iniciando sistema...", back: "Voltar para o In\u00edcio",
    invalid: "Convite inv\u00e1lido, expirado ou j\u00e1 utilizado.", activationFailed: "Erro ao ativar convite. Tente novamente.",
  },
  "en-US": {
    title: "Activate access",
    greetingPrefix: "Hi,", invited: "You've been invited to join GUTO.",
    createPass: "Create Password", confirmPass: "Confirm Password",
    mismatch: "Passwords don't match.", tooShort: "Password must be at least 6 characters.",
    cta: "ACTIVATE MY GUTO", activated: "ACCOUNT ACTIVATED SUCCESSFULLY.", starting: "Starting system...", back: "Back to Start",
    invalid: "Invalid, expired, or already used invite.", activationFailed: "Could not activate invite. Try again.",
  },
  "it-IT": {
    title: "Attiva accesso",
    greetingPrefix: "Ciao,", invited: "Sei stato invitato a entrare in GUTO.",
    createPass: "Crea Password", confirmPass: "Conferma Password",
    mismatch: "Le password non corrispondono.", tooShort: "La password deve avere almeno 6 caratteri.",
    cta: "ATTIVA IL MIO GUTO", activated: "ACCOUNT ATTIVATO CON SUCCESSO.", starting: "Avvio sistema...", back: "Torna all'Inizio",
    invalid: "Invito non valido, scaduto o gi\u00e0 utilizzato.", activationFailed: "Impossibile attivare l'invito. Riprova.",
  },
}

function formatGutoName(value: string) {
  return formatGutoDisplayName(value)
}

function onboardingSuggestedName(value?: string | null) {
  return firstGutoGivenName(value)
}

function normalizeGutoName(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function validateGutoNameLocally(value: string, language: SupportedLanguage = "pt-BR"): GutoNameValidation {
  const normalized = normalizeGutoName(value)
  const lower = normalized.toLocaleLowerCase(language)
  const copy = stageCopy[language]
  const suspiciousNames = new Set(["banana", "teste", "asdf", "qwerty", "nome", "usuario", "usuário", "nada", "ovo", "test", "user", "name"])

  if (normalized.length < 2) {
    return { status: "invalid", normalized, message: copy.nameTooShort }
  }

  if (normalized.length > 20) {
    return { status: "invalid", normalized, message: copy.nameTooLong }
  }

  if (!/^[\p{L} ]+$/u.test(normalized)) {
    return { status: "invalid", normalized, message: copy.nameInvalidChars }
  }

  if (suspiciousNames.has(lower)) {
    return {
      status: "confirm",
      normalized,
      message: copy.nameConfirmPrompt.replace("{name}", normalized),
    }
  }

  return { status: "valid", normalized, message: copy.nameAccepted }
}

const resolveEvolutionStage = resolveGutoEvolutionStage

async function resolveGutoNameValidation(value: string, language: SupportedLanguage, userId?: string) {
  try {
    return await validateGutoName(value, userId)
  } catch {
    return validateGutoNameLocally(value, language)
  }
}

function readStorageItem(key: string) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorageItem(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Safari/private browsing can block storage; the app must still run.
  }
}

function removeStorageItem(key: string) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Storage is optional for first-run access.
  }
}

function clearPendingInviteStorage() {
  removeStorageItem(PENDING_INVITE_TOKEN_KEY)
  removeStorageItem(ENTRY_MODE_KEY)
}

function writeOnboardingLanguageStorage(language: SupportedLanguage) {
  writeStorageItem(SELECTED_LANGUAGE_KEY, language)
  writeStorageItem(ONBOARDING_LANGUAGE_KEY, language)
  if (process.env.NODE_ENV === "development") {
    console.info("[GUTO_LANGUAGE] persisted", { language, source: "onboarding" })
  }
}

function writeConfirmedLanguageStorage(language: SupportedLanguage) {
  writeStorageItem(SELECTED_LANGUAGE_KEY, language)
  removeStorageItem(ONBOARDING_LANGUAGE_KEY)
  if (process.env.NODE_ENV === "development") {
    console.info("[GUTO_LANGUAGE] persisted", { language, source: "settings" })
  }
}

function readResolvedStoredLanguage({
  scope = "private",
  sessionLanguage,
  localProfileLanguage,
  memoryLanguage,
  fallbackLanguage,
}: {
  scope?: "onboarding" | "private"
  sessionLanguage?: string | null
  localProfileLanguage?: string | null
  memoryLanguage?: string | null
  fallbackLanguage?: string | null
}) {
  const resolved = resolveGutoLanguage({
    scope,
    sessionLanguage,
    onboardingLanguage: readStorageItem(ONBOARDING_LANGUAGE_KEY),
    localProfileLanguage,
    memoryLanguage,
    globalStoredLanguage: readStorageItem(SELECTED_LANGUAGE_KEY),
    fallbackLanguage,
  })
  if (process.env.NODE_ENV === "development") {
    console.info("[GUTO_LANGUAGE] resolved", { scope, language: resolved })
  }
  return resolved
}

function getPublicEntryStage(hasInviteToken: boolean, skipIntro: boolean): AppStage {
  if (skipIntro) return hasInviteToken ? "invite_claim" : "language"
  return "intro"
}

function hasStoredName(profile?: StoredProfile | null) {
  return Boolean(firstRealGutoName(profile?.userName))
}

function hasMemoryName(memory?: GutoMemory | null) {
  return Boolean(firstRealGutoName(memory?.name))
}

function sameMemoryPatchValue(current: unknown, incoming: unknown): boolean {
  if (Object.is(current, incoming)) return true
  if (!current || !incoming || typeof current !== "object" || typeof incoming !== "object") return false
  try {
    return JSON.stringify(current) === JSON.stringify(incoming)
  } catch {
    return false
  }
}

function normalizeCountryLookup(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
}

function resolveCountryCodeFromDraft(country: string, language: SupportedLanguage): string | undefined {
  const raw = country.trim()
  if (!raw) return undefined

  const directCode = raw.toUpperCase()
  if (/^[A-Z]{2}$/.test(directCode) && Country.getCountryByCode(directCode)) return directCode

  const aliases: Record<string, string> = {
    brasil: "BR",
    brazil: "BR",
    italia: "IT",
    italy: "IT",
    usa: "US",
    eua: "US",
    "estados unidos": "US",
    "united states": "US",
    portugal: "PT",
    espanha: "ES",
    spain: "ES",
    franca: "FR",
    france: "FR",
    alemanha: "DE",
    germany: "DE",
    argentina: "AR",
  }
  const normalizedRaw = normalizeCountryLookup(raw)
  const alias = aliases[normalizedRaw]
  if (alias) return alias

  const locales = Array.from(new Set([language, "pt-BR", "en-US", "it-IT"]))
  const displayNames = locales.map((locale) => new Intl.DisplayNames([locale], { type: "region" }))

  return Country.getAllCountries().find((countryOption) => {
    if (normalizeCountryLookup(countryOption.isoCode) === normalizedRaw) return true
    if (normalizeCountryLookup(countryOption.name) === normalizedRaw) return true
    return displayNames.some((names) => normalizeCountryLookup(names.of(countryOption.isoCode) ?? "") === normalizedRaw)
  })?.isoCode
}

function hasMemoryCalibration(memory?: GutoMemory | null) {
  return hasCompleteGutoCalibration(memory)
}

function hasMemoryConsent(memory?: GutoMemory | null) {
  return Boolean(memory?.consentHealthFitness && memory?.acceptedTerms)
}

function resolveAuthenticatedStage(
  user: { userId: string } | null | undefined,
  profile?: StoredProfile | null,
  memory?: GutoMemory | null
): AppStage {
  if (!user) return "intro"


  // Fase 2A — backend é a fonte de verdade do consentimento (igual à calibragem).
  // Se a memória do backend carregou, ela manda; localStorage é só cache/UX.
  // Assim, consentimento revogado em outro device força a tela de consent mesmo
  // que o cache local diga o contrário.
  const consentMissing = memory
    ? !hasMemoryConsent(memory)
    : (!profile?.consentHealthFitness || !profile?.acceptedTerms)
  if (consentMissing) {
    return "consent"
  }

  // Pacto concluído no backend (`initialXpGranted`) é a prova de que o aluno
  // completou TODO o onboarding (consent→naming→calibragem→pacto) em algum
  // device. É a fonte de verdade do RETORNO: um login novo (sem flags locais no
  // localStorage) vai DIRETO pro chat, em vez de repetir naming/pacto. O backend
  // só concede esse XP inicial quando o aluno assina o pacto (grantInitialXp).
  const pactDoneBackend = Boolean(memory?.initialXpGranted)

  // namingConfirmed: confirmação do aluno NESTE device (flag local) OU prova no
  // backend (pacto feito ⇒ naming já foi confirmado antes). Sempre exige um nome
  // real. Nome só de admin (preset do convite), sem confirmação nem pacto, NÃO
  // conta — preserva a regra do Nome Soberano.
  const hasRealName = hasStoredName(profile) || hasMemoryName(memory)
  const namingConfirmed = hasDurableSovereignNameConfirmation(profile, memory)
  if (!namingConfirmed || !hasRealName) {
    return "naming"
  }

  // Santo Graal §7.6 — backend é a fonte de verdade da calibragem.
  // NÃO confiar só no flag local `calibrationComplete`: o localStorage pode
  // estar poluído (mesmo navegador, multi-conta, aluno cadastrado pelo coach).
  // Se a memória do backend carregou e NÃO tem a calibragem, força a tela —
  // mesmo que o profile local diga completo. Só caímos no flag local quando a
  // memória não carregou (memory == null), pra não prender quem já calibrou.
  const calibrationMissing = memory ? !hasMemoryCalibration(memory) : !profile?.calibrationComplete
  if (calibrationMissing) {
    return "calibration"
  }

  // Pacto: quando a memória carregou, o backend manda. Flag local só serve como
  // fallback se a memória não carregou; isso evita entrar no app sem XP/pacto
  // gravados no servidor.
  const pactDoneLocal = Boolean(profile?.onboardingComplete || profile?.pactAccepted)
  if (memory ? pactDoneBackend : pactDoneLocal) {
    return "system"
  }

  return "pact"
}

export function GutoApp({
  userName,
  language,
  skipIntro = false,
}: {
  userName: string
  language: string
  skipIntro?: boolean
}) {
  const { user, login, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [isHydrated, setIsHydrated] = useState(false)
  const [stage, setStage] = useState<AppStage>(skipIntro ? "language" : "intro")
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>("pt-BR")
  const [draftName, setDraftName] = useState("")
  const [committedName, setCommittedName] = useState("")
  const [activeTab, setActiveTab] = useState<TabType>("guto")
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)
  const [evolution, setEvolution] = useState<EvolutionStage>("baby")
  const [activeLanguageGlow, setActiveLanguageGlow] = useState<SupportedLanguage | null>(null)
  const [rotatingLanguage, setRotatingLanguage] = useState(false)
  const [isHoldingPact, setIsHoldingPact] = useState(false)
  const [pactProgress, setPactProgress] = useState(0)
  const [whiteout, setWhiteout] = useState(false)
  const [introNeedsActivation, setIntroNeedsActivation] = useState(true)
  const [introPlaybackState, setIntroPlaybackState] = useState<IntroPlaybackState>("idle")
  const [settingsMode, setSettingsMode] = useState<SettingsMode>("menu")
  const [settingsNameDraft, setSettingsNameDraft] = useState("")
  const [settingsSexDraft, setSettingsSexDraft] = useState<"male" | "female" | null>(null)
  const [settingsAgeDraft, setSettingsAgeDraft] = useState("")
  const [settingsGoalDraft, setSettingsGoalDraft] = useState<string | null>(null)
  const [settingsLocationDraft, setSettingsLocationDraft] = useState<string | null>(null)
  const [settingsPathologyDraft, setSettingsPathologyDraft] = useState("")
  const [settingsWeightDraft, setSettingsWeightDraft] = useState("")
  const [settingsHeightDraft, setSettingsHeightDraft] = useState("")
  const [settingsCountryDraft, setSettingsCountryDraft] = useState("")
  const [settingsCityDraft, setSettingsCityDraft] = useState("")
  const [settingsFoodRestrictionsDraft, setSettingsFoodRestrictionsDraft] = useState("")
  const [settingsSavedToast, setSettingsSavedToast] = useState(false)
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null)
  const [privacyConfirm, setPrivacyConfirm] = useState<"revoke" | "delete-step1" | "delete-step2" | "delete-done" | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [privacyMsg, setPrivacyMsg] = useState<string | null>(null)
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushMsg, setPushMsg] = useState<string | null>(null)
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null)
  const [billingBusy, setBillingBusy] = useState(false)
  const [billingMsg, setBillingMsg] = useState<string | null>(null)
  const [pendingExerciseQuestion, setPendingExerciseQuestion] =
    useState<PendingExerciseQuestion | null>(null)
  const [pendingFoodQuestion, setPendingFoodQuestion] = useState<{ food: DietFood; meal: DietMeal } | null>(null)
  const [workoutPlan, setWorkoutPlan] = useState<GutoWorkoutPlan | null>(null)
  const [memory, setMemory] = useState<GutoMemory | null>(null)
  const [gutoUserId, setGutoUserId] = useState(user?.userId || "guest")
  const [nameGate, setNameGate] = useState<NameGate | null>(null)
  const [isValidatingName, setIsValidatingName] = useState(false)
  const [showValidationFlow, setShowValidationFlow] = useState(false)
  const [arenaRefreshKey, setArenaRefreshKey] = useState(0)
  const [pendingInviteToken, setPendingInviteToken] = useState<string | null>(null)
  const [inviteClaimData, setInviteClaimData] = useState<InvitePreview | null>(null)
  const [invitePassword, setInvitePassword] = useState("")
  const [inviteConfirmPassword, setInviteConfirmPassword] = useState("")
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSubmitting, setInviteSubmitting] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)

  const timersRef = useRef<number[]>([])
  const pactIntervalRef = useRef<number | null>(null)
  const introSafetyTimerRef = useRef<number | null>(null)
  const introFinishedRef = useRef(false)
  const introStartedRef = useRef(false)
  const introStartedAtRef = useRef(0)
  const pactCompleteRef = useRef(false)
  const portalVideoRef = useRef<HTMLVideoElement | null>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)
  const memoryRef = useRef<GutoMemory | null>(null)
  const effectRegistry = useMemo(() => createGutoEffectRegistry(), [])

  useEffect(() => {
    memoryRef.current = memory
  }, [memory])

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((id) => id !== timer)
      callback()
    }, delay)
    timersRef.current.push(timer)
  }, [])

  const clearScheduled = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
    timersRef.current = []
  }, [])

  const clearPactInterval = useCallback(() => {
    if (pactIntervalRef.current) {
      window.clearInterval(pactIntervalRef.current)
      pactIntervalRef.current = null
    }
  }, [])

  const clearIntroSafetyTimer = useCallback(() => {
    if (introSafetyTimerRef.current) {
      window.clearTimeout(introSafetyTimerRef.current)
      introSafetyTimerRef.current = null
    }
  }, [])

  const persistProfile = useCallback(
    (next: Partial<StoredProfile>) => {
      if (typeof window === "undefined" || !user?.userId) return

      const storageKey = `${STORAGE_KEY}-${user.userId}`
      const existingRaw = readStorageItem(storageKey)
      let existing: StoredProfile = {
        language: selectedLanguage,
        userName: committedName,
        onboardingComplete: false,
      }

      if (existingRaw) {
        try {
          existing = JSON.parse(existingRaw) as StoredProfile
        } catch {
          removeStorageItem(storageKey)
        }
      }

      const payload: StoredProfile = {
        ...existing,
        language: selectedLanguage,
        userName: committedName,
        ...next,
      }

      writeStorageItem(storageKey, JSON.stringify(payload))
    },
    [committedName, selectedLanguage, user]
  )

  const persistMemory = useCallback(
    async (payload: GutoMemoryPayload, options?: { optimistic?: boolean }) => {
      const shouldOptimisticallyUpdate = options?.optimistic !== false
      const memoryBeforeSave = memoryRef.current
      const rollbackOptimisticUpdate = () => {
        if (shouldOptimisticallyUpdate) {
          memoryRef.current = memoryBeforeSave
          setMemory(memoryBeforeSave)
        }
      }

      if (shouldOptimisticallyUpdate) {
        const optimisticMemory = memoryBeforeSave ? { ...memoryBeforeSave, ...payload } : (payload as GutoMemory)
        memoryRef.current = optimisticMemory
        setMemory(optimisticMemory)
      }

      if (!user?.userId) {
        rollbackOptimisticUpdate()
        return null
      }

      try {
        const updated = await saveGutoMemory({
          userId: gutoUserId,
          language: selectedLanguage,
          ...payload,
        })
        memoryRef.current = updated
        setMemory(updated)
        return updated
      } catch (error) {
        rollbackOptimisticUpdate()
        console.warn(`Memória do GUTO não sincronizada: ${getApiErrorMessage(error)}`)
        return null
      }
    },
    [gutoUserId, selectedLanguage, user?.userId]
  )

  const trackBehaviorEvent = useCallback(
    (event: GutoTelemetryEvent, metadata?: Record<string, unknown>) => {
      if (!user?.userId) return
      void trackGutoEvent({
        event,
        userId: gutoUserId,
        language: selectedLanguage,
        metadata,
      }).catch((error) => {
        console.warn(`Evento do GUTO não registrado: ${getApiErrorMessage(error)}`)
      })
    },
    [gutoUserId, selectedLanguage, user?.userId]
  )

  const previousStageRef = useRef<AppStage | null>(null)

  useEffect(() => {
    if (previousStageRef.current && previousStageRef.current !== stage) {
      gutoAudio.playGutoFeedback('transition')
    }
    previousStageRef.current = stage
  }, [stage])

  useEffect(() => {
    const shell = shellRef.current
    if (!shell || typeof window === "undefined") return

    let frame = 0
    let lastKeyboardOpen = false

    const syncViewport = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        const visualViewport = window.visualViewport
        const viewportHeight = Math.max(320, Math.round(visualViewport?.height ?? window.innerHeight))
        const viewportWidth = Math.round(visualViewport?.width ?? window.innerWidth)
        const offsetTop = Math.max(0, Math.round(visualViewport?.offsetTop ?? 0))
        const keyboardOffset = Math.max(0, Math.round(window.innerHeight - viewportHeight - offsetTop))
        const activeElement = document.activeElement
        const isTextInput =
          activeElement instanceof HTMLElement &&
          activeElement.matches("input, textarea, [contenteditable='true']")
        const keyboardOpen = isTextInput && (keyboardOffset > 60 || window.innerHeight - viewportHeight > 60)

        const viewportHeightValue = keyboardOpen ? `${viewportHeight}px` : "100dvh"
        shell.style.setProperty("--guto-viewport-height", viewportHeightValue)
        shell.style.setProperty("--guto-viewport-width", `${viewportWidth}px`)
        shell.style.setProperty("--guto-keyboard-offset", `${keyboardOffset}px`)
        shell.toggleAttribute("data-keyboard-open", keyboardOpen)
        // Mirror viewport vars on <html> so portals (selects, modals) renderizados fora de
        // .sala-guto também respondem ao teclado iOS sem cair no fallback 100dvh.
        const root = document.documentElement
        root.style.setProperty("--guto-viewport-height", viewportHeightValue)
        root.style.setProperty("--guto-viewport-width", `${viewportWidth}px`)
        root.style.setProperty("--guto-keyboard-offset", `${keyboardOffset}px`)
        root.toggleAttribute("data-keyboard-open", keyboardOpen)
        if (keyboardOpen !== lastKeyboardOpen) {
          lastKeyboardOpen = keyboardOpen
          setIsKeyboardOpen(keyboardOpen)
        }
      })
    }

    syncViewport()
    window.addEventListener("resize", syncViewport)
    window.addEventListener("orientationchange", syncViewport)
    window.addEventListener("focusin", syncViewport)
    window.addEventListener("focusout", syncViewport)
    window.visualViewport?.addEventListener("resize", syncViewport)
    window.visualViewport?.addEventListener("scroll", syncViewport)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener("resize", syncViewport)
      window.removeEventListener("orientationchange", syncViewport)
      window.removeEventListener("focusin", syncViewport)
      window.removeEventListener("focusout", syncViewport)
      window.visualViewport?.removeEventListener("resize", syncViewport)
      window.visualViewport?.removeEventListener("scroll", syncViewport)
      const root = document.documentElement
      root.style.removeProperty("--guto-viewport-height")
      root.style.removeProperty("--guto-viewport-width")
      root.style.removeProperty("--guto-keyboard-offset")
      root.removeAttribute("data-keyboard-open")
    }
  }, [])

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = selectedLanguage
    }
  }, [selectedLanguage])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (authLoading) return
    let cancelled = false

    if (!user?.userId) {
      const savedLang = readResolvedStoredLanguage({ scope: "onboarding", fallbackLanguage: language })
      const savedInviteToken = readStorageItem(PENDING_INVITE_TOKEN_KEY)
      const savedEntryMode = readStorageItem(ENTRY_MODE_KEY)
      setSelectedLanguage(savedLang)
      if (savedInviteToken) {
        setPendingInviteToken(savedInviteToken)
        if (savedEntryMode !== "invite") writeStorageItem(ENTRY_MODE_KEY, "invite")
        setStage(getPublicEntryStage(true, skipIntro))
      } else if (savedEntryMode === "invite") {
        removeStorageItem(ENTRY_MODE_KEY)
      } else {
        // Idioma é lei: quem já escolheu idioma não vê o seletor de novo ao reabrir —
        // vai direto para o login no idioma salvo (não repergunta o idioma toda vez).
        const alreadyChoseLanguage =
          isSupportedGutoLanguage(readStorageItem(SELECTED_LANGUAGE_KEY)) ||
          isSupportedGutoLanguage(readStorageItem(ONBOARDING_LANGUAGE_KEY))
        if (skipIntro && alreadyChoseLanguage) {
          setIsHydrated(true)
          router.replace(`/login?lang=${savedLang}`)
          return
        }
        setStage(getPublicEntryStage(false, skipIntro))
      }
      setIsHydrated(true)
      return
    }

    const hydrateAuthenticatedUser = async () => {
      try {
        const currentUserId = user.userId
        setGutoUserId(currentUserId)

        const search = new URLSearchParams(window.location.search)
        const forceResetParam = search.get("forceReset") === "1"
        const presetName = search.get("presetName")

        const userStorageKey = `${STORAGE_KEY}-${currentUserId}`
        const userVersionKey = `${STORAGE_VERSION_KEY}-${currentUserId}`

        const storedVersion = parseInt(readStorageItem(userVersionKey) ?? "0", 10)
        const versionOutdated = storedVersion < STORAGE_VERSION

        const shouldReset =
          search.get("guto-reset") === "1" || forceResetParam || readStorageItem(DEBUG_RESET_KEY) === "1" || versionOutdated


        if (shouldReset) {
          removeStorageItem(userStorageKey)
          removeStorageItem(DEBUG_RESET_KEY)
          writeStorageItem(userVersionKey, String(STORAGE_VERSION))
        } else {
          writeStorageItem(userVersionKey, String(STORAGE_VERSION))
        }

        // Cleanup URL parameters precisely once without triggering a re-render
        if (search.has("guto-reset") || search.has("forceReset") || search.has("skip-intro")) {
          const url = new URL(window.location.href);
          url.searchParams.delete("guto-reset");
          url.searchParams.delete("skip-intro");
          url.searchParams.delete("forceReset");
          url.searchParams.delete("presetName");
          window.history.replaceState({}, document.title, url.toString());
        }

        const storedRaw = readStorageItem(userStorageKey)
        let stored: StoredProfile | null = null

        if (storedRaw) {
          try {
            stored = JSON.parse(storedRaw) as StoredProfile
          } catch {
            removeStorageItem(userStorageKey)
          }
        }

        let loadedMemory: GutoMemory | null = null
        try {
          loadedMemory = await getGutoMemory()
        } catch {
          loadedMemory = null
        }

        if (cancelled) return

        const onboardingIncomplete = !stored?.onboardingComplete && !stored?.pactAccepted
        const persistedLanguage = readResolvedStoredLanguage({
          scope: onboardingIncomplete ? "onboarding" : "private",
          localProfileLanguage: stored?.language,
          memoryLanguage: loadedMemory?.language,
          fallbackLanguage: language,
        })
        if (process.env.NODE_ENV === "development") {
          console.info("[GUTO_LANGUAGE] resolved after auth:", persistedLanguage)
        }

        const localPactDone = Boolean(stored?.onboardingComplete || stored?.pactAccepted)
        if (
          localPactDone &&
          loadedMemory &&
          hasMemoryConsent(loadedMemory) &&
          hasCompleteGutoCalibration(loadedMemory) &&
          !loadedMemory.initialXpGranted
        ) {
          const repairPayload: GutoMemoryPayload = {
            userId: currentUserId,
            language: persistedLanguage,
            xpEvent: "grant_initial_xp",
          }
          const repairedName = firstRealGutoName(stored?.userName, loadedMemory.name)
          if (repairedName) repairPayload.name = repairedName
          try {
            loadedMemory = await saveGutoMemory(repairPayload)
            if (cancelled) return
          } catch (error) {
            console.warn(`Pacto do GUTO não reconciliado: ${getApiErrorMessage(error)}`)
          }
        }

        if (loadedMemory) {
          setMemory(loadedMemory)
          setEvolution(resolveEvolutionStage(loadedMemory.totalXp || 0))
          // Prefer coach-set weekly plan for today over the GUTO-generated lastWorkoutPlan
          const weekDays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const
          const todayKey = weekDays[new Date().getDay()]
          const todayWeeklyWorkout = loadedMemory.weeklyWorkoutPlan?.days?.[todayKey]
          if (todayWeeklyWorkout?.exercises?.length) {
            setWorkoutPlan(todayWeeklyWorkout)
          } else if (loadedMemory.lastWorkoutPlan?.exercises?.length) {
            setWorkoutPlan(loadedMemory.lastWorkoutPlan)
          }
        }

        const resolvedProfile = resolveGutoProfile({
          user,
          stored,
          memory: loadedMemory,
          fallbackName: firstRealGutoName(presetName, userName),
        })
        const resolvedName = resolvedProfile.displayName

        setSelectedLanguage(persistedLanguage)
        // Idioma é lei: o boot aplica o idioma resolvido, mas NUNCA sobrescreve uma
        // escolha explícita já salva com o fallback pt-BR. Só grava quando ainda não
        // existe idioma salvo (primeira persistência), preservando a escolha do usuário
        // mesmo que a memória do backend falhe ao carregar.
        if (
          isSupportedGutoLanguage(persistedLanguage) &&
          !isSupportedGutoLanguage(readStorageItem(SELECTED_LANGUAGE_KEY))
        ) {
          writeStorageItem(SELECTED_LANGUAGE_KEY, persistedLanguage)
        }
        if (process.env.NODE_ENV === "development") {
          console.info("[GUTO_LANGUAGE] applied in private app:", persistedLanguage)
        }

        const hasConfirmedName = Boolean(stored?.namingConfirmed || stored?.onboardingComplete)
        const onboardingDraftName = hasConfirmedName ? resolvedName : onboardingSuggestedName(resolvedName)

        // Only set committedName (used in the chat header) if the user has already
        // confirmed their own name. If they're still at the naming screen, only
        // pre-fill draftName so the presetName from the invite does not leak into the UI.
        setDraftName(onboardingDraftName)
        setCommittedName(hasConfirmedName ? resolvedName : "")

        persistProfile({
          language: persistedLanguage,
          onboardingComplete: Boolean(stored?.onboardingComplete),
          ...(hasConfirmedName && resolvedName ? { userName: resolvedName } : {})
        })

        if (hasConfirmedName && resolvedName && (!loadedMemory || isGenericGutoName(loadedMemory.name))) {
          void persistMemory({ name: resolvedName, language: persistedLanguage })
        }

        setStage(resolveAuthenticatedStage(user, stored, loadedMemory))
      } catch {
        if (cancelled) return
        const safeLanguage = readResolvedStoredLanguage({ scope: "private", fallbackLanguage: language })
        setSelectedLanguage(safeLanguage)
        setDraftName(onboardingSuggestedName(userName || ""))
        setCommittedName("")
        setStage(resolveAuthenticatedStage(user, null, null))
      } finally {
        if (!cancelled) setIsHydrated(true)
      }
    }

    void hydrateAuthenticatedUser()

    return () => {
      cancelled = true
      clearScheduled()
      clearPactInterval()
      clearIntroSafetyTimer()
    }
  }, [authLoading, clearIntroSafetyTimer, clearPactInterval, clearScheduled, language, persistMemory, persistProfile, router, skipIntro, user, userName])

  useEffect(() => {
    if (authLoading || !isHydrated) return

    if (user && user.role !== "student") {
      router.replace("/coach")
      return
    }

    // VISITORS (unauthenticated) flow: Always Intro -> Video -> Language
    // Never redirect to login if we haven't reached the language selection stage yet
    if (!user) {
      if (stage !== "intro" && stage !== "language" && stage !== "invite_claim") {
        // If somehow in a private stage without being logged in, reset to intro
        if (PRIVATE_STAGES.has(stage)) {
          setStage("intro")
        }
      }
      return
    }

    // AUTHENTICATED users flow: public stages are not repeated, but private onboarding cannot be skipped.
    if (!PRIVATE_STAGES.has(stage)) {
      clearPendingInviteStorage()
      setPendingInviteToken(null)
      const guardStoredRaw = readStorageItem(`${STORAGE_KEY}-${user.userId}`)
      let guardProfile: StoredProfile | null = null
      try { guardProfile = guardStoredRaw ? JSON.parse(guardStoredRaw) as StoredProfile : null } catch { guardProfile = null }
      setStage(resolveAuthenticatedStage(user, guardProfile, memory))
      return
    }
  }, [authLoading, isHydrated, memory, router, stage, user])

  useEffect(() => {
    if (stage === "intro") {
      introFinishedRef.current = false
      introStartedRef.current = false
      clearIntroSafetyTimer()
      setIntroNeedsActivation(true)
      setIntroPlaybackState("idle")
    }
  }, [clearIntroSafetyTimer, stage])

  const startSystem = useCallback(
    async (finalName: string, finalLanguage: SupportedLanguage) => {
      if (pactCompleteRef.current) return
      pactCompleteRef.current = true
      gutoAudio.stopGutoSound("hold_charge")
      setProfileSaveError(null)

      const updated = await persistMemory({
        name: finalName,
        language: finalLanguage,
        trainedToday: false,
        xpEvent: "grant_initial_xp",
      }, { optimistic: false })

      if (!updated) {
        pactCompleteRef.current = false
        setPactProgress(0)
        setIsHoldingPact(false)
        setWhiteout(false)
        gutoAudio.playGutoFeedback("error")
        setProfileSaveError(stageCopy[finalLanguage].profileSaveError)
        return
      }

      gutoAudio.playGutoFeedback("hold_complete")
      effectRegistry.emit("whiteout")
      persistProfile({
        language: finalLanguage,
        userName: finalName,
        calibrationComplete: true,
        pactAccepted: true,
        onboardingComplete: true,
      })
      trackBehaviorEvent("pact_completed", { finalLanguage })
      setMemory(updated)
      setEvolution(resolveEvolutionStage(updated.totalXp || 0))
      setPactProgress(100)
      setIsHoldingPact(false)
      setWhiteout(true)
      schedule(() => {
        setStage("system")
      }, 140)
      schedule(() => {
        setWhiteout(false)
        setPactProgress(0)
      }, 860)
      schedule(() => {
        void getGutoMemory().then((fresh) => {
          if (fresh) setMemory(fresh)
        }).catch(() => {})
      }, 1200)
    },
    [effectRegistry, persistMemory, persistProfile, schedule, setMemory, trackBehaviorEvent]
  )

  const handleConsentAccepted = useCallback(async () => {
    // Fase 2A — o aceite tem de ser gravado no backend (fonte de verdade).
    // Se o backend falhar, NÃO avança nem finge que salvou.
    setProfileSaveError(null)
    let updated: GutoMemory | null = null
    try {
      updated = await acceptGutoConsent()
    } catch {
      updated = null
    }
    if (!updated) {
      gutoAudio.playGutoFeedback("error")
      setProfileSaveError(stageCopy[selectedLanguage].profileSaveError)
      return
    }
    // Backend confirmou: espelha no estado em memória + cache local (UX), e avança.
    memoryRef.current = updated
    setMemory(updated)
    persistProfile({
      language: selectedLanguage,
      consentHealthFitness: true,
      acceptedTerms: true,
      consentAcceptedAt: updated.consentAcceptedAt ?? new Date().toISOString(),
    })
    const storedRaw = readStorageItem(`${STORAGE_KEY}-${user?.userId}`)
    let stored: StoredProfile | null = null
    try { stored = storedRaw ? JSON.parse(storedRaw) as StoredProfile : null } catch { stored = null }
    setStage(resolveAuthenticatedStage(user, stored, updated))
  }, [persistProfile, selectedLanguage, user])

  // ── Unique completer: ONLY sets stage to language, never decides login/invite ─
  const completeIntroToLanguage = useCallback(() => {
    if (introFinishedRef.current) return
    introFinishedRef.current = true
    clearIntroSafetyTimer()
    effectRegistry.emit("portal_open")
    setIntroPlaybackState("finished")
    setStage("language")
  }, [clearIntroSafetyTimer, effectRegistry])

  const restartPortalVideo = useCallback(() => {
    const video = portalVideoRef.current
    if (!video || introStartedRef.current) return

    video.pause()
    video.controls = false
    video.defaultMuted = true
    video.muted = true
    video.volume = 1
    // Force back to frame 0 so Safari doesn't show a pre-buffered frame
    try { video.currentTime = 0 } catch { /* ignore Safari timing errors */ }
  }, [])

  // ── Single entry point for the intro — always 4000ms, no variable timers ──
  const startIntroVideo = useCallback(() => {
    gutoAudio.playGutoFeedback("tap")
    if (introStartedRef.current) return // prevent double-tap
    clearIntroSafetyTimer()
    introStartedRef.current = true
    introStartedAtRef.current = Date.now()
    introFinishedRef.current = false
    setIntroPlaybackState("starting")

    const video = portalVideoRef.current

    // SAFARI FIX: Reset to frame 0 BEFORE making the video visible.
    // Safari pre-buffers frames during preload, so we must seek back
    // imperatively before the visibility state change triggers a re-render.
    if (video) {
      video.pause()
      try { video.currentTime = 0 } catch { /* Safari rejects before metadata — ignore */ }
    }

    // Now safe to reveal the video (React re-render will show frame 0)
    setIntroNeedsActivation(false)

    // Safety timer is the MASTER control: 4000ms fixed
    introSafetyTimerRef.current = window.setTimeout(completeIntroToLanguage, INTRO_VIDEO_MS)

    if (!video) {
      return
    }

    video.controls = false
    video.playsInline = true
    video.setAttribute("playsinline", "")
    video.setAttribute("webkit-playsinline", "")

    // Use requestAnimationFrame so the seek to 0 has been painted
    // before we start playback — critical for Safari
    requestAnimationFrame(() => {

      // Try unmuted first
      video.muted = false
      video.defaultMuted = false
      video.volume = 1

      video.play()
        .then(() => {
          setIntroPlaybackState("playing")
        })
        .catch(() => {
          video.muted = true
          video.defaultMuted = true
          video.setAttribute("muted", "")
          video.play()
            .then(() => {
              setIntroPlaybackState("playing")
            })
            .catch(() => {
            })
        })
    })
  }, [clearIntroSafetyTimer, completeIntroToLanguage])

  const handleIntroVideoEnded = useCallback(() => {
  }, [])

  const handleLanguageSelect = useCallback(
    (lang: SupportedLanguage) => {
      gutoAudio.playGutoFeedback("select")
      if (rotatingLanguage) return

      effectRegistry.emit("language_select", { meta: { language: lang } })
      setSelectedLanguage(lang)
      writeOnboardingLanguageStorage(lang)
      if (process.env.NODE_ENV === "development") {
        console.info("[GUTO_LANGUAGE] onboarding selected:", lang)
      }

      if (!user) {
        if (typeof window !== "undefined") {
          const pendingToken = localStorage.getItem(PENDING_INVITE_TOKEN_KEY)
          
          if (pendingToken) {
            setPendingInviteToken(pendingToken)
            setActiveLanguageGlow(lang)
            setRotatingLanguage(true)
            schedule(() => {
              setStage("invite_claim")
              setRotatingLanguage(false)
              setActiveLanguageGlow(null)
            }, 560)
            return
          }
        }
        
        const target = `/login?lang=${lang}`
        router.push(target)
        return
      }

      // If user is already logged in (re-selecting language or returning)
      setActiveLanguageGlow(lang)
      setNameGate(null)
      setRotatingLanguage(true)
      persistProfile({ language: lang, onboardingComplete: false })
      persistMemory({ language: lang })
      schedule(() => {
        setStage("naming")
        setRotatingLanguage(false)
        setActiveLanguageGlow(null)
      }, 560)
    },
    [effectRegistry, persistMemory, persistProfile, rotatingLanguage, router, schedule, user]
  )

  const commitOnboardingName = useCallback(
    (name: string, confirmedName = false) => {
      const normalizedName = formatGutoName(name)
      if (!normalizedName) return

      setNameGate(null)
      setCommittedName(normalizedName)
      pactCompleteRef.current = false
      setPactProgress(0)
      setIsHoldingPact(false)
      setWhiteout(false)
      setStage("calibration")
      effectRegistry.emit("seal_complete", {
        meta: { nameLength: normalizedName.length, language: selectedLanguage },
      })
      persistProfile({ userName: normalizedName, language: selectedLanguage, onboardingComplete: false, namingConfirmed: true })
      persistMemory({ name: normalizedName, confirmedName, sovereignNameConfirmed: true, language: selectedLanguage })
    },
    [effectRegistry, persistMemory, persistProfile, selectedLanguage]
  )

  const handleCalibrationComplete = useCallback(
    async (calibration: GutoMemoryPayload) => {
      setProfileSaveError(null)
      const updated = await persistMemory({
        ...calibration,
        language: selectedLanguage,
        foodRestrictions: calibration.foodRestrictions?.trim(),
        trainingPathology: calibration.trainingPathology?.trim(),
        trainingStatus: calibration.trainingLevel,
        trainingLimitations: calibration.trainingPathology?.trim(),
      }, { optimistic: false })
      if (!updated) {
        gutoAudio.playGutoFeedback("error")
        setProfileSaveError(stageCopy[selectedLanguage].profileSaveError)
        return
      }
      persistProfile({ calibrationComplete: true, onboardingComplete: false })
      trackBehaviorEvent("calibration_completed", { ...calibration })
      setStage("pact")
    },
    [persistMemory, persistProfile, selectedLanguage, trackBehaviorEvent]
  )

  const handleFoodDoubt = useCallback((food: DietFood, meal: DietMeal) => {
    setPendingFoodQuestion({ food, meal })
    setActiveTab("guto")
  }, [])

  const handleSeal = useCallback(
    async (confirmedName = false) => {
      gutoAudio.playGutoFeedback("tap")
      const normalizedName = normalizeGutoName(draftName)
      if (!normalizedName || isValidatingName) return

      setIsValidatingName(true)
      const validation = await resolveGutoNameValidation(normalizedName, selectedLanguage, gutoUserId)
      setIsValidatingName(false)

      if (validation.status === "invalid") {
        gutoAudio.playGutoFeedback("error")
        setNameGate({
          status: "invalid",
          normalized: validation.normalized,
          message: validation.message,
          target: "onboarding",
        })
        return
      }

      if (validation.status === "confirm" && !confirmedName) {
        gutoAudio.playGutoFeedback("error")
        setNameGate({
          status: "confirm",
          normalized: validation.normalized,
          message: validation.message,
          target: "onboarding",
        })
        return
      }

      commitOnboardingName(validation.normalized, confirmedName)
    },
    [commitOnboardingName, draftName, isValidatingName, selectedLanguage, gutoUserId]
  )

  const openSettings = useCallback(() => {
    gutoAudio.playGutoFeedback("tap")
    setProfileSaveError(null)
    setSettingsNameDraft(committedName || formatGutoName(userName || ""))
    setSettingsSexDraft(memory?.biologicalSex === "male" || memory?.biologicalSex === "female" ? memory.biologicalSex : null)
    setSettingsAgeDraft(memory?.userAge ? String(memory.userAge) : "")
    setSettingsGoalDraft(memory?.trainingGoal ?? null)
    setSettingsLocationDraft(memory?.preferredTrainingLocation ?? null)
    setSettingsPathologyDraft(
      memory?.trainingPathology && !isNoPainPathology(memory.trainingPathology)
        ? memory.trainingPathology
        : ""
    )
    setSettingsWeightDraft(memory?.weightKg ? String(memory.weightKg) : "")
    setSettingsHeightDraft(memory?.heightCm ? String(memory.heightCm) : "")
    setSettingsCountryDraft(memory?.country ?? "")
    setSettingsCityDraft(memory?.city ?? "")
    setSettingsFoodRestrictionsDraft(memory?.foodRestrictions?.trim() || "")
    setSettingsMode("menu")
    setSettingsSavedToast(false)
    setNameGate(null)
    setStage("settings")
  }, [committedName, memory, userName])

  const handleSettingsBack = useCallback(() => {
    gutoAudio.playGutoFeedback("tap")
    setActiveLanguageGlow(null)
    setProfileSaveError(null)

    if (settingsMode === "privacy" && privacyConfirm !== null) {
      setPrivacyConfirm(null)
      setDeleteConfirmText("")
      return
    }

    if (settingsMode !== "menu") {
      setPrivacyConfirm(null)
      setDeleteConfirmText("")
      setPrivacyMsg(null)
      setSettingsMode("menu")
      return
    }

    setStage("system")
  }, [settingsMode, privacyConfirm])

  useEffect(() => {
    if (settingsMode !== "privacy") return
    let cancelled = false
    ;(async () => {
      try {
        const sub = await getCurrentSubscription()
        if (!cancelled) setPushSubscribed(!!sub)
      } catch {
        if (!cancelled) setPushSubscribed(false)
      }
      try {
        const status = await getBillingStatus()
        if (!cancelled) setBillingStatus(status)
      } catch {
        if (!cancelled) setBillingStatus(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [settingsMode])

  const handleManageSubscription = useCallback(async () => {
    if (billingBusy) return
    setBillingBusy(true)
    setBillingMsg(null)
    try {
      const { url } = await createPortalSession()
      if (url) window.location.href = url
      else setBillingMsg(getApiErrorMessage(new Error("portal_url_missing")))
    } catch (err) {
      setBillingMsg(getApiErrorMessage(err))
      setBillingBusy(false)
    }
  }, [billingBusy])

  const handleTogglePush = useCallback(async () => {
    if (pushBusy) return
    const copy = stageCopy[selectedLanguage]
    setPushBusy(true)
    setPushMsg(null)
    try {
      if (!isPushSupported()) {
        setPushMsg(copy.pushUnsupported)
        return
      }
      if (pushSubscribed) {
        await unsubscribePush()
        setPushSubscribed(false)
      } else {
        const result = await subscribePush()
        if (result.ok) {
          setPushSubscribed(true)
        } else if (result.reason === "denied") {
          setPushMsg(copy.pushDenied)
        } else if (result.reason === "unsupported") {
          setPushMsg(copy.pushUnsupported)
        } else {
          setPushMsg(getApiErrorMessage(new Error(result.reason || "")))
        }
      }
    } catch (err) {
      setPushMsg(getApiErrorMessage(err))
    } finally {
      setPushBusy(false)
    }
  }, [pushBusy, pushSubscribed, selectedLanguage])

  const handleSettingsLanguageSelect = useCallback(
    async (lang: SupportedLanguage) => {
      gutoAudio.playGutoFeedback("select")
      effectRegistry.emit("language_select", { meta: { language: lang, source: "settings" } })
      setProfileSaveError(null)
      setSelectedLanguage(lang)
      writeConfirmedLanguageStorage(lang)
      if (process.env.NODE_ENV === "development") {
        console.info("[GUTO_LANGUAGE] settings changed", lang)
      }
      const updated = await persistMemory({ language: lang }, { optimistic: false })
      if (!updated) {
        gutoAudio.playGutoFeedback("error")
        setProfileSaveError(stageCopy[lang].profileSaveError)
        return
      }
      setWorkoutPlan(localizeGutoWorkoutPlan(updated.lastWorkoutPlan?.exercises?.length ? updated.lastWorkoutPlan : workoutPlan, lang))
      setActiveLanguageGlow(null)
      setSettingsMode("menu")
      setStage("system")
      persistProfile({ language: lang, onboardingComplete: true })
      if (process.env.NODE_ENV === "development") {
        console.info("[GUTO_BACKEND_PROFILE] language synced", lang)
      }
    },
    [effectRegistry, persistMemory, persistProfile, workoutPlan]
  )

  const saveSettingsName = useCallback(
    async (confirmedName = false) => {
      const normalizedName = normalizeGutoName(settingsNameDraft)
      if (!normalizedName || isValidatingName) return

      setIsValidatingName(true)
      const validation = await resolveGutoNameValidation(normalizedName, selectedLanguage, gutoUserId)
      setIsValidatingName(false)

      if (validation.status === "invalid") {
        setNameGate({
          status: "invalid",
          normalized: validation.normalized,
          message: validation.message,
          target: "settings",
        })
        return
      }

      if (validation.status === "confirm" && !confirmedName) {
        setNameGate({
          status: "confirm",
          normalized: validation.normalized,
          message: validation.message,
          target: "settings",
        })
        return
      }

      const finalName = formatGutoName(validation.normalized)
      setNameGate(null)
      setProfileSaveError(null)
      const updated = await persistMemory({ name: finalName, confirmedName, sovereignNameConfirmed: true }, { optimistic: false })
      if (!updated) {
        gutoAudio.playGutoFeedback("error")
        setProfileSaveError(stageCopy[selectedLanguage].profileSaveError)
        return
      }
      setDraftName(finalName)
      setCommittedName(finalName)
      persistProfile({ userName: finalName, onboardingComplete: true })
      setSettingsNameDraft(finalName)
      setSettingsMode("menu")
      setStage("system")
    },
    [gutoUserId, isValidatingName, persistMemory, persistProfile, selectedLanguage, settingsNameDraft]
  )

  const showSavedToast = useCallback(() => {
    setProfileSaveError(null)
    setSettingsSavedToast(true)
    window.setTimeout(() => setSettingsSavedToast(false), 2200)
  }, [])

  const showProfileSaveError = useCallback(() => {
    gutoAudio.playGutoFeedback("error")
    setProfileSaveError(stageCopy[selectedLanguage].profileSaveError)
  }, [selectedLanguage])

  const persistSettingsMemory = useCallback(
    async (payload: GutoMemoryPayload) => {
      setProfileSaveError(null)
      const updated = await persistMemory(payload, { optimistic: false })
      if (!updated) {
        showProfileSaveError()
        return null
      }
      return updated
    },
    [persistMemory, showProfileSaveError]
  )

  const saveProfileSettings = useCallback(async () => {
    const ageNum = parseInt(settingsAgeDraft, 10)
    const isAgeValid = !isNaN(ageNum) && ageNum >= 14 && ageNum <= 99
    if (settingsSexDraft && isAgeValid) {
      const updated = await persistSettingsMemory({ biologicalSex: settingsSexDraft, userAge: ageNum })
      if (!updated) return
    }
    showSavedToast()
    setSettingsMode("menu")
    setStage("system")
  }, [persistSettingsMemory, settingsAgeDraft, settingsSexDraft, showSavedToast])

  const saveGoalSettings = useCallback(async () => {
    if (!settingsGoalDraft) return
    const goal = settingsGoalDraft as "consistency" | "fat_loss" | "muscle_gain" | "conditioning" | "mobility_health"
    const updated = await persistSettingsMemory({ trainingGoal: goal })
    if (!updated) return
    showSavedToast()
    setSettingsMode("menu")
    setStage("system")
  }, [persistSettingsMemory, settingsGoalDraft, showSavedToast])

  const saveLocationSettings = useCallback(async () => {
    if (!settingsLocationDraft) return
    const loc = settingsLocationDraft as "gym" | "home" | "park" | "mixed"
    const updated = await persistSettingsMemory({ preferredTrainingLocation: loc })
    if (!updated) return
    showSavedToast()
    setSettingsMode("menu")
    setStage("system")
  }, [persistSettingsMemory, settingsLocationDraft, showSavedToast])

  const savePathologySettings = useCallback(async () => {
    const val = settingsPathologyDraft.trim()
    if (!val) return
    const updated = await persistSettingsMemory({ trainingPathology: val })
    if (!updated) return
    showSavedToast()
    setSettingsMode("menu")
    setStage("system")
  }, [persistSettingsMemory, settingsPathologyDraft, showSavedToast])

  const savePhysicalDataSettings = useCallback(async () => {
    const wNum = parseFloat(settingsWeightDraft)
    const hNum = parseInt(settingsHeightDraft, 10)
    const isWeightValid = !isNaN(wNum) && wNum >= 30 && wNum <= 300
    const isHeightValid = !isNaN(hNum) && hNum >= 100 && hNum <= 250
    const update: GutoMemoryPayload = {}
    if (isWeightValid) update.weightKg = wNum
    if (isHeightValid) update.heightCm = hNum
    if (Object.keys(update).length === 0) return
    const updated = await persistSettingsMemory(update)
    if (!updated) return
    showSavedToast()
    setSettingsMode("menu")
    setStage("system")
  }, [persistSettingsMemory, settingsHeightDraft, settingsWeightDraft, showSavedToast])

  const saveResidenceSettings = useCallback(async () => {
    const country = settingsCountryDraft.trim()
    const city = settingsCityDraft.trim()
    const countryCode = resolveCountryCodeFromDraft(country, selectedLanguage)
    if (!country || !countryCode || !city) {
      showProfileSaveError()
      return
    }
    const updated = await persistSettingsMemory({
      country,
      countryCode,
      city,
    })
    if (!updated) return
    showSavedToast()
    setSettingsMode("menu")
    setStage("system")
  }, [persistSettingsMemory, selectedLanguage, settingsCityDraft, settingsCountryDraft, showProfileSaveError, showSavedToast])

  const saveFoodRestrictionsSettings = useCallback(async () => {
    const restrictions = settingsFoodRestrictionsDraft.trim()
    const updated = await persistSettingsMemory({ foodRestrictions: restrictions })
    if (!updated) return
    showSavedToast()
    setSettingsMode("menu")
    setStage("system")
  }, [persistSettingsMemory, settingsFoodRestrictionsDraft, showSavedToast])

  const saveSettingsData = useCallback(
    async (calibration: GutoMemoryPayload) => {
      const updated = await persistSettingsMemory(calibration)
      if (!updated) return
      persistProfile({ calibrationComplete: true, onboardingComplete: true })
      showSavedToast()
      setSettingsMode("menu")
      setStage("system")
    },
    [persistProfile, persistSettingsMemory, showSavedToast]
  )

  const handleDownloadData = useCallback(() => {
    if (typeof window === "undefined" || !user?.userId) return
    const stored = (() => {
      try { return JSON.parse(window.localStorage.getItem(`${STORAGE_KEY}-${user.userId}`) ?? "null") as StoredProfile | null } catch { return null }
    })()
    const exportData = {
      exportedAt: new Date().toISOString(),
      userId: user.userId,
      language: stored?.language ?? selectedLanguage,
      userName: stored?.userName ?? committedName,
      consents: {
        consentHealthFitness: stored?.consentHealthFitness ?? false,
        acceptedTerms: stored?.acceptedTerms ?? false,
        consentAcceptedAt: stored?.consentAcceptedAt ?? null,
      },
      profile: {
        biologicalSex: memory?.biologicalSex ?? null,
        userAge: memory?.userAge ?? null,
        weightKg: memory?.weightKg ?? null,
        heightCm: memory?.heightCm ?? null,
        trainingGoal: memory?.trainingGoal ?? null,
        preferredTrainingLocation: memory?.preferredTrainingLocation ?? null,
        trainingPathology: memory?.trainingPathology ?? null,
        country: memory?.country ?? null,
        countryCode: memory?.countryCode ?? null,
        city: memory?.city ?? null,
        foodRestrictions: memory?.foodRestrictions ?? null,
      },
      progress: {
        totalXp: memory?.totalXp ?? null,
        streak: memory?.streak ?? null,
      },
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `guto-meus-dados-${user.userId.slice(0, 8)}-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [committedName, memory, selectedLanguage, user])

  const handleCorrectData = useCallback(() => {
    gutoAudio.playGutoFeedback("tap")
    setPrivacyMsg(stageCopy[selectedLanguage].privacyCorrectToast)
    setSettingsMode("menu")
  }, [selectedLanguage])

  const handleRevokeConsent = useCallback(async () => {
    gutoAudio.playGutoFeedback("tap")
    // P2-D — Call the server first so the user's sensitive fields are cleared
    // backend-side BEFORE flipping the local consent flag. If the call fails we
    // still flip locally and log the error so the user is never stuck.
    try {
      await revokeConsent()
    } catch (err) {
      console.warn("[GUTO] revokeConsent server call failed (continuing local revoke)", err)
    }
    persistProfile({ consentHealthFitness: false, acceptedTerms: false, consentAcceptedAt: undefined })
    setPrivacyConfirm(null)
    setPrivacyMsg(null)
    setSettingsMode("menu")
    setStage("consent")
  }, [persistProfile])

  const handleDeleteAccountConfirm = useCallback(async () => {
    if (typeof window === "undefined" || !user?.userId) return
    try {
      await deleteOwnAccount()
    } catch (error) {
      console.error("[GUTO] account self-delete failed", error)
      setPrivacyMsg(getApiErrorMessage(error) || stageCopy[selectedLanguage].privacyDeleteError)
      return
    }
    try { window.localStorage.removeItem(`${STORAGE_KEY}-${user.userId}`) } catch { /* noop */ }
    setDeleteConfirmText("")
    setPrivacyConfirm("delete-done")
    try { await logout() } catch { /* sessão já invalidada */ }
    router.push("/login")
  }, [router, selectedLanguage, user])

  const updateUserProfileField = useCallback(
    async (field: string, value: string | number) => {
      switch (field) {
        case "name": {
          const formatted = formatGutoName(String(value))
          if (!formatted) return
          setDraftName(formatted)
          setCommittedName(formatted)
          persistProfile({ userName: formatted, onboardingComplete: true })
          await persistMemory({ name: formatted })
          break
        }
        case "weight": {
          const n = parseFloat(String(value))
          if (!isNaN(n) && n >= 30 && n <= 300) { persistMemory({ weightKg: n }); setMemory((prev) => prev ? { ...prev, weightKg: n } : prev) }
          break
        }
        case "height": {
          const n = parseInt(String(value), 10)
          if (!isNaN(n) && n >= 100 && n <= 250) { persistMemory({ heightCm: n }); setMemory((prev) => prev ? { ...prev, heightCm: n } : prev) }
          break
        }
        case "age": {
          const n = parseInt(String(value), 10)
          if (!isNaN(n) && n >= 14 && n <= 99) { persistMemory({ userAge: n }); setMemory((prev) => prev ? { ...prev, userAge: n } : prev) }
          break
        }
        case "goal":
          persistMemory({ trainingGoal: value as "consistency" | "fat_loss" | "muscle_gain" | "conditioning" | "mobility_health" })
          setMemory((prev) => prev ? { ...prev, trainingGoal: value as "consistency" | "fat_loss" | "muscle_gain" | "conditioning" | "mobility_health" } : prev)
          break
        case "location":
          persistMemory({ preferredTrainingLocation: value as "gym" | "home" | "park" | "mixed" })
          setMemory((prev) => prev ? { ...prev, preferredTrainingLocation: value as "gym" | "home" | "park" | "mixed" } : prev)
          break
        case "pathology":
          {
            const pathologyValue = String(value).trim()
            if (!pathologyValue) return
            persistMemory({ trainingPathology: pathologyValue })
            setMemory((prev) =>
              prev
                ? { ...prev, trainingPathology: pathologyValue }
                : prev
            )
          }
          break
        case "country":
          persistMemory({ country: String(value) || undefined })
          setMemory((prev) => prev ? { ...prev, country: String(value) || undefined } : prev)
          break
        case "foodRestrictions": {
          const foodValue = String(value).trim() || undefined
          persistMemory({ foodRestrictions: foodValue })
          setMemory((prev) =>
            prev
              ? { ...prev, foodRestrictions: foodValue }
              : prev
          )
          break
        }
        case "language": {
          const lang = value as SupportedLanguage
          if (!["pt-BR", "en-US", "it-IT"].includes(lang)) break
          setSelectedLanguage(lang)
          writeConfirmedLanguageStorage(lang)
          persistProfile({ language: lang, onboardingComplete: true })
          setWorkoutPlan((current) => localizeGutoWorkoutPlan(current, lang))
          await persistMemory({ language: lang })
          break
        }
        default:
          break
      }
    },
    [persistMemory, persistProfile]
  )

  useEffect(() => {
    if (stage !== "pact" || !isHoldingPact) {
      clearPactInterval()
      return
    }

    pactIntervalRef.current = window.setInterval(() => {
      setPactProgress((current) => {
        const next = Math.min(current + HOLD_INCREMENT, 100)
        effectRegistry.emit("pact_hold_tick", { value: next })

        if (next >= 100) {
          clearPactInterval()
          void startSystem(
            committedName || formatGutoName(draftName || userName || ""),
            selectedLanguage
          )
        }

        return next
      })
    }, HOLD_INTERVAL_MS)

    return clearPactInterval
  }, [
    clearPactInterval,
    committedName,
    draftName,
    effectRegistry,
    isHoldingPact,
    selectedLanguage,
    stage,
    startSystem,
    userName,
  ])

  useEffect(() => {
    if (!user?.userId) return
    let cancelled = false

    void getGutoMemory()
      .then((memory) => {
        if (cancelled) return
        setMemory(memory)
        if (memory?.name && memory.name.toLocaleLowerCase("pt-BR") !== "operador") {
          const storedRaw = readStorageItem(`${STORAGE_KEY}-${user.userId}`)
          let stored: StoredProfile | null = null
          try { stored = storedRaw ? JSON.parse(storedRaw) as StoredProfile : null } catch { stored = null }
          const hasConfirmedName = Boolean(stored?.namingConfirmed || stored?.onboardingComplete)
          const memoryName = formatGutoName(memory.name)
          setDraftName((prev) => prev || (hasConfirmedName ? memoryName : onboardingSuggestedName(memoryName)))
          if (hasConfirmedName) {
            setCommittedName((prev) => prev || memoryName)
          }
        }
        setEvolution(resolveEvolutionStage(memory?.totalXp || 0))
        const weekDays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const
        const todayKey = weekDays[new Date().getDay()]
        const todayWeeklyWorkout = memory?.weeklyWorkoutPlan?.days?.[todayKey]
        if (todayWeeklyWorkout?.exercises?.length) {
          setWorkoutPlan(todayWeeklyWorkout)
        } else if (memory?.lastWorkoutPlan?.exercises?.length) {
          setWorkoutPlan(memory.lastWorkoutPlan)
        } else {
          setWorkoutPlan((prev) => prev ? prev : null)
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [gutoUserId, user?.userId])


  const stopHold = useCallback(() => {
    if (stage !== "pact" || pactProgress >= 100 || pactCompleteRef.current) return
    clearPactInterval()
    gutoAudio.stopGutoSound('hold_charge')
    setIsHoldingPact(false)
    setPactProgress(0)
  }, [clearPactInterval, pactProgress, stage])

  // ── Invite claim flow ──────────────────────────────────────────────────────
  useEffect(() => {
    if (stage !== "invite_claim" || !pendingInviteToken) return
    let cancelled = false
    setInviteLoading(true)
    setInviteClaimData(null)
    setInviteError(null)
    getInvite(pendingInviteToken)
      .then((data) => {
        if (cancelled) return
        setInviteClaimData(data)
        setInviteLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        void err
        clearPendingInviteStorage()
        setPendingInviteToken(null)
        setInviteError(inviteClaimCopy[selectedLanguage].invalid)
        setInviteLoading(false)
      })
    return () => { cancelled = true }
  }, [stage, pendingInviteToken, selectedLanguage])

  const handleInviteClaim = useCallback(async () => {
    if (!pendingInviteToken || inviteSubmitting) return
    const ic = inviteClaimCopy[selectedLanguage]
    if (invitePassword !== inviteConfirmPassword) {
      gutoAudio.playGutoFeedback("error")
      setInviteError(ic.mismatch)
      return
    }
    if (invitePassword.length < 6) {
      gutoAudio.playGutoFeedback("error")
      setInviteError(ic.tooShort)
      return
    }
    setInviteSubmitting(true)
    setInviteError(null)
    try {
      const res = await claimInvite(pendingInviteToken, invitePassword)
      setInviteSuccess(true)
      clearPendingInviteStorage()
      setPendingInviteToken(null)
      schedule(() => {
        login({ ...res, role: res.role ?? "student" })
        const inviteResolvedName = firstRealGutoName(res.name, inviteClaimData?.name)
        setGutoUserId(res.userId)
        writeOnboardingLanguageStorage(selectedLanguage)
        if (inviteResolvedName) {
          setDraftName(onboardingSuggestedName(inviteResolvedName))
          // Only save language so hydration doesn't reset to a wrong language.
          // committedName and backend name are set only after the user confirms on the naming screen.
          writeStorageItem(`${STORAGE_KEY}-${res.userId}`, JSON.stringify({
            language: selectedLanguage,
            onboardingComplete: false,
          }))
        }
        setStage(stageAfterInviteClaim())
        router.replace("/")
      }, 2000)
    } catch (err: unknown) {
      void err
      gutoAudio.playGutoFeedback("error")
      setInviteError(ic.activationFailed)
      setInviteSubmitting(false)
    }
  }, [pendingInviteToken, inviteSubmitting, selectedLanguage, invitePassword, inviteConfirmPassword, inviteClaimData, login, router, schedule])

  const handleExerciseQuestion = useCallback((exercise: MissionExercise) => {
    setPendingExerciseQuestion({
      id: `${exercise.id}-${Date.now()}`,
      exercise,
    })
    setActiveTab("guto")
  }, [])

  const handleMissionComplete = useCallback(async () => {
    const updated = await saveGutoMemory({
      userId: gutoUserId,
      language: selectedLanguage,
      xpEvent: "complete_daily_mission",
    })
    gutoAudio.playGutoFeedback("success")
    setMemory(updated)
    setEvolution(resolveEvolutionStage(updated.totalXp || 0))
    trackBehaviorEvent("mission_completed", { missionType: "daily" })
    setActiveTab("caminho")
  }, [gutoUserId, selectedLanguage, trackBehaviorEvent])

  const handleAdaptedMissionComplete = useCallback(async () => {
    const updated = await saveGutoMemory({
      userId: gutoUserId,
      language: selectedLanguage,
      xpEvent: "accept_adapted_mission",
    })
    gutoAudio.playGutoFeedback("success")
    setMemory(updated)
    setEvolution(resolveEvolutionStage(updated.totalXp || 0))
    trackBehaviorEvent("mission_completed", { missionType: "adapted" })
    setActiveTab("caminho")
  }, [gutoUserId, selectedLanguage, trackBehaviorEvent])

  const resolvedProfile = resolveGutoProfile({
    user,
    memory,
    fallbackName: firstRealGutoName(committedName, userName),
  })
  const userLabel = resolvedProfile.displayName || firstRealGutoName(committedName, userName) || ""
  const workoutMissingFields = getWorkoutMissingFields(memory)
  const localizedWorkoutPlan = useMemo(
    () => localizeGutoWorkoutPlan(workoutPlan, selectedLanguage),
    [selectedLanguage, workoutPlan]
  )
  const locale = stageCopy[selectedLanguage]
  const vitalState = useMemo(() => getGutoVitalState(memory), [memory])
  const canSaveSettingsName =
    Boolean(formatGutoName(settingsNameDraft)) &&
    formatGutoName(settingsNameDraft) !== userLabel &&
    !isValidatingName

  const mergeMemoryPatch = useCallback((patch: Partial<GutoMemory>) => {
    setMemory((previous) => {
      if (!previous) return previous
      const changed = (Object.entries(patch) as Array<[keyof GutoMemory, unknown]>)
        .some(([key, value]) => !sameMemoryPatchValue(previous[key], value))
      return changed ? { ...previous, ...patch } : previous
    })
  }, [])

  // Chat e Dieta são chunks clientes diferentes, mas o GutoApp permanece
  // montado durante a troca de abas. Centralizar aqui a Promise em voo garante
  // que a missão recém-confirmada gere uma única dieta, mesmo quando a aba
  // Dieta abre enquanto a chamada iniciada pelo Chat ainda está pendente.
  const dietGenerationInFlightRef = useRef(new Map<string, Promise<DietPlan>>())
  const requestDietGeneration = useCallback((language: SupportedLanguage) => {
    // O estado espelhado gutoUserId começa como "guest" enquanto o AuthProvider
    // hidrata. Para a dieta, a identidade autenticada já disponível é a chave
    // soberana; assim Chat e Dieta não abrem flights diferentes durante o boot.
    const generationUserId = user?.userId || gutoUserId
    const key = `${generationUserId}:${language}`
    const activeRequest = dietGenerationInFlightRef.current.get(key)
    if (activeRequest) return activeRequest

    const request = generateDietPlan(language, generationUserId)
    dietGenerationInFlightRef.current.set(key, request)
    void request.then(() => {
      window.setTimeout(() => {
        if (dietGenerationInFlightRef.current.get(key) === request) {
          dietGenerationInFlightRef.current.delete(key)
        }
      }, 1_500)
    }, () => {
      if (dietGenerationInFlightRef.current.get(key) === request) {
        dietGenerationInFlightRef.current.delete(key)
      }
    })
    return request
  }, [gutoUserId, user?.userId])

  const chatContent = useMemo(() => (
    <ChatTab
      key={`chat-${gutoUserId}-${selectedLanguage}`}
      userId={gutoUserId}
      userName={userLabel}
      language={selectedLanguage}
      evolution={evolution}
      memory={memory}
      pendingExerciseQuestion={pendingExerciseQuestion}
      onExerciseQuestionHandled={() => setPendingExerciseQuestion(null)}
      pendingFoodQuestion={pendingFoodQuestion}
      onFoodQuestionHandled={() => setPendingFoodQuestion(null)}
      onWorkoutPlanUpdated={setWorkoutPlan}
      workoutPlan={localizedWorkoutPlan}
      vitalState={vitalState}
      initialXpGranted={memory?.initialXpGranted}
      initialXpRewardSeen={memory?.initialXpRewardSeen}
      onXpRewardSeen={async () => {
        if (memory) {
          const updated = { ...memory, initialXpRewardSeen: true };
          setMemory(updated);
          await persistMemory({ initialXpRewardSeen: true });
        }
      }}
      onProfileUpdate={updateUserProfileField}
      onMemoryPatch={mergeMemoryPatch}
      onGenerateDiet={requestDietGeneration}
      onChangeLanguage={(nextLang) => {
        setSelectedLanguage(nextLang)
        writeConfirmedLanguageStorage(nextLang)
        persistProfile({ language: nextLang })
        persistMemory({ language: nextLang })
      }}
      onOpenPrivacySettings={() => {
        setSettingsMode("privacy")
        setStage("settings")
      }}
      isAvatarActive={activeTab === "guto" && !isKeyboardOpen}
      isKeyboardOpen={isKeyboardOpen}
    />
  ), [activeTab, evolution, gutoUserId, isKeyboardOpen, localizedWorkoutPlan, vitalState, memory, mergeMemoryPatch, pendingExerciseQuestion, pendingFoodQuestion, persistMemory, persistProfile, requestDietGeneration, selectedLanguage, updateUserProfileField, userLabel])

  const validationLocationMode = useMemo(
    () =>
      resolveWorkoutValidationLocationMode({
        workoutPlan: localizedWorkoutPlan,
        memory,
        selectedLocation: settingsLocationDraft,
      }),
    [localizedWorkoutPlan, memory, settingsLocationDraft]
  )

  const tabContent = useMemo(() => {
    switch (activeTab) {
      case "guto":
        return null
      case "caminho":
        return (
          <PathTab
            userName={userLabel}
            language={selectedLanguage}
            memory={memory}
            workoutPlan={localizedWorkoutPlan}
            currentEvolution={evolution}
            validationHistory={memory?.validationHistory}
            onMemoryPatch={mergeMemoryPatch}
            onOpenChat={() => setActiveTab("guto")}
          />
        )
      case "evolucoes":
        return (
          <EvolutionsTab
            userName={userLabel}
            language={selectedLanguage}
            currentEvolution={evolution}
            memory={memory}
          />
        )
      case "missao":
        return (
          <MissionTab
            language={selectedLanguage}
            userName={userLabel}
            userId={gutoUserId}
            evolution={evolution}
            workoutFocus={localizedWorkoutPlan?.focusKey || "full_body"}
            onAskExercise={handleExerciseQuestion}
            workoutPlan={localizedWorkoutPlan}
            trainedToday={Boolean(memory?.trainedToday)}
            adaptedMissionToday={Boolean(memory?.adaptedMissionToday)}
            onMissionComplete={handleMissionComplete}
            onAdaptedMissionComplete={handleAdaptedMissionComplete}
            onValidateWorkout={() => setShowValidationFlow(true)}
            missingProfileFields={workoutMissingFields}
            memory={memory}
          />
        )
      case "arena":
        return (
          <ArenaTab
            userId={gutoUserId}
            language={selectedLanguage}
            translations={translations[selectedLanguage]}
            refreshKey={arenaRefreshKey}
            currentUserName={userLabel}
          />
        )
      case "dieta":
        return (
          <DietTab
            userId={gutoUserId}
            language={selectedLanguage}
            onFoodDoubt={handleFoodDoubt}
            memory={memory}
            onMemoryPatch={mergeMemoryPatch}
            onGenerateDiet={requestDietGeneration}
          />
        )
      default:
        return null
    }
  }, [activeTab, arenaRefreshKey, evolution, gutoUserId, handleAdaptedMissionComplete, handleExerciseQuestion, handleFoodDoubt, handleMissionComplete, localizedWorkoutPlan, memory, mergeMemoryPatch, requestDietGeneration, selectedLanguage, userLabel, workoutMissingFields])

  if (authLoading || !isHydrated || (user && user.role !== "student")) {
    return (
      <div className="sala-guto flex min-h-dvh flex-col items-center justify-center gap-5 bg-white px-8">
        <Image
          src="/assets/guto/logo_guto.png"
          alt="GUTO"
          width={180}
          height={60}
          priority
          className="h-auto w-[min(180px,72vw)] object-contain"
          style={{ height: "auto" }}
        />
        <Loader2 className="h-8 w-8 animate-spin text-(--guto-cyan)" aria-hidden />
        <p className="sr-only">GUTO</p>
      </div>
    )
  }

  return (
    <div ref={shellRef} className="sala-guto">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-(--guto-varnish)" />
      <div className="pointer-events-none absolute inset-x-0 top-[18%] h-px bg-[linear-gradient(90deg,transparent,rgba(82,231,255,0.28),transparent)]" />

      <AnimatePresence mode="wait">
        {stage === "intro" && (
          <motion.section
            key="intro"
            className="absolute inset-0 z-40 overflow-hidden bg-white"
            data-intro-playback-state={introPlaybackState}
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.36 }}
          >
            <video
              ref={portalVideoRef}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ visibility: introNeedsActivation ? "hidden" : "visible" }}
              playsInline
              webkit-playsinline="true"
              preload="auto"
              muted
              disablePictureInPicture
              controls={false}
              onLoadedMetadata={restartPortalVideo}
              onCanPlay={restartPortalVideo}
              onEnded={handleIntroVideoEnded}
            >
              <source src="/assets/guto/abertura-guto.mp4" type="video/mp4" />
            </video>

            {introNeedsActivation && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white px-8">
                <div className="flex max-w-sm flex-col items-center gap-6 pointer-events-auto">
                  <Image
                    src="/assets/guto/logo_guto.png"
                    alt="GUTO"
                    width={180}
                    height={60}
                    priority
                    className="h-auto w-[min(180px,72vw)] object-contain"
                    style={{ height: "auto" }}
                  />
                  <button
                    type="button"
                    id="guto-start-button"
                    onClick={startIntroVideo}
                    className="guto-intro-sound-button inline-flex items-center gap-3 rounded-full px-5 py-3 text-[11px] font-black uppercase tracking-normal shadow-md"
                    aria-label={locale.startIntro}
                  >
                    <Volume2 className="h-5 w-5" />
                    {locale.startIntro}
                  </button>
                </div>
              </div>
            )}
          </motion.section>
        )}

        {stage === "language" && (
          <motion.div
            key="language"
            className="absolute inset-0 z-30"
            initial={skipIntro ? false : { rotateY: 0, opacity: 0 }}
            animate={{
              rotateY: rotatingLanguage ? 180 : 0,
              opacity: rotatingLanguage ? 0 : 1,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.56, ease: [0.66, 0, 0.18, 1] }}
            style={{ transformStyle: "preserve-3d" }}
          >
            <LanguageScreen
              selectedLanguage={selectedLanguage}
              onSelect={(lang) => handleLanguageSelect(lang as SupportedLanguage)}
            />
          </motion.div>
        )}

        {stage === "invite_claim" && (
          <motion.section
            key="invite_claim"
            className="guto-main-screen absolute inset-0 z-30 flex flex-col items-center justify-center px-8"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.42 }}
          >
            <div className="flex w-full max-w-sm flex-col items-center">
              <div className="mb-8 flex flex-col items-center text-center">
                <Image
                  src="/assets/guto/logo_guto.png"
                  alt="GUTO"
                  width={180}
                  height={60}
                  priority
                  className="mb-5 h-auto w-[180px] max-w-[78%] object-contain drop-shadow-sm"
                  style={{ height: "auto" }}
                />
                {inviteLoading && (
                  <Loader2 className="h-6 w-6 animate-spin text-(--guto-cyan)" />
                )}
                {!inviteLoading && inviteClaimData && !inviteSuccess && (
                  <>
                    <p className="mb-2 font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[rgba(13,35,65,0.45)]">
                      {inviteClaimCopy[selectedLanguage].title}
                    </p>
                    <h1 className="font-mono text-sm font-black uppercase tracking-widest text-(--guto-navy)">
                      {inviteClaimCopy[selectedLanguage].greetingPrefix}{" "}
                      <span className="text-(--guto-cyan)">{inviteClaimData.name}</span>
                    </h1>
                    <p className="mt-2 font-mono text-[10px] font-black uppercase tracking-wider text-[rgba(13,35,65,0.4)]">
                      {inviteClaimCopy[selectedLanguage].invited}
                    </p>
                  </>
                )}
                {!inviteLoading && !inviteClaimData && inviteError && (
                  <p className="font-mono text-xs font-black uppercase text-red-500">{inviteError}</p>
                )}
              </div>

              {!inviteLoading && inviteSuccess && (
                <div className="flex flex-col items-center space-y-4 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                  <p className="font-mono text-[11px] font-black uppercase tracking-widest text-(--guto-navy)">
                    {inviteClaimCopy[selectedLanguage].activated}
                  </p>
                  <p className="font-mono text-[9px] font-black uppercase tracking-widest text-[rgba(13,35,65,0.4)]">
                    {inviteClaimCopy[selectedLanguage].starting}
                  </p>
                </div>
              )}

              {!inviteLoading && !inviteSuccess && inviteClaimData && (
                <form
                  onSubmit={(e) => { e.preventDefault(); void handleInviteClaim() }}
                  className="w-full space-y-4"
                >
                  <div className="guto-deboss rounded-2xl p-4">
                    <label className="mb-1.5 block font-mono text-[10px] font-black uppercase tracking-wider text-[rgba(13,35,65,0.55)]">
                      {inviteClaimCopy[selectedLanguage].createPass}
                    </label>
                    <input
                      type="password"
                      value={invitePassword}
                      onChange={(e) => { setInvitePassword(e.target.value); setInviteError(null) }}
                      className="w-full border-none bg-transparent font-mono text-sm font-black text-(--guto-navy) outline-none placeholder:text-[rgba(13,35,65,0.2)]"
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="guto-deboss rounded-2xl p-4">
                    <label className="mb-1.5 block font-mono text-[10px] font-black uppercase tracking-wider text-[rgba(13,35,65,0.55)]">
                      {inviteClaimCopy[selectedLanguage].confirmPass}
                    </label>
                    <input
                      type="password"
                      value={inviteConfirmPassword}
                      onChange={(e) => { setInviteConfirmPassword(e.target.value); setInviteError(null) }}
                      className="w-full border-none bg-transparent font-mono text-sm font-black text-(--guto-navy) outline-none placeholder:text-[rgba(13,35,65,0.2)]"
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                    />
                  </div>
                  {inviteError && (
                    <p className="text-center font-mono text-[10px] font-black uppercase text-red-500">{inviteError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={inviteSubmitting}
                    className="mt-2 flex h-14 w-full items-center justify-center rounded-full bg-(--guto-cyan) font-mono text-xs font-black uppercase tracking-[0.2em] text-(--guto-navy) shadow-[0_4px_20px_rgba(82,231,255,0.3)] transition-all active:scale-95 disabled:opacity-50"
                  >
                    {inviteSubmitting
                      ? <Loader2 className="h-5 w-5 animate-spin" />
                      : inviteClaimCopy[selectedLanguage].cta}
                  </button>
                </form>
              )}

              {!inviteLoading && !inviteClaimData && !inviteSuccess && (
                <button
                  type="button"
                  onClick={() => router.push(`/login?lang=${selectedLanguage}`)}
                  className="mt-8 font-mono text-[10px] font-black uppercase tracking-widest text-(--guto-cyan) underline"
                >
                  {inviteClaimCopy[selectedLanguage].back}
                </button>
              )}
            </div>
          </motion.section>
        )}

        {stage === "consent" && (
          <ConsentScreen
            key="consent"
            language={selectedLanguage}
            onComplete={handleConsentAccepted}
            errorMessage={profileSaveError}
          />
        )}

        {stage === "naming" && (
          <motion.section
            key="naming"
            className="guto-main-screen absolute inset-0 z-30 flex flex-col items-center px-8"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.42 }}
          >
            <div className="guto-name-stage flex w-full flex-1 flex-col items-center">
              <motion.div
                className="guto-name-lockup"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
              >
                <Image
                  src="/assets/guto/logo_guto.png"
                  alt="GUTO"
                  width={268}
                  height={86}
                  priority
                  className="guto-name-logo"
                  style={{ height: "auto" }}
                />
                <div className="guto-name-ampersand" aria-hidden="true">
                  &
                </div>
                <div className="guto-name-partner" aria-live="polite">
                  {draftName.trim()}
                </div>
              </motion.div>

              <div className="guto-name-input-block mt-auto w-full pb-[max(env(safe-area-inset-bottom),2.75rem)]">
                <div className="guto-name-slit mx-auto flex w-full max-w-[24rem] items-center gap-3 rounded-full px-5 py-3">
                  <input
                    type="text"
                    value={draftName}
                    onChange={(event) => {
                      setNameGate(null)
                      setDraftName(formatGutoName(event.target.value).slice(0, 24))
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void handleSeal()
                    }}
                    placeholder={locale.namingPlaceholder}
                    autoFocus
                    className="min-w-0 flex-1 border-none bg-transparent text-center font-mono text-xl font-black uppercase tracking-normal text-(--guto-cyan) outline-none placeholder:text-[rgba(13,35,65,0.24)]"
                  />
                  <motion.button
                    type="button"
                    aria-label={locale.submitNameAria}
                    onClick={() => void handleSeal()}
                    disabled={!draftName.trim() || isValidatingName}
                    whileTap={{ scale: 0.92 }}
                    className="guto-name-send flex h-10 w-10 shrink-0 items-center justify-center rounded-full disabled:opacity-30"
                  >
                    <Send className="h-5 w-5" strokeWidth={2.4} />
                  </motion.button>
                </div>
                {nameGate?.target === "onboarding" && (
                  <div className="mx-auto mt-3 w-full max-w-[24rem] rounded-[18px] border border-white/70 bg-white/92 px-4 py-3 text-center shadow-[inset_4px_4px_12px_rgba(105,119,138,0.16),inset_-4px_-4px_12px_rgba(255,255,255,0.82)]">
                    <p className="font-mono text-[11px] font-black uppercase leading-snug tracking-normal text-(--guto-navy)">
                      {nameGate.message}
                    </p>
                    {nameGate.status === "confirm" && (
                      <div className="mt-3 flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleSeal(true)}
                          className="rounded-full bg-(--guto-cyan) px-4 py-2 text-[10px] font-black uppercase tracking-normal text-white"
                        >
                          {locale.nameConfirm}
                        </button>
                        <button
                          type="button"
                          onClick={() => setNameGate(null)}
                          className="rounded-full border border-[rgba(13,35,65,0.14)] bg-white/55 px-4 py-2 text-[10px] font-black uppercase tracking-normal text-(--guto-navy)"
                        >
                          {locale.nameChange}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.section>
        )}

        {stage === "calibration" && (
          <motion.section
            key="calibration"
            className="guto-main-screen guto-main-screen--calibration absolute inset-0 z-30 flex h-full min-h-0 w-full flex-col items-center overflow-hidden"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.4 }}
          >
            <CalibrationScreen 
              language={selectedLanguage} 
              onComplete={handleCalibrationComplete} 
            />
            {profileSaveError && (
              <div className="absolute inset-x-8 bottom-[max(env(safe-area-inset-bottom),1rem)] rounded-[18px] border border-[rgba(255,60,60,0.24)] bg-[rgba(255,60,60,0.08)] px-4 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                <p className="font-mono text-[9px] font-black uppercase leading-snug tracking-[0.12em] text-[rgba(200,30,30,0.82)]">
                  {profileSaveError}
                </p>
              </div>
            )}
          </motion.section>
        )}

        {stage === "pact" && (
          <motion.section
            key="pact"
            className="guto-main-screen absolute inset-0 z-30 flex flex-col items-center justify-center px-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="pointer-events-none absolute inset-x-0 bottom-0 top-0">
              <motion.div
                className="guto-pact-ignition absolute inset-0"
                animate={{
                  opacity: isHoldingPact ? Math.min(0.82, pactProgress / 115) : 0,
                }}
              />

              {pactVeins.map((left, index) => (
                <motion.div
                  key={left}
                  className="guto-pact-vein absolute bottom-0 w-0.5 origin-bottom rounded-full"
                  style={{ left: `${left * 100}%`, height: `${30 + index * 10}%` }}
                  animate={{
                    scaleY: 0.08 + pactProgress / 100,
                    opacity: pactProgress > 0 ? 0.16 + pactProgress / 130 : 0,
                  }}
                />
              ))}

              {pactNodes.map((node, index) => (
                <motion.div
                  key={`${node.left}-${node.top}`}
                  className="guto-pact-node absolute h-2.5 w-2.5 rounded-full"
                  style={{ left: `${node.left * 100}%`, top: `${node.top * 100}%` }}
                  animate={{
                    opacity: pactProgress > 12 + index * 14 ? 1 : 0,
                    scale: pactProgress > 12 + index * 14 ? [0.8, 1.45, 1] : 0.8,
                  }}
                  transition={{ duration: 0.55, repeat: isHoldingPact ? Infinity : 0, repeatDelay: 0.5 }}
                />
              ))}
            </div>

            <p className="guto-pact-title mb-9">
              {locale.noReturn}
            </p>

            <div className="relative flex items-center justify-center">
              <motion.div
                className="guto-pact-field pointer-events-none absolute h-80 w-80 rounded-full"
                animate={{
                  opacity: isHoldingPact ? 1 : 0.36,
                  scale: isHoldingPact ? [0.96, 1.05, 0.96] : 1,
                }}
                transition={{ duration: 1.2, repeat: isHoldingPact ? Infinity : 0, ease: "easeInOut" }}
              />

              {[0, 1, 2].map((ring) => (
                <motion.div
                  key={ring}
                  className="guto-pact-shock pointer-events-none absolute h-44 w-44 rounded-full"
                  animate={{
                    opacity: isHoldingPact ? [0, 0.46, 0] : 0,
                    scale: isHoldingPact ? [1, 1.58 + ring * 0.18, 1.78 + ring * 0.18] : 1,
                  }}
                  transition={{
                    duration: 1.45,
                    delay: ring * 0.22,
                    repeat: isHoldingPact ? Infinity : 0,
                    ease: "easeOut",
                  }}
                />
              ))}

              <svg className="absolute -inset-7 h-56 w-56 -rotate-90" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="68" fill="none" stroke="rgba(13,35,65,0.08)" strokeWidth="4" />
                <circle
                  cx="80"
                  cy="80"
                  r="68"
                  fill="none"
                  stroke="rgba(82,231,255,0.94)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray="427"
                  strokeDashoffset={427 - (427 * pactProgress) / 100}
                  style={{ filter: "drop-shadow(0 0 10px rgba(82,231,255,0.36))" }}
                />
              </svg>

              <motion.button
                type="button"
                onPointerDown={() => {
                  if (isHoldingPact || pactCompleteRef.current) return
                  gutoAudio.playGutoFeedback("hold_charge")
                  setIsHoldingPact(true)
                }}
                onPointerUp={stopHold}
                onPointerLeave={stopHold}
                onPointerCancel={stopHold}
                  aria-label={locale.pactHoldAria}
                className="guto-biometric-scanner relative flex h-44 w-44 touch-none items-center justify-center rounded-full"
                animate={{
                  scale: isHoldingPact ? (pactProgress > 70 ? [0.95, 1.02, 0.97] : 0.97) : 1,
                  boxShadow: isHoldingPact
                    ? "inset 8px 9px 20px rgba(105,119,138,0.32), inset -9px -9px 18px rgba(255,255,255,0.96), inset 0 0 26px rgba(82,231,255,0.44), 0 0 34px rgba(82,231,255,0.22)"
                    : undefined,
                }}
                transition={{ duration: 0.42, repeat: isHoldingPact && pactProgress > 70 ? Infinity : 0 }}
              >
                <div className="absolute inset-5 rounded-full border border-white/80" />
                <motion.div
                  className="guto-pact-scan absolute inset-7 rounded-full"
                  animate={{ opacity: isHoldingPact ? 1 : 0, y: isHoldingPact ? ["-32%", "32%", "-32%"] : "-32%" }}
                  transition={{ duration: 1.15, repeat: isHoldingPact ? Infinity : 0, ease: "easeInOut" }}
                />
                <motion.div
                  className="guto-pact-core absolute inset-[2.35rem] rounded-full"
                  animate={{
                    opacity: isHoldingPact ? 1 : 0.2,
                    scale: isHoldingPact ? [0.94, 1.08, 0.94] : 1,
                  }}
                  transition={{ duration: 0.9, repeat: isHoldingPact ? Infinity : 0 }}
                />
                <Fingerprint
                  className="relative z-10 h-14 w-14"
                  style={{ color: isHoldingPact ? "var(--guto-cyan)" : "rgba(13,35,65,0.38)" }}
                />
              </motion.button>
            </div>

            <p className="guto-pact-hold mt-8">
              {isHoldingPact
                ? pactProgress > 70
                  ? `${locale.pactSealing} ${Math.round(pactProgress)}%`
                  : `${locale.pactConnecting} ${Math.round(pactProgress)}%`
                : locale.hold}
            </p>
          </motion.section>
        )}

        {stage === "system" && (
          <motion.section
            key="system"
            className="guto-main-screen absolute inset-0 z-20 flex h-full min-h-0 flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="relative flex min-h-0 flex-1 flex-col">
              <div
                className={activeTab === "guto" ? "min-h-0 flex-1" : "pointer-events-none absolute inset-0 opacity-0"}
                aria-hidden={activeTab !== "guto"}
              >
                {chatContent}
              </div>
              {activeTab !== "guto" && (
                <div className="mx-4 mb-(--guto-bottom-nav-space) mt-[max(env(safe-area-inset-top),1.1rem)] flex min-h-0 flex-1 flex-col">
                <div className="guto-deboss flex min-h-0 flex-1 flex-col rounded-[2.25rem] px-4 py-4">
                  <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeTab}
                        className="h-full"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.24 }}
                      >
                        {tabContent}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
                </div>
              )}

              <div className="guto-bottom-nav absolute inset-x-0 bottom-0 z-30">
                <BottomNavigation
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  language={selectedLanguage}
                />
              </div>

              <div className="guto-settings-trigger-shell absolute right-4 top-[max(env(safe-area-inset-top),1rem)] z-40">
                <motion.button
                  type="button"
                  aria-label={locale.settingsTitle}
                  onClick={openSettings}
                  whileTap={{ scale: 0.94 }}
                  className="guto-settings-trigger grid h-10 w-10 place-items-center rounded-full"
                >
                  <Settings className="h-4 w-4" strokeWidth={2.2} />
                </motion.button>
              </div>
            </div>
          </motion.section>
        )}

        {stage === "settings" && (
          <motion.section
            key="settings"
            className="guto-main-screen absolute inset-0 z-30 flex flex-col px-8"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <div className="guto-settings-topbar flex items-center justify-between">
              <motion.button
                type="button"
                aria-label={settingsMode === "menu" ? locale.settingsClose : locale.settingsBack}
                onClick={handleSettingsBack}
                whileTap={{ scale: 0.94 }}
                className="guto-settings-trigger grid h-10 w-10 place-items-center rounded-full"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
              </motion.button>
              <p className="guto-settings-page-title">
                {settingsMode === "language"
                  ? locale.settingsLanguage
                  : settingsMode === "name"
                    ? locale.settingsName
                    : settingsMode === "data"
                      ? locale.settingsData
                      : settingsMode === "profile"
                      ? locale.settingsProfile
                      : settingsMode === "goal"
                        ? locale.settingsGoal
                        : settingsMode === "location"
                          ? locale.settingsLocation
                          : settingsMode === "pathology"
                            ? locale.settingsPathology
                            : settingsMode === "physicaldata"
                              ? locale.settingsPhysicalData
                              : settingsMode === "residence"
                                ? locale.settingsResidence
                                : settingsMode === "food_restrictions"
                                  ? translations[selectedLanguage].calibration.restrictionsLabel
                                  : settingsMode === "privacy"
                                      ? locale.settingsPrivacy
                                      : locale.settingsTitle}
              </p>
              <div className="h-10 w-10" aria-hidden="true" />
            </div>

            {profileSaveError && (
              <div className="mx-auto mt-2 w-full max-w-[22rem] rounded-[18px] border border-[rgba(255,60,60,0.24)] bg-[rgba(255,60,60,0.08)] px-4 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                <p className="font-mono text-[9px] font-black uppercase leading-snug tracking-[0.12em] text-[rgba(200,30,30,0.82)]">
                  {profileSaveError}
                </p>
              </div>
            )}

            {settingsMode === "menu" && (() => {
              const langLabel = languages.find((l) => l.id === selectedLanguage)?.label ?? selectedLanguage
              const dataSummary = [
                memory?.userAge ? `${memory.userAge}` : null,
                memory?.weightKg ? `${memory.weightKg}kg` : null,
                memory?.country?.trim() || null,
              ].filter(Boolean).join(" · ") || translations[selectedLanguage].calibration.subtitle

              const cardClass = "guto-settings-choice-card guto-settings-primary-card group relative flex flex-col items-center justify-center gap-1 overflow-hidden rounded-[22px] p-5"
              const valueClass = "guto-settings-choice-value mt-0.5 max-w-full font-mono text-[9px] font-black uppercase tracking-[0.08em] text-(--guto-cyan) opacity-80"

              return (
                <div className="guto-settings-home flex min-h-0 flex-1 flex-col justify-center gap-3 overflow-y-auto pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-3">
                  <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={() => { gutoAudio.playGutoFeedback("tap"); setSettingsMode("language"); }} aria-label={locale.settingsLanguage} className={cardClass}>
                    <Languages className="guto-settings-choice-icon" strokeWidth={2.2} />
                    <span className="guto-settings-choice-label">{locale.settingsLanguage}</span>
                    <span className={valueClass}>{langLabel}</span>
                  </motion.button>

                  <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={() => { gutoAudio.playGutoFeedback("tap"); setSettingsMode("name"); }} aria-label={locale.settingsName} className={cardClass}>
                    <UserRound className="guto-settings-choice-icon" strokeWidth={2.2} />
                    <span className="guto-settings-choice-label">{locale.settingsName}</span>
                    {committedName && <span className={valueClass}>{committedName}</span>}
                  </motion.button>

                  <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={() => { gutoAudio.playGutoFeedback("tap"); setSettingsMode("data"); }} aria-label={locale.settingsData} className={cardClass}>
                    <Activity className="guto-settings-choice-icon" strokeWidth={2.2} />
                    <span className="guto-settings-choice-label">{locale.settingsData}</span>
                    <span className={valueClass}>{dataSummary}</span>
                  </motion.button>

                  <button type="button" onClick={() => { gutoAudio.playGutoFeedback("tap"); setPrivacyMsg(null); setPrivacyConfirm(null); setDeleteConfirmText(""); setSettingsMode("privacy"); }} aria-label={locale.settingsPrivacy} className="mx-auto mt-2 flex min-h-11 max-w-[18rem] items-center justify-center gap-2 rounded-full border border-[rgba(82,231,255,0.32)] bg-white/42 px-4 text-center font-mono text-[9px] font-black uppercase tracking-[0.14em] text-[rgba(13,35,65,0.52)] shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
                    <Shield className="guto-settings-choice-icon" strokeWidth={2.2} />
                    <span>{locale.settingsPrivacy}</span>
                  </button>
                </div>
              )
            })()}

            {settingsMode === "language" && (
              <div className="guto-settings-language-list flex min-h-0 flex-1 flex-col justify-center gap-3.5 overflow-y-auto pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-3">
                {languages.map((lang, index) => (
                  <motion.button
                    key={lang.id}
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onHoverStart={() => setActiveLanguageGlow(lang.id)}
                    onHoverEnd={() =>
                      setActiveLanguageGlow((current) => (current === lang.id ? null : current))
                    }
                    onPointerDown={() => setActiveLanguageGlow(lang.id)}
                    onPointerUp={() => setActiveLanguageGlow(null)}
                    onPointerCancel={() => setActiveLanguageGlow(null)}
                    onPointerLeave={() => setActiveLanguageGlow(null)}
                    onClick={() => void handleSettingsLanguageSelect(lang.id)}
                    aria-label={lang.label}
                    className="guto-settings-language-option relative flex w-full items-center gap-4 overflow-hidden rounded-[20px] px-3.5 py-3.5 text-left transition-all"
                    data-active={activeLanguageGlow === lang.id || selectedLanguage === lang.id}
                    initial={{ x: -16, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.06 + index * 0.06 }}
                  >
                    <div className="relative h-[62px] w-[62px] shrink-0">
                      {(activeLanguageGlow === lang.id || selectedLanguage === lang.id) && (
                        <div
                          className="absolute -inset-1 rounded-full"
                          style={{
                            background: "radial-gradient(circle, rgba(82,231,255,0.45), transparent 70%)",
                            filter: "blur(6px)",
                          }}
                        />
                      )}
                      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 120 120" aria-hidden="true">
                        {Array.from({ length: 36 }).map((_, tickIndex) => {
                          const active = activeLanguageGlow === lang.id || selectedLanguage === lang.id
                          const angle = (tickIndex / 36) * Math.PI * 2 - Math.PI / 2
                          const outerRadius = 58
                          const innerRadius = tickIndex % 3 === 0 ? 52 : 55

                          return (
                            <line
                              key={tickIndex}
                              x1={60 + Math.cos(angle) * outerRadius}
                              y1={60 + Math.sin(angle) * outerRadius}
                              x2={60 + Math.cos(angle) * innerRadius}
                              y2={60 + Math.sin(angle) * innerRadius}
                              stroke={active ? "rgba(82,231,255,0.85)" : "rgba(90,124,168,0.28)"}
                              strokeWidth={tickIndex % 3 === 0 ? 1.2 : 0.6}
                            />
                          )
                        })}
                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          fill="none"
                          stroke={selectedLanguage === lang.id ? "#52e7ff" : "rgba(193,212,232,0.6)"}
                          strokeWidth={selectedLanguage === lang.id ? 1.6 : 1}
                        />
                      </svg>
                      <div className="absolute inset-[14%] grid place-items-center overflow-hidden rounded-full p-[3px] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(214,228,244,0.7))] shadow-[inset_0_2px_4px_rgba(255,255,255,0.95),0_6px_16px_rgba(90,124,168,0.15)]">
                        <Image src={lang.asset} alt="" aria-hidden="true" width={48} height={48} className="h-full w-full rounded-full object-cover" />
                        <div className="pointer-events-none absolute left-[14%] top-[10%] h-[28%] w-[52%] rounded-full bg-[radial-gradient(ellipse,rgba(255,255,255,0.55),transparent_70%)]" />
                      </div>
                    </div>
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-[18px] font-black uppercase leading-none tracking-normal text-(--guto-navy)">
                        {lang.label}
                      </span>
                      <span className="mt-1 block font-mono text-[10px] font-black uppercase tracking-[0.18em] text-(--guto-cyan)">
                        {lang.id}
                      </span>
                    </span>
                    {selectedLanguage === lang.id && (
                      <Check className="h-5 w-5 shrink-0 text-(--guto-cyan)" strokeWidth={2.8} />
                    )}
                  </motion.button>
                ))}
              </div>
            )}

            {settingsMode === "data" && (
              <div className="guto-settings-data-shell -mx-4 flex min-h-0 flex-1 flex-col">
                <CalibrationScreen
                  language={selectedLanguage}
                  title={locale.settingsData}
                  initialProfile={{
                    userAge: memory?.userAge,
                    biologicalSex:
                      memory?.biologicalSex === "male" || memory?.biologicalSex === "female"
                        ? memory.biologicalSex
                        : undefined,
                    trainingLevel: memory?.trainingLevel,
                    trainingGoal: memory?.trainingGoal,
                    preferredTrainingLocation: memory?.preferredTrainingLocation,
                    trainingPathology: memory?.trainingPathology,
                    country: memory?.country,
                    countryCode: memory?.countryCode,
                    city: memory?.city,
                    heightCm: memory?.heightCm,
                    weightKg: memory?.weightKg,
                    foodRestrictions: memory?.foodRestrictions,
                  }}
                  onComplete={saveSettingsData}
                />
              </div>
            )}

            {settingsMode === "name" && (
              <div className="guto-name-stage flex w-full flex-1 flex-col items-center">

                <motion.div
                  className="guto-name-lockup"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Image
                    src="/assets/guto/logo_guto.png"
                    alt="GUTO"
                    width={268}
                    height={86}
                    className="guto-name-logo"
                    style={{ height: "auto" }}
                  />
                  <div className="guto-name-ampersand" aria-hidden="true">
                    &
                  </div>
                  <div className="guto-name-partner" aria-live="polite">
                    {settingsNameDraft.trim()}
                  </div>
                </motion.div>

                <form
                  className="guto-name-input-block mt-auto w-full pb-[max(env(safe-area-inset-bottom),2.75rem)]"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void saveSettingsName()
                  }}
                >
                  <div className="guto-name-slit mx-auto flex w-full max-w-[24rem] items-center gap-3 rounded-full px-5 py-3">
                    <input
                      type="text"
                      value={settingsNameDraft}
                      onChange={(event) => {
                        setNameGate(null)
                        setSettingsNameDraft(formatGutoName(event.target.value).slice(0, 24))
                      }}
                      placeholder={locale.settingsNamePlaceholder}
                      autoFocus
                      className="min-w-0 flex-1 border-none bg-transparent text-center font-mono text-xl font-black uppercase tracking-normal text-(--guto-cyan) outline-none placeholder:text-[rgba(13,35,65,0.24)]"
                    />
                    <motion.button
                      type="submit"
                      aria-label={locale.settingsSaveName}
                      disabled={!canSaveSettingsName}
                      whileTap={{ scale: 0.92 }}
                      className="guto-name-send flex h-10 w-10 shrink-0 items-center justify-center rounded-full disabled:opacity-30"
                    >
                      <Check className="h-5 w-5" strokeWidth={2.6} />
                    </motion.button>
                  </div>
                  {nameGate?.target === "settings" && (
                    <div className="mx-auto mt-3 w-full max-w-[24rem] rounded-[18px] border border-white/70 bg-white/92 px-4 py-3 text-center shadow-[inset_4px_4px_12px_rgba(105,119,138,0.16),inset_-4px_-4px_12px_rgba(255,255,255,0.82)]">
                      <p className="font-mono text-[11px] font-black uppercase leading-snug tracking-normal text-(--guto-navy)">
                        {nameGate.message}
                      </p>
                      {nameGate.status === "confirm" && (
                        <div className="mt-3 flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => void saveSettingsName(true)}
                            className="rounded-full bg-(--guto-cyan) px-4 py-2 text-[10px] font-black uppercase tracking-normal text-white"
                          >
                            {locale.nameConfirm}
                          </button>
                          <button
                            type="button"
                            onClick={() => setNameGate(null)}
                            className="rounded-full border border-[rgba(13,35,65,0.14)] bg-white/55 px-4 py-2 text-[10px] font-black uppercase tracking-normal text-(--guto-navy)"
                          >
                            {locale.nameChange}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </form>
              </div>
            )}

            {settingsMode === "profile" && (() => {
              const t = translations[selectedLanguage].calibration
              const ageNum = parseInt(settingsAgeDraft, 10)
              const isAgeValid = !isNaN(ageNum) && ageNum >= 14 && ageNum <= 99
              const canSave = Boolean(settingsSexDraft && isAgeValid)
              const inputClass = "w-full rounded-full border border-[rgba(82,231,255,0.45)] bg-white px-4 py-2.5 text-center font-mono text-[14px] font-black text-(--guto-navy) outline-none appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              const labelClass = "mt-4 mb-2 font-mono text-[8px] font-black uppercase tracking-[0.2em] text-[rgba(13,35,65,0.42)]"
              return (
                <div className="flex flex-1 flex-col gap-4 pt-2 overflow-y-auto">
                  <div className="guto-slot rounded-3xl px-5 py-4">
                    <p className="mb-3 font-mono text-[8px] font-black uppercase tracking-[0.2em] text-[rgba(13,35,65,0.42)]">
                      {t.sexOptions.male} / {t.sexOptions.female}
                    </p>
                    <div className="flex gap-2">
                      {(["male", "female"] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSettingsSexDraft(s)}
                          className={`flex-1 rounded-full border py-2 font-mono text-[10px] font-black uppercase tracking-[0.12em] transition-all ${
                            settingsSexDraft === s
                              ? "border-[rgba(82,231,255,0.75)] bg-[rgba(82,231,255,0.18)] text-(--guto-cyan)"
                              : "border-[rgba(82,231,255,0.28)] bg-white/50 text-[rgba(13,35,65,0.65)]"
                          }`}
                        >
                          {s === "male" ? t.sexOptions.male : t.sexOptions.female}
                        </button>
                      ))}
                    </div>
                    <p className={labelClass}>{t.ageLabel}</p>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={14}
                      max={99}
                      value={settingsAgeDraft}
                      onChange={(e) => setSettingsAgeDraft(e.target.value)}
                      placeholder="--"
                      autoComplete="off"
                      className={inputClass}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!canSave}
                    onClick={() => void saveProfileSettings()}
                    className={`h-12 w-full rounded-full font-mono text-[11px] font-black uppercase tracking-[0.2em] transition-all ${
                      canSave
                        ? "bg-(--guto-cyan) text-(--guto-navy) shadow-[0_4px_16px_rgba(82,231,255,0.3)]"
                        : "bg-white/40 text-[rgba(13,35,65,0.3)] border border-[rgba(13,35,65,0.08)]"
                    }`}
                  >
                    {locale.settingsSave}
                  </button>
                </div>
              )
            })()}

            {settingsMode === "goal" && (() => {
              const t = translations[selectedLanguage].calibration
              type GoalKey = "consistency" | "fat_loss" | "muscle_gain" | "conditioning" | "mobility_health"
              return (
                <div className="flex flex-1 flex-col gap-4 pt-2">
                  <div className="guto-slot rounded-3xl px-5 py-4">
                    <div className="flex flex-wrap justify-center gap-2">
                      {(Object.entries(t.objectiveChips) as [GoalKey, string][]).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSettingsGoalDraft(key)}
                          className={`rounded-full border px-4 py-1.5 font-mono text-[10px] font-black uppercase tracking-widest transition-all ${
                            settingsGoalDraft === key
                              ? "border-[rgba(82,231,255,0.75)] bg-[rgba(82,231,255,0.18)] text-(--guto-cyan)"
                              : "border-[rgba(82,231,255,0.28)] bg-white/50 text-[rgba(13,35,65,0.65)]"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!settingsGoalDraft}
                    onClick={() => void saveGoalSettings()}
                    className={`h-12 w-full rounded-full font-mono text-[11px] font-black uppercase tracking-[0.2em] transition-all ${
                      settingsGoalDraft
                        ? "bg-(--guto-cyan) text-(--guto-navy) shadow-[0_4px_16px_rgba(82,231,255,0.3)]"
                        : "bg-white/40 text-[rgba(13,35,65,0.3)] border border-[rgba(13,35,65,0.08)]"
                    }`}
                  >
                    {locale.settingsSave}
                  </button>
                </div>
              )
            })()}

            {settingsMode === "location" && (() => {
              const t = translations[selectedLanguage].calibration
              type LocationKey = "gym" | "home" | "park" | "mixed"
              return (
                <div className="flex flex-1 flex-col gap-4 pt-2">
                  <div className="guto-slot rounded-3xl px-5 py-4">
                    <div className="flex flex-wrap justify-center gap-2">
                      {(Object.entries(t.locationOptions) as [LocationKey, string][]).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSettingsLocationDraft(key)}
                          className={`rounded-full border px-4 py-1.5 font-mono text-[10px] font-black uppercase tracking-widest transition-all ${
                            settingsLocationDraft === key
                              ? "border-[rgba(82,231,255,0.75)] bg-[rgba(82,231,255,0.18)] text-(--guto-cyan)"
                              : "border-[rgba(82,231,255,0.28)] bg-white/50 text-[rgba(13,35,65,0.65)]"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!settingsLocationDraft}
                    onClick={() => void saveLocationSettings()}
                    className={`h-12 w-full rounded-full font-mono text-[11px] font-black uppercase tracking-[0.2em] transition-all ${
                      settingsLocationDraft
                        ? "bg-(--guto-cyan) text-(--guto-navy) shadow-[0_4px_16px_rgba(82,231,255,0.3)]"
                        : "bg-white/40 text-[rgba(13,35,65,0.3)] border border-[rgba(13,35,65,0.08)]"
                    }`}
                  >
                    {locale.settingsSave}
                  </button>
                </div>
              )
            })()}

            {settingsMode === "pathology" && (
              <div className="flex flex-1 flex-col gap-4 pt-2">
                <div className="guto-slot rounded-3xl px-5 py-4">
                  <input
                    type="text"
                    value={settingsPathologyDraft}
                    onChange={(e) => setSettingsPathologyDraft(e.target.value)}
                    placeholder={translations[selectedLanguage].calibration.pathologyPlaceholder}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className="w-full rounded-full border border-[rgba(82,231,255,0.45)] bg-white px-4 py-2.5 font-mono text-[12px] text-(--guto-navy) placeholder-[rgba(13,35,65,0.3)] outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void savePathologySettings()}
                  className="h-12 w-full rounded-full bg-(--guto-cyan) font-mono text-[11px] font-black uppercase tracking-[0.2em] text-(--guto-navy) shadow-[0_4px_16px_rgba(82,231,255,0.3)]"
                >
                  {locale.settingsSave}
                </button>
              </div>
            )}

            {settingsMode === "physicaldata" && (() => {
              const cal = translations[selectedLanguage].calibration
              const wNum = parseFloat(settingsWeightDraft)
              const hNum = parseInt(settingsHeightDraft, 10)
              const isWeightValid = !isNaN(wNum) && wNum >= 30 && wNum <= 300
              const isHeightValid = !isNaN(hNum) && hNum >= 100 && hNum <= 250
              const canSave = isWeightValid || isHeightValid
              const inputClass = "w-full rounded-full border border-[rgba(82,231,255,0.45)] bg-white px-4 py-2.5 text-center font-mono text-[14px] font-black text-(--guto-navy) outline-none appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              const labelClass = "mb-2 font-mono text-[8px] font-black uppercase tracking-[0.2em] text-[rgba(13,35,65,0.42)]"
              return (
                <div className="flex flex-1 flex-col gap-4 pt-2">
                  <div className="guto-slot rounded-3xl px-5 py-4 flex flex-col gap-3">
                    <div>
                      <p className={labelClass}>{cal.weightLabel}</p>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={30}
                        max={300}
                        step={0.1}
                        value={settingsWeightDraft}
                        onChange={(e) => setSettingsWeightDraft(e.target.value)}
                        placeholder="--"
                        autoComplete="off"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <p className={labelClass}>{cal.heightLabel}</p>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={100}
                        max={250}
                        value={settingsHeightDraft}
                        onChange={(e) => setSettingsHeightDraft(e.target.value)}
                        placeholder="--"
                        autoComplete="off"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!canSave}
                    onClick={() => void savePhysicalDataSettings()}
                    className={`h-12 w-full rounded-full font-mono text-[11px] font-black uppercase tracking-[0.2em] transition-all ${
                      canSave
                        ? "bg-(--guto-cyan) text-(--guto-navy) shadow-[0_4px_16px_rgba(82,231,255,0.3)]"
                        : "bg-white/40 text-[rgba(13,35,65,0.3)] border border-[rgba(13,35,65,0.08)]"
                    }`}
                  >
                    {locale.settingsSave}
                  </button>
                </div>
              )
            })()}

            {settingsMode === "residence" && (() => {
              const cal = translations[selectedLanguage].calibration
              return (
                <div className="flex flex-1 flex-col gap-4 pt-2">
                  <div className="guto-slot rounded-3xl px-5 py-4">
                    <p className="mb-2 font-mono text-[8px] font-black uppercase tracking-[0.2em] text-[rgba(13,35,65,0.42)]">{cal.countryLabel}</p>
                    <input
                      type="text"
                      value={settingsCountryDraft}
                      onChange={(e) => setSettingsCountryDraft(e.target.value)}
                      placeholder={cal.countryPlaceholder}
                      autoComplete="country-name"
                      autoCorrect="off"
                      spellCheck={false}
                      className="w-full rounded-full border border-[rgba(82,231,255,0.45)] bg-white px-4 py-2.5 font-mono text-[12px] text-(--guto-navy) placeholder-[rgba(13,35,65,0.3)] outline-none"
                    />
                  </div>
                  <div className="guto-slot rounded-3xl px-5 py-4">
                    <p className="mb-2 font-mono text-[8px] font-black uppercase tracking-[0.2em] text-[rgba(13,35,65,0.42)]">{cal.cityLabel}</p>
                    <input
                      type="text"
                      value={settingsCityDraft}
                      onChange={(e) => setSettingsCityDraft(e.target.value)}
                      placeholder={cal.cityPlaceholder}
                      autoComplete="address-level2"
                      autoCorrect="off"
                      spellCheck={false}
                      className="w-full rounded-full border border-[rgba(82,231,255,0.45)] bg-white px-4 py-2.5 font-mono text-[12px] text-(--guto-navy) placeholder-[rgba(13,35,65,0.3)] outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void saveResidenceSettings()}
                    className="h-12 w-full rounded-full bg-(--guto-cyan) font-mono text-[11px] font-black uppercase tracking-[0.2em] text-(--guto-navy) shadow-[0_4px_16px_rgba(82,231,255,0.3)]"
                  >
                    {locale.settingsSave}
                  </button>
                </div>
              )
            })()}

            {settingsMode === "food_restrictions" && (() => {
              const cal = translations[selectedLanguage].calibration
              return (
                <div className="flex flex-1 flex-col gap-4 pt-2">
                  <div className="guto-slot rounded-3xl px-5 py-4">
                    <p className="mb-2 font-mono text-[8px] font-black uppercase tracking-[0.2em] text-[rgba(13,35,65,0.42)]">{cal.restrictionsLabel}</p>
                    <input
                      type="text"
                      value={settingsFoodRestrictionsDraft}
                      onChange={(e) => setSettingsFoodRestrictionsDraft(e.target.value)}
                      placeholder={cal.restrictionsPlaceholder}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      className="w-full rounded-full border border-[rgba(82,231,255,0.45)] bg-white px-4 py-2.5 font-mono text-[12px] text-(--guto-navy) placeholder-[rgba(13,35,65,0.3)] outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void saveFoodRestrictionsSettings()}
                    className="h-12 w-full rounded-full bg-(--guto-cyan) font-mono text-[11px] font-black uppercase tracking-[0.2em] text-(--guto-navy) shadow-[0_4px_16px_rgba(82,231,255,0.3)]"
                  >
                    {locale.settingsSave}
                  </button>
                </div>
              )
            })()}


            {settingsMode === "privacy" && (() => {
              const stored = (() => {
                if (typeof window === "undefined" || !user?.userId) return null
                try { return JSON.parse(window.localStorage.getItem(`${STORAGE_KEY}-${user.userId}`) ?? "null") as StoredProfile | null } catch { return null }
              })()
              const consentHealth = stored?.consentHealthFitness === true
              const consentTerms = stored?.acceptedTerms === true
              const consentDate = stored?.consentAcceptedAt
              const confirmWord = locale.privacyDeleteConfirmWord
              const canConfirmDelete = deleteConfirmText.trim() === confirmWord

              const rowClass = "flex items-center justify-between gap-2 py-1"
              const labelClass = "font-mono text-[10px] font-black uppercase tracking-[0.12em] text-[rgba(13,35,65,0.6)]"
              const statusClass = (ok: boolean) => `font-mono text-[10px] font-black uppercase tracking-widest ${ok ? "text-(--guto-cyan)" : "text-[rgba(13,35,65,0.38)]"}`
              const btnPrimary = "h-11 w-full rounded-full bg-(--guto-cyan) font-mono text-[11px] font-black uppercase tracking-[0.2em] text-(--guto-navy) shadow-[0_4px_16px_rgba(82,231,255,0.3)] flex items-center justify-center gap-2"
              const btnGhost = "h-11 w-full rounded-full border border-[rgba(13,35,65,0.14)] bg-white/55 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[rgba(13,35,65,0.65)]"
              const btnDanger = "h-11 w-full rounded-full border border-[rgba(255,60,60,0.4)] bg-[rgba(255,60,60,0.07)] font-mono text-[11px] font-black uppercase tracking-[0.18em] text-[rgba(200,30,30,0.85)] flex items-center justify-center gap-2 disabled:opacity-40"

              return (
                <div className="flex flex-1 flex-col gap-3 pt-2 overflow-y-auto pb-8">
                  {/* Consent status */}
                  <div className="guto-slot rounded-3xl px-5 py-4 flex flex-col gap-1">
                    <p className="mb-2 font-mono text-[8px] font-black uppercase tracking-[0.2em] text-[rgba(13,35,65,0.42)]">{locale.privacyConsentTitle}</p>
                    <div className={rowClass}>
                      <span className={labelClass}>{locale.privacyHealthConsentLabel}</span>
                      <span className={statusClass(consentHealth)}>{consentHealth ? locale.privacyAccepted : locale.privacyNotAccepted}</span>
                    </div>
                    <div className={rowClass}>
                      <span className={labelClass}>{locale.privacyTermsConsentLabel}</span>
                      <span className={statusClass(consentTerms)}>{consentTerms ? locale.privacyAccepted : locale.privacyNotAccepted}</span>
                    </div>
                    {consentDate && (
                      <p className="mt-1 font-mono text-[8px] text-[rgba(13,35,65,0.38)] uppercase tracking-widest">
                        {locale.privacyAcceptedAt}: {new Date(consentDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {/* Notifications toggle */}
                  {!privacyConfirm && (
                    <div className="guto-slot rounded-3xl px-5 py-4 flex flex-col gap-2">
                      <p className="font-mono text-[8px] font-black uppercase tracking-[0.2em] text-[rgba(13,35,65,0.42)]">{locale.pushTitle}</p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[rgba(13,35,65,0.6)] leading-relaxed">{locale.pushSubtitle}</p>
                      <button
                        type="button"
                        onClick={handleTogglePush}
                        disabled={pushBusy}
                        className={`${pushSubscribed ? btnGhost : btnPrimary} mt-1 disabled:opacity-50`}
                      >
                        {pushSubscribed ? locale.pushDisable : locale.pushEnable}
                      </button>
                      {pushMsg && (
                        <p className="font-mono text-[9px] uppercase tracking-widest text-[rgba(200,30,30,0.85)]">{pushMsg}</p>
                      )}
                    </div>
                  )}

                  {/* Billing — manage subscription */}
                  {!privacyConfirm && billingStatus?.hasStripeCustomer && (
                    <div className="guto-slot rounded-3xl px-5 py-4 flex flex-col gap-2">
                      <p className="font-mono text-[8px] font-black uppercase tracking-[0.2em] text-[rgba(13,35,65,0.42)]">{locale.billingTitle}</p>
                      <button
                        type="button"
                        onClick={handleManageSubscription}
                        disabled={billingBusy}
                        className={`${btnGhost} mt-1 disabled:opacity-50`}
                      >
                        {locale.billingManage}
                      </button>
                      {billingMsg && (
                        <p className="font-mono text-[9px] uppercase tracking-widest text-[rgba(200,30,30,0.85)]">{billingMsg}</p>
                      )}
                    </div>
                  )}

                  {/* Inline message (after correct data) */}
                  {privacyMsg && !privacyConfirm && (
                    <div className="rounded-[1.25rem] border border-[rgba(82,231,255,0.4)] bg-[rgba(82,231,255,0.08)] px-4 py-3">
                      <p className="font-mono text-[10px] font-black uppercase tracking-widest text-(--guto-navy)">{privacyMsg}</p>
                    </div>
                  )}

                  {/* Revoke confirm dialog */}
                  {privacyConfirm === "revoke" && (
                    <div className="guto-slot rounded-3xl px-5 py-4 flex flex-col gap-3">
                      <p className="font-mono text-[10px] font-black uppercase tracking-widest text-(--guto-navy) leading-relaxed">{locale.privacyRevokeWarning}</p>
                      <button type="button" onClick={handleRevokeConsent} className={btnDanger}>
                        {locale.privacyRevokeConfirm}
                      </button>
                      <button type="button" onClick={() => setPrivacyConfirm(null)} className={btnGhost}>
                        {locale.privacyCancel}
                      </button>
                    </div>
                  )}

                  {/* Delete step 1 */}
                  {privacyConfirm === "delete-step1" && (
                    <div className="guto-slot rounded-3xl px-5 py-4 flex flex-col gap-3">
                      <p className="font-mono text-[10px] font-black uppercase tracking-widest text-(--guto-navy) leading-relaxed">{locale.privacyDeleteStep1}</p>
                      <button type="button" onClick={() => setPrivacyConfirm("delete-step2")} className={btnDanger}>
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                        {locale.privacyDeleteBtn}
                      </button>
                      <button type="button" onClick={() => setPrivacyConfirm(null)} className={btnGhost}>
                        {locale.privacyCancel}
                      </button>
                    </div>
                  )}

                  {/* Delete step 2 — type confirmation */}
                  {privacyConfirm === "delete-step2" && (
                    <div className="guto-slot rounded-3xl px-5 py-4 flex flex-col gap-3">
                      <p className="font-mono text-[9px] font-black uppercase tracking-[0.15em] text-[rgba(13,35,65,0.5)]">{locale.privacyDeleteStep2Label}</p>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder={confirmWord}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        className="w-full rounded-full border border-[rgba(255,60,60,0.4)] bg-white px-4 py-2.5 text-center font-mono text-[14px] font-black uppercase text-[rgba(200,30,30,0.9)] outline-none placeholder:text-[rgba(13,35,65,0.18)]"
                      />
                      <button type="button" disabled={!canConfirmDelete} onClick={handleDeleteAccountConfirm} className={btnDanger}>
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                        {locale.privacyDeleteBtn}
                      </button>
                      <button type="button" onClick={() => { setPrivacyConfirm(null); setDeleteConfirmText("") }} className={btnGhost}>
                        {locale.privacyCancel}
                      </button>
                    </div>
                  )}

                  {/* Delete done — beta message */}
                  {privacyConfirm === "delete-done" && (
                    <div className="guto-slot rounded-3xl px-5 py-4 flex flex-col gap-3">
                      <p className="font-mono text-[11px] font-black uppercase tracking-[0.12em] text-(--guto-navy)">{locale.privacyDeleteBetaTitle}</p>
                      <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-[rgba(13,35,65,0.6)] leading-relaxed">{locale.privacyDeleteBetaMsg}</p>
                      <button
                        type="button"
                        onClick={async () => {
                          try { await logout() } catch { /* noop */ }
                          window.location.href = "/"
                        }}
                        className={btnDanger}
                      >
                        {locale.settingsClose}
                      </button>
                    </div>
                  )}

                  {/* Action buttons */}
                  {!privacyConfirm && (
                    <div className="flex flex-col gap-2">
                      <button type="button" onClick={handleDownloadData} className={btnPrimary}>
                        <Download className="h-3.5 w-3.5" strokeWidth={2.2} />
                        {locale.privacyDownload}
                      </button>
                      <button type="button" onClick={handleCorrectData} className={btnGhost}>
                        {locale.privacyCorrect}
                      </button>
                      <button type="button" onClick={() => { gutoAudio.playGutoFeedback("tap"); setPrivacyConfirm("revoke") }} className={btnGhost}>
                        {locale.privacyRevoke}
                      </button>
                      <button type="button" onClick={() => { gutoAudio.playGutoFeedback("tap"); setPrivacyConfirm("delete-step1") }} className={btnDanger}>
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                        {locale.privacyDelete}
                      </button>
                    </div>
                  )}
                </div>
              )
            })()}
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {whiteout && (
          <motion.div
            key="whiteout"
            className="absolute inset-0 z-40 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {settingsSavedToast && (
          <motion.div
            key="settings-saved-toast"
            className="pointer-events-none fixed left-1/2 top-[max(env(safe-area-inset-top),1.25rem)] z-50 -translate-x-1/2"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            <div className="flex items-center gap-2 rounded-full border border-[rgba(82,231,255,0.35)] bg-white/92 px-5 py-2.5 shadow-[0_4px_20px_rgba(13,35,65,0.12)] backdrop-blur-sm">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-(--guto-cyan)" strokeWidth={2.4} />
              <span className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-(--guto-navy)">
                {locale.settingsSavedMsg}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showValidationFlow && (
        <div className="fixed inset-0 z-50">
          <WorkoutValidationFlow
            language={selectedLanguage}
            userId={gutoUserId}
            workoutFocus={localizedWorkoutPlan?.focusKey || "full_body"}
            workoutLabel={localizedWorkoutPlan?.focus || ""}
            locationMode={validationLocationMode}
            workoutPlan={localizedWorkoutPlan}
            onComplete={(validationHistory) => {
              // Optimistic: update validation history immediately
              setMemory((prev) => prev ? { ...prev, validationHistory } : prev)
              setShowValidationFlow(false)
              setActiveTab("caminho")
              // Refresh full memory so totalXp, trainedToday, streak sync everywhere
              getGutoMemory().then((fresh) => {
                if (fresh) setMemory(fresh)
              }).catch(() => {})
              // Tell ArenaTab to refetch rankings
              setArenaRefreshKey((k) => k + 1)
            }}
            onClose={() => setShowValidationFlow(false)}
          />
        </div>
      )}
    </div>
  )
}
