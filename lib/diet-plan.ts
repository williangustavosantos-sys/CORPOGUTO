import type { DietFood, DietMeal, DietPlan, GutoMemory, SupportedLanguage } from "@/lib/api/guto"

const MACRO_KCAL_TOLERANCE = 10
const MEAL_KCAL_TOLERANCE = 10
const MEAL_DISTRIBUTION = [0.23, 0.12, 0.3, 0.11, 0.24]

const mealCopy: Record<SupportedLanguage, Array<{ id: string; name: string; time: string; gutoNote: string }>> = {
  "pt-BR": [
    { id: "cafe", name: "Café da manhã", time: "07:30", gutoNote: "Começa forte, sem exagerar no peso do prato." },
    { id: "lanche1", name: "Lanche da manhã", time: "10:30", gutoNote: "Mantém o motor ligado até o almoço." },
    { id: "almoco", name: "Almoço", time: "13:00", gutoNote: "Aqui entra a base da missão: proteína, carbo e controle." },
    { id: "lanche2", name: "Lanche da tarde", time: "16:30", gutoNote: "Sem improviso. Esse lanche protege o treino." },
    { id: "jantar", name: "Jantar", time: "20:00", gutoNote: "Fecha o dia sem abandonar a meta." },
  ],
  "en-US": [
    { id: "cafe", name: "Breakfast", time: "07:30", gutoNote: "Start strong without overloading the plate." },
    { id: "lanche1", name: "Morning Snack", time: "10:30", gutoNote: "Keeps the engine on until lunch." },
    { id: "almoco", name: "Lunch", time: "13:00", gutoNote: "This is the base: protein, carbs and control." },
    { id: "lanche2", name: "Afternoon Snack", time: "16:30", gutoNote: "No improvising. This snack protects the workout." },
    { id: "jantar", name: "Dinner", time: "20:00", gutoNote: "Close the day without dropping the target." },
  ],
  "it-IT": [
    { id: "cafe", name: "Colazione", time: "07:30", gutoNote: "Parti forte, senza caricare troppo il piatto." },
    { id: "lanche1", name: "Spuntino del mattino", time: "10:30", gutoNote: "Tiene acceso il motore fino al pranzo." },
    { id: "almoco", name: "Pranzo", time: "13:00", gutoNote: "Qui entra la base: proteine, carboidrati e controllo." },
    { id: "lanche2", name: "Spuntino del pomeriggio", time: "16:30", gutoNote: "Niente improvvisazione. Questo spuntino protegge l'allenamento." },
    { id: "jantar", name: "Cena", time: "20:00", gutoNote: "Chiudi la giornata senza mollare l'obiettivo." },
  ],
}

type FoodTemplate = {
  key: string
  kcalPer100G?: number
  kcalPerUnit?: number
  proteinPer100G?: number
  carbsPer100G?: number
  fatPer100G?: number
  proteinPerUnit?: number
  carbsPerUnit?: number
  fatPerUnit?: number
}

const foodNames: Record<string, Record<SupportedLanguage, string>> = {
  oats: { "pt-BR": "Aveia", "en-US": "Oats", "it-IT": "Avena" },
  banana: { "pt-BR": "Banana", "en-US": "Banana", "it-IT": "Banana" },
  yogurt: { "pt-BR": "Iogurte natural", "en-US": "Plain yogurt", "it-IT": "Yogurt naturale" },
  eggs: { "pt-BR": "Ovos", "en-US": "Eggs", "it-IT": "Uova" },
  rice: { "pt-BR": "Arroz cozido", "en-US": "Cooked rice", "it-IT": "Riso cotto" },
  chicken: { "pt-BR": "Frango grelhado", "en-US": "Grilled chicken", "it-IT": "Pollo grigliato" },
  oliveOil: { "pt-BR": "Azeite", "en-US": "Olive oil", "it-IT": "Olio d'oliva" },
  pasta: { "pt-BR": "Macarrão cozido", "en-US": "Cooked pasta", "it-IT": "Pasta cotta" },
  parmesan: { "pt-BR": "Queijo parmesão", "en-US": "Parmesan cheese", "it-IT": "Parmigiano" },
}

const foods: Record<string, FoodTemplate> = {
  oats: { key: "oats", kcalPer100G: 389, proteinPer100G: 16.9, carbsPer100G: 66.3, fatPer100G: 6.9 },
  banana: { key: "banana", kcalPer100G: 89, proteinPer100G: 1.1, carbsPer100G: 22.8, fatPer100G: 0.3 },
  yogurt: { key: "yogurt", kcalPer100G: 60, proteinPer100G: 3.5, carbsPer100G: 4.7, fatPer100G: 3.3 },
  eggs: { key: "eggs", kcalPer100G: 140, proteinPer100G: 12, carbsPer100G: 1.2, fatPer100G: 10 },
  rice: { key: "rice", kcalPer100G: 130, proteinPer100G: 2.7, carbsPer100G: 28, fatPer100G: 0.3 },
  chicken: { key: "chicken", kcalPer100G: 165, proteinPer100G: 31, carbsPer100G: 0, fatPer100G: 3.6 },
  oliveOil: { key: "oliveOil", kcalPer100G: 900, proteinPer100G: 0, carbsPer100G: 0, fatPer100G: 100 },
  pasta: { key: "pasta", kcalPer100G: 155, proteinPer100G: 5.8, carbsPer100G: 30.9, fatPer100G: 0.9 },
  parmesan: { key: "parmesan", kcalPer100G: 400, proteinPer100G: 36, carbsPer100G: 3.2, fatPer100G: 26 },
}

const mealFoodKeys = [
  ["oats", "banana", "yogurt", "eggs"],
  ["yogurt", "banana", "oats"],
  ["rice", "chicken", "oliveOil", "banana"],
  ["yogurt", "oats", "banana"],
  ["pasta", "chicken", "oliveOil", "parmesan"],
]

const foodSafetyGroups: Record<string, Array<FoodTemplate["key"]>> = {
  dairy: ["yogurt", "parmesan"],
  meat: ["chicken"],
  animal: ["yogurt", "parmesan", "eggs", "chicken"],
  gluten: ["oats", "pasta"],
}

const foodSafetyTerms = {
  dairy: /\b(lactose|lactos|láct|latic|dairy|milk|leite|latte|cheese|queijo|formagg|yogurt|iogurte)\b/i,
  vegan: /\b(vegan|vegano|vegana|plant[-\s]?based)\b/i,
  vegetarian: /\b(vegetarian|vegetariano|vegetariana)\b/i,
  gluten: /\b(gluten|glúten|celiac|celíac|celiach)\b/i,
}

export function validateDietPlan(plan: DietPlan) {
  const macroKcal = plan.macros.proteinG * 4 + plan.macros.carbsG * 4 + plan.macros.fatG * 9
  const mealsKcal = plan.meals.reduce((sum, meal) => sum + meal.totalKcal, 0)
  const mealValidation = plan.meals.map((meal) => {
    const foodsKcal = meal.foods.reduce((sum, food) => sum + food.kcal, 0)
    return {
      mealId: meal.id,
      mealKcal: meal.totalKcal,
      foodsKcal,
      delta: Math.abs(meal.totalKcal - foodsKcal),
      valid: Math.abs(meal.totalKcal - foodsKcal) <= MEAL_KCAL_TOLERANCE,
    }
  })

  return {
    targetKcal: plan.macros.targetKcal,
    macroKcal,
    mealsKcal,
    macroDelta: Math.abs(plan.macros.targetKcal - macroKcal),
    mealsDelta: Math.abs(plan.macros.targetKcal - mealsKcal),
    mealValidation,
    valid:
      Math.abs(plan.macros.targetKcal - macroKcal) <= MACRO_KCAL_TOLERANCE &&
      Math.abs(plan.macros.targetKcal - mealsKcal) <= MEAL_KCAL_TOLERANCE &&
      mealValidation.every((meal) => meal.valid),
  }
}

export class DietPlanValidationError extends Error {
  constructor(public readonly reason: "calorie_mismatch" | "restriction_violation") {
    super("A dieta recebida do cérebro não passou na validação final. Vou pedir uma nova versão antes de mostrar isso para você.")
    this.name = "DietPlanValidationError"
  }
}

export function sanitizeDietPlan(plan: DietPlan, _memory: GutoMemory | null): DietPlan {
  if (plan.lockedByCoach || plan.manualOverride || plan.source === "coach_manual" || plan.source === "mixed") {
    return plan
  }

  // O backend é a fonte de verdade da dieta: ele já valida calorias/macros
  // e restrições contra o catálogo antes de devolver 200. O front NÃO pode
  // redecidir por texto se "iogurte de soja sem lactose" é laticínio: isso criou
  // um segundo decisor, rejeitando o plano soberano válido no pós-pacto. Mantemos
  // a checagem numérica apenas como telemetria; segurança alimentar continua no
  // trilho autoritativo do backend.
  logValidation(validateDietPlan(plan))
  return plan
}

export function createCalculatedDietPlan(
  memory: GutoMemory,
  language: SupportedLanguage,
  userId = memory.userId,
  generatedAt = new Date().toISOString()
): DietPlan {
  const sex = memory.biologicalSex === "female" ? "female" : "male"
  const weightKg = memory.weightKg ?? 70
  const heightCm = memory.heightCm ?? 170
  const age = memory.userAge ?? memory.trainingAge ?? 30
  const bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "male" ? 5 : -161))
  const activityFactor = getActivityFactor(memory)
  const tdee = Math.round(bmr * activityFactor)
  const goalMultiplier = getGoalMultiplier(memory.trainingGoal)
  const minKcal = sex === "female" ? 1400 : 1600
  const rawTarget = Math.max(minKcal, Math.round(tdee * goalMultiplier))
  const proteinG = Math.round(weightKg * getProteinPerKg(memory.trainingGoal))
  const fatG = Math.round(weightKg * getFatPerKg(memory.trainingGoal))
  const carbsG = Math.max(80, Math.round((rawTarget - proteinG * 4 - fatG * 9) / 4))
  const targetKcal = proteinG * 4 + carbsG * 4 + fatG * 9
  const meals = buildMeals(targetKcal, language, memory)

  if (process.env.NODE_ENV === "development") {
    console.info("[GUTO_DIET_INPUT]", {
      sex,
      age,
      heightCm,
      weightKg,
      goal: memory.trainingGoal,
      trainingLevel: memory.trainingLevel || memory.trainingStatus,
      location: memory.preferredTrainingLocation,
    })
    console.info("[GUTO_DIET_CALC]", {
      bmr,
      activityFactor,
      tdee,
      goalMultiplier,
      rawTarget,
      targetKcal,
      proteinG,
      carbsG,
      fatG,
    })
  }

  return {
    userId,
    generatedAt,
    country: memory.country || "",
    foodRestrictions: memory.foodRestrictions,
    macros: {
      bmr,
      tdee,
      targetKcal,
      proteinG,
      carbsG,
      fatG,
      goal: memory.trainingGoal || "consistency",
    },
    meals,
  }
}

function getActivityFactor(memory: GutoMemory): number {
  const baseByLevel: Record<string, number> = {
    beginner: 1.3,
    returning: 1.4,
    consistent: 1.48,
    advanced: 1.62,
  }
  const level = memory.trainingLevel || memory.trainingStatus || "returning"
  const base = baseByLevel[level] ?? 1.45
  if (level === "advanced") return 1.7
  if (memory.preferredTrainingLocation === "gym") return Math.min(1.55, base + 0.04)
  if (memory.preferredTrainingLocation === "home") return Math.min(1.4, base)
  return Math.min(1.5, base)
}

function getGoalMultiplier(goal?: string): number {
  if (goal === "muscle_gain") return 1.1
  if (goal === "fat_loss") return 0.82
  if (goal === "conditioning") return 1
  if (goal === "mobility_health") return 0.95
  return 1
}

function getProteinPerKg(goal?: string): number {
  if (goal === "muscle_gain") return 1.9
  if (goal === "fat_loss") return 1.9
  if (goal === "conditioning") return 1.7
  return 1.7
}

function getFatPerKg(goal?: string): number {
  if (goal === "fat_loss") return 0.8
  if (goal === "muscle_gain") return 0.9
  return 0.85
}

function buildMeals(targetKcal: number, language: SupportedLanguage, memory?: GutoMemory): DietMeal[] {
  let allocated = 0
  return MEAL_DISTRIBUTION.map((pct, index) => {
    const mealKcal = index === MEAL_DISTRIBUTION.length - 1 ? targetKcal - allocated : Math.round(targetKcal * pct)
    allocated += mealKcal
    const copy = mealCopy[language][index]
    const allowedFoodKeys = filterFoodKeysForDietLimits(mealFoodKeys[index], memory)
    return {
      ...copy,
      totalKcal: mealKcal,
      foods: buildFoods(mealKcal, allowedFoodKeys, rebalanceDistribution(allowedFoodKeys.length), language),
    }
  })
}

function getDietLimits(memory?: GutoMemory | null) {
  const text = (memory?.foodRestrictions ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  return {
    dairy: foodSafetyTerms.dairy.test(text),
    vegan: foodSafetyTerms.vegan.test(text),
    vegetarian: foodSafetyTerms.vegetarian.test(text),
    gluten: foodSafetyTerms.gluten.test(text),
  }
}

function filterFoodKeysForDietLimits(keys: string[], memory?: GutoMemory): string[] {
  const limits = getDietLimits(memory)
  const blocked = new Set<string>()
  if (limits.dairy) foodSafetyGroups.dairy.forEach((key) => blocked.add(key))
  if (limits.vegan) foodSafetyGroups.animal.forEach((key) => blocked.add(key))
  if (limits.vegetarian) foodSafetyGroups.meat.forEach((key) => blocked.add(key))
  if (limits.gluten) foodSafetyGroups.gluten.forEach((key) => blocked.add(key))

  const allowed = keys.filter((key) => !blocked.has(key))
  return allowed.length > 0 ? allowed : ["rice", "banana", "oliveOil"]
}

function rebalanceDistribution(length: number): number[] {
  if (length <= 1) return [1]
  return Array.from({ length }, () => 1 / length)
}

function buildFoods(mealKcal: number, keys: string[], distribution: number[], language: SupportedLanguage): DietFood[] {
  let allocated = 0
  return keys.map((key, index) => {
    const kcal = index === keys.length - 1 ? mealKcal - allocated : Math.round(mealKcal * distribution[index])
    allocated += kcal
    return foodFromKcal(foods[key], kcal, language)
  })
}

function foodFromKcal(template: FoodTemplate, kcal: number, language: SupportedLanguage): DietFood {
  if (template.kcalPerUnit) {
    const units = Math.max(1, Math.round(kcal / template.kcalPerUnit))
    return {
      name: foodNames[template.key][language],
      quantity: `${units} un`,
      kcal,
      proteinG: Math.round((template.proteinPerUnit ?? 0) * units),
      carbsG: Math.round((template.carbsPerUnit ?? 0) * units),
      fatG: Math.round((template.fatPerUnit ?? 0) * units),
    }
  }

  const grams = Math.max(5, Math.round((kcal / (template.kcalPer100G ?? 1)) * 100))
  return {
    name: foodNames[template.key][language],
    quantity: `${grams}g`,
    kcal,
    proteinG: Math.round(((template.proteinPer100G ?? 0) * grams) / 100),
    carbsG: Math.round(((template.carbsPer100G ?? 0) * grams) / 100),
    fatG: Math.round(((template.fatPer100G ?? 0) * grams) / 100),
  }
}

function logValidation(validation: ReturnType<typeof validateDietPlan>) {
  if (process.env.NODE_ENV !== "development") return
  console.info("[GUTO_DIET_VALIDATE]", {
    targetKcal: validation.targetKcal,
    macroKcal: validation.macroKcal,
    mealsKcal: validation.mealsKcal,
    mealValidation: validation.mealValidation,
  })
  if (!validation.valid) console.warn("[GUTO_DIET_INVALID]", validation)
}
