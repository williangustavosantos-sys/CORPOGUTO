import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { sanitizeDietPlan, DietPlanValidationError } from "../lib/diet-plan"
import type { DietPlan, GutoMemory } from "../lib/api/guto"

// Fase 3 — BUG 1: o backend é a fonte de verdade da dieta (valida ±80 kcal/dia +
// soma exata por refeição). O frontend NÃO pode re-rejeitar um plano válido por
// uma tolerância mais apertada (±10 kcal) — era o que causava o falso
// "A dieta falhou na checagem final". O sanitizeDietPlan agora só bloqueia por
// RESTRIÇÃO ALIMENTAR (segurança real), confiando no backend para calorias.

function food(name: string, kcal: number) {
  return { name, quantity: "100g", kcal, proteinG: 0, carbsG: 0, fatG: 0 }
}
function meal(id: string, name: string, foods: ReturnType<typeof food>[]) {
  return { id, name, time: "08:00", gutoNote: "", totalKcal: foods.reduce((s, f) => s + f.kcal, 0), foods }
}

function buildPlan(overrides: Partial<DietPlan> = {}): DietPlan {
  return {
    userId: "u1",
    generatedAt: new Date().toISOString(),
    country: "Brasil",
    foodRestrictions: "none",
    macros: { bmr: 1600, tdee: 2200, targetKcal: 2000, proteinG: 150, carbsG: 200, fatG: 60, goal: "consistency" },
    meals: [
      meal("cafe", "Café", [food("Aveia", 600), food("Banana", 150)]),
      meal("almoco", "Almoço", [food("Arroz", 500), food("Frango", 400)]),
      // total diário = 2050 → +50 da meta (dentro de ±80 do backend, mas fora de ±10)
    ],
    ...overrides,
  } as unknown as DietPlan
}

describe("Fase 3 — BUG 1: sanitizeDietPlan confia no backend para calorias", () => {
  it("aceita plano válido do backend mesmo com total diário a +50 kcal da meta (não re-rejeita por ±10)", () => {
    const plan = buildPlan()
    const result = sanitizeDietPlan(plan, null)
    assert.equal(result, plan)
  })

  it("aceita plano sem violar restrição quando há memória de restrição compatível", () => {
    const plan = buildPlan({ foodRestrictions: "lactose" })
    const memory = { foodRestrictions: "lactose" } as unknown as GutoMemory
    // nenhum alimento lácteo → não viola → retorna o plano
    assert.equal(sanitizeDietPlan(plan, memory), plan)
  })

  it("aceita alimento vegetal explicitamente sem lactose", () => {
    const plan = buildPlan({
      foodRestrictions: "vegetariano, sem lactose",
      meals: [meal("lanche2", "Lanche", [food("Iogurte de soja sem lactose", 150), food("Granola", 160)])],
    } as Partial<DietPlan>)
    const memory = { foodRestrictions: "vegetariano, sem lactose" } as unknown as GutoMemory

    assert.equal(sanitizeDietPlan(plan, memory), plan)
  })

  it("AINDA bloqueia (segurança real) quando o plano viola a restrição alimentar declarada", () => {
    const plan = buildPlan({
      foodRestrictions: "lactose",
      meals: [meal("cafe", "Café", [food("Leite integral", 300), food("Aveia", 400)])],
    } as Partial<DietPlan>)
    const memory = { foodRestrictions: "lactose" } as unknown as GutoMemory
    assert.throws(() => sanitizeDietPlan(plan, memory), (err: unknown) => {
      assert.ok(err instanceof DietPlanValidationError)
      assert.equal((err as DietPlanValidationError).reason, "restriction_violation")
      return true
    })
  })

  it("respeita plano travado pelo coach sem validar", () => {
    const plan = buildPlan({ lockedByCoach: true } as Partial<DietPlan>)
    assert.equal(sanitizeDietPlan(plan, null), plan)
  })
})
