import { getLanguage } from "@/components/guto/translations"
import type { SupportedLanguage } from "@/types/contract"
import type { GutoVoiceItem } from "@/lib/guto-online/guto-voice-queue"

function normalizeVoiceIntentText(text: string) {
  return text.replace(/\s+/g, " ").trim().toLocaleLowerCase().slice(0, 96)
}

export function resolveChatVoiceLanguage(language: string): SupportedLanguage {
  return getLanguage(language) as SupportedLanguage
}

export function createChatVoiceItem(text: string, language: string): GutoVoiceItem {
  const safeLanguage = resolveChatVoiceLanguage(language)
  return {
    intentKey: `chat:${safeLanguage}:${normalizeVoiceIntentText(text)}`,
    text,
    language: safeLanguage,
    source: "chat",
    priority: "interrupt",
    preferStatic: false,
  }
}
