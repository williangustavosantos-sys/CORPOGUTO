/**
 * Localização determinística dos alimentos oficiais do catálogo V3.
 *
 * O backend é a autoridade do conteúdo, mas após swap/reload o nome pode
 * aparecer no idioma da geração anterior (ex.: inglês) enquanto o usuário
 * está em pt-BR ou it-IT. A regra do produto ("idioma é lei") exige nomes
 * sempre no idioma atual do perfil — sem LLM, por foodId + language.
 */

export type FoodLocale = "pt-BR" | "it-IT" | "en-US"

export const OFFICIAL_FOOD_NAMES: Record<string, Record<FoodLocale, string>> = {
  chicken_breast: { "pt-BR": "Peito de frango", "it-IT": "Petto di pollo", "en-US": "Chicken breast" },
  tuna_canned: { "pt-BR": "Atum enlatado", "it-IT": "Tonno in scatola", "en-US": "Canned tuna" },
  eggs: { "pt-BR": "Ovos", "it-IT": "Uova", "en-US": "Eggs" },
  white_fish: { "pt-BR": "Peixe branco", "it-IT": "Pesce bianco", "en-US": "White fish" },
  bresaola: { "pt-BR": "Bresaola", "it-IT": "Bresaola", "en-US": "Bresaola" },
  rice: { "pt-BR": "Arroz", "it-IT": "Riso", "en-US": "Rice" },
  pasta: { "pt-BR": "Macarrão", "it-IT": "Pasta", "en-US": "Pasta" },
  oats: { "pt-BR": "Aveia", "it-IT": "Avena", "en-US": "Oats" },
  wholegrain_bread: { "pt-BR": "Pão integral", "it-IT": "Pane integrale", "en-US": "Whole grain bread" },
  potato: { "pt-BR": "Batata", "it-IT": "Patata", "en-US": "Potato" },
  sweet_potato: { "pt-BR": "Batata-doce", "it-IT": "Patata dolce", "en-US": "Sweet potato" },
  tapioca: { "pt-BR": "Tapioca", "it-IT": "Tapioca", "en-US": "Tapioca" },
  greek_yogurt: { "pt-BR": "Iogurte grego", "it-IT": "Yogurt greco", "en-US": "Greek yogurt" },
  soy_yogurt: { "pt-BR": "Iogurte de soja", "it-IT": "Yogurt di soia", "en-US": "Soy yogurt" },
  cottage_cheese: { "pt-BR": "Queijo cottage", "it-IT": "Fiocchi di latte", "en-US": "Cottage cheese" },
  banana: { "pt-BR": "Banana", "it-IT": "Banana", "en-US": "Banana" },
  apple: { "pt-BR": "Maçã", "it-IT": "Mela", "en-US": "Apple" },
  berries: { "pt-BR": "Frutas vermelhas", "it-IT": "Frutti di bosco", "en-US": "Berries" },
  zucchini: { "pt-BR": "Abobrinha", "it-IT": "Zucchine", "en-US": "Zucchini" },
  broccoli: { "pt-BR": "Brócolis", "it-IT": "Broccoli", "en-US": "Broccoli" },
  spinach: { "pt-BR": "Espinafre", "it-IT": "Spinaci", "en-US": "Spinach" },
  lentils: { "pt-BR": "Lentilhas", "it-IT": "Lenticchie", "en-US": "Lentils" },
  beans: { "pt-BR": "Feijão", "it-IT": "Fagioli", "en-US": "Beans" },
  chickpeas: { "pt-BR": "Grão-de-bico", "it-IT": "Ceci", "en-US": "Chickpeas" },
  olive_oil: { "pt-BR": "Azeite de oliva", "it-IT": "Olio d'oliva", "en-US": "Olive oil" },
  avocado: { "pt-BR": "Abacate", "it-IT": "Avocado", "en-US": "Avocado" },
  almonds: { "pt-BR": "Amêndoas", "it-IT": "Mandorle", "en-US": "Almonds" },
  rice_cakes: { "pt-BR": "Bolinho de arroz", "it-IT": "Gallette di riso", "en-US": "Rice cakes" },
}

export function localizeFoodName(foodId: string | undefined, fallbackName: string, language: string): string {
  if (!foodId) return fallbackName
  const locale = (language === "it-IT" || language === "en-US" ? language : "pt-BR") as FoodLocale
  return OFFICIAL_FOOD_NAMES[foodId]?.[locale] ?? fallbackName
}