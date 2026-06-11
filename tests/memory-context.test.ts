import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { buildWorkoutCare, buildDietProfile } from "../lib/memory-context"
import type { GutoMemory } from "../lib/api/guto"

// Fase 3K — camada VISÍVEL de memória/contexto. Os componentes React
// (WorkoutCareNotice / DietProfileNotice) são renderizadores finos da lógica
// pura testada aqui: o que aparece, o estado vazio e — sobretudo — a SEPARAÇÃO
// entre patologia (treino) e restrição alimentar (dieta).

function mem(partial: Partial<GutoMemory>): GutoMemory {
  return { ...partial } as GutoMemory
}

const KNEE_RESOLVED = {
  field: "pathology" as const,
  rawValue: "dor no joelho",
  status: "clear" as const,
  bodyRegion: "knee",
  riskTags: ["knee_sensitive"],
}

describe("buildWorkoutCare — cuidados do treino", () => {
  it("mostra cuidado ATIVO de joelho quando resolvido (clear + bodyRegion)", () => {
    const care = buildWorkoutCare(
      mem({ trainingPathology: "dor no joelho direito", resolvedFields: { pathology: KNEE_RESOLVED } }),
      "pt-BR"
    )
    assert.ok(care)
    assert.equal(care!.status, "active")
    assert.equal(care!.region, "knee")
    assert.match(care!.title, /joelho/i)
    assert.match(care!.body, /joelho/i)
  })

  it("deriva região do texto livre quando não há resolvedFields (pernas → ativo)", () => {
    const care = buildWorkoutCare(mem({ trainingLimitations: "dor nas pernas" }), "pt-BR")
    assert.ok(care)
    assert.equal(care!.status, "active")
    assert.equal(care!.region, "legs")
    assert.match(care!.title, /pernas/i)
  })

  it("reconhece lombar/coluna como lower_back", () => {
    const care = buildWorkoutCare(mem({ trainingPathology: "incômodo na lombar" }), "pt-BR")
    assert.ok(care)
    assert.equal(care!.region, "lower_back")
  })

  it("mostra cuidado PENDENTE quando a limitação é ambígua (status needs_confirmation)", () => {
    const care = buildWorkoutCare(
      mem({
        trainingPathology: "Gambia",
        resolvedFields: { pathology: { field: "pathology", rawValue: "Gambia", status: "needs_confirmation" } },
      }),
      "pt-BR"
    )
    assert.ok(care)
    assert.equal(care!.status, "pending")
    assert.match(care!.title, /pendente/i)
    assert.match(care!.body, /entender melhor/i)
  })

  it("texto sem região reconhecível e sem resolução vira pendente (honesto, não erro)", () => {
    const care = buildWorkoutCare(mem({ trainingPathology: "um troço estranho" }), "pt-BR")
    assert.ok(care)
    assert.equal(care!.status, "pending")
  })

  it("estado vazio: 'sem dor' não renderiza bloco", () => {
    assert.equal(buildWorkoutCare(mem({ trainingPathology: "sem dor" }), "pt-BR"), null)
    assert.equal(buildWorkoutCare(mem({ trainingLimitations: "nenhuma" }), "pt-BR"), null)
  })

  it("estado vazio: sem patologia nenhuma → null", () => {
    assert.equal(buildWorkoutCare(mem({ country: "Brasil", trainingGoal: "fat_loss" }), "pt-BR"), null)
    assert.equal(buildWorkoutCare(null, "pt-BR"), null)
  })

  it("localiza a região (en-US / it-IT)", () => {
    const en = buildWorkoutCare(mem({ resolvedFields: { pathology: KNEE_RESOLVED } }), "en-US")
    assert.match(en!.title, /knee/i)
    const it = buildWorkoutCare(mem({ resolvedFields: { pathology: KNEE_RESOLVED } }), "it-IT")
    assert.match(it!.title, /ginocchio/i)
  })
})

describe("buildDietProfile — perfil usado na dieta", () => {
  it("mostra preferência + país + objetivo + restrição quando existem", () => {
    const profile = buildDietProfile(
      mem({ foodRestrictions: "vegetariano, sem lactose", country: "Itália", trainingGoal: "fat_loss" }),
      "pt-BR"
    )
    assert.ok(profile)
    assert.equal(profile!.preferenceLabel, "Vegetariano")
    assert.equal(profile!.countryLabel, "Itália")
    assert.equal(profile!.goalLabel, "Emagrecer")
    assert.ok(profile!.restrictionLabels.includes("Sem lactose"))
  })

  it("vegano tem precedência sobre vegetariano", () => {
    const profile = buildDietProfile(mem({ foodRestrictions: "sou vegano", country: "Brasil", trainingGoal: "muscle_gain" }), "pt-BR")
    assert.equal(profile!.preferenceLabel, "Vegano")
  })

  it("NÃO mostra patologia como restrição/erro de dieta (separação)", () => {
    const profile = buildDietProfile(
      mem({
        foodRestrictions: "vegetariano",
        trainingPathology: "dor no joelho",
        resolvedFields: { pathology: KNEE_RESOLVED },
        country: "Itália",
        trainingGoal: "fat_loss",
      }),
      "pt-BR"
    )
    assert.ok(profile)
    // Nenhuma restrição alimentar pode conter texto de patologia.
    for (const r of profile!.restrictionLabels) {
      assert.doesNotMatch(r, /joelho|dor|patolog/i)
    }
    // A nota física é separada, neutra e NUNCA texto de erro.
    if (profile!.physicalCareNote) {
      assert.match(profile!.physicalCareNote, /joelho/i)
      assert.doesNotMatch(profile!.physicalCareNote, /erro|bloque|falh|inválid/i)
    }
  })

  it("dor no joelho sem restrição alimentar → sem chips de restrição, só nota física neutra", () => {
    const profile = buildDietProfile(
      mem({ trainingPathology: "dor no joelho", resolvedFields: { pathology: KNEE_RESOLVED }, country: "Itália", trainingGoal: "fat_loss" }),
      "pt-BR"
    )
    assert.ok(profile)
    assert.equal(profile!.preferenceLabel, null)
    assert.equal(profile!.restrictionLabels.length, 0)
    assert.ok(profile!.physicalCareNote && /joelho/i.test(profile!.physicalCareNote))
  })

  it("estado vazio: sem objetivo/país/restrição/patologia → null", () => {
    assert.equal(buildDietProfile(mem({}), "pt-BR"), null)
    assert.equal(buildDietProfile(null, "pt-BR"), null)
  })

  it("'como de tudo' não vira restrição", () => {
    const profile = buildDietProfile(mem({ foodRestrictions: "como de tudo", country: "Brasil", trainingGoal: "fat_loss" }), "pt-BR")
    assert.ok(profile)
    assert.equal(profile!.preferenceLabel, null)
    assert.equal(profile!.restrictionLabels.length, 0)
    // ainda mostra país/objetivo (contexto útil)
    assert.equal(profile!.countryLabel, "Brasil")
  })

  it("localiza restrições e preferência (it-IT)", () => {
    const profile = buildDietProfile(mem({ foodRestrictions: "vegetariano, senza lattosio", country: "Italia", trainingGoal: "fat_loss" }), "it-IT")
    assert.equal(profile!.preferenceLabel, "Vegetariano")
    assert.ok(profile!.restrictionLabels.includes("Senza lattosio"))
    assert.equal(profile!.goalLabel, "Dimagrire")
  })
})

describe("buildDietProfile — restrição declarada nunca fica invisível (smoke test DUDAAA)", () => {
  it("forma feminina 'vegana' gera o chip Vegano", () => {
    const profile = buildDietProfile(mem({ foodRestrictions: "vegana", country: "Brasil", trainingGoal: "muscle_gain" }), "pt-BR")
    assert.equal(profile!.preferenceLabel, "Vegano")
  })

  it("'sou vegana' (frase) gera o chip Vegano", () => {
    const profile = buildDietProfile(mem({ foodRestrictions: "sou vegana", country: "Brasil", trainingGoal: "muscle_gain" }), "pt-BR")
    assert.equal(profile!.preferenceLabel, "Vegano")
  })

  it("forma feminina 'vegetariana' gera o chip Vegetariano", () => {
    const profile = buildDietProfile(mem({ foodRestrictions: "vegetariana", country: "Brasil", trainingGoal: "fat_loss" }), "pt-BR")
    assert.equal(profile!.preferenceLabel, "Vegetariano")
  })

  it("'vegana' com restrição estruturada junto: preferência + chip, sem fallback duplicado", () => {
    const profile = buildDietProfile(
      mem({ foodRestrictions: "vegana e sem lactose", country: "Brasil", trainingGoal: "muscle_gain" }),
      "pt-BR"
    )
    assert.equal(profile!.preferenceLabel, "Vegano")
    assert.deepEqual(profile!.restrictionLabels, ["Sem lactose"])
  })

  it("restrição fora do allowlist ('alergia a kiwi') vira chip com o texto declarado", () => {
    const profile = buildDietProfile(mem({ foodRestrictions: "alergia a kiwi", country: "Brasil", trainingGoal: "fat_loss" }), "pt-BR")
    assert.equal(profile!.preferenceLabel, null)
    assert.deepEqual(profile!.restrictionLabels, ["Alergia a kiwi"])
  })

  it("fallback NÃO dispara quando algo estruturado casou (não duplica texto)", () => {
    const profile = buildDietProfile(
      mem({ foodRestrictions: "não como peixe nem frutos do mar", country: "Brasil", trainingGoal: "fat_loss" }),
      "pt-BR"
    )
    assert.deepEqual(profile!.restrictionLabels, ["Sem peixe"])
  })

  it("texto cru longo é truncado no chip de fallback", () => {
    const longo = "não como nenhum tipo de fruta vermelha, morango, amora, framboesa e mirtilo"
    const profile = buildDietProfile(mem({ foodRestrictions: longo, country: "Brasil", trainingGoal: "fat_loss" }), "pt-BR")
    assert.equal(profile!.restrictionLabels.length, 1)
    assert.ok(profile!.restrictionLabels[0].length <= 48)
    assert.ok(profile!.restrictionLabels[0].endsWith("…"))
  })
})

describe("separação treino × dieta (cenário Will: joelho + vegetariano + Itália)", () => {
  const will = mem({
    trainingPathology: "dor no joelho",
    trainingLimitations: "dor no joelho",
    resolvedFields: { pathology: KNEE_RESOLVED },
    foodRestrictions: "vegetariano",
    country: "Itália",
    trainingGoal: "fat_loss",
  })

  it("Missão mostra cuidado de joelho", () => {
    const care = buildWorkoutCare(will, "pt-BR")
    assert.equal(care!.region, "knee")
    assert.equal(care!.status, "active")
  })

  it("Dieta mostra vegetariano/Itália e não trata joelho como restrição", () => {
    const profile = buildDietProfile(will, "pt-BR")
    assert.equal(profile!.preferenceLabel, "Vegetariano")
    assert.equal(profile!.countryLabel, "Itália")
    for (const r of profile!.restrictionLabels) assert.doesNotMatch(r, /joelho|dor/i)
  })
})

describe("WorkoutCareNotice copy — gramática natural (Fase 3L)", () => {
  function careFor(region: string, lang: "pt-BR" | "en-US" | "it-IT" = "pt-BR") {
    return buildWorkoutCare(
      mem({
        trainingPathology: "limitação",
        resolvedFields: { pathology: { field: "pathology", rawValue: region, status: "clear", bodyRegion: region, riskTags: [region] } },
      }),
      lang
    )
  }

  it("lombar usa 'proteger a lombar' — nunca 'teu lombar' / erro de gênero", () => {
    const care = careFor("lower_back", "pt-BR")
    assert.match(care!.body, /proteger a lombar/i)
    assert.doesNotMatch(care!.body, /teu lombar|tua lombar|teu\b/i)
    assert.equal(care!.title, "Cuidados: lombar")
  })

  it("joelho usa 'proteger o joelho'", () => {
    const care = careFor("knee", "pt-BR")
    assert.match(care!.body, /proteger o joelho/i)
    assert.doesNotMatch(care!.body, /teu joelho/i)
  })

  it("pernas usa 'proteger as pernas' (plural correto)", () => {
    const care = careFor("legs", "pt-BR")
    assert.match(care!.body, /proteger as pernas/i)
  })

  it("não mistura 'teu/sua' nem usa 'pra' (tom profissional)", () => {
    const care = careFor("lower_back", "pt-BR")
    assert.doesNotMatch(care!.body, /\bpra\b/i)
    assert.doesNotMatch(care!.body, /\bteu\b|\btua\b/i)
  })

  it("EN/IT com artigo correto", () => {
    assert.match(careFor("lower_back", "en-US")!.body, /protect the lower back/i)
    assert.match(careFor("lower_back", "it-IT")!.body, /proteggere la schiena/i)
    assert.match(careFor("knee", "it-IT")!.body, /proteggere il ginocchio/i)
  })
})
