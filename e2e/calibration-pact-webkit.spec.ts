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
