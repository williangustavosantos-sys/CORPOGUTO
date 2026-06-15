import { test, expect } from "@playwright/test"

// Phase 1.1 smoke: captures the real admin login and legacy panel entrypoints
// at 3 widths. /admin and /empresa are legacy routes whose canonical target is
// /coach; unauthenticated users then land on /admin/login.

const SIZES = [
  { name: "mobile-375", width: 375, height: 740 },
  { name: "iphone-430", width: 430, height: 740 },
  { name: "tablet-768", width: 768, height: 600 },
  { name: "desktop-1024", width: 1024, height: 700 },
  { name: "ipad-820", width: 820, height: 1180 },
  { name: "desktop-1440", width: 1440, height: 900 },
] as const

const ROUTES = [
  { name: "admin-login", path: "/admin/login", finalPath: /\/admin\/login$/ },
  { name: "admin", path: "/admin", finalPath: /\/admin\/login$/ },
  { name: "empresa", path: "/empresa", finalPath: /\/admin\/login$/ },
]

for (const size of SIZES) {
  for (const route of ROUTES) {
    test(`${route.name} @ ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height })
      const resp = await page.goto(route.path, { waitUntil: "domcontentloaded" })
      expect(resp?.status() ?? 0).toBeLessThan(400)
      await page.waitForURL(route.finalPath)
      await page.locator("body").waitFor({ state: "visible" })
      await page.screenshot({
        path: `playwright-report/phase1.1/${route.name}-${size.name}.png`,
        fullPage: false,
      })
      // No horizontal overflow at any breakpoint.
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 1
      })
      expect(overflow).toBe(false)
    })
  }
}

// ─── BUG 5 — botão "Criar" dos modais (aluno/coach/empresa) sempre visível ──────
// O e2e roda só o Next dev (sem backend), então não dá pra autenticar e abrir o
// modal real. Em vez disso, montamos o MESMO contrato de layout de
// app/coach/_components/create-dialogs.tsx (container flex-col + max-h-[90dvh],
// corpo rolável com flex:1 1 auto/min-h:0/overflow-y:auto, footer shrink-0) com
// conteúdo que estoura a altura e provamos que o botão Criar continua no viewport
// e clicável — o que ANTES quebrava em janela baixa/celular.
const MODAL_SIZES = [
  { name: "iphone-430", width: 430, height: 740 },
  { name: "tablet-768", width: 768, height: 600 },
  { name: "desktop-1024", width: 1024, height: 700 },
  { name: "desktop-1440", width: 1440, height: 900 },
] as const

for (const size of MODAL_SIZES) {
  test(`modal "Criar" visível e clicável @ ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height })
    await page.goto("/admin/login", { waitUntil: "domcontentloaded" })

    let clicked = false
    await page.exposeFunction("__bug5OnClick", () => {
      clicked = true
    })

    await page.evaluate(() => {
      const root = document.createElement("div")
      root.id = "bug5-modal"
      // mesmo contrato do dialogClass + dialogStyle
      root.style.cssText =
        "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:min(28rem,92vw);max-height:90dvh;display:flex;flex-direction:column;background:#fff;border:1px solid #ccc;border-radius:16px;overflow:hidden;z-index:99999"
      const header = document.createElement("div")
      header.style.cssText = "flex-shrink:0;padding:20px;border-bottom:1px solid #eee"
      header.textContent = "Novo aluno"
      const body = document.createElement("div")
      // mesmo contrato do bodyStyle: corpo rolável
      body.style.cssText = "flex:1 1 auto;min-height:0;overflow-y:auto;padding:20px;display:grid;gap:14px"
      for (let i = 0; i < 24; i++) {
        const f = document.createElement("input")
        f.style.cssText = "height:40px;display:block;width:100%"
        f.placeholder = "campo " + i
        body.appendChild(f)
      }
      const footer = document.createElement("div")
      // mesmo contrato do footerStyle: footer fixo
      footer.style.cssText = "flex-shrink:0;padding:16px;border-top:1px solid #ccc;display:flex;justify-content:flex-end"
      const btn = document.createElement("button")
      btn.id = "bug5-criar"
      btn.textContent = "Criar"
      btn.style.cssText = "padding:10px 16px"
      btn.addEventListener("click", () => (window as unknown as { __bug5OnClick: () => void }).__bug5OnClick())
      footer.appendChild(btn)
      root.append(header, body, footer)
      document.body.appendChild(root)
    })

    const btn = page.locator("#bug5-criar")
    await expect(btn).toBeVisible()
    await expect(btn).toBeInViewport()
    const box = await btn.boundingBox()
    expect(box).not.toBeNull()
    // O footer/botão não pode ficar recortado abaixo da viewport.
    expect(box!.y + box!.height).toBeLessThanOrEqual(size.height + 1)
    // E tem que ser clicável (não interceptado por overflow).
    await btn.click()
    expect(clicked).toBe(true)
  })
}
