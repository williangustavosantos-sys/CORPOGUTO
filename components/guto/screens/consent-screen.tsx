"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { AlertTriangle, Brain, Shield } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

type ConsentLanguage = "pt-BR" | "en-US" | "it-IT"

interface ConsentScreenProps {
  language?: string
  onComplete: () => void
  errorMessage?: string | null
}

const consentCopy: Record<ConsentLanguage, {
  headline: string
  subtext: string
  aiTitle: string
  aiBody: string
  dataTitle: string
  dataBody: string
  safetyTitle: string
  safetyBody: string
  checkHealth: string
  checkTerms: string
  termsLabel: string
  and: string
  privacyLabel: string
  cta: string
}> = {
  "pt-BR": {
    headline: "Antes de começar",
    subtext: "Leia e confirme abaixo para continuar.",
    aiTitle: "O GUTO é uma IA",
    aiBody: "O GUTO é um assistente digital com inteligência artificial. Ele ajuda com treino, dieta e rotina, mas não substitui avaliação médica, nutricional ou profissional presencial.",
    dataTitle: "Uso de dados de saúde e fitness",
    dataBody: "Para gerar treinos, dietas e acompanhamento, o GUTO usa dados como peso, altura, objetivo, limitações, patologias, restrições alimentares e histórico de treino.",
    safetyTitle: "Responsabilidade",
    safetyBody: "Se você sentir dor, tontura, mal-estar ou tiver condição médica, interrompa o treino e procure um profissional.",
    checkHealth: "Li e aceito que o GUTO use meus dados de saúde/fitness para gerar treino, dieta e acompanhamento.",
    checkTerms: "Li e aceito os",
    termsLabel: "Termos de Uso",
    and: "e a",
    privacyLabel: "Política de Privacidade",
    cta: "Continuar",
  },
  "en-US": {
    headline: "Before you start",
    subtext: "Read and confirm below to continue.",
    aiTitle: "GUTO is an AI",
    aiBody: "GUTO is a digital assistant powered by artificial intelligence. It helps with training, diet, and routine, but does not replace medical, nutritional, or in-person professional evaluation.",
    dataTitle: "Use of health & fitness data",
    dataBody: "To generate workouts, diets, and tracking, GUTO uses data such as weight, height, goals, limitations, pathologies, dietary restrictions, and training history.",
    safetyTitle: "Responsibility",
    safetyBody: "If you feel pain, dizziness, discomfort, or have a medical condition, stop training and seek a professional.",
    checkHealth: "I have read and accept that GUTO may use my health/fitness data to generate training, diet, and tracking.",
    checkTerms: "I have read and accept the",
    termsLabel: "Terms of Use",
    and: "and the",
    privacyLabel: "Privacy Policy",
    cta: "Continue",
  },
  "it-IT": {
    headline: "Prima di iniziare",
    subtext: "Leggi e conferma qui sotto per continuare.",
    aiTitle: "GUTO è una IA",
    aiBody: "GUTO è un assistente digitale con intelligenza artificiale. Aiuta con allenamento, dieta e routine, ma non sostituisce la valutazione medica, nutrizionale o professionale in presenza.",
    dataTitle: "Uso dei dati di salute e fitness",
    dataBody: "Per generare allenamenti, diete e monitoraggio, GUTO utilizza dati come peso, altezza, obiettivi, limitazioni, patologie, restrizioni alimentari e storico degli allenamenti.",
    safetyTitle: "Responsabilità",
    safetyBody: "Se senti dolore, vertigini, malessere o hai una condizione medica, interrompi l'allenamento e rivolgiti a un professionista.",
    checkHealth: "Ho letto e accetto che GUTO utilizzi i miei dati di salute/fitness per generare allenamenti, dieta e monitoraggio.",
    checkTerms: "Ho letto e accetto i",
    termsLabel: "Termini di Utilizzo",
    and: "e la",
    privacyLabel: "Informativa sulla Privacy",
    cta: "Continua",
  },
}

function ConsentCheckbox({
  checked,
  onChange,
  ariaLabel,
  children,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  ariaLabel: string
  children: React.ReactNode
}) {
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      tabIndex={0}
      className="flex min-h-11 cursor-pointer items-start gap-2.5 rounded-2xl py-0.5"
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") onChange(!checked) }}
    >
      <div
        className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border-2 transition-colors"
        style={
          checked
            ? { borderColor: "var(--guto-cyan)", background: "var(--guto-cyan)" }
            : { borderColor: "rgba(13,35,65,0.2)", background: "white" }
        }
      >
        {checked && (
          <svg viewBox="0 0 10 8" className="h-3 w-3" fill="none" stroke="var(--guto-navy)" strokeWidth="2">
            <path d="M1 4l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className="select-none text-[12px] leading-snug text-[rgba(13,35,65,0.76)]">{children}</span>
    </div>
  )
}

export function ConsentScreen({ language = "pt-BR", onComplete, errorMessage }: ConsentScreenProps) {
  const safeLanguage: ConsentLanguage = language === "en-US" || language === "it-IT" ? language : "pt-BR"
  const t = consentCopy[safeLanguage]
  const [checkHealth, setCheckHealth] = useState(false)
  const [checkTerms, setCheckTerms] = useState(false)
  const canContinue = checkHealth && checkTerms

  return (
    <motion.section
      className="absolute inset-0 z-30 flex flex-col overflow-y-auto px-5 py-[max(env(safe-area-inset-top),18px)]"
      style={{
        background:
          'linear-gradient(180deg, rgba(255,255,255,.55) 0%, rgba(255,255,255,.18) 22%, rgba(255,255,255,.08) 50%, rgba(255,255,255,.45) 78%, rgba(220,232,244,.85) 100%), url("/assets/guto/FUNDO_APP.JPG") center / cover no-repeat',
        WebkitOverflowScrolling: "touch",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="mx-auto flex min-h-full w-full max-w-sm flex-col justify-center gap-3 py-3">
      <div className="flex flex-col items-center text-center">
        <Image
          src="/assets/guto/logo_guto.png"
          alt="GUTO"
          width={112}
          height={36}
          priority
          style={{
            width: 112,
            height: "auto",
            filter: "drop-shadow(0 0 12px rgba(82,231,255,0.55)) drop-shadow(0 4px 8px rgba(13,35,65,0.10))",
          }}
        />
        <h1 className="mt-3 text-[22px] font-black uppercase leading-none tracking-[0.06em]" style={{ color: "var(--guto-navy)" }}>
          {t.headline}
        </h1>
        <p className="mt-1 text-[12px] font-semibold text-[rgba(13,35,65,0.58)]">{t.subtext}</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="rounded-[18px] border border-white/90 bg-white/70 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_8px_18px_rgba(90,124,168,0.10)] backdrop-blur-[18px]">
          <div className="mb-1.5 flex items-center justify-center gap-2">
            <Brain className="h-4 w-4 opacity-50" style={{ color: "var(--guto-navy)" }} />
            <p className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-[rgba(13,35,65,0.55)]">
              {t.aiTitle}
            </p>
          </div>
          <p className="text-center text-[11.5px] leading-snug text-[rgba(13,35,65,0.7)]">{t.aiBody}</p>
        </div>

        <div className="rounded-[18px] border border-white/90 bg-white/70 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_8px_18px_rgba(90,124,168,0.10)] backdrop-blur-[18px]">
          <div className="mb-1.5 flex items-center justify-center gap-2">
            <Shield className="h-4 w-4 opacity-50" style={{ color: "var(--guto-navy)" }} />
            <p className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-[rgba(13,35,65,0.55)]">
              {t.dataTitle}
            </p>
          </div>
          <p className="text-center text-[11.5px] leading-snug text-[rgba(13,35,65,0.7)]">{t.dataBody}</p>
        </div>

        <div className="rounded-[18px] border border-[rgba(82,231,255,0.38)] bg-white/70 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_0_18px_rgba(82,231,255,0.16)] backdrop-blur-[18px]">
          <div className="mb-1.5 flex items-center justify-center gap-2">
            <AlertTriangle className="h-4 w-4" style={{ color: "var(--guto-cyan)" }} />
            <p className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-[rgba(13,35,65,0.55)]">
              {t.safetyTitle}
            </p>
          </div>
          <p className="text-center text-[11.5px] leading-snug text-[rgba(13,35,65,0.7)]">{t.safetyBody}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 rounded-[18px] border border-white/90 bg-white/65 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_8px_18px_rgba(90,124,168,0.08)] backdrop-blur-[18px]">
        <ConsentCheckbox checked={checkHealth} onChange={setCheckHealth} ariaLabel={t.checkHealth}>
          {t.checkHealth}
        </ConsentCheckbox>

        <ConsentCheckbox
          checked={checkTerms}
          onChange={setCheckTerms}
          ariaLabel={`${t.checkTerms} ${t.termsLabel} ${t.and} ${t.privacyLabel}`}
        >
          {t.checkTerms}{" "}
          <Link
            href={`/terms?lang=${safeLanguage}`}
            className="font-semibold underline"
            style={{ color: "var(--guto-navy)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {t.termsLabel}
          </Link>{" "}
          {t.and}{" "}
          <Link
            href={`/privacy?lang=${safeLanguage}`}
            className="font-semibold underline"
            style={{ color: "var(--guto-navy)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {t.privacyLabel}
          </Link>
          .
        </ConsentCheckbox>
      </div>

      <div>
        {errorMessage && (
          <p className="mb-2 text-center font-mono text-[10px] font-black uppercase leading-snug tracking-[0.12em] text-[rgba(200,30,30,0.82)]">
            {errorMessage}
          </p>
        )}
        <button
          type="button"
          onClick={canContinue ? onComplete : undefined}
          disabled={!canContinue}
          className={`h-[52px] w-full rounded-full font-mono text-[11px] font-black uppercase tracking-[0.2em] transition-all ${
            canContinue ? "cursor-pointer active:scale-95" : "cursor-not-allowed"
          }`}
          style={
            canContinue
              ? {
                  background: "var(--guto-cyan)",
                  color: "var(--guto-navy)",
                  boxShadow: "0 4px 16px rgba(82,231,255,0.3)",
                }
              : {
                  background: "rgba(13,35,65,0.06)",
                  color: "rgba(13,35,65,0.3)",
                }
          }
        >
          {t.cta}
        </button>
      </div>
      </div>
    </motion.section>
  )
}
