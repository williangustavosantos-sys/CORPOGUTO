// ─── Camada visível de memória/contexto (Fase 3K) ──────────────────────────────
//
// Lógica PURA que decide o que os badges "Cuidados do treino" (Missão) e "Perfil
// usado na dieta" (Dieta) devem mostrar a partir da GutoMemory do backend.
//
// Separação obrigatória (canon GUTO):
//   • Treino usa dor/patologia/limitação física (trainingPathology /
//     trainingLimitations / resolvedFields.pathology).
//   • Dieta usa objetivo + país + NÃO COMO (foodRestrictions).
//   • Patologia NUNCA é erro/validação de dieta. Restrição alimentar NUNCA vira
//     patologia. A dieta pode, no máximo, exibir uma NOTA física neutra e
//     separada — nunca tratá-la como restrição nutricional.
//
// São funções puras (sem React) para serem cobertas por testes node:test.

import type { GutoMemory } from "@/lib/api/guto"
import type { ValidLanguage } from "@/components/guto/translations"

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function hasWord(haystackNormalized: string, term: string): boolean {
  const padded = ` ${haystackNormalized} `
  return padded.includes(` ${normalize(term)} `)
}

function includesTerm(haystackNormalized: string, term: string): boolean {
  return haystackNormalized.includes(normalize(term))
}

// Frases que significam "sem limitação física" — não devem gerar cuidado.
const NO_LIMITATION_PHRASES = [
  "sem dor", "sem dores", "sem limitacao", "sem limitacoes", "nenhuma", "nenhum",
  "nada", "nao", "no pain", "pain free", "no limitation", "no limitations",
  "all clear", "none", "senza dolore", "senza dolori", "nessun dolore",
  "nessuna limitazione", "non ho dolore", "non ho dolori", "sono libero",
  "libero", "nessuno", "nessuna",
]

function isNoLimitation(raw: string): boolean {
  const n = normalize(raw)
  if (!n) return true
  if (NO_LIMITATION_PHRASES.includes(n)) return true
  return NO_LIMITATION_PHRASES.some((p) => n === normalize(p))
}

// Frases que significam "sem restrição alimentar" — não devem gerar perfil.
const NO_FOOD_RESTRICTION_PHRASES = [
  "como de tudo", "eu como de tudo", "sem restricao", "sem restricoes",
  "sem restricao alimentar", "nao tenho restricao", "nao tenho restricoes",
  "sem alergia", "sem alergias", "sem intolerancia", "sem intolerancias",
  "nada", "nenhuma", "nenhum", "none", "no", "nessuna", "nessuno",
  "mangio tutto", "senza restrizioni", "nessuna restrizione",
  "no food restriction", "no food restrictions", "i eat everything",
  "eat everything", "no allergy", "no allergies",
]

function isNoFoodRestriction(raw: string): boolean {
  const n = normalize(raw)
  if (!n) return true
  return NO_FOOD_RESTRICTION_PHRASES.some((p) => n === normalize(p))
}

// ─── Body region (treino) ─────────────────────────────────────────────────────

export type BodyRegion =
  | "knee" | "shoulder" | "lower_back" | "ankle" | "hip" | "wrist" | "elbow"
  | "legs" | "neck" | "generic"

const REGION_TERMS: Record<Exclude<BodyRegion, "generic">, string[]> = {
  knee: ["joelho", "knee", "ginocchio", "menisco", "patela", "ligamento", "lca", "acl"],
  shoulder: ["ombro", "shoulder", "spalla", "manguito", "rotador"],
  lower_back: ["lombar", "coluna", "hernia", "lower back", "schiena", "disco", "back"],
  ankle: ["tornozelo", "ankle", "caviglia"],
  hip: ["quadril", "hip", "anca", "fianco"],
  wrist: ["punho", "wrist", "polso"],
  elbow: ["cotovelo", "elbow", "gomito"],
  legs: ["perna", "pernas", "legs", "leg", "gamba", "gambe", "panturrilha", "coxa"],
  neck: ["pescoco", "neck", "collo", "cervical"],
}

function deriveRegion(raw: string): BodyRegion | null {
  const n = normalize(raw)
  if (!n) return null
  for (const region of Object.keys(REGION_TERMS) as Array<Exclude<BodyRegion, "generic">>) {
    if (REGION_TERMS[region].some((term) => hasWord(n, term) || includesTerm(n, term))) {
      return region
    }
  }
  return null
}

const REGION_LABEL: Record<BodyRegion, Record<ValidLanguage, string>> = {
  knee: { "pt-BR": "joelho", "en-US": "knee", "it-IT": "ginocchio" },
  shoulder: { "pt-BR": "ombro", "en-US": "shoulder", "it-IT": "spalla" },
  lower_back: { "pt-BR": "lombar", "en-US": "lower back", "it-IT": "schiena" },
  ankle: { "pt-BR": "tornozelo", "en-US": "ankle", "it-IT": "caviglia" },
  hip: { "pt-BR": "quadril", "en-US": "hip", "it-IT": "anca" },
  wrist: { "pt-BR": "punho", "en-US": "wrist", "it-IT": "polso" },
  elbow: { "pt-BR": "cotovelo", "en-US": "elbow", "it-IT": "gomito" },
  legs: { "pt-BR": "pernas", "en-US": "legs", "it-IT": "gambe" },
  neck: { "pt-BR": "pescoço", "en-US": "neck", "it-IT": "collo" },
  generic: { "pt-BR": "", "en-US": "", "it-IT": "" },
}

function regionLabel(region: BodyRegion | null, lang: ValidLanguage): string {
  if (!region) return ""
  return REGION_LABEL[region][lang]
}

// Forma com artigo, para frases naturais ("proteger a lombar", "protect the knee",
// "proteggere la schiena"). Evita o erro de gênero de "proteger teu lombar".
const REGION_WITH_ARTICLE: Record<BodyRegion, Record<ValidLanguage, string>> = {
  knee: { "pt-BR": "o joelho", "en-US": "the knee", "it-IT": "il ginocchio" },
  shoulder: { "pt-BR": "o ombro", "en-US": "the shoulder", "it-IT": "la spalla" },
  lower_back: { "pt-BR": "a lombar", "en-US": "the lower back", "it-IT": "la schiena" },
  ankle: { "pt-BR": "o tornozelo", "en-US": "the ankle", "it-IT": "la caviglia" },
  hip: { "pt-BR": "o quadril", "en-US": "the hip", "it-IT": "l'anca" },
  wrist: { "pt-BR": "o punho", "en-US": "the wrist", "it-IT": "il polso" },
  elbow: { "pt-BR": "o cotovelo", "en-US": "the elbow", "it-IT": "il gomito" },
  legs: { "pt-BR": "as pernas", "en-US": "the legs", "it-IT": "le gambe" },
  neck: { "pt-BR": "o pescoço", "en-US": "the neck", "it-IT": "il collo" },
  generic: { "pt-BR": "", "en-US": "", "it-IT": "" },
}

function regionWithArticle(region: BodyRegion | null, lang: ValidLanguage): string {
  if (!region) return ""
  return REGION_WITH_ARTICLE[region][lang]
}

// Status do resolver que ainda exigem confirmação (cuidado pendente).
const PENDING_STATUSES = new Set(["needs_confirmation", "unknown", "risky_unclear", "needs_clarification"])

// ─── Workout care ─────────────────────────────────────────────────────────────

export interface WorkoutCare {
  status: "active" | "pending"
  region: BodyRegion | null
  title: string
  body: string
}

export function buildWorkoutCare(memory: GutoMemory | null | undefined, language: ValidLanguage): WorkoutCare | null {
  if (!memory) return null
  const raw = (memory.trainingPathology || memory.trainingLimitations || "").trim()
  const resolved = memory.resolvedFields?.pathology
  const meaningful = Boolean(raw) && !isNoLimitation(raw)

  const region: BodyRegion | null =
    (resolved?.status === "clear" ? (resolved.bodyRegion as BodyRegion | undefined) : undefined) ||
    (meaningful ? deriveRegion(raw) : null) ||
    null

  const t = WORKOUT_COPY[language]

  // Pendente: o resolver entende que existe algo, mas não com confiança.
  if (resolved && PENDING_STATUSES.has(resolved.status)) {
    return { status: "pending", region, title: t.pendingTitle, body: t.pendingBody }
  }

  const activeFromResolved =
    resolved?.status === "clear" && (Boolean(resolved.bodyRegion) || (resolved.riskTags?.length ?? 0) > 0)
  const activeFromText = meaningful && region !== null

  if (activeFromResolved || activeFromText) {
    return {
      status: "active",
      region,
      title: region ? `${t.activeTitlePrefix}: ${regionLabel(region, language)}` : t.activeTitleGeneric,
      body: t.activeBody(region ? regionWithArticle(region, language) : null),
    }
  }

  // Texto presente mas sem região clara e sem resolução → pendente (honesto).
  if (meaningful) {
    return { status: "pending", region: null, title: t.pendingTitle, body: t.pendingBody }
  }

  return null
}

const WORKOUT_COPY: Record<ValidLanguage, {
  activeTitlePrefix: string
  activeTitleGeneric: string
  // Recebe a região JÁ com artigo ("a lombar", "the knee", "la schiena").
  activeBody: (regionWithArticle: string | null) => string
  pendingTitle: string
  pendingBody: string
}> = {
  "pt-BR": {
    activeTitlePrefix: "Cuidados",
    activeTitleGeneric: "Cuidados ativos",
    activeBody: (region) =>
      region
        ? `Hoje ajustei o treino para proteger ${region}: menos impacto e sem carga agressiva.`
        : "Hoje ajustei o treino para respeitar a sua limitação: menos impacto e sem carga agressiva.",
    pendingTitle: "Cuidado pendente",
    pendingBody: "Preciso entender melhor essa limitação antes de liberar certos exercícios.",
  },
  "en-US": {
    activeTitlePrefix: "Care",
    activeTitleGeneric: "Active care",
    activeBody: (region) =>
      region
        ? `Today I adjusted the workout to protect ${region}: less impact, no aggressive load.`
        : "Today I adjusted the workout to respect your limitation: less impact, no aggressive load.",
    pendingTitle: "Care pending",
    pendingBody: "I need to understand this limitation better before I clear certain exercises.",
  },
  "it-IT": {
    activeTitlePrefix: "Attenzioni",
    activeTitleGeneric: "Attenzioni attive",
    activeBody: (region) =>
      region
        ? `Oggi ho adattato l'allenamento per proteggere ${region}: meno impatto e niente carichi aggressivi.`
        : "Oggi ho adattato l'allenamento per rispettare il tuo limite: meno impatto e niente carichi aggressivi.",
    pendingTitle: "Attenzione in sospeso",
    pendingBody: "Devo capire meglio questo limite prima di sbloccare certi esercizi.",
  },
}

// ─── Diet profile ──────────────────────────────────────────────────────────────

const GOAL_LABEL: Record<ValidLanguage, Record<string, string>> = {
  "pt-BR": { fat_loss: "Emagrecer", muscle_gain: "Hipertrofia", conditioning: "Condicionamento", mobility_health: "Saúde", consistency: "Consistência" },
  "en-US": { fat_loss: "Fat Loss", muscle_gain: "Hypertrophy", conditioning: "Conditioning", mobility_health: "Health", consistency: "Consistency" },
  "it-IT": { fat_loss: "Dimagrire", muscle_gain: "Ipertrofia", conditioning: "Condizionamento", mobility_health: "Salute", consistency: "Costanza" },
}

interface RestrictionRule {
  key: string
  terms: string[]
  label: Record<ValidLanguage, string>
}

// Apenas para chips do PERFIL (exibição). Não é gate de segurança — o backend é
// a fonte de verdade nutricional.
const RESTRICTION_RULES: RestrictionRule[] = [
  { key: "lactose", terms: ["lactose", "lactos", "leite", "dairy", "milk", "latte", "lattosio"], label: { "pt-BR": "Sem lactose", "en-US": "Lactose-free", "it-IT": "Senza lattosio" } },
  { key: "gluten", terms: ["gluten", "celiaco", "celiac"], label: { "pt-BR": "Sem glúten", "en-US": "Gluten-free", "it-IT": "Senza glutine" } },
  { key: "fish", terms: ["peixe", "fish", "pesce", "frutos do mar", "frutti di mare", "marisco", "seafood", "camarao", "shrimp", "atum", "tuna", "tonno", "salmao", "salmon"], label: { "pt-BR": "Sem peixe", "en-US": "No fish", "it-IT": "Senza pesce" } },
  { key: "egg", terms: ["ovo", "ovos", "egg", "eggs", "uovo", "uova"], label: { "pt-BR": "Sem ovo", "en-US": "No egg", "it-IT": "Senza uova" } },
  { key: "peanut", terms: ["amendoim", "peanut", "arachidi"], label: { "pt-BR": "Sem amendoim", "en-US": "No peanut", "it-IT": "Senza arachidi" } },
  { key: "red_meat", terms: ["carne vermelha", "red meat", "manzo", "bovina"], label: { "pt-BR": "Sem carne vermelha", "en-US": "No red meat", "it-IT": "Senza carne rossa" } },
]

const PREFERENCE_COPY: Record<ValidLanguage, { vegan: string; vegetarian: string }> = {
  "pt-BR": { vegan: "Vegano", vegetarian: "Vegetariano" },
  "en-US": { vegan: "Vegan", vegetarian: "Vegetarian" },
  "it-IT": { vegan: "Vegano", vegetarian: "Vegetariano" },
}

const DIET_COPY: Record<ValidLanguage, { title: string; goalPrefix: string; physicalCarePrefix: string }> = {
  "pt-BR": { title: "Perfil usado na dieta", goalPrefix: "Objetivo", physicalCarePrefix: "Cuidado físico registrado" },
  "en-US": { title: "Profile used for your diet", goalPrefix: "Goal", physicalCarePrefix: "Physical care noted" },
  "it-IT": { title: "Profilo usato per la dieta", goalPrefix: "Obiettivo", physicalCarePrefix: "Nota fisica registrata" },
}

export interface DietProfile {
  title: string
  goalLabel: string | null
  countryLabel: string | null
  preferenceLabel: string | null      // Vegano / Vegetariano
  restrictionLabels: string[]         // Sem lactose, etc. (NUNCA inclui patologia)
  /** Nota física NEUTRA e separada. Nunca é restrição/erro nutricional. */
  physicalCareNote: string | null
}

function parseDietPreference(foodRestrictionsNormalized: string, lang: ValidLanguage): string | null {
  // Substring, com a mesma semântica do gate nutricional do backend: cobre
  // vegan/vegano/VEGANA/veganismo. A forma masculina exata deixava "vegana"
  // sem chip enquanto a dieta gerada respeitava a restrição (smoke test
  // DUDAAA). "vegetariano" não contém "vegan", então a precedência
  // vegano-primeiro continua correta.
  if (includesTerm(foodRestrictionsNormalized, "vegan")) {
    return PREFERENCE_COPY[lang].vegan
  }
  if (includesTerm(foodRestrictionsNormalized, "vegetarian")) {
    return PREFERENCE_COPY[lang].vegetarian
  }
  return null
}

function parseRestrictions(foodRestrictionsNormalized: string, lang: ValidLanguage): string[] {
  const labels: string[] = []
  for (const rule of RESTRICTION_RULES) {
    if (rule.terms.some((term) => hasWord(foodRestrictionsNormalized, term) || includesTerm(foodRestrictionsNormalized, term))) {
      labels.push(rule.label[lang])
    }
  }
  return labels
}

const RAW_RESTRICTION_CHIP_MAX = 48

function rawRestrictionChip(raw: string): string {
  const compact = raw.replace(/\s+/g, " ").trim()
  const capped =
    compact.length > RAW_RESTRICTION_CHIP_MAX
      ? `${compact.slice(0, RAW_RESTRICTION_CHIP_MAX - 1).trimEnd()}…`
      : compact
  return capped.charAt(0).toUpperCase() + capped.slice(1)
}

export function buildDietProfile(memory: GutoMemory | null | undefined, language: ValidLanguage): DietProfile | null {
  if (!memory) return null
  const t = DIET_COPY[language]

  const rawRestrictions = (memory.foodRestrictions || "").trim()
  const restrictionsActive = Boolean(rawRestrictions) && !isNoFoodRestriction(rawRestrictions)
  const restrictionsNormalized = restrictionsActive ? normalize(rawRestrictions) : ""

  const preferenceLabel = restrictionsActive ? parseDietPreference(restrictionsNormalized, language) : null
  // Preferência (vegano/vegetariano) não é repetida na lista de restrições.
  const restrictionLabels = restrictionsActive ? parseRestrictions(restrictionsNormalized, language) : []

  // Restrição declarada nunca fica invisível: se nenhum rótulo estruturado
  // casou, o texto cru declarado vira o chip — sem inventar categoria e sem
  // duplicar (só entra quando NADA estruturado foi exibido).
  if (restrictionsActive && !preferenceLabel && restrictionLabels.length === 0) {
    restrictionLabels.push(rawRestrictionChip(rawRestrictions))
  }

  const goalLabel = memory.trainingGoal ? (GOAL_LABEL[language][memory.trainingGoal] || memory.trainingGoal) : null
  const countryLabel = memory.country?.trim() || null

  // Nota física NEUTRA (opcional). Patologia NUNCA entra como restrição/erro.
  const care = buildWorkoutCare(memory, language)
  let physicalCareNote: string | null = null
  if (care && care.status === "active" && care.region) {
    physicalCareNote = `${t.physicalCarePrefix}: ${regionLabel(care.region, language)}`
  }

  const hasAnything =
    Boolean(goalLabel) || Boolean(countryLabel) || Boolean(preferenceLabel) || restrictionLabels.length > 0
  if (!hasAnything && !physicalCareNote) return null

  return {
    title: t.title,
    goalLabel,
    countryLabel,
    preferenceLabel,
    restrictionLabels,
    physicalCareNote,
  }
}
