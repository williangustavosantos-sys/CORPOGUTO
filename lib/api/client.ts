/** Backend Render (produção). Override com NEXT_PUBLIC_GUTO_API_URL/NEXT_PUBLIC_API_URL. */
const PRODUCTION_API_URL = "https://cerebroguto.onrender.com"

function shouldUseApiProxy() {
  if (typeof window === "undefined") return false
  const host = window.location.hostname
  if (host.endsWith(".vercel.app") && host !== "corpoguto.vercel.app") return true
  // Dev local: same-origin proxy evita CORS com Render ou backend na :3001.
  // Cobre também IPs de LAN (192.168.x.x / 10.x.x.x / 172.16-31.x.x) para que
  // o painel funcione quando aberto do celular real apontando pro Mac.
  if (process.env.NODE_ENV === "development") {
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") return true
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true
  }
  return false
}

const RAW_API_URL = shouldUseApiProxy()
  ? "/api/guto"
  : process.env.NEXT_PUBLIC_GUTO_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === "production" ? PRODUCTION_API_URL : "http://localhost:3001")

export const API_URL = RAW_API_URL.replace(/\/+$/, "")

let activeAuthToken: string | undefined

export function setApiAuthToken(token: string | null | undefined) {
  activeAuthToken = token || undefined
}

function readAuthToken() {
  if (activeAuthToken) return activeAuthToken
  if (typeof window === "undefined") return undefined
  try {
    return window.localStorage.getItem("guto-auth-token") ?? undefined
  } catch {
    return undefined
  }
}

function removeAuthToken() {
  activeAuthToken = undefined
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem("guto-auth-token")
  } catch {
    // Storage is optional; redirect below still recovers the user session.
  }
}

function isQaDemoMode() {
  const demoEnv = process.env.NEXT_PUBLIC_VERCEL_ENV

  return Boolean(
    typeof window !== "undefined" &&
      process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "true" &&
      (demoEnv === "preview" || demoEnv === "development") &&
      window.location.pathname.startsWith("/coach") &&
      new URLSearchParams(window.location.search).has("demo")
  )
}

export class ApiError extends Error {
  status?: number
  details?: unknown
  code?: string
  constructor(message: string, status?: number, details?: unknown, code?: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.details = details
    this.code = code
  }
}

function isApiErrorBody(value: unknown): value is { message?: string; error?: string; code?: string } {
  return typeof value === "object" && value !== null
}

type GutoErrorLanguage = "pt-BR" | "en-US" | "it-IT"

function readErrorLanguage(language?: string): GutoErrorLanguage {
  if (language === "en-US" || language === "it-IT" || language === "pt-BR") return language
  if (typeof window === "undefined") return "pt-BR"
  try {
    const stored =
      window.localStorage.getItem("guto-selected-language") ||
      window.localStorage.getItem("guto-onboarding-language")
    return stored === "en-US" || stored === "it-IT" || stored === "pt-BR" ? stored : "pt-BR"
  } catch {
    return "pt-BR"
  }
}

const gutoApiErrorCopy: Record<GutoErrorLanguage, {
  timeout: string
  connection: string
  unknown: string
  missingApiUrl: string
  invalidCredentials: string
  accessDenied: string
  accessPaused: string
}> = {
  "pt-BR": {
    timeout: "Ixi, demorei demais pra responder. Aguenta aí e tenta de novo.",
    connection: "Perdi a conexão por um instante. Confere a internet e me chama de novo.",
    unknown: "Deu um curto aqui no meu sistema. Aguenta aí e tenta de novo.",
    missingApiUrl: "Ixi, meu cérebro não está conectado aqui. Configura a URL do Cérebro do GUTO e eu volto.",
    invalidCredentials: "Credenciais inválidas.",
    accessDenied: "Acesso negado.",
    accessPaused: "Teu acesso está pausado ou expirado. Resolve isso e eu volto contigo.",
  },
  "en-US": {
    timeout: "My system took too long to answer. Hold on and try again.",
    connection: "I lost connection for a moment. Check the internet and call me again.",
    unknown: "My system shorted out here. Hold on and try again.",
    missingApiUrl: "My brain is not connected here. Configure the GUTO Brain URL and I will be back.",
    invalidCredentials: "Invalid credentials.",
    accessDenied: "Access denied.",
    accessPaused: "Your access is paused or expired. Fix that and I will be back with you.",
  },
  "it-IT": {
    timeout: "Il mio sistema ci ha messo troppo a rispondere. Aspetta un attimo e riprova.",
    connection: "Ho perso la connessione per un attimo. Controlla internet e richiamami.",
    unknown: "Mi si è inceppato il sistema qui. Aspetta un attimo e riprova.",
    missingApiUrl: "Il mio cervello non è collegato qui. Configura l'URL del Cervello GUTO e torno.",
    invalidCredentials: "Credenziali non valide.",
    accessDenied: "Accesso negato.",
    accessPaused: "Il tuo accesso è in pausa o scaduto. Sistema questo e torno con te.",
  },
}

export function getApiErrorMessage(error: unknown, language?: string): string {
  const copy = gutoApiErrorCopy[readErrorLanguage(language)]
  if (error instanceof ApiError) {
    if (error.code === "TIMEOUT") return copy.timeout
    if (error.code === "CONNECTION_ERROR") return copy.connection
    if (error.code === "ACCESS_PAUSED") return copy.accessPaused
    if (error.status === 401) return copy.invalidCredentials
    if (error.status === 403) return copy.accessDenied
    return error.message
  }
  if (error instanceof Error) return error.message
  return copy.unknown
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number
  token?: string
  suppressAuthRedirect?: boolean
}

export async function apiRequest<T>(
  path: string,
  { timeoutMs = 15000, token, suppressAuthRedirect = false, ...init }: RequestOptions = {}
): Promise<T> {
  if (!API_URL) {
    throw new ApiError(gutoApiErrorCopy[readErrorLanguage()].missingApiUrl)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  // Prefer the token held by AuthProvider. localStorage remains the durable
  // reload fallback, but blocked storage must not create an authenticated UI
  // whose API requests silently lose the Authorization header.
  const activeToken = token || readAuthToken()

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(activeToken ? { "Authorization": `Bearer ${activeToken}` } : {}),
        ...(init.headers || {}),
      },
      signal: controller.signal,
    })

    if (res.status === 401) {
      const body = await res.json().catch(() => ({}))
      const isLoginEndpoint = path.includes("/login")
      const shouldSuppressAuthRedirect = suppressAuthRedirect || isQaDemoMode()

      removeAuthToken()

      if (!isLoginEndpoint && typeof window !== "undefined" && !shouldSuppressAuthRedirect) {
        if (
          window.location.pathname !== "/" &&
          !window.location.pathname.includes("/login") &&
          !window.location.pathname.includes("/convite")
        ) {
          window.location.href = "/login"
        }
      }

      throw new ApiError(isApiErrorBody(body) ? body.message || "Credenciais inválidas." : "Credenciais inválidas.", 401, body, isApiErrorBody(body) ? body.code : undefined)
    }

    if (res.status === 403) {
      const body = await res.json().catch(() => ({}))
      const code = isApiErrorBody(body) ? body.code : undefined
      const blockedCodes = new Set([
        "ACCESS_PAUSED",
        "ACCESS_EXPIRED",
        "SUBSCRIPTION_EXPIRED",
        "GUTO_DECEASED",
        "GUTO_DEAD",
      ])
      if (code && blockedCodes.has(code)) {
        if (!suppressAuthRedirect && typeof window !== "undefined" && !window.location.pathname.includes("/acesso-pausado")) {
          window.location.href = `/acesso-pausado?reason=${encodeURIComponent(code)}`
        }
      }
      throw new ApiError(isApiErrorBody(body) ? body.message || "Acesso negado." : "Acesso negado.", 403, body, code)
    }

    if (!res.ok) {
      let message = `Erro de API (${res.status})`
      let details: unknown = undefined
      try {
        const body = await res.json()
        message = isApiErrorBody(body) ? body.message || body.error || message : message
        details = body
      } catch {}
      throw new ApiError(message, res.status, details)
    }

    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("timeout", undefined, undefined, "TIMEOUT")
    }
    if (err instanceof ApiError) throw err
    throw new ApiError("connection_error", undefined, undefined, "CONNECTION_ERROR")
  } finally {
    clearTimeout(timeout)
  }
}
