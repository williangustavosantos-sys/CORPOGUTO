"use client"

import { useEffect } from "react"
import { RotateCcw } from "lucide-react"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[GUTO_APP_ERROR]", error)
  }, [error])

  const handleReset = () => {
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.clear()
      }
    } catch {}
    reset()
    if (typeof window !== "undefined") {
      window.location.reload()
    }
  }

  return (
    <div className="flex h-dvh min-h-dvh w-full items-center justify-center bg-[#0d2341] p-4 text-white">
      <div className="flex max-w-sm flex-col items-center rounded-3xl border border-cyan-500/30 bg-slate-900/90 p-6 text-center shadow-2xl backdrop-blur-xl">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-400/30">
          <RotateCcw className="h-7 w-7 text-cyan-400 animate-spin" style={{ animationDuration: "4s" }} />
        </div>
        <h1 className="text-xl font-black uppercase tracking-wider text-cyan-300">GUTO Reestabilizando</h1>
        <p className="mt-2 text-xs font-medium text-slate-300 leading-relaxed">
          Tivemos uma pequena oscilação no carregamento inicial. Toque no botão abaixo para reiniciar o app com segurança.
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 active:scale-95 shadow-lg shadow-cyan-500/20"
        >
          <RotateCcw className="h-4 w-4" />
          Recarregar Aplicativo
        </button>
      </div>
    </div>
  )
}
