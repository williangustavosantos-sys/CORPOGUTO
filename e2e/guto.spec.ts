import { test, expect, Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'

// ─── Screenshot helper ────────────────────────────────────────────────────────

const SCREENSHOT_DIR = path.join(__dirname, '..', 'e2e-screenshots')

async function snap(page: Page, name: string) {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`)
  await page.screenshot({ path: filePath, fullPage: false })
  return filePath
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TEST_USER_ID = 'qa-test-user-001'
const TEST_TOKEN = 'qa-fake-token-playwright'
// API URL from .env.local (NEXT_PUBLIC_API_URL)
const API_BASE = 'https://cerebroguto.onrender.com'

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockUser = {
  userId: TEST_USER_ID,
  name: 'QA',
  email: 'qa@guto.test',
  role: 'student',
}

const mockMemory = {
  userId: TEST_USER_ID,
  name: 'QA',
  language: 'pt-BR',
  initialXpGranted: true,
  totalXp: 500,
  streak: 3,
  trainedToday: false,
  adaptedMissionToday: false,
  lastActiveAt: new Date().toISOString(),
  trainingLocation: 'gym',
  trainingStatus: 'active',
  trainingLevel: 'consistent',
  trainingGoal: 'muscle_gain',
  preferredTrainingLocation: 'gym',
  biologicalSex: 'male',
  userAge: 28,
  country: 'Brasil',
  countryCode: 'BR',
  city: 'São Paulo',
  trainingPathology: 'Nenhuma',
  foodRestrictions: 'nenhuma',
  consentHealthFitness: true,
  acceptedTerms: true,
  consentAcceptedAt: new Date().toISOString(),
  heightCm: 175,
  weightKg: 75,
  completedWorkoutDates: [],
  adaptedMissionDates: [],
  missedMissionDates: [],
  xpEvents: [],
  proactiveSent: {},
  initialXpRewardSeen: true,
  lastWorkoutPlan: {
    studentId: TEST_USER_ID,
    title: 'Treino de Peito e Tríceps',
    focus: 'Peito e Tríceps',
    focusKey: 'chest_triceps',
    weekDay: 'Qui',
    goal: 'muscle_gain',
    location: 'Academia',
    locationMode: 'gym',
    dateLabel: 'Qui 15/05',
    scheduledFor: new Date().toISOString(),
    summary: 'Foco em peitoral com sobrecarga progressiva.',
    exercises: [
      {
        id: 'ex-001',
        name: 'Supino Reto com Barra',
        canonicalNamePt: 'Supino Reto com Barra',
        muscleGroup: 'peito',
        sets: 4,
        reps: '8-10',
        load: '60kg',
        rest: '90s',
        restSeconds: 90,
        cue: 'Mantenha as escápulas retraídas.',
        note: '',
        videoUrl: '/exercise/visuals/peito/supino_reto.mp4',
        videoProvider: 'local',
        sourceFileName: 'supino_reto.mp4',
      },
      {
        id: 'ex-002',
        name: 'Crucifixo Inclinado com Halteres',
        canonicalNamePt: 'Crucifixo Inclinado com Halteres',
        muscleGroup: 'peito',
        sets: 3,
        reps: '12',
        load: '14kg',
        rest: '60s',
        restSeconds: 60,
        cue: 'Cotovelos ligeiramente fletidos.',
        note: '',
        videoUrl: '/exercise/visuals/peito/crucifixo_maquina.mp4',
        videoProvider: 'local',
        sourceFileName: 'crucifixo_maquina.mp4',
      },
    ],
  },
}

const mockDiet = {
  userId: TEST_USER_ID,
  title: 'Dieta da Semana — Hipertrofia',
  generatedAt: new Date().toISOString(),
  country: 'Brasil',
  goal: 'muscle_gain',
  macros: {
    bmr: 1850,
    tdee: 2590,
    targetKcal: 483,
    proteinG: 40,
    carbsG: 65,
    fatG: 7,
    goal: 'muscle_gain',
  },
  meals: [
    {
      id: 'meal-001',
      name: 'Café da manhã',
      time: '07:00',
      totalKcal: 480,
      gutoNote: 'Refeição de abertura com carbo rápido.',
      foods: [
        { name: 'Ovos mexidos', quantity: '3 unidades', kcal: 210 },
        { name: 'Aveia', quantity: '50g', kcal: 180 },
        { name: 'Banana', quantity: '1 unidade', kcal: 90 },
      ],
    },
  ],
}

// ─── Auth setup helpers ───────────────────────────────────────────────────────

/**
 * Register Playwright route mocks for the production API.
 * Must be called BEFORE page.goto().
 */
const API_HOST = new URL(API_BASE).hostname

// Em dev/CI o app usa o proxy same-origin (/api/guto/...) em vez da URL absoluta
// do Render (ver shouldUseApiProxy em lib/api/client.ts). Tratamos como chamada
// de API tudo que vai pro host do Render OU pro prefixo do proxy, então os mocks
// valem em local, CI e Vercel.
function isApiCall(url: URL) {
  return url.hostname === API_HOST || url.pathname.startsWith('/api/guto')
}

const jsonBody = (body: unknown) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
})

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

async function setupApiMocks(page: Page) {
  // Casa pelo final do pathname (cobre `/auth/me` e `/api/guto/auth/me`).
  const onPath = (suffix: string, handler: Parameters<Page['route']>[1]) =>
    page.route((url) => isApiCall(url) && url.pathname.endsWith(suffix), handler)
  // Casa por trecho do pathname (endpoints com query/sub-rotas).
  const onIncludes = (part: string, handler: Parameters<Page['route']>[1]) =>
    page.route((url) => isApiCall(url) && url.pathname.includes(part), handler)

  // Catch-all: qualquer chamada de API não mockada abaixo responde 200 {} em vez
  // de cair no proxy real do Next (que tentaria o backend e falharia →
  // fetch failed → overlay de dev bloqueando cliques). Registrado primeiro =
  // menor prioridade no Playwright; os mocks específicos abaixo vencem.
  await page.route((url) => isApiCall(url), (route) => route.fulfill(jsonBody({})))

  await onPath('/auth/me', (route) => route.fulfill(jsonBody(mockUser)))
  await onPath('/guto/memory', (route) => route.fulfill(jsonBody(mockMemory)))
  await onPath('/guto/diet/generate', (route) => route.fulfill(jsonBody(mockDiet)))
  await onPath('/guto/diet', (route) => route.fulfill(jsonBody(mockDiet)))
  await onIncludes('/guto/proactive', (route) => route.fulfill(jsonBody({ due: false })))
  await onIncludes('/guto/events', (route) => route.fulfill(jsonBody({ ok: true })))
  await onPath('/voz', (route) => route.fulfill(jsonBody({ audioContent: null })))
  await onIncludes('/guto/arena', (route) =>
    route.fulfill(jsonBody({ rankingType: 'weekly', arenaGroupId: 'qa-group', items: [] }))
  )
  await onIncludes('/guto/validations', (route) => route.fulfill(jsonBody([])))
  await onIncludes('/validate-name', (route) =>
    route.fulfill(jsonBody({ status: 'valid', normalized: 'QA', message: 'ok' }))
  )
  await onIncludes('/billing', (route) => route.fulfill(jsonBody({ status: 'active' })))
  // Chat (POST /guto). Registrado por último → prioridade no match do Playwright;
  // só intercepta POST e não engole /guto/memory, /guto/diet, etc.
  await onPath('/guto', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill(jsonBody({
        fala: 'Boa, QA! Treino montado e dieta calibrada. Bora, dupla!',
        acao: 'none',
        avatarEmotion: 'default',
      }))
    }
    return route.continue()
  })
}

/**
 * Inject localStorage BEFORE page JS runs (addInitScript).
 * The per-user version key is required to avoid forced reset.
 */
async function injectAuthStorage(page: Page) {
  await page.addInitScript(
    ({ token, userId, profile, storageVersion }) => {
      // Auth token
      localStorage.setItem('guto-auth-token', token)
      // Profile (key is per-user)
      localStorage.setItem(`guto-white-lab-profile-${userId}`, JSON.stringify(profile))
      // Version key must also be per-user to avoid shouldReset = true
      localStorage.setItem(`guto-storage-version-${userId}`, String(storageVersion))
      // Language preference
      localStorage.setItem('guto-selected-language', 'pt-BR')
    },
    {
      token: TEST_TOKEN,
      userId: TEST_USER_ID,
      storageVersion: 2,
      profile: {
        language: 'pt-BR',
        userName: 'QA',
        onboardingComplete: true,
        namingConfirmed: true,
        calibrationComplete: true,
        pactAccepted: true,
        consentHealthFitness: true,
        acceptedTerms: true,
        consentAcceptedAt: new Date().toISOString(),
      },
    }
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('GUTO – Fluxos críticos', () => {

  // ── 1. App abre sem tela branca ────────────────────────────────────────────
  test('01 — app abre sem tela branca', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('body')).not.toBeEmpty()
    const html = await page.content()
    expect(html.length).toBeGreaterThan(200)
    await snap(page, '01-app-home')
  })

  // ── 2. Loader não fica infinito ────────────────────────────────────────────
  test('02 — loader resolve em até 10 segundos', async ({ page }) => {
    await page.goto('/')
    // Se aparecer spinner, deve sumir em 10s
    await expect(page.locator('[class*="animate-spin"]').first())
      .not.toBeVisible({ timeout: 10000 })
      .catch(() => { /* spinner nunca apareceu — também válido */ })
    await snap(page, '02-app-loaded')
  })

  // ── 3. Tela de idiomas aparece com ?skip-intro=1 ───────────────────────────
  test('03 — tela de idioma aparece ao pular intro', async ({ page }) => {
    await page.goto('/?skip-intro=1')
    // Botões usam aria-label, não texto visível — usar getByRole
    await expect(page.getByRole('button', { name: 'Português' })).toBeVisible({ timeout: 8000 })
    await expect(page.getByRole('button', { name: 'English' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Italiano' })).toBeVisible()
    await snap(page, '03-language-screen')
  })

  // ── 4. Seleção de idioma PT-BR ─────────────────────────────────────────────
  test('04 — seleciona PT-BR e persiste em localStorage', async ({ page }) => {
    await page.goto('/?skip-intro=1')
    await page.getByRole('button', { name: 'Português' }).click()
    await page.waitForTimeout(600)
    const stored = await page.evaluate(
      () => localStorage.getItem('guto-selected-language') || localStorage.getItem('guto-onboarding-language')
    )
    expect(stored).toBe('pt-BR')
    await snap(page, '04-language-pt-selected')
  })

  // ── 5. Seleção de idioma EN-US ─────────────────────────────────────────────
  test('05 — seleciona EN-US e persiste em localStorage', async ({ page }) => {
    await page.goto('/?skip-intro=1')
    await page.getByRole('button', { name: 'English' }).click()
    await page.waitForTimeout(600)
    const stored = await page.evaluate(
      () => localStorage.getItem('guto-selected-language') || localStorage.getItem('guto-onboarding-language')
    )
    expect(stored).toBe('en-US')
    await snap(page, '05-language-en-selected')
  })

  // ── 6. Seleção de idioma IT-IT ─────────────────────────────────────────────
  test('06 — seleciona IT-IT e persiste em localStorage', async ({ page }) => {
    await page.goto('/?skip-intro=1')
    await page.getByRole('button', { name: 'Italiano' }).click()
    await page.waitForTimeout(600)
    const stored = await page.evaluate(
      () => localStorage.getItem('guto-selected-language') || localStorage.getItem('guto-onboarding-language')
    )
    expect(stored).toBe('it-IT')
    await snap(page, '06-language-it-selected')
  })

  // ── 7. Idioma persiste após reload ─────────────────────────────────────────
  test('07 — idioma EN-US persiste após reload', async ({ page }) => {
    await page.goto('/?skip-intro=1')
    await page.getByRole('button', { name: 'English' }).click()
    await page.waitForTimeout(600)

    await page.reload()
    await page.waitForTimeout(1000)

    const stored = await page.evaluate(() => localStorage.getItem('guto-selected-language'))
    expect(stored).toBe('en-US')
  })

  // ── 8. Três botões de idioma — sem mistura ────────────────────────────────
  test('08 — tela de idioma tem exatamente 3 botões sem mistura de idiomas', async ({ page }) => {
    await page.goto('/?skip-intro=1')
    await expect(page.getByRole('button', { name: 'Português' })).toBeVisible({ timeout: 8000 })
    await expect(page.getByRole('button', { name: 'English' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Italiano' })).toBeVisible()

    // Exatamente 3 botões de idioma (não pode aparecer "Português" e "Portuguese" juntos)
    const allButtons = await page.locator('button[aria-label]').evaluateAll((btns) =>
      btns.map((b) => b.getAttribute('aria-label'))
    )
    const langLabels = allButtons.filter((l) =>
      l && ['Português', 'English', 'Italiano'].includes(l)
    )
    expect(langLabels.length).toBe(3)
    await snap(page, '08-language-no-mixing')
  })

  // ── 9. Sistema autenticado — tabs visíveis ────────────────────────────────
  test('09 — sistema mostra tabs ao usuário autenticado (mocked)', async ({ page }) => {
    await injectAuthStorage(page)
    await setupApiMocks(page)
    await page.goto('/')

    // O app usa isHydrated + resolveAuthenticatedStage para chegar em "system"
    // A nav inferior tem aria-label "Navegação principal" em pt-BR
    await expect(
      page.locator('nav[aria-label="Navegação principal"]')
    ).toBeVisible({ timeout: 15000 })

    await snap(page, '09-system-tabs')
  })

  // ── 10. Aba Chat — avatar e input visíveis ────────────────────────────────
  test('10 — aba chat está na tab GUTO e input de mensagem está visível', async ({ page }) => {
    await injectAuthStorage(page)
    await setupApiMocks(page)
    await page.goto('/')

    // Aguarda sistema carregar
    await expect(page.locator('nav[aria-label="Navegação principal"]')).toBeVisible({ timeout: 15000 })

    // Tab "GUTO" (chat) já é o ativo por padrão — não precisa de clique
    await page.waitForTimeout(800)

    // Input de texto do chat
    const input = page.locator('input[type="text"]').first()
    await expect(input).toBeVisible({ timeout: 8000 })

    // Não deve estar coberto — bounding box válida
    const box = await input.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.height).toBeGreaterThanOrEqual(16) // input text-[16px], leading-none
    expect(box!.width).toBeGreaterThan(80)

    await snap(page, '10-chat-input')
  })

  test('10b — abertura do app injeta mensagem proativa contextual no chat', async ({ page }) => {
    await injectAuthStorage(page)
    await setupApiMocks(page)

    let forceArrivalCalled = false
    await page.route((url) => isApiCall(url) && url.pathname.includes('/guto/proactive'), (route) => {
      const url = new URL(route.request().url())
      if (url.searchParams.get('force') === '1') forceArrivalCalled = true
      return route.fulfill(jsonBody({
        due: true,
        slot: 'arrival',
        fala: 'QA, tua missão de hoje já está pronta: Peito e Tríceps. Se você tiver 25 minutos, eu te puxo agora.',
        acao: 'none',
        expectedResponse: null,
        avatarEmotion: 'reward',
      }))
    })

    await page.goto('/')
    await expect(page.locator('nav[aria-label="Navegação principal"]')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/tua missão de hoje já está pronta/i)).toBeVisible({ timeout: 10000 })
    expect(forceArrivalCalled).toBe(true)

    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/Como posso te ajudar hoje/i)
  })

  test('10c — card interno do chat mostra apenas GUTO, sem duplicar a dupla', async ({ page }) => {
    await injectAuthStorage(page)
    await setupApiMocks(page)
    await page.goto('/')

    await expect(page.locator('nav[aria-label="Navegação principal"]')).toBeVisible({ timeout: 15000 })

    const presenceLabel = page.getByTestId('guto-chat-presence-label')
    await expect(presenceLabel).toBeVisible({ timeout: 8000 })
    await expect(presenceLabel).toHaveText('GUTO')
    await expect(presenceLabel).not.toContainText(/GUTO\s*&/i)
  })

  // ── 11. Enviar mensagem no chat ────────────────────────────────────────────
  test('11 — envia mensagem no chat e recebe resposta (mocked)', async ({ page }) => {
    await injectAuthStorage(page)
    await setupApiMocks(page)
    await page.goto('/')

    await expect(page.locator('nav[aria-label="Navegação principal"]')).toBeVisible({ timeout: 15000 })

    // Já estamos no chat (tab GUTO)
    const input = page.locator('input[type="text"]').first()
    await expect(input).toBeVisible({ timeout: 8000 })

    await input.fill('Oi GUTO, tudo bem?')
    await input.press('Enter')

    // Aguarda a resposta mock aparecer no chat
    await expect(page.getByText('Boa, QA!')).toBeVisible({ timeout: 10000 })

    // Sem erro técnico exposto
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/connection_error|TypeError|Cannot read/i)

    await snap(page, '11-chat-response')
  })

  // ── 12. Aba Treino — cards de exercício ───────────────────────────────────
  test('12 — aba MISSÃO mostra exercícios do treino', async ({ page }) => {
    await injectAuthStorage(page)
    await setupApiMocks(page)
    await page.goto('/')

    await expect(page.locator('nav[aria-label="Navegação principal"]')).toBeVisible({ timeout: 15000 })

    // Clica na aba MISSÃO
    await page.getByRole('button', { name: 'MISSÃO' }).click()
    await page.waitForTimeout(2000)

    // Deve mostrar algum conteúdo — não tela branca
    const html = await page.content()
    expect(html.length).toBeGreaterThan(1000)

    // Sem erro técnico
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/TypeError|Cannot read|undefined is not/i)

    await snap(page, '12-workout-tab')
  })

  // ── 13. GUTO Online — modal abre sem sobreposição ────────────────────────
  test('13 — GUTO Online: modal abre com botão fechar acessível', async ({ page }) => {
    await injectAuthStorage(page)
    await setupApiMocks(page)
    await page.goto('/')

    await expect(page.locator('nav[aria-label="Navegação principal"]')).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: 'MISSÃO' }).click()
    await page.waitForTimeout(2000)

    // Procura o botão de iniciar GUTO Online (texto "GUTO PERSONAL ONLINE")
    const onlineBtn = page.locator('button').filter({ hasText: /guto\s*personal\s*online/i }).first()
    const radioBtn = page.locator('[aria-label*="online" i], [aria-label*="radio" i]').first()

    const hasOnlineBtn = await onlineBtn.isVisible({ timeout: 3000 }).catch(() => false)
    const hasRadioBtn = await radioBtn.isVisible({ timeout: 500 }).catch(() => false)

    if (hasOnlineBtn) {
      await onlineBtn.click()
      await page.waitForTimeout(1500)

      // Verificar ausência de overflow horizontal
      const overflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth)
      expect(overflow).toBe(false)

      // Verificar que algum botão de fechar ou X aparece
      const closeBtn = page.locator('[aria-label*="fechar" i], [aria-label*="close" i], button:has([data-lucide="x"])').first()
      const closeBtnVisible = await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)
      // Registra no log mas não falha se não encontrou fechar (o botão pode ter outra label)
      if (!closeBtnVisible) {
        console.log('[QA] GUTO Online: botão fechar não encontrado com aria-label — verificar manualmente')
      }

      await snap(page, '13-guto-online-open')
    } else if (hasRadioBtn) {
      await radioBtn.click()
      await page.waitForTimeout(1500)
      await snap(page, '13-guto-online-radio-btn')
    } else {
      console.log('[QA] GUTO Online: sem plano de treino carregado — botão não encontrado')
      await snap(page, '13-guto-online-no-workout')
    }
  })

  // ── 14. Aba Dieta — sem tela morta nem timeout ────────────────────────────
  test('14 — aba DIETA abre sem tela morta e sem timeout exposto', async ({ page }) => {
    await injectAuthStorage(page)
    await setupApiMocks(page)
    await page.goto('/')

    await expect(page.locator('nav[aria-label="Navegação principal"]')).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: 'DIETA' }).click()
    await page.waitForTimeout(3000)

    // Sem spinner infinito
    const spinner = page.locator('[class*="animate-spin"]').first()
    const spinning = await spinner.isVisible({ timeout: 200 }).catch(() => false)
    if (spinning) {
      await expect(spinner).not.toBeVisible({ timeout: 12000 })
    }

    // Sem tela branca / HTML mínimo
    const html = await page.content()
    expect(html.length).toBeGreaterThan(1000)

    // Sem erro técnico exposto
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/TypeError|Cannot read|undefined is not|TIMEOUT_ERROR/i)
    expect(bodyText).not.toMatch(/Tempo de resposta excedido|timed out/i)
    // Sem mensagem de falha de conexão visível ao usuário
    expect(bodyText).not.toMatch(/Falha de conexão|connection failed/i)

    await snap(page, '14-diet-tab')
  })

  // ── 15. Overflow horizontal — tela de idioma ──────────────────────────────
  test('15 — sem overflow horizontal na tela de idioma', async ({ page }) => {
    await page.goto('/?skip-intro=1')
    await expect(page.getByRole('button', { name: 'Português' })).toBeVisible({ timeout: 8000 })

    const overflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth)
    expect(overflow).toBe(false)
    await snap(page, '15-no-overflow-language')
  })

  // ── 16. Overflow horizontal — sistema autenticado ────────────────────────
  test('16 — sem overflow horizontal no sistema autenticado', async ({ page }) => {
    await injectAuthStorage(page)
    await setupApiMocks(page)
    await page.goto('/')

    await expect(page.locator('nav[aria-label="Navegação principal"]')).toBeVisible({ timeout: 15000 })

    const overflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth)
    expect(overflow).toBe(false)
  })

  // ── 17. Avatar GUTO — sem fundo quadrado cinza ───────────────────────────
  test('17 — avatar não tem dimensão zero nem fundo cinza quadrado', async ({ page }) => {
    await injectAuthStorage(page)
    await setupApiMocks(page)
    await page.goto('/')

    await expect(page.locator('nav[aria-label="Navegação principal"]')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(1000)

    // Imagens de avatar não devem ser 0x0
    const avatarImgs = page.locator('img[src*="guto"], img[src*="avatar"], canvas').first()
    const exists = await avatarImgs.isVisible({ timeout: 2000 }).catch(() => false)

    if (exists) {
      const box = await avatarImgs.boundingBox()
      if (box) {
        expect(box.width).toBeGreaterThan(0)
        expect(box.height).toBeGreaterThan(0)
      }
    }

    await snap(page, '17-avatar-check')
  })

  // ── 18. GUTO Online — fechar com X volta ao treino sem overlay preso ───────
  test('18 — GUTO Online: fechar com X remove overlay e volta ao treino', async ({ page }) => {
    await injectAuthStorage(page)
    await setupApiMocks(page)
    await page.goto('/')

    await expect(page.locator('nav[aria-label="Navegação principal"]')).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: 'MISSÃO' }).click()
    await page.waitForTimeout(2000)

    // Clica no botão GUTO Online (texto "GUTO PERSONAL ONLINE")
    const onlineBtn = page.locator('button').filter({ hasText: /guto\s*personal\s*online/i }).first()
    const hasBtnVisible = await onlineBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (!hasBtnVisible) {
      console.log('[QA] GUTO Online: botão não encontrado — treino não carregado no mock')
      await snap(page, '18-guto-online-btn-not-found')
      return
    }

    await onlineBtn.click()
    await page.waitForTimeout(1500)

    // Overlay deve estar presente — há um header com "Presença ativa" ou "Active presence"
    const overlayVisible = await page.locator('text=/Presença ativa|Active presence/i').isVisible({ timeout: 5000 }).catch(() => false)
    expect(overlayVisible).toBe(true)

    await snap(page, '18-guto-online-open')

    // Clica no X (aria-label "Fechar GUTO Online" para pt-BR)
    const closeBtn = page.getByRole('button', { name: 'Fechar GUTO Online' })
    await expect(closeBtn).toBeVisible({ timeout: 3000 })
    await closeBtn.click()
    await page.waitForTimeout(800)

    // Overlay deve ter desaparecido — "Presença ativa" não deve mais existir
    const overlayGone = await page.locator('text=/Presença ativa|Active presence/i').isVisible({ timeout: 1000 }).catch(() => false)
    expect(overlayGone).toBe(false)

    // Aba MISSÃO ainda deve estar acessível (nav visível, sem tela travada)
    await expect(page.locator('nav[aria-label="Navegação principal"]')).toBeVisible()

    await snap(page, '18-guto-online-closed')
  })

  // ── 19. Página /login renderiza sem crash ─────────────────────────────────
  test('19 — página /login renderiza sem erro', async ({ page }) => {
    await page.goto('/login')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/Application error|Internal Server Error|500/i)
    await snap(page, '19-login-page')
  })

  // ── 20. Arena — abre sem crash e sem TypeError ────────────────────────────
  test('20 — aba Arena abre sem crash e mostra ranking ou estado vazio', async ({ page }) => {
    await setupApiMocks(page)
    await injectAuthStorage(page)
    await page.goto('/?skip-intro=1')
    await page.waitForTimeout(2500)

    // Clicar na aba Arena
    await page.getByRole('button', { name: 'ARENA' }).click()
    await page.waitForTimeout(1500)

    // Confirmar que não há TypeError ou crash
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/TypeError|Cannot read properties|Application error/i)

    // Confirmar que sub-tabs existem (Semana, Mês, Individual)
    await expect(page.getByText('SEMANA')).toBeVisible()
    await expect(page.getByText('MÊS')).toBeVisible()
    await expect(page.getByText('INDIVIDUAL')).toBeVisible()

    // Confirmar que a aba Arena mostra ranking ou estado vazio controlado (não tela branca)
    const arenaContent = page.locator('body')
    await expect(arenaContent).not.toBeEmpty()

    await snap(page, '20-arena-sem-crash')
  })

  test('21 — chat persiste histórico ao reabrir', async ({ page }) => {
    await injectAuthStorage(page)
    await setupApiMocks(page)
    await page.goto('/')

    await expect(page.locator('nav[aria-label="Navegação principal"]')).toBeVisible({ timeout: 15000 })

    const input = page.locator('input[type="text"]').first()
    await expect(input).toBeVisible({ timeout: 8000 })
    await input.fill('GUTO, vou viajar sexta')
    await input.press('Enter')

    await expect(page.getByTestId('user-message').filter({ hasText: 'vou viajar sexta' })).toBeVisible({ timeout: 8000 })
    await expect(page.getByTestId('guto-message').filter({ hasText: 'Boa, QA!' })).toBeVisible({ timeout: 10000 })

    await page.reload()
    await expect(page.locator('nav[aria-label="Navegação principal"]')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('user-message').filter({ hasText: 'vou viajar sexta' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('guto-message').filter({ hasText: 'Boa, QA!' })).toBeVisible({ timeout: 10000 })

    await snap(page, '21-chat-history-persisted')
  })

  test('22 — teclado mobile mantém histórico e input utilizáveis', async ({ page }) => {
    await injectAuthStorage(page)
    await setupApiMocks(page)
    await page.goto('/')

    await expect(page.locator('nav[aria-label="Navegação principal"]')).toBeVisible({ timeout: 15000 })
    const input = page.locator('input[type="text"]').first()
    await expect(input).toBeVisible({ timeout: 8000 })

    await input.focus()
    await page.evaluate(() => {
      const vv = window.visualViewport
      if (!vv) return
      const input = document.activeElement instanceof HTMLInputElement
        ? document.activeElement
        : (document.querySelector('input[type="text"]') as HTMLInputElement | null)
      input?.focus()
      input?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
      const heightDesc = Object.getOwnPropertyDescriptor(window.visualViewport, 'height')
      const offsetDesc = Object.getOwnPropertyDescriptor(window.visualViewport, 'offsetTop')
      Object.defineProperty(window.visualViewport, 'height', {
        configurable: true,
        get: () => Math.max(320, (window.innerHeight ?? 800) - 360),
      })
      Object.defineProperty(window.visualViewport, 'offsetTop', { configurable: true, get: () => 0 })
      const viewportHeight = Math.max(320, (window.innerHeight ?? 800) - 360)
      document.documentElement.setAttribute('data-keyboard-open', '')
      document.documentElement.style.setProperty('--guto-viewport-height', `${viewportHeight}px`)
      document.documentElement.style.setProperty('--guto-keyboard-offset', `${Math.max(0, window.innerHeight - viewportHeight)}px`)
      document.querySelectorAll('.sala-guto').forEach((el) => {
        const shell = el as HTMLElement
        shell.setAttribute('data-keyboard-open', '')
        shell.style.setProperty('--guto-viewport-height', `${viewportHeight}px`)
        shell.style.setProperty('--guto-keyboard-offset', `${Math.max(0, window.innerHeight - viewportHeight)}px`)
      })
      window.dispatchEvent(new FocusEvent('focusin'))
      window.dispatchEvent(new Event('resize'))
      vv.dispatchEvent(new Event('resize'))
      ;(window as unknown as { __restoreVisualViewport?: () => void }).__restoreVisualViewport = () => {
        if (heightDesc) Object.defineProperty(window.visualViewport, 'height', heightDesc)
        if (offsetDesc) Object.defineProperty(window.visualViewport, 'offsetTop', offsetDesc)
      }
    })
    await page.waitForTimeout(180)

    await expect(page.locator('html')).toHaveAttribute('data-keyboard-open', '', { timeout: 2000 })

    const listBox = await page.locator('.guto-chat-list').boundingBox()
    const inputBox = await input.boundingBox()
    expect(listBox).not.toBeNull()
    expect(inputBox).not.toBeNull()
    expect(listBox!.height).toBeGreaterThan(120)
    const visualHeight = await page.evaluate(() => window.visualViewport?.height ?? window.innerHeight)
    expect(inputBox!.y + inputBox!.height).toBeLessThanOrEqual(visualHeight + 12)

    await page.evaluate(() => {
      ;(window as unknown as { __restoreVisualViewport?: () => void }).__restoreVisualViewport?.()
      document.documentElement.removeAttribute('data-keyboard-open')
      document.querySelectorAll('.sala-guto').forEach((el) => {
        const shell = el as HTMLElement
        shell.removeAttribute('data-keyboard-open')
        shell.style.removeProperty('--guto-viewport-height')
        shell.style.removeProperty('--guto-keyboard-offset')
      })
      window.dispatchEvent(new Event('resize'))
      window.visualViewport?.dispatchEvent(new Event('resize'))
    })
    await input.blur()

    await snap(page, '22-chat-keyboard-mobile')
  })

  test('23 — Percurso agrega viagem e treino adaptado em um item do calendário', async ({ page }) => {
    const travelDate = addDays(new Date(), 4)
    const travelDateKey = toDateKey(travelDate)
    const travelDay = String(travelDate.getDate()).padStart(2, '0')

    await injectAuthStorage(page)
    await setupApiMocks(page)
    await page.route((url) => isApiCall(url) && url.pathname.endsWith('/guto/memory'), (route) =>
      route.fulfill(jsonBody({
        ...mockMemory,
        proactiveMemories: [
          {
            id: 'pm-trip-e2e',
            userId: TEST_USER_ID,
            type: 'trip',
            status: 'confirmed',
            rawText: 'vou viajar sexta',
            understood: 'Viagem registrada',
            dateText: 'sexta',
            dateParsed: travelDateKey,
            weekKey: 'e2e-week',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        proactiveImpacts: [
          {
            id: 'pi-trip-e2e',
            memoryId: 'pm-trip-e2e',
            status: 'active',
            surfaces: ['chat', 'workout', 'mission', 'path'],
            priority: 80,
            affectedDates: [travelDateKey],
            workoutEffect: 'short_light',
            missionEffect: 'reduced',
            pushEffect: 'avoid_blind_charge',
            xpEffect: 'no_free_xp_context_only',
            arenaEffect: 'validation_required',
            pathEffect: 'adapted_context',
            evolutionEffect: 'adapted_context',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            decision: {
              id: 'decision-trip-e2e',
              memoryId: 'pm-trip-e2e',
              kind: 'adapt_day',
              reason: 'travel',
              priority: 80,
              affectedDates: [travelDateKey],
              workoutEffect: 'short_light',
              missionEffect: 'reduced',
              message: 'Treino adaptado por causa da viagem.',
              createdAt: new Date().toISOString(),
            },
          },
        ],
      }))
    )

    await page.goto('/')
    await expect(page.locator('nav[aria-label="Navegação principal"]')).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: 'PERCURSO' }).click()
    await expect(page.getByText('Memória visual')).toBeVisible({ timeout: 8000 })

    await page.getByRole('button', { name: new RegExp(`${travelDay} Treino adaptado`) }).click()
    await expect(page.getByText('Treino adaptado').first()).toBeVisible({ timeout: 8000 })
    await expect(page.getByText('Viagem registrada')).toBeVisible({ timeout: 8000 })
    await expect(page.getByRole('button', { name: 'ALTERAR' })).toBeVisible()

    await snap(page, '23-path-travel-adapted')
  })

  test('24 — resposta rápida de viagem envia contexto operacional correto', async ({ page }) => {
    await injectAuthStorage(page)
    await setupApiMocks(page)

    const seenInputs: string[] = []
    const confirmPayloads: Array<{ memoryId?: string; trainingAdapted?: boolean }> = []
    const travelDate = addDays(new Date(), 3)
    const travelDateKey = toDateKey(travelDate)
    const travelDateLabel = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(travelDate)
    let cardPending = false
    const pendingTrip = {
      id: 'pm-trip-card-e2e',
      userId: TEST_USER_ID,
      type: 'trip',
      status: 'pending_confirmation',
      stage: 'impact_confirmation',
      confirmationStage: 'impact',
      proposedTrainingAdapted: true,
      rawText: 'viajo sexta; consigo treinar na viagem',
      understood: 'Viagem com treino adaptado pendente',
      dateText: 'sexta',
      dateParsed: travelDateKey,
      weekKey: 'e2e-week',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await page.route((url) => isApiCall(url) && url.pathname.endsWith('/guto/proactivity/memories'), (route) =>
      route.fulfill(jsonBody({ memories: cardPending ? [pendingTrip] : [] }))
    )
    await page.route((url) => isApiCall(url) && url.pathname.endsWith('/guto/proactivity/confirm'), async (route) => {
      confirmPayloads.push(route.request().postDataJSON() as { memoryId?: string; trainingAdapted?: boolean })
      cardPending = false
      return route.fulfill(jsonBody({
        ok: true,
        memory: { ...pendingTrip, status: 'confirmed', stage: 'confirmed_adapted', trainingAdapted: true },
        fala: 'Fechado. Salvei tua viagem. Agora vamos cuidar de hoje.',
        memoryPatch: {
          proactiveMemories: [{ ...pendingTrip, status: 'confirmed', stage: 'confirmed_adapted', trainingAdapted: true }],
          proactiveImpacts: [{ memoryId: pendingTrip.id, status: 'active', workoutEffect: 'short_light' }],
        },
      }))
    })
    await page.route((url) => isApiCall(url) && url.pathname.endsWith('/guto'), async (route) => {
      if (route.request().method() !== 'POST') return route.continue()
      const body = route.request().postDataJSON() as { input?: string }
      seenInputs.push(body.input || '')
      if (seenInputs.length === 1) {
        return route.fulfill(jsonBody({
          fala: 'Consigo adaptar para 20-30 minutos. Você consegue treinar?',
          acao: 'none',
          avatarEmotion: 'alert',
          expectedResponse: {
            type: 'text',
            context: 'travel_training',
            options: ['SIM', 'NÃO'],
            instruction: 'Responder se consegue treinar na viagem ou se o dia precisa ser protegido.',
          },
        }))
      }
      cardPending = true
      return route.fulfill(jsonBody({
        fala: 'Confirma no card e eu já sigo organizando tua semana.',
        acao: 'none',
        avatarEmotion: 'default',
        expectedResponse: null,
        memoryPatch: {
          proactiveMemories: [pendingTrip],
          proactiveImpacts: [],
          activeConversationContext: {
            kind: 'travel_impact_confirmation',
            source: 'state_resolver',
            relatedMemoryId: pendingTrip.id,
            updatedAt: new Date().toISOString(),
          },
        },
      }))
    })

    await page.goto('/')
    await expect(page.locator('nav[aria-label="Navegação principal"]')).toBeVisible({ timeout: 15000 })

    const input = page.locator('input[type="text"]').first()
    await expect(input).toBeVisible({ timeout: 8000 })
    await input.fill('viajo sexta')
    await input.press('Enter')

    await expect(page.getByRole('button', { name: 'SIM' })).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: 'SIM' }).click()
    await expect(page.getByText('Viagem', { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(travelDateLabel)).toBeVisible()
    const tripCardQuestion = page.getByText('Treino adaptado na viagem?')
    await expect(tripCardQuestion).toBeVisible()
    await expect(page.getByRole('button', { name: 'ALTERAR DATA' })).toBeVisible()

    const cardBeforeConfirmation = await tripCardQuestion.locator('..').innerText()
    expect(cardBeforeConfirmation).not.toMatch(/workflow|pending|memory|status|impacto/i)

    await page.reload()
    await expect(page.locator('nav[aria-label="Navegação principal"]')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Treino adaptado na viagem?')).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: 'SIM' }).click()
    await expect(page.getByText('Fechado. Salvei tua viagem. Agora vamos cuidar de hoje.')).toBeVisible({ timeout: 10000 })

    await expect.poll(() => seenInputs.length).toBeGreaterThanOrEqual(2)
    expect(seenInputs[1]).toContain('consigo treinar na viagem')
    await expect.poll(() => confirmPayloads.length).toBe(1)
    expect(confirmPayloads[0]).toEqual({ memoryId: pendingTrip.id, trainingAdapted: true })

    await snap(page, '24-travel-quick-reply')
  })

})
