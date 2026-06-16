"use client"

import manifest from "@/public/voicepack/manifest.json"
import { API_URL } from "@/lib/api/client"
import {
  VoiceResolver,
  type VoicePackManifest,
  type VoiceRuntimeState,
  createInitialVoiceRuntimeState,
  normalizeVoiceRuntimeState,
} from "@/lib/guto-online/voice-resolver"

export type GutoVoiceSource = "chat" | "online" | "system"

export interface SpeakGutoOptions {
  text: string
  language: string
  intentKey?: string
  source?: GutoVoiceSource
  preferStatic?: boolean
  allowRemoteSynthesis?: boolean
  onStart?: () => void
  onEnd?: () => void
}

export interface GutoVoiceBankRecord {
  key: string
  textHash: string
  text: string
  language: string
  voiceId: string
  voiceVersion: string
  source: GutoVoiceSource
  provider: "backend-voz"
  blob: Blob
  contentType: string
  createdAt: number
  lastUsedAt: number
  hitCount: number
}

export type GutoVoiceMode = "static-file" | "local-cache" | "remote-saved" | "browser-fallback" | "silent"

export interface GutoVoiceResult {
  mode: GutoVoiceMode
  cacheKey?: string
  file?: string
  textHash?: string
  voiceId: string
  voiceVersion: string
  contentType?: string
}

const VOICE_HISTORY_KEY = "guto.voice.history.v1"
const DB_NAME = "guto-voice-bank"
const DB_VERSION = 1
const AUDIO_STORE = "audio"
// Respostas do GUTO são curtas (2-3 frases), mas algumas passavam de 240 e
// caíam no fallback do navegador — mudo no celular. 600 cobre praticamente
// toda fala do GUTO com a voz real do servidor, deixando o áudio consistente.
const MAX_REMOTE_TEXT_LENGTH = 600

function isBrowser() {
  return typeof window !== "undefined"
}

function getVoiceId() {
  return String((manifest as VoicePackManifest).voiceId || "GUTO")
}

function getVoiceVersion() {
  return String((manifest as VoicePackManifest).voiceVersion || "v1")
}

function loadVoiceState(): VoiceRuntimeState {
  if (!isBrowser()) return createInitialVoiceRuntimeState()
  try {
    return normalizeVoiceRuntimeState(JSON.parse(window.localStorage.getItem(VOICE_HISTORY_KEY) || "null"))
  } catch {
    return createInitialVoiceRuntimeState()
  }
}

function saveVoiceState(state: VoiceRuntimeState) {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(VOICE_HISTORY_KEY, JSON.stringify(state))
  } catch {
    // Anti-repetition history is non-critical.
  }
}

function normalizeTextForHash(text: string) {
  return text.replace(/\s+/g, " ").trim()
}

async function sha1(value: string) {
  const data = new TextEncoder().encode(value)
  const digest = globalThis.crypto?.subtle?.digest

  if (digest) {
    const hashBuffer = await digest.call(globalThis.crypto.subtle, "SHA-1", data)
    return Array.from(new Uint8Array(hashBuffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
  }

  let hash = 0x811c9dc5
  for (const byte of data) {
    hash ^= byte
    hash = Math.imul(hash, 0x01000193)
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`
}

function base64ToBlob(base64: string, contentType = "audio/mpeg") {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new Blob([bytes], { type: contentType })
}

function openVoiceDb(): Promise<IDBDatabase | null> {
  if (!isBrowser() || !window.indexedDB) return Promise.resolve(null)

  return new Promise((resolve) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE, { keyPath: "key" })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
  })
}

async function getCachedAudio(key: string): Promise<GutoVoiceBankRecord | null> {
  const db = await openVoiceDb()
  if (!db) return null

  return new Promise((resolve) => {
    const transaction = db.transaction(AUDIO_STORE, "readonly")
    const request = transaction.objectStore(AUDIO_STORE).get(key)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => resolve(null)
  })
}

async function saveCachedAudio(record: GutoVoiceBankRecord) {
  const db = await openVoiceDb()
  if (!db) return

  await new Promise<void>((resolve) => {
    const transaction = db.transaction(AUDIO_STORE, "readwrite")
    transaction.objectStore(AUDIO_STORE).put(record)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => resolve()
  })
}

async function touchCachedAudio(record: GutoVoiceBankRecord) {
  await saveCachedAudio({
    ...record,
    lastUsedAt: Date.now(),
    hitCount: record.hitCount + 1,
  })
}

function isRemoteCacheable(text: string) {
  const normalized = normalizeTextForHash(text)
  if (!normalized || normalized.length > MAX_REMOTE_TEXT_LENGTH) return false
  if (/[{}]/.test(normalized)) return false
  return true
}

class GutoVoiceService {
  private resolver: VoiceResolver | null = null
  private currentAudio: HTMLAudioElement | null = null
  // Token monotônico: toda nova fala (ou stop) o incrementa. Uma fala que estava
  // "em voo" (ex: síntese remota lenta) descarta a si mesma se um speak/stop mais
  // novo já passou — garante UMA voz e que fala antiga nunca toca depois da nova.
  private playToken = 0

  private getResolver() {
    if (!this.resolver) {
      this.resolver = new VoiceResolver(manifest as VoicePackManifest, loadVoiceState())
    }
    return this.resolver
  }

  stop() {
    if (!isBrowser()) return
    this.playToken += 1
    window.speechSynthesis?.cancel()
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio = null
    }
  }

  async speak(options: SpeakGutoOptions): Promise<GutoVoiceResult> {
    const {
      text,
      language,
      intentKey,
      source = "system",
      preferStatic = false,
      allowRemoteSynthesis = true,
      onStart,
      onEnd,
    } = options

    if (!isBrowser() || !text.trim()) {
      return {
        mode: "silent",
        voiceId: getVoiceId(),
        voiceVersion: getVoiceVersion(),
      }
    }

    onStart?.()
    this.stop()
    // Esta fala passa a ser a vigente. Se um speak/stop mais novo chegar enquanto
    // esperamos cache/síntese remota, abortamos antes de tocar — nada de voz dupla
    // nem fala antiga tocando depois da nova.
    const myToken = this.playToken
    const isStale = () => myToken !== this.playToken
    const supersededResult: GutoVoiceResult = {
      mode: "silent",
      voiceId: getVoiceId(),
      voiceVersion: getVoiceVersion(),
    }

    try {
      if (intentKey && preferStatic) {
        const resolver = this.getResolver()
        const voiceSource = resolver.resolve({ intentKey, lang: language, text })
        saveVoiceState(resolver.getState())

        if (voiceSource.kind === "file") {
          if (isStale()) return supersededResult
          const played = await this.playFile(voiceSource.url)
          if (played) {
            return {
              mode: "static-file",
              file: voiceSource.url,
              voiceId: getVoiceId(),
              voiceVersion: getVoiceVersion(),
            }
          }
        }
      }

      const cacheKey = await this.cacheKey({ text, language })
      const cached = await getCachedAudio(cacheKey)
      if (cached) {
        if (isStale()) return supersededResult
        await touchCachedAudio(cached)
        await this.playBlob(cached.blob)
        return {
          mode: "local-cache",
          cacheKey,
          textHash: cached.textHash,
          voiceId: cached.voiceId,
          voiceVersion: cached.voiceVersion,
          contentType: cached.contentType,
        }
      }

      if (allowRemoteSynthesis && isRemoteCacheable(text)) {
        const generated = await this.generateRemoteAudio({ text, language, source, cacheKey })
        if (generated) {
          if (isStale()) return supersededResult
          await this.playBlob(generated.blob)
          return {
            mode: "remote-saved",
            cacheKey,
            textHash: generated.textHash,
            voiceId: generated.voiceId,
            voiceVersion: generated.voiceVersion,
            contentType: generated.contentType,
          }
        }
      }

      if (isStale()) return supersededResult
      // Identidade vocal > disponibilidade a qualquer custo. O fallback nativo
      // do navegador muda timbre/persona entre iOS/Android/desktop; quando a
      // voz remota falha, este turno fica silencioso em vez de virar outra voz.
      return {
        mode: "silent",
        cacheKey: await this.cacheKey({ text, language }),
        textHash: await sha1(normalizeTextForHash(text)),
        voiceId: getVoiceId(),
        voiceVersion: getVoiceVersion(),
      }
    } finally {
      onEnd?.()
    }
  }

  async inspect(text: string, language: string) {
    if (!isBrowser() || !text.trim()) return null
    const cacheKey = await this.cacheKey({ text, language })
    const cached = await getCachedAudio(cacheKey)
    return {
      cacheKey,
      cached: Boolean(cached),
      textHash: await sha1(normalizeTextForHash(text)),
      voiceId: getVoiceId(),
      voiceVersion: getVoiceVersion(),
      contentType: cached?.contentType,
      hitCount: cached?.hitCount ?? 0,
      createdAt: cached?.createdAt,
      lastUsedAt: cached?.lastUsedAt,
    }
  }

  private async cacheKey({ text, language }: { text: string; language: string }) {
    const normalizedText = normalizeTextForHash(text)
    const textHash = await sha1(normalizedText)
    return `${language}:${getVoiceId()}:${getVoiceVersion()}:${textHash}`
  }

  private async generateRemoteAudio({
    text,
    language,
    source,
    cacheKey,
  }: {
    text: string
    language: string
    source: GutoVoiceSource
    cacheKey: string
  }): Promise<GutoVoiceBankRecord | null> {
    try {
      const token = window.localStorage.getItem("guto-auth-token")
      const response = await fetch(`${API_URL}/voz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text, language }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.audioContent) return null

      const contentType = typeof data.mimeType === "string" ? data.mimeType : "audio/mpeg"
      const voiceUsed = typeof data.voiceUsed === "string" && data.voiceUsed.trim() ? data.voiceUsed : getVoiceId()
      const record: GutoVoiceBankRecord = {
        key: cacheKey,
        textHash: await sha1(normalizeTextForHash(text)),
        text: normalizeTextForHash(text),
        language,
        voiceId: voiceUsed,
        voiceVersion: getVoiceVersion(),
        source,
        provider: "backend-voz",
        blob: base64ToBlob(data.audioContent, contentType),
        contentType,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        hitCount: 0,
      }
      await saveCachedAudio(record)
      return record
    } catch (error) {
      console.warn("[GUTO_VOICE] remote_synthesis_unavailable", { language, source, error })
      return null
    }
  }

  private playFile(url: string) {
    return new Promise<boolean>((resolve) => {
      try {
        const audio = new Audio(url)
        this.currentAudio = audio
        audio.onended = () => resolve(true)
        audio.onerror = () => resolve(false)
        void audio.play().catch(() => resolve(false))
      } catch {
        resolve(false)
      }
    })
  }

  private playBlob(blob: Blob) {
    return new Promise<void>((resolve) => {
      const url = URL.createObjectURL(blob)
      let done = false
      const MAX_BLOB_MS = 15000
      const safeCleanup = () => {
        if (!done) {
          done = true
          URL.revokeObjectURL(url)
          resolve()
        }
      }
      const hardTimeout = setTimeout(safeCleanup, MAX_BLOB_MS)
      try {
        const audio = new Audio(url)
        this.currentAudio = audio
        audio.onended = () => { clearTimeout(hardTimeout); safeCleanup() }
        audio.onerror = () => { clearTimeout(hardTimeout); safeCleanup() }
        void audio.play().catch(() => { clearTimeout(hardTimeout); safeCleanup() })
      } catch {
        clearTimeout(hardTimeout)
        safeCleanup()
      }
    })
  }
}

export const gutoVoice = new GutoVoiceService()
