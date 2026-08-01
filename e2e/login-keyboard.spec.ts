import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

// Verifica gap A do plano login: viewport/keyboard sync na rota /login.
// Não precisa de backend rodando — /login só lê localStorage.

const SCREENSHOT_DIR = path.join(__dirname, '..', 'e2e-screenshots')

function ensureDir() {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
}

test.describe('login mobile keyboard sync (gap A)', () => {
  test.beforeEach(async ({ page }) => {
    // Bloqueia chamadas externas para o teste rodar offline.
    await page.route('**/cerebroguto.onrender.com/**', (route) => route.abort())
    await page.route('**/api/guto/**', (route) => route.abort())
  })

  test('mounts shell with --guto-viewport-height and toggles data-keyboard-open on focus', async ({ page }) => {
    ensureDir()
    await page.goto('/login?lang=pt-BR')

    // Shell .sala-guto presente
    const shell = page.locator('.sala-guto').first()
    await expect(shell).toBeVisible()

    // Inputs renderizados
    const userInput = page.locator('input[autocomplete="username"]')
    const passInput = page.locator('input[autocomplete="current-password"]')
    await expect(userInput).toBeVisible()
    await expect(passInput).toBeVisible()

    // Antes do foco, --guto-viewport-height deve ser 100dvh (default da CSS)
    const heightVarInitial = await shell.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('--guto-viewport-height').trim()
    )
    expect(heightVarInitial.length).toBeGreaterThan(0)

    // Foca o input e simula encolhimento do visualViewport (teclado iOS)
    await userInput.focus()
    await page.evaluate(() => {
      const vv = window.visualViewport
      if (!vv) return
      const input = document.querySelector('input[autocomplete="username"]') as HTMLInputElement | null
      input?.focus()
      input?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
      const desc = Object.getOwnPropertyDescriptor(window.visualViewport, 'height')
      Object.defineProperty(window.visualViewport, 'height', {
        configurable: true,
        get: () => Math.max(320, (window.innerHeight ?? 800) - 360),
      })
      Object.defineProperty(window.visualViewport, 'offsetTop', { configurable: true, get: () => 0 })
      window.dispatchEvent(new FocusEvent('focusin'))
      window.dispatchEvent(new Event('resize'))
      vv.dispatchEvent(new Event('resize'))
      ;(window as unknown as { __restoreVisualViewport?: () => void }).__restoreVisualViewport = () => {
        if (desc) Object.defineProperty(window.visualViewport, 'height', desc)
      }
    })

    // Espera o requestAnimationFrame do hook
    await page.waitForTimeout(150)

    const html = page.locator('html')
    const dataKeyboard = await html.getAttribute('data-keyboard-open')
    const heightVarAfter = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--guto-viewport-height').trim()
    )

    expect(dataKeyboard).not.toBeNull()
    expect(heightVarAfter).toMatch(/\d+px/)

    // O input focado precisa continuar visível dentro do viewport visual
    const userBox = await userInput.boundingBox()
    expect(userBox).not.toBeNull()
    if (userBox) {
      expect(userBox.y).toBeGreaterThanOrEqual(0)
      // Deve caber dentro do "visualViewport" simulado (innerHeight - 360)
      const visualHeight = await page.evaluate(() => window.visualViewport?.height ?? window.innerHeight)
      expect(userBox.y + userBox.height).toBeLessThanOrEqual(visualHeight + 4)
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'login-keyboard-open.png') })

    // Restaura e checa que o flag volta a fechar quando o input perde foco
    await page.evaluate(() => {
      ;(window as unknown as { __restoreVisualViewport?: () => void }).__restoreVisualViewport?.()
      window.dispatchEvent(new Event('resize'))
      window.visualViewport?.dispatchEvent(new Event('resize'))
    })
    await userInput.blur()
    await page.waitForTimeout(150)
    const dataKeyboardAfterBlur = await html.getAttribute('data-keyboard-open')
    expect(dataKeyboardAfterBlur).toBeNull()
  })

  test('renders correctly in en-US and it-IT', async ({ page }) => {
    await page.goto('/login?lang=en-US')
    await expect(page.getByText('Restricted Access', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'ENTER' })).toBeVisible()

    await page.goto('/login?lang=it-IT')
    await expect(page.getByText('Accesso Riservato', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'ACCEDI' })).toBeVisible()
  })
})
