export type ValidLanguage = "pt-BR" | "it-IT" | "en-US";

export function getLanguage(lang: string): ValidLanguage {
  const valid: ValidLanguage[] = ["pt-BR", "it-IT", "en-US"];
  return valid.includes(lang as ValidLanguage) ? (lang as ValidLanguage) : "pt-BR";
}

export interface TranslationDictionary {
  complete: string;
  initialMessage: string;
  placeholder: string;
  evoTitle: string;
  evoSubtitle: string;
  unlocked: string;
  locked: string;
  level: string;
  totalXp: string;
  nextEvolution: string;
  evoAuto1: string;
  evoAuto2: string;
  evoQuote: string;
  evoStages: {
    baby: string;
    teen: string;
    adult: string;
    elite: string;
  };
  missionTitle: string;
  objectivesTitle: string;
  restLabel: string;
  setsLabel: string;
  repsLabel: string;
  workoutDate: string;
  workoutFocus: string;
  exercises: { name: string; rest: string }[];
  workoutObjectives: string[];
  pathTitle: string;
  pathSubtitle: string;
  pathMonth: string;
  pathDayLabel: string;
  pathWorkoutDone: string;
  pathWorkoutName: string;
  pathXpYesterday: string;
  pathStreak: string;
  pathObservation: string;
  pathXpReward: string;
  pathQuote: string;
  calibration: {
    title: string;
    subtitle: string;
    ageLabel: string;
    sexLabel: string;
    sexOptions: { female: string; male: string };
    levelLabel: string;
    levelOptions: { beginner: string; returning: string; consistent: string; advanced: string };
    pathologyLabel: string;
    pathologyOptions: { none: string; knee: string; lower_back: string; shoulder: string; other: string };
    pathologyPlaceholder: string;
    confirm: string;
    goalLabel: string;
    goalOptions: { consistency: string; fat_loss: string; muscle_gain: string; conditioning: string; mobility_health: string };
    locationLabel: string;
    locationOptions: { gym: string; home: string; park: string; mixed: string };
    submit: string;
    errorRequired: string;
    statusLabel: string;
    statusChips: { paused: string; returning: string; active: string; advanced: string };
    frequencyLabel: string;
    frequencyOptions: string[];
    pathologySection: string;
    objectiveSection: string;
    objectiveChips: { fat_loss: string; muscle_gain: string; conditioning: string; mobility_health: string; consistency: string };
    countryLabel: string;
    countryPlaceholder: string;
    cityLabel: string;
    cityPlaceholder: string;
    heightLabel: string;
    weightLabel: string;
    restrictionsLabel: string;
    restrictionsPlaceholder: string;
    intolerancesLabel: string;
    intolerancesPlaceholder: string;
    physicalDataSection: string;
  };
  diet: {
    tab: string;
    title: string;
    subtitle: string;
    generateButton: string;
    regenerateButton: string;
    generatingLabel: string;
    dailyGoalTitle: string;
    kcalLabel: string;
    proteinLabel: string;
    carbsLabel: string;
    fatLabel: string;
    objectiveLabel: string;
    mealDoubtButton: string;
    emptyTitle: string;
    emptyBody: string;
    lastUpdated: string;
    goalNames: {
      fat_loss: string;
      muscle_gain: string;
      conditioning: string;
      mobility_health: string;
      consistency: string;
    };
  };
  arena: {
    tab: string;
    subtitle: string;
    week: string;
    month: string;
    individual: string;
    weeklyHeadline: string;
    monthlyHeadline: string;
    individualHeadline: string;
    workoutsValidated: string;
    xp: string;
    restartsMonday: string;
    restartsNextMonth: string;
    nextEvolution: string;
    xpMissing: string;
    emptyState: string;
    xpEarned: string;
    leveledUp: string;
    pairWithGuto: string;
  };
}

export const translations: Record<ValidLanguage, TranslationDictionary> = {
  "pt-BR": {
    // Name Screen
    complete: "Completo.",
    
    // Chat Tab
    initialMessage: "Estamos prontos. Sem distrações.",
    placeholder: "Falar com Guto..",
    
    // Evolutions Tab
    evoTitle: "EVOLUÇÕES DO GUTO",
    evoSubtitle: "Cada evolução reflete o seu esforço.",
    unlocked: "DESBLOQUEADO",
    locked: "BLOQUEADO",
    level: "NÍVEL",
    totalXp: "XP TOTAL",
    nextEvolution: "PRÓXIMA EVOLUÇÃO",
    evoAuto1: "A evolução não é automática.",
    evoAuto2: "É construída todos os dias.",
    evoQuote: "Você já é mais forte do que ontem. E o melhor ainda está por vir.",
    evoStages: {
      baby: "BABY",
      teen: "TEEN",
      adult: "ADULTO",
      elite: "Elite"
    },
    
    // Mission Tab
    missionTitle: "MISSÃO",
    objectivesTitle: "Objetivos",
    restLabel: "Descanso",
    setsLabel: "Séries",
    repsLabel: "Reps",
    workoutDate: "24 de Abril, Quarta-feira",
    workoutFocus: "Peito e tríceps",
    exercises: [
      { name: "Supino reto", rest: "1:30min" },
      { name: "Supino inclinado com halteres", rest: "1:30min" },
      { name: "Crucifixo no cabo", rest: "1:15min" },
      { name: "Chest press máquina", rest: "1:30min" },
      { name: "Paralela assistida", rest: "1:30min" },
      { name: "Tríceps corda", rest: "1:00min" },
      { name: "Tríceps francês no cabo", rest: "1:15min" },
      { name: "Flexão fechada", rest: "1:00min" },
    ],
    workoutObjectives: [
      "Execução controlada. Nada de pressa.",
      "Tempo certo = músculo certo."
    ],

    // Path Tab
    pathTitle: "PERCURSO",
    pathSubtitle: "O percurso mostra execução, ausência e consequência.",
    pathMonth: "ABRIL 2024",
    pathDayLabel: "Quarta, Peito e tríceps",
    pathWorkoutDone: "Treino realizado:",
    pathWorkoutName: "Peito e tríceps",
    pathXpYesterday: "0 XP hoje",
    pathStreak: "+3 dias na sequência",
    pathObservation: "+1 observação do Guto",
    pathXpReward: "+100 XP",
    pathQuote: "Você já é mais forte do que ontem. O melhor ainda está por vir.",
    calibration: {
      title: "Calibragem inicial",
      subtitle: "Antes de eu te puxar, preciso entender o teu corpo.",
      ageLabel: "Idade",
      sexLabel: "Sexo biológico",
      sexOptions: { female: "Feminino", male: "Masculino" },
      levelLabel: "Nível atual de treino",
      levelOptions: { beginner: "Começando", returning: "Voltando", consistent: "Mantendo ritmo", advanced: "Avançado" },
      pathologyLabel: "Dor, limitação ou patologia",
      pathologyOptions: { none: "Sem dor", knee: "Joelho", lower_back: "Lombar", shoulder: "Ombro", other: "Outro" },
      pathologyPlaceholder: "Detalhe sua limitação...",
      confirm: "Confirmar",
      goalLabel: "Objetivo principal",
      goalOptions: { consistency: "Consistência", fat_loss: "Perder gordura", muscle_gain: "Ganhar massa", conditioning: "Condicionamento", mobility_health: "Mobilidade e saúde" },
      locationLabel: "Local padrão de treino",
      locationOptions: { gym: "Academia", home: "Casa", park: "Parque", mixed: "Misturo" },
      submit: "Calibrar GUTO",
      errorRequired: "Falta calibrar isso antes de seguir.",
      statusLabel: "NÍVEL",
      statusChips: { paused: "Iniciante", returning: "Retornando", active: "Consistente", advanced: "Avançado" },
      frequencyLabel: "FREQUÊNCIA SEMANAL",
      frequencyOptions: ["1D", "2D", "3D", "4D", "5D", "6D", "7D"],
      pathologySection: "LIMITAÇÃO PATOLOGIA",
      objectiveSection: "OBJETIVO",
      objectiveChips: { fat_loss: "Emagrecer", muscle_gain: "Hipertrofia", conditioning: "Condicionamento", mobility_health: "Saúde", consistency: "Consistência" },
      countryLabel: "ONDE MORA",
      countryPlaceholder: "Ex: Brasil, Itália, EUA...",
      cityLabel: "CIDADE",
      cityPlaceholder: "Ex: São Paulo, Roma, Lisboa...",
      heightLabel: "ALTURA (cm)",
      weightLabel: "PESO (kg)",
      restrictionsLabel: "RESTRIÇÕES / ALERGIAS",
      restrictionsPlaceholder: "Ex: nenhuma, sem lactose, vegetariano...",
      intolerancesLabel: "INTOLERÂNCIAS ALIMENTARES",
      intolerancesPlaceholder: "Ex: lactose, glúten, frutos do mar...",
      physicalDataSection: "DADOS FÍSICOS",
    },
    diet: {
      tab: "DIETA",
      title: "DIETA DA SEMANA",
      subtitle: "Plano base. Adapta pelo chat.",
      generateButton: "GERAR MINHA DIETA",
      regenerateButton: "REGENERAR DIETA",
      generatingLabel: "GUTO calculando...",
      dailyGoalTitle: "META DIÁRIA",
      kcalLabel: "kcal",
      proteinLabel: "Proteína",
      carbsLabel: "Carbo",
      fatLabel: "Gordura",
      objectiveLabel: "Objetivo",
      mealDoubtButton: "DÚVIDA SOBRE ESTA REFEIÇÃO",
      emptyTitle: "Dieta ainda não gerada",
      emptyBody: "Complete seu perfil com altura, peso e país para o GUTO montar seu plano.",
      lastUpdated: "Atualizado em",
      goalNames: {
        fat_loss: "Emagrecer",
        muscle_gain: "Hipertrofia",
        conditioning: "Condicionamento",
        mobility_health: "Saúde",
        consistency: "Consistência",
      },
    },
    arena: {
      tab: "ARENA",
      subtitle: "Aqui o GUTO não evolui escondido.",
      week: "SEMANA",
      month: "MÊS",
      individual: "INDIVIDUAL",
      weeklyHeadline: "Todo mundo tem chance de virar o jogo.",
      monthlyHeadline: "Consistência vence empolgação.",
      individualHeadline: "Essa é a evolução real do seu GUTO.",
      workoutsValidated: "treinos validados",
      xp: "XP",
      restartsMonday: "Reinicia segunda-feira",
      restartsNextMonth: "Reinicia no próximo mês",
      nextEvolution: "Próxima evolução",
      xpMissing: "XP restantes",
      emptyState: "Nenhum treino validado ainda neste período.",
      xpEarned: "+100 XP na Arena",
      leveledUp: "Seu GUTO evoluiu!",
      pairWithGuto: "DUPLA COM GUTO",
    },
  },
  "it-IT": {
    complete: "Completato.",
    initialMessage: "Siamo pronti. Niente distrazioni.",
    placeholder: "Parla con Guto..",
    evoTitle: "EVOLUZIONI DI GUTO",
    evoSubtitle: "Ogni evoluzione riflette il tuo impegno.",
    unlocked: "SBLOCCATO",
    locked: "BLOCCATO",
    level: "LIVELLO",
    totalXp: "XP TOTALE",
    nextEvolution: "PROSSIMA EVOLUZIONE",
    evoAuto1: "L'evoluzione non è automatica.",
    evoAuto2: "Si costruisce ogni giorno.",
    evoQuote: "Sei già più forte di ieri. Il meglio deve ancora venire.",
    evoStages: {
      baby: "BABY",
      teen: "TEEN",
      adult: "ADULTO",
      elite: "Elite"
    },
    missionTitle: "MISSIONE",
    objectivesTitle: "Obiettivi",
    restLabel: "recupero",
    setsLabel: "serie",
    repsLabel: "ripetizioni",
    workoutDate: "24 Aprile, Mercoledì",
    workoutFocus: "Petto e tricipiti",
    exercises: [
      { name: "Panca piana", rest: "1:30min" },
      { name: "Panca inclinata con manubri", rest: "1:30min" },
      { name: "Croci ai cavi", rest: "1:15min" },
      { name: "Chest press macchina", rest: "1:30min" },
      { name: "Dip assistite", rest: "1:30min" },
      { name: "Pushdown con corda", rest: "1:00min" },
      { name: "French press al cavo", rest: "1:15min" },
      { name: "Push-up presa stretta", rest: "1:00min" },
    ],
    workoutObjectives: [
      "Esecuzione controllata. Nessuna fretta.",
      "Tempo giusto = muscolo giusto."
    ],
    pathTitle: "PERCORSO",
    pathSubtitle: "Il percorso mostra esecuzione, assenza e conseguenza.",
    pathMonth: "APRILE 2024",
    pathDayLabel: "Mercoledì, Petto e tricipiti",
    pathWorkoutDone: "Allenamento completato:",
    pathWorkoutName: "Petto e tricipiti",
    pathXpYesterday: "0 XP oggi",
    pathStreak: "+3 giorni di fila",
    pathObservation: "+1 nota da Guto",
    pathXpReward: "+100 XP",
    pathQuote: "Sei già più forte di ieri. Il meglio deve ancora venire.",
    calibration: {
      title: "Calibrazione iniziale",
      subtitle: "Prima di spingerti, devo capire il tuo corpo.",
      ageLabel: "Età",
      sexLabel: "Sesso biologico",
      sexOptions: { female: "Femminile", male: "Maschile" },
      levelLabel: "Livello attuale di allenamento",
      levelOptions: { beginner: "Inizio", returning: "Rientro", consistent: "Tengo il ritmo", advanced: "Avanzato" },
      pathologyLabel: "Dolore, limite o patologia",
      pathologyOptions: { none: "Nessun dolore", knee: "Ginocchio", lower_back: "Lombare", shoulder: "Spalla", other: "Altro" },
      pathologyPlaceholder: "Dettagli sulla limitazione...",
      confirm: "Conferma",
      goalLabel: "Obiettivo principale",
      goalOptions: { consistency: "Costanza", fat_loss: "Perdere grasso", muscle_gain: "Aumentare massa", conditioning: "Condizionamento", mobility_health: "Mobilità e salute" },
      locationLabel: "Luogo predefinito di allenamento",
      locationOptions: { gym: "Palestra", home: "Casa", park: "Parco", mixed: "Misto" },
      submit: "Calibra GUTO",
      errorRequired: "Calibra questo prima di continuare.",
      statusLabel: "LIVELLO",
      statusChips: { paused: "Principiante", returning: "Rientro", active: "Costante", advanced: "Avanzato" },
      frequencyLabel: "FREQUENZA SETTIMANALE",
      frequencyOptions: ["1G", "2G", "3G", "4G", "5G", "6G", "7G"],
      pathologySection: "DOLORE E LIMITI",
      objectiveSection: "OBIETTIVO",
      objectiveChips: { fat_loss: "Dimagrire", muscle_gain: "Ipertrofia", conditioning: "Condizionamento", mobility_health: "Salute", consistency: "Costanza" },
      countryLabel: "DOVE ABITI",
      countryPlaceholder: "Es: Italia, Brasile, USA...",
      cityLabel: "CITTÀ",
      cityPlaceholder: "Es: Roma, Milano, Lisbona...",
      heightLabel: "ALTEZZA (cm)",
      weightLabel: "PESO (kg)",
      restrictionsLabel: "RESTRIZIONI / ALLERGIE",
      restrictionsPlaceholder: "Es: nessuna, senza lattosio, vegetariano...",
      intolerancesLabel: "INTOLLERANZE ALIMENTARI",
      intolerancesPlaceholder: "Es: lattosio, glutine, frutti di mare...",
      physicalDataSection: "DATI FISICI",
    },
    diet: {
      tab: "DIETA",
      title: "DIETA DELLA SETTIMANA",
      subtitle: "Piano base. Adatta via chat.",
      generateButton: "CREA LA MIA DIETA",
      regenerateButton: "RIGENERA DIETA",
      generatingLabel: "GUTO sta calcolando...",
      dailyGoalTitle: "OBIETTIVO GIORNALIERO",
      kcalLabel: "kcal",
      proteinLabel: "Proteine",
      carbsLabel: "Carboidrati",
      fatLabel: "Grassi",
      objectiveLabel: "Obiettivo",
      mealDoubtButton: "DUBBIO SU QUESTO PASTO",
      emptyTitle: "Dieta non ancora creata",
      emptyBody: "Completa il profilo con altezza, peso e paese per far creare la dieta a GUTO.",
      lastUpdated: "Aggiornato il",
      goalNames: {
        fat_loss: "Dimagrire",
        muscle_gain: "Ipertrofia",
        conditioning: "Condizionamento",
        mobility_health: "Salute",
        consistency: "Costanza",
      },
    },
    arena: {
      tab: "ARENA",
      subtitle: "Il tuo GUTO non evolve di nascosto.",
      week: "SETTIMANA",
      month: "MESE",
      individual: "INDIVIDUALE",
      weeklyHeadline: "Ogni settimana puoi ribaltare il gioco.",
      monthlyHeadline: "La costanza batte la motivazione.",
      individualHeadline: "Questa è la vera evoluzione del tuo GUTO.",
      workoutsValidated: "allenamenti convalidati",
      xp: "XP",
      restartsMonday: "Riparte lunedì",
      restartsNextMonth: "Riparte il prossimo mese",
      nextEvolution: "Prossima evoluzione",
      xpMissing: "XP rimanenti",
      emptyState: "Nessun allenamento convalidato in questo periodo.",
      xpEarned: "+100 XP nell'Arena",
      leveledUp: "Il tuo GUTO si è evoluto!",
      pairWithGuto: "COPPIA CON GUTO",
    },
  },
  "en-US": {
    complete: "Completed.",
    initialMessage: "We are ready. No distractions.",
    placeholder: "Talk to Guto..",
    evoTitle: "GUTO EVOLUTIONS",
    evoSubtitle: "Every evolution reflects your effort.",
    unlocked: "UNLOCKED",
    locked: "LOCKED",
    level: "LEVEL",
    totalXp: "TOTAL XP",
    nextEvolution: "NEXT EVOLUTION",
    evoAuto1: "Evolution is not automatic.",
    evoAuto2: "It is built every day.",
    evoQuote: "You are already stronger than yesterday. The best is yet to come.",
    evoStages: {
      baby: "BABY",
      teen: "TEEN",
      adult: "ADULT",
      elite: "Elite"
    },
    missionTitle: "MISSION",
    objectivesTitle: "Objectives",
    restLabel: "Rest",
    setsLabel: "Sets",
    repsLabel: "Reps",
    workoutDate: "April 24, Wednesday",
    workoutFocus: "Chest and triceps",
    exercises: [
      { name: "Bench Press", rest: "1:30min" },
      { name: "Incline Dumbbell Press", rest: "1:30min" },
      { name: "Cable Fly", rest: "1:15min" },
      { name: "Machine Chest Press", rest: "1:30min" },
      { name: "Assisted Dips", rest: "1:30min" },
      { name: "Triceps Rope Pushdown", rest: "1:00min" },
      { name: "Overhead Cable Triceps", rest: "1:15min" },
      { name: "Close-Grip Push-Up", rest: "1:00min" },
    ],
    workoutObjectives: [
      "Controlled execution. No rushing.",
      "Right timing = right muscle."
    ],
    pathTitle: "JOURNEY",
    pathSubtitle: "The path shows execution, absence, and consequence.",
    pathMonth: "APRIL 2024",
    pathDayLabel: "Wednesday, Chest and triceps",
    pathWorkoutDone: "Workout completed:",
    pathWorkoutName: "Chest and triceps",
    pathXpYesterday: "0 XP today",
    pathStreak: "+3 days in a row",
    pathObservation: "+1 note from Guto",
    pathXpReward: "+100 XP",
    pathQuote: "You are already stronger than yesterday. The best is yet to come.",
    calibration: {
      title: "Initial calibration",
      subtitle: "Before I push you, I need to read your body.",
      ageLabel: "Age",
      sexLabel: "Biological sex",
      sexOptions: { female: "Female", male: "Male" },
      levelLabel: "Current training level",
      levelOptions: { beginner: "Starting", returning: "Returning", consistent: "Keeping rhythm", advanced: "Advanced" },
      pathologyLabel: "Pain, limitation or condition",
      pathologyOptions: { none: "No pain", knee: "Knee", lower_back: "Lower back", shoulder: "Shoulder", other: "Other" },
      pathologyPlaceholder: "Detail your limitation...",
      confirm: "Confirm",
      goalLabel: "Main goal",
      goalOptions: { consistency: "Consistency", fat_loss: "Fat loss", muscle_gain: "Muscle gain", conditioning: "Conditioning", mobility_health: "Mobility and health" },
      locationLabel: "Standard training location",
      locationOptions: { gym: "Gym", home: "Home", park: "Park", mixed: "Mixed" },
      submit: "Calibrate GUTO",
      errorRequired: "Calibrate this before moving on.",
      statusLabel: "LEVEL",
      statusChips: { paused: "Beginner", returning: "Returning", active: "Consistent", advanced: "Advanced" },
      frequencyLabel: "WEEKLY FREQUENCY",
      frequencyOptions: ["1D", "2D", "3D", "4D", "5D", "6D", "7D"],
      pathologySection: "PAIN & LIMITATIONS",
      objectiveSection: "GOAL",
      objectiveChips: { fat_loss: "Lose Fat", muscle_gain: "Hypertrophy", conditioning: "Conditioning", mobility_health: "Health", consistency: "Consistency" },
      countryLabel: "WHERE YOU LIVE",
      countryPlaceholder: "E.g.: USA, Brazil, Italy...",
      cityLabel: "CITY",
      cityPlaceholder: "E.g.: New York, Lisbon, Rome...",
      heightLabel: "HEIGHT (cm)",
      weightLabel: "WEIGHT (kg)",
      restrictionsLabel: "RESTRICTIONS / ALLERGIES",
      restrictionsPlaceholder: "E.g.: none, dairy-free, vegetarian...",
      intolerancesLabel: "FOOD INTOLERANCES",
      intolerancesPlaceholder: "E.g.: lactose, gluten, shellfish...",
      physicalDataSection: "PHYSICAL DATA",
    },
    diet: {
      tab: "DIET",
      title: "WEEKLY DIET",
      subtitle: "Base plan. Adapt through chat.",
      generateButton: "GENERATE MY DIET",
      regenerateButton: "REGENERATE DIET",
      generatingLabel: "GUTO calculating...",
      dailyGoalTitle: "DAILY GOAL",
      kcalLabel: "kcal",
      proteinLabel: "Protein",
      carbsLabel: "Carbs",
      fatLabel: "Fat",
      objectiveLabel: "Goal",
      mealDoubtButton: "QUESTION ABOUT THIS MEAL",
      emptyTitle: "Diet not generated yet",
      emptyBody: "Complete your profile with height, weight and country so GUTO can build your plan.",
      lastUpdated: "Last updated",
      goalNames: {
        fat_loss: "Fat Loss",
        muscle_gain: "Hypertrophy",
        conditioning: "Conditioning",
        mobility_health: "Health",
        consistency: "Consistency",
      },
    },
    arena: {
      tab: "ARENA",
      subtitle: "Your GUTO does not evolve in silence.",
      week: "WEEK",
      month: "MONTH",
      individual: "INDIVIDUAL",
      weeklyHeadline: "Everyone gets a fresh chance.",
      monthlyHeadline: "Consistency beats motivation.",
      individualHeadline: "This is your GUTO's real evolution.",
      workoutsValidated: "validated workouts",
      xp: "XP",
      restartsMonday: "Restarts Monday",
      restartsNextMonth: "Restarts next month",
      nextEvolution: "Next evolution",
      xpMissing: "XP remaining",
      emptyState: "No validated workouts yet this period.",
      xpEarned: "+100 XP in Arena",
      leveledUp: "Your GUTO evolved!",
      pairWithGuto: "PAIRED WITH GUTO",
    },
  }
};
