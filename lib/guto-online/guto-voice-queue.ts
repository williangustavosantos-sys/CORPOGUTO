"use client"

/**
 * GUTO Voice Queue
 * --------------------------------------------------------------------------
 * Problema que isso resolve:
 *
 *   GUTO fala "série feita"
 *   GUTO fala "descansa"
 *   GUTO fala "próxima"
 *   ↑ tudo atropelado se você só chamar gutoVoice.speak() em sequência.
 *
 * Esta fila garante:
 *   - uma fala por vez
 *   - prioridade (interrupt | normal | low)
 *   - abort() limpo (push-to-talk derruba fala atual)
 *   - dedupe por (intentKey + text) numa janela curta — evita repetir a
 *     mesma frase quando dois eventos pedem a mesma coisa simultaneamente
 *
 * Quando a voz está desligada (mode = "disabled"), a fila não fala — só
 * registra a linha (para a UI/notificação consumir) e dispara o callback.
 */

import { gutoVoice, type GutoVoiceSource, type SpeakGutoOptions } from "@/lib/guto-voice/guto-voice-service"
import type { GutoVoiceMode } from "./guto-online-types"

export type GutoVoicePriority = "interrupt" | "normal" | "low"

export interface GutoVoiceItem {
  intentKey: string
  text: string
  language: string
  source?: GutoVoiceSource
  priority?: GutoVoicePriority
  preferStatic?: boolean
  onStart?: () => void
  onEnd?: () => void
}

interface GutoVoiceSpeaker {
  speak: (options: SpeakGutoOptions) => Promise<unknown>
  stop: () => void
}

interface GutoVoiceQueueOptions {
  speaker?: GutoVoiceSpeaker
  source?: GutoVoiceSource
}

interface InternalItem extends GutoVoiceItem {
  id: number
  enqueuedAt: number
}

const DEDUPE_WINDOW_MS = 1200

export class GutoVoiceQueue {
  private queue: InternalItem[] = []
  private currentId: number | null = null
  private nextId = 1
  private recentlySaid: Array<{ key: string; at: number }> = []
  private mode: GutoVoiceMode = "enabled"
  private destroyed = false
  private speaker: GutoVoiceSpeaker
  private source: GutoVoiceSource

  constructor(options: GutoVoiceQueueOptions = {}) {
    this.speaker = options.speaker ?? gutoVoice
    this.source = options.source ?? "online"
  }

  setMode(mode: GutoVoiceMode) {
    if (this.mode === mode) return
    this.mode = mode
    if (mode === "disabled") {
      // Não cancelamos a fala atual de imediato — deixamos terminar para não
      // ser estranho. A próxima da fila só vira texto.
    }
  }

  getMode(): GutoVoiceMode {
    return this.mode
  }

  enqueue(item: GutoVoiceItem): void {
    if (this.destroyed) return

    const priority: GutoVoicePriority = item.priority ?? "normal"
    const key = `${item.intentKey}::${item.text}`

    // Dedupe de janela curta.
    const now = Date.now()
    this.recentlySaid = this.recentlySaid.filter((entry) => now - entry.at < DEDUPE_WINDOW_MS)
    if (this.recentlySaid.some((entry) => entry.key === key)) {
      // Já dito recentemente — segue só o callback para a UI manter a linha.
      item.onStart?.()
      item.onEnd?.()
      return
    }
    this.recentlySaid.push({ key, at: now })

    const id = this.nextId++
    const internal: InternalItem = { ...item, id, priority, enqueuedAt: now }

    if (priority === "interrupt") {
      // Limpa o que está esperando, aborta o atual e fala já.
      this.queue = [internal]
      const interrupted = this.abortCurrent()
      if (interrupted) {
        queueMicrotask(() => {
          if (!this.destroyed) void this.drain()
        })
        return
      }
    } else if (priority === "low" && this.currentId != null) {
      this.queue.push(internal)
      return
    } else {
      this.queue.push(internal)
    }

    void this.drain()
  }

  /**
   * Aborta a fala em andamento e limpa a fila.
   * Usado quando o usuário toca "Falar com GUTO" — push-to-talk derruba
   * qualquer coisa que o GUTO esteja dizendo.
   */
  abort(): void {
    this.queue = []
    this.abortCurrent()
  }

  private abortCurrent(): boolean {
    if (this.currentId != null) {
      this.speaker.stop()
      this.currentId = null
      return true
    }
    return false
  }

  private async drain() {
    if (this.currentId != null) return
    if (!this.queue.length) return

    const item = this.queue.shift()
    if (!item) return
    this.currentId = item.id

    try {
      // Sempre dispara o callback onStart para a UI mostrar a linha.
      item.onStart?.()

      if (this.mode === "enabled") {
        await this.speaker.speak({
          text: item.text,
          language: item.language,
          intentKey: item.intentKey,
          source: item.source ?? this.source,
          preferStatic: item.preferStatic ?? false,
        })
      } else {
        // Modo texto: dá um pequeno respiro para a UI exibir a linha
        // antes de drenar o próximo. Sem isso, várias falas seguidas
        // colidem em um único frame.
        await new Promise<void>((resolve) => setTimeout(resolve, 200))
      }
    } finally {
      const isCurrentItem = this.currentId === item.id
      if (isCurrentItem) {
        this.currentId = null
        item.onEnd?.()
      }
      // continua drenando
      if (!this.destroyed && isCurrentItem) void this.drain()
    }
  }

  destroy() {
    this.destroyed = true
    this.queue = []
    this.abortCurrent()
  }
}
