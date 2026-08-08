import { expect, test, type Page } from '@playwright/test'

const USER_ID = 'webkit-calibration-user'
const TOKEN = 'webkit-calibration-token'

const user = {
  userId: USER_ID,
  name: 'QA WebKit',
  email: 'webkit@guto.test',
  role: 'student',
}

const baseMemory = {
  userId: USER_ID,
  name: 'QA WebKit',
  language: 'pt-BR',
  sovereignNameConfirmedAt: '2026-07-20T10:00:00.000Z',
  consentHealthFitness: true,
  acceptedTerms: true,
  consentAcceptedAt: '2026-07-20T10:00:00.000Z',
  initialXpGranted: false,
  totalXp: 0,
  streak: 0,
  trainedToday: false,
  adaptedMissionToday: false,
  completedWorkoutDates: [],
  adaptedMissionDates: [],
  missedMissionDates: [],
  xpEvents: [],
  proactiveSent: {},
  initialXpRewardSeen: false,
}

function json(body: unknown) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify(body) }
}

async function chooseSearchOption(page: Page, opener: ReturnType<Page['getByRole']>, query: string, option: string | RegExp) {
  await opener.click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('input[type="search"]').fill(query)
  await dialog.getByRole('button', { name: option, exact: typeof option === 'string' }).first().click()
  await expect(dialog).not.toBeVisible()
}

test('calibration commit with a lost response recovers and enters pact', async ({ page }) => {
  let memory: Record<string, unknown> = { ...baseMemory }
  let calibrationPosts = 0
  let memoryReadsAfterLostResponse = 0
  let responseWasLost = false

  await page.addInitScript(({ token, userId }) => {
    localStorage.setItem('guto-auth-token', token)
    localStorage.setItem('guto-selected-language', 'pt-BR')
    localStorage.setItem(`guto-storage-version-${userId}`, '2')
    localStorage.setItem(`guto-white-lab-profile-${userId}`, JSON.stringify({
      language: 'pt-BR',
      userName: 'QA WebKit',
      onboardingComplete: false,
      namingConfirmed: true,
      calibrationComplete: false,
      pactAccepted: false,
      consentHealthFitness: true,
      acceptedTerms: true,
      consentAcceptedAt: '2026-07-20T10:00:00.000Z',
    }))
  }, { token: TOKEN, userId: USER_ID })

  const isApi = (url: URL) => url.pathname.startsWith('/api/guto') || url.hostname === 'cerebroguto.onrender.com'
  await page.route((url) => isApi(url), (route) => route.fulfill(json({})))
  await page.route((url) => isApi(url) && url.pathname.endsWith('/auth/me'), (route) => route.fulfill(json(user)))
  await page.route((url) => isApi(url) && url.pathname.endsWith('/guto/memory'), async (route) => {
    if (route.request().method() === 'GET') {
      if (responseWasLost) memoryReadsAfterLostResponse += 1
      return route.fulfill(json(memory))
    }

    calibrationPosts += 1
    memory = { ...memory, ...(route.request().postDataJSON() as Record<string, unknown>) }
    responseWasLost = true
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{' })
  })
  await page.route((url) => isApi(url) && url.pathname.endsWith('/guto/events'), (route) => route.fulfill(json({ ok: true })))

  await page.goto('/')
  await expect(page.getByText(/CALIBRAGEM INICIAL/i)).toBeVisible()

  const selectButtons = page.getByRole('button', { name: 'Selecionar', exact: true })
  await chooseSearchOption(page, selectButtons.nth(0), 'Itália', 'Itália')
  await chooseSearchOption(page, page.getByRole('button', { name: 'Selecionar', exact: true }), 'Roma', /^Roma(?:\s|$)/)
  await page.getByText(/como de tudo/i).click({ force: true })
  await page.getByText(/masculino/i).click({ force: true })
  await chooseSearchOption(page, page.getByRole('button', { name: '--', exact: true }), '35', '35')
  await chooseSearchOption(page, page.getByRole('button', { name: '70', exact: true }), '82', '82,0')
  await chooseSearchOption(page, page.getByRole('button', { name: '170', exact: true }), '178', '178')
  await page.getByText(/TREINANDO/i).click({ force: true })
  await page.getByText(/sem dor/i).click({ force: true })
  await page.getByText(/HIPERTROFIA/i).click({ force: true })
  await page.getByText(/ACADEMIA/i).click({ force: true })

  await page.getByRole('button', { name: /CALIBRAR GUTO/i }).click({ force: true })

  await expect(page.getByRole('button', { name: 'Segurar para selar o pacto' })).toBeVisible()
  expect(calibrationPosts).toBe(1)
  expect(memoryReadsAfterLostResponse).toBe(1)
  expect(memory.trainingGoal).toBe('muscle_gain')
})

test('Bora stays dismissed and opens chat when reward persistence and arrival responses are lost', async ({ page }) => {
  test.setTimeout(60_000)

  const postPactMemory = {
    ...baseMemory,
    initialXpGranted: true,
    initialXpRewardSeen: false,
    totalXp: 100,
    trainingLevel: 'consistent',
    trainingGoal: 'muscle_gain',
    preferredTrainingLocation: 'gym',
    biologicalSex: 'male',
    userAge: 35,
    country: 'Itália',
    countryCode: 'IT',
    city: 'Roma',
    trainingPathology: 'SEM DOR',
    foodRestrictions: 'COMO DE TUDO',
    heightCm: 178,
    weightKg: 82,
    lastWorkoutPlan: {
      focus: 'Peito, Ombro e Tríceps',
      dateLabel: 'hoje',
      scheduledFor: 'hoje',
      summary: 'Treino oficial',
      exercises: [{ id: 'supino', name: 'Supino reto máquina', sets: 3, reps: '10' }],
    },
    lastDietPlan: {
      userId: USER_ID,
      generatedAt: '2026-08-08T09:00:00.000Z',
      country: 'Itália',
      macros: { targetKcal: 2200, proteinG: 150, carbsG: 250, fatG: 65 },
      meals: [{ id: 'almoco', name: 'Almoço', foods: [{ id: 'arroz', name: 'Arroz', amount: '150 g' }] }],
    },
  }
  let rewardSeenWrites = 0
  let arrivalRequests = 0

  await page.addInitScript(({ token, userId }) => {
    localStorage.setItem('guto-auth-token', token)
    localStorage.setItem('guto-selected-language', 'pt-BR')
    localStorage.setItem(`guto-storage-version-${userId}`, '4')
    localStorage.setItem(`guto-white-lab-profile-${userId}`, JSON.stringify({
      language: 'pt-BR',
      userName: 'QA WebKit',
      onboardingComplete: true,
      namingConfirmed: true,
      calibrationComplete: true,
      pactAccepted: true,
      consentHealthFitness: true,
      acceptedTerms: true,
      consentAcceptedAt: '2026-07-20T10:00:00.000Z',
    }))

    const originalSetItem = Storage.prototype.setItem
    Storage.prototype.setItem = function(key, value) {
      if (String(key).startsWith('guto-initial-xp-reward-seen:')) {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError')
      }
      return originalSetItem.call(this, key, value)
    }
  }, { token: TOKEN, userId: USER_ID })

  const isApi = (url: URL) => url.pathname.startsWith('/api/guto') || url.hostname.includes('cerebroguto')
  await page.route((url) => isApi(url), (route) => route.fulfill(json({})))
  await page.route((url) => isApi(url) && url.pathname.endsWith('/auth/me'), (route) => route.fulfill(json(user)))
  await page.route((url) => isApi(url) && url.pathname.endsWith('/guto/memory'), async (route) => {
    if (route.request().method() === 'GET') return route.fulfill(json(postPactMemory))

    const body = route.request().postDataJSON() as Record<string, unknown>
    if (body.initialXpRewardSeen === true) {
      rewardSeenWrites += 1
      await new Promise((resolve) => setTimeout(resolve, 16_000))
      return route.abort('timedout')
    }
    return route.fulfill(json({ ...postPactMemory, ...body }))
  })
  await page.route((url) => isApi(url) && url.pathname.endsWith('/guto/proactive'), async (route) => {
    arrivalRequests += 1
    await new Promise((resolve) => setTimeout(resolve, 16_000))
    return route.abort('timedout')
  })
  await page.route((url) => isApi(url) && url.pathname.endsWith('/guto/events'), (route) => route.fulfill(json({ ok: true })))

  await page.goto('/')
  const bora = page.getByRole('button', { name: 'Bora', exact: true })
  await expect(bora).toBeVisible()
  await bora.click({ force: true })

  await page.waitForTimeout(17_000)

  await expect(bora).not.toBeVisible()
  await expect(page.getByText(/Finalmente, QA WebKit/i)).toBeVisible()
  expect(rewardSeenWrites).toBe(1)
  expect(arrivalRequests).toBe(1)
})
