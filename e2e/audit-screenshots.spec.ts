import { test, expect, Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const SCREENSHOT_DIR = path.join(__dirname, '..', 'docs', 'audit-screenshots', 'page-by-page-2026-05-16')
const API_BASE = 'https://cerebroguto.onrender.com'
const TEST_USER_ID = 'qa-audit-user-001'
const TEST_TOKEN = 'qa-audit-token'

async function snap(page: Page, name: string) {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`)
  await page.screenshot({ path: filePath, fullPage: true })
  return filePath
}

const mockMemory = {
  userId: TEST_USER_ID,
  name: 'Willian',
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
  heightCm: 175,
  weightKg: 75,
  trainingPathology: 'Nenhuma',
  foodRestrictions: 'Nenhuma',
  // Consentimento — backend é a fonte de verdade (resolveAuthenticatedStage em
  // guto-app.tsx); sem isto a memory mockada cai na tela de consent.
  consentHealthFitness: true,
  acceptedTerms: true,
  consentAcceptedAt: new Date().toISOString(),
  completedWorkoutDates: ['2026-05-14'],
  adaptedMissionDates: ['2026-05-13'],
  missedMissionDates: ['2026-05-12'],
  xpEvents: [
    { type: 'grant_initial_xp', xp: 100, date: '2026-05-10' },
    { type: 'complete_daily_mission', xp: 100, date: '2026-05-14' },
  ],
  proactiveSent: {},
  initialXpRewardSeen: true,
  lastWorkoutPlan: {
    studentId: TEST_USER_ID,
    title: 'Treino de Peito e Tríceps',
    focus: 'Peito e Tríceps',
    focusKey: 'chest_triceps',
    weekDay: 'Sex',
    goal: 'muscle_gain',
    location: 'Academia',
    locationMode: 'gym',
    dateLabel: 'Sex 16/05',
    scheduledFor: new Date().toISOString(),
    summary: 'Foco em peitoral com sobrecarga progressiva.',
    exercises: [
      {
        id: 'ex-001', name: 'Supino Reto com Barra', canonicalNamePt: 'Supino Reto com Barra',
        muscleGroup: 'peito', sets: 4, reps: '8-10', load: '60kg', rest: '90s', restSeconds: 90,
        cue: 'Mantenha as escápulas retraídas.', note: '',
        videoUrl: '/exercise/visuals/supino-reto.mp4', videoProvider: 'local', sourceFileName: 'supino-reto.mp4',
      },
      {
        id: 'ex-002', name: 'Crucifixo Inclinado', canonicalNamePt: 'Crucifixo Inclinado com Halteres',
        muscleGroup: 'peito', sets: 3, reps: '12', load: '14kg', rest: '60s', restSeconds: 60,
        cue: 'Cotovelos ligeiramente fletidos.', note: '',
        videoUrl: '/exercise/visuals/crucifixo.mp4', videoProvider: 'local', sourceFileName: 'crucifixo.mp4',
      },
      {
        id: 'ex-003', name: 'Tríceps Pulley', canonicalNamePt: 'Tríceps Pulley',
        muscleGroup: 'triceps', sets: 3, reps: '12-15', load: '25kg', rest: '60s', restSeconds: 60,
        cue: 'Cotovelos grudados no corpo.', note: '',
        videoUrl: '/exercise/visuals/triceps-pulley.mp4', videoProvider: 'local', sourceFileName: 'triceps-pulley.mp4',
      },
    ],
  },
  validationHistory: [
    {
      id: 'val-001', date: '2026-05-14', workoutFocus: 'Peito e Tríceps',
      xpEarned: 100, imageUrl: null, locationMode: 'gym',
    },
  ],
}

const mockDiet = {
  userId: TEST_USER_ID,
  title: 'Dieta da Semana — Hipertrofia',
  generatedAt: new Date().toISOString(),
  country: 'Brasil',
  goal: 'muscle_gain',
  macros: { bmr: 1850, tdee: 2590, targetKcal: 2900, proteinG: 180, carbsG: 310, fatG: 90, goal: 'muscle_gain' },
  meals: [
    {
      id: 'meal-001', name: 'Café da manhã', time: '07:00', totalKcal: 620,
      gutoNote: 'Refeição de abertura.',
      foods: [
        { name: 'Ovos mexidos', quantity: '3 unidades', kcal: 210 },
        { name: 'Aveia', quantity: '50g', kcal: 180 },
        { name: 'Banana', quantity: '1 unidade', kcal: 90 },
      ],
    },
    {
      id: 'meal-002', name: 'Almoço', time: '12:00', totalKcal: 850,
      gutoNote: 'Prato principal.',
      foods: [
        { name: 'Frango grelhado', quantity: '200g', kcal: 330 },
        { name: 'Arroz integral', quantity: '150g', kcal: 260 },
        { name: 'Brócolis', quantity: '100g', kcal: 34 },
      ],
    },
  ],
}

const API_HOST = new URL(API_BASE).hostname

// Em dev/CI o app usa o proxy same-origin (/api/guto/...) em vez da URL absoluta
// do Render (ver shouldUseApiProxy em lib/api/client.ts). Casamos os dois
// formatos: tratamos como chamada de API tudo que vai pro host do Render OU
// pro prefixo do proxy — assim os mocks valem em ambiente local, CI e Vercel.
function isApiCall(url: URL) {
  return url.hostname === API_HOST || url.pathname.startsWith('/api/guto')
}

const jsonBody = (body: unknown) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
})

async function setupApiMocks(page: Page) {
  // Casa pelo final do pathname (cobre `/auth/me` e `/api/guto/auth/me`).
  const onPath = (suffix: string, handler: Parameters<Page['route']>[1]) =>
    page.route((url) => isApiCall(url) && url.pathname.endsWith(suffix), handler)
  // Casa por trecho do pathname (endpoints que recebem query/sub-rotas).
  const onIncludes = (part: string, handler: Parameters<Page['route']>[1]) =>
    page.route((url) => isApiCall(url) && url.pathname.includes(part), handler)

  // Catch-all: qualquer chamada de API não mockada abaixo (telemetria /guto/events,
  // /guto/proactivity/*, etc.) responde 200 {} em vez de cair no proxy real do
  // Next — que tentaria o backend e falharia (fetch failed → overlay de dev
  // bloqueando cliques). Registrado primeiro = menor prioridade no Playwright,
  // então os mocks específicos abaixo vencem.
  await page.route((url) => isApiCall(url), (route) => route.fulfill(jsonBody({})))

  await onPath('/auth/me', (route) =>
    route.fulfill(jsonBody({ userId: TEST_USER_ID, name: 'Willian', email: 'willian@test.com', role: 'student' }))
  )
  await onPath('/guto/memory', (route) => route.fulfill(jsonBody(mockMemory)))
  await onPath('/guto/diet/generate', (route) => route.fulfill(jsonBody(mockDiet)))
  await onPath('/guto/diet', (route) => route.fulfill(jsonBody(mockDiet)))
  await onIncludes('/guto/proactive', (route) => route.fulfill(jsonBody({ due: false })))
  await onIncludes('/guto/arena', (route) =>
    route.fulfill(jsonBody({
      rankingType: 'weekly',
      arenaGroupId: 'qa-group',
      items: [
        { position: 1, userId: 'user-a', pairName: 'GUTO & Maria', avatarStage: 'teen', xp: 1200, validatedWorkouts: 12, status: 'arena.status.on_fire', currentStreak: 7 },
        { position: 2, userId: TEST_USER_ID, pairName: 'GUTO & Willian', avatarStage: 'baby', xp: 500, validatedWorkouts: 5, status: 'arena.status.consistent', currentStreak: 3 },
        { position: 3, userId: 'user-b', pairName: 'GUTO & Pedro', avatarStage: 'baby', xp: 300, validatedWorkouts: 3, status: 'arena.status.needs_action', currentStreak: 1 },
      ],
    }))
  )
  await onIncludes('/guto/validations', (route) => route.fulfill(jsonBody([])))
  await onIncludes('/guto/name', (route) =>
    route.fulfill(jsonBody({ status: 'valid', normalized: 'Willian', message: 'ok' }))
  )
  await onIncludes('/billing', (route) => route.fulfill(jsonBody({ status: 'active' })))
  await onPath('/guto/event', (route) => route.fulfill(jsonBody({ ok: true })))
  // Chat (POST /guto). Registrado por último → tem prioridade no match do
  // Playwright; só intercepta POST e não engole /guto/memory, /guto/diet, etc.
  await onPath('/guto', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill(jsonBody({ fala: 'E aí, Willian! Treino pronto pra hoje. Bora, dupla!', acao: 'none', avatarEmotion: 'default' }))
    }
    return route.continue()
  })
}

async function injectAuthStorage(page: Page) {
  await page.addInitScript(
    ({ token, userId, profile, storageVersion }) => {
      localStorage.setItem('guto-auth-token', token)
      localStorage.setItem(`guto-white-lab-profile-${userId}`, JSON.stringify(profile))
      localStorage.setItem(`guto-storage-version-${userId}`, String(storageVersion))
      localStorage.setItem('guto-selected-language', 'pt-BR')
    },
    {
      token: TEST_TOKEN,
      userId: TEST_USER_ID,
      storageVersion: 2,
      profile: {
        language: 'pt-BR',
        userName: 'Willian',
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

test.describe('AUDIT — Screenshots página por página', () => {

  test('01 — Intro / abertura', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1500)
    await snap(page, '01-intro-abertura')
  })

  test('02 — Seleção de idioma', async ({ page }) => {
    await page.goto('/?skip-intro=1')
    await expect(page.getByRole('button', { name: 'Português' })).toBeVisible({ timeout: 8000 })
    await snap(page, '02-selecao-idioma')
  })

  test('03 — Login page', async ({ page }) => {
    await page.goto('/login')
    await page.waitForTimeout(1000)
    await snap(page, '03-login-page')
  })

  test('04 — Login EN-US', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('guto-selected-language', 'en-US')
      localStorage.setItem('guto-onboarding-language', 'en-US')
    })
    await page.goto('/login?lang=en-US')
    await page.waitForTimeout(1000)
    await snap(page, '04-login-en-us')
  })

  test('05 — Login IT-IT', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('guto-selected-language', 'it-IT')
      localStorage.setItem('guto-onboarding-language', 'it-IT')
    })
    await page.goto('/login?lang=it-IT')
    await page.waitForTimeout(1000)
    await snap(page, '05-login-it-it')
  })

  test('06 — Consentimento (pre-auth redirect to login)', async ({ page }) => {
    await page.goto('/?skip-intro=1')
    await page.getByRole('button', { name: 'Português' }).click()
    await page.waitForTimeout(1500)
    await snap(page, '06-consentimento-redirect')
  })

  test('07 — Sistema autenticado — Chat tab', async ({ page }) => {
    await setupApiMocks(page)
    await injectAuthStorage(page)
    await page.goto('/?skip-intro=1')
    await page.waitForTimeout(2500)
    await snap(page, '07-sistema-chat-tab')
  })

  test('08 — Aba Missão', async ({ page }) => {
    await setupApiMocks(page)
    await injectAuthStorage(page)
    await page.goto('/?skip-intro=1')
    await page.waitForTimeout(2500)
    await page.getByRole('button', { name: 'MISSÃO' }).click()
    await page.waitForTimeout(1500)
    await snap(page, '08-aba-missao')
  })

  test('09 — Aba Dieta', async ({ page }) => {
    await setupApiMocks(page)
    await injectAuthStorage(page)
    await page.goto('/?skip-intro=1')
    await page.waitForTimeout(2500)
    await page.getByRole('button', { name: 'DIETA' }).click()
    await page.waitForTimeout(2500)
    await snap(page, '09-aba-dieta')
  })

  test('10 — Aba Arena', async ({ page }) => {
    await setupApiMocks(page)
    await injectAuthStorage(page)
    await page.goto('/?skip-intro=1')
    await page.waitForTimeout(2500)
    await page.getByRole('button', { name: 'ARENA' }).click()
    await page.waitForTimeout(1500)
    await snap(page, '10-aba-arena')
  })

  test('11 — Aba Evoluir', async ({ page }) => {
    await setupApiMocks(page)
    await injectAuthStorage(page)
    await page.goto('/?skip-intro=1')
    await page.waitForTimeout(2500)
    await page.getByRole('button', { name: 'EVOLUIR' }).click()
    await page.waitForTimeout(1500)
    await snap(page, '11-aba-evoluir')
  })

  test('12 — Aba Percurso', async ({ page }) => {
    await setupApiMocks(page)
    await injectAuthStorage(page)
    await page.goto('/?skip-intro=1')
    await page.waitForTimeout(2500)
    await page.getByRole('button', { name: 'PERCURSO' }).click()
    await page.waitForTimeout(1500)
    await snap(page, '12-aba-percurso')
  })

  test('13 — Settings / Ajustes', async ({ page }) => {
    await setupApiMocks(page)
    await injectAuthStorage(page)
    await page.goto('/?skip-intro=1')
    await page.waitForTimeout(2000)
    const settingsBtn = page.locator('button:has(svg.lucide-settings)').or(page.getByRole('button', { name: /settings|ajustes|impostazioni/i }))
    await settingsBtn.first().click().catch(() => {})
    await page.waitForTimeout(1000)
    await snap(page, '13-settings')
  })

  test('14 — Admin login', async ({ page }) => {
    await page.goto('/admin/login')
    await page.waitForTimeout(1000)
    await snap(page, '14-admin-login')
  })

  test('15 — Coach panel (unauthenticated)', async ({ page }) => {
    await page.goto('/coach')
    await page.waitForTimeout(2000)
    await snap(page, '15-coach-panel')
  })

  test('16 — Terms page PT', async ({ page }) => {
    await page.goto('/terms?lang=pt-BR')
    await page.waitForTimeout(1500)
    await snap(page, '16-terms-pt')
  })

  test('17 — Privacy page PT', async ({ page }) => {
    await page.goto('/privacy?lang=pt-BR')
    await page.waitForTimeout(1500)
    await snap(page, '17-privacy-pt')
  })

  test('18 — Billing pricing', async ({ page }) => {
    await page.goto('/billing/pricing')
    await page.waitForTimeout(1000)
    await snap(page, '18-billing-pricing')
  })

  test('19 — Acesso pausado', async ({ page }) => {
    await page.goto('/acesso-pausado')
    await page.waitForTimeout(1000)
    await snap(page, '19-acesso-pausado')
  })

  test('20 — Convite token page', async ({ page }) => {
    await page.goto('/convite/test-invalid-token')
    await page.waitForTimeout(2000)
    await snap(page, '20-convite-page')
  })

})
