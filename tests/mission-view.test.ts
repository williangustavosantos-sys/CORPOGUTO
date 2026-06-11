import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { buildCompactRows, formatRepsLabel } from "../lib/mission-view"
import type { MissionExercise } from "../components/guto/view-models"

// Smoke test DUDAAA: cards gigantes (vídeo autoplay por exercício) sem visão
// geral do treino, e reps "12-15" quebrando em "12-"/"15". A MissionTab é
// renderizadora fina desta lógica: lista compacta + faixa de reps num token.

function exercise(partial: Partial<MissionExercise>): MissionExercise {
  return {
    id: partial.id || "ex-1",
    name: "Agachamento",
    canonicalNamePt: "Agachamento",
    muscleGroup: "pernas",
    sets: 3,
    reps: "12-15",
    rest: "60s",
    cue: "Desce controlado",
    note: "Não trava o joelho",
    videoUrl: "/exercise/visuals/agachamento.mp4",
    videoProvider: "local",
    sourceFileName: "agachamento.mp4",
    ...partial,
  }
}

describe("formatRepsLabel — faixa de reps em token único", () => {
  it("normaliza '12-15' para en dash sem espaços (um token)", () => {
    assert.equal(formatRepsLabel("12-15"), "12–15")
  })

  it("normaliza '12 - 15' (espaços quebráveis) para '12–15'", () => {
    assert.equal(formatRepsLabel("12 - 15"), "12–15")
  })

  it("número simples e tempo passam intactos", () => {
    assert.equal(formatRepsLabel(12), "12")
    assert.equal(formatRepsLabel("30s"), "30s")
  })

  it("resultado de faixa nunca contém espaço interno (nada quebrável)", () => {
    for (const reps of ["12-15", "8 – 12", "10—12"]) {
      assert.ok(!formatRepsLabel(reps).includes(" "), `"${reps}" virou token único`)
    }
  })
})

describe("buildCompactRows — visão geral compacta do treino inteiro", () => {
  const plan = [
    exercise({ id: "w1", name: "Polichinelo", muscleGroup: "aquecimento", reps: "30s" }),
    exercise({ id: "w2", name: "Mobilidade de quadril", muscleGroup: "aquecimento", reps: "10" }),
    exercise({ id: "m1", name: "Agachamento", muscleGroup: "pernas" }),
    exercise({ id: "m2", name: "Supino", muscleGroup: "peito", reps: "10-12" }),
    exercise({ id: "m3", name: "Remada", muscleGroup: "costas" }),
    exercise({ id: "m4", name: "Desenvolvimento", muscleGroup: "ombro" }),
    exercise({ id: "m5", name: "Rosca", muscleGroup: "bracos" }),
    exercise({ id: "m6", name: "Prancha", muscleGroup: "abdomen", reps: "45s" }),
  ]

  it("plano com 8 exercícios vira 8 linhas compactas com todos os campos", () => {
    const { warmup, main } = buildCompactRows(plan, [], false)
    assert.equal(warmup.length + main.length, 8)
    for (const row of [...warmup, ...main]) {
      assert.ok(row.order >= 1 && row.order <= 8, "tem ordem")
      assert.ok(row.name, "tem nome")
      assert.ok(row.muscleGroup, "tem grupo")
      assert.ok(row.sets > 0, "tem séries")
      assert.ok(row.repsLabel, "tem reps/tempo")
      assert.ok(row.rest, "tem descanso")
      assert.equal(typeof row.done, "boolean", "tem status")
    }
  })

  it("ordem é contínua: aquecimento 1-2, parte principal 3-8", () => {
    const { warmup, main } = buildCompactRows(plan, [], false)
    assert.deepEqual(warmup.map((r) => r.order), [1, 2])
    assert.deepEqual(main.map((r) => r.order), [3, 4, 5, 6, 7, 8])
  })

  it("status reflete exercícios marcados", () => {
    const { main } = buildCompactRows(plan, ["m1", "m3"], false)
    assert.equal(main.find((r) => r.id === "m1")?.done, true)
    assert.equal(main.find((r) => r.id === "m2")?.done, false)
    assert.equal(main.find((r) => r.id === "m3")?.done, true)
  })

  it("treino já validado hoje marca tudo como feito", () => {
    const { warmup, main } = buildCompactRows(plan, [], true)
    assert.ok([...warmup, ...main].every((r) => r.done))
  })

  it("reps com faixa chega à linha como token único ('10-12' → '10–12')", () => {
    const { main } = buildCompactRows(plan, [], false)
    assert.equal(main.find((r) => r.id === "m2")?.repsLabel, "10–12")
  })
})
