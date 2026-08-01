"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error("[GUTO_GLOBAL_ERROR]", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, padding: 0, backgroundColor: "#0d2341", color: "#ffffff", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", height: "100vh", width: "100vw", alignItems: "center", justifyContent: "center", padding: "16px", boxSizing: "border-box" }}>
          <div style={{ maxWidth: "360px", width: "100%", padding: "24px", borderRadius: "24px", border: "1px solid rgba(82, 231, 255, 0.3)", backgroundColor: "rgba(15, 23, 42, 0.95)", textAlign: "center" }}>
            <h1 style={{ fontSize: "18px", fontWeight: 900, textTransform: "uppercase", color: "#52e7ff", margin: "0 0 8px 0" }}>GUTO Reconectando</h1>
            <p style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: 1.5, margin: "0 0 20px 0" }}>
              Atualizamos o sistema com novas melhorias. Toque abaixo para atualizar a sessão.
            </p>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.reload();
                }
              }}
              style={{ width: "100%", padding: "12px 16px", borderRadius: "16px", backgroundColor: "#52e7ff", color: "#020617", border: "none", fontWeight: 800, fontSize: "14px", cursor: "pointer" }}
            >
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
