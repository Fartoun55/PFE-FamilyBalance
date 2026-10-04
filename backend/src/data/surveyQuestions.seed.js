const domainMeta = {
  screen_time: 'Temps d\'écran',
  comportements: 'Comportements',
  emotions: 'Émotions',
  social: 'Social',
};

const singleChoice = (config) => ({
  type: 'single-choice',
  options: config.options,
  ...config,
});

const likert = (config) => ({
  type: 'likert',
  ...config,
});

const text = (config) => ({
  type: 'text',
  ...config,
});

const scaleOptions = [
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
  { label: '4', value: '4' },
  { label: '5', value: '5' },
];

const yesNoOptions = [
  { label: 'Oui', value: 'yes' },
  { label: 'Non', value: 'no' },
];

const happyOptions = [
  { label: 'Très bien', value: 'great' },
  { label: 'Bien', value: 'good' },
  { label: 'Moyen', value: 'okay' },
  { label: 'Pas bien', value: 'sad' },
];

const buildBlock = ({
  segment,
  prefix,
  entryPrompt,
  followUpPrompt,
  behaviorPrompt,
  socialPrompt,
  screenTimePrompt,
  lowEnergyPrompt,
  supportPrompt,
  freeConclusionPrompt,
  screenType = 'single-choice',
  screenOptions = yesNoOptions,
}) => [
  singleChoice({
    code: `${prefix}_1`,
    domain: 'emotions',
    domainLabel: domainMeta.emotions,
    ageSegments: [segment],
    order: 1,
    prompt: entryPrompt,
    helpText: 'La réponse oriente les questions suivantes.',
    options: happyOptions,
    branchingRules: [{ values: ['sad'], nextCode: `${prefix}_2` }],
    defaultNextCode: `${prefix}_3`,
    isEntryPoint: true,
  }),
  text({
    code: `${prefix}_2`,
    domain: 'emotions',
    domainLabel: domainMeta.emotions,
    ageSegments: [segment],
    order: 2,
    prompt: followUpPrompt,
    helpText: 'Réponse libre sauvegardée automatiquement.',
    defaultNextCode: `${prefix}_3`,
  }),
  likert({
    code: `${prefix}_3`,
    domain: 'comportements',
    domainLabel: domainMeta.comportements,
    ageSegments: [segment],
    order: 3,
    prompt: behaviorPrompt,
    helpText: 'Choisissez une valeur de 1 à 5.',
    branchingRules: [{ maxValue: 2, nextCode: `${prefix}_6` }],
    defaultNextCode: `${prefix}_4`,
  }),
  likert({
    code: `${prefix}_4`,
    domain: 'social',
    domainLabel: domainMeta.social,
    ageSegments: [segment],
    order: 4,
    prompt: socialPrompt,
    helpText: 'Répondez selon votre expérience sociale.',
    defaultNextCode: `${prefix}_5`,
  }),
  singleChoice({
    code: `${prefix}_5`,
    domain: 'screen_time',
    domainLabel: domainMeta.screen_time,
    ageSegments: [segment],
    order: 5,
    prompt: screenTimePrompt,
    helpText: 'Cette réponse permet d\'ajuster la suite.',
    options: screenOptions,
    branchingRules: [{ values: ['no'], nextCode: `${prefix}_7` }],
    defaultNextCode: `${prefix}_8`,
  }),
  text({
    code: `${prefix}_6`,
    domain: 'comportements',
    domainLabel: domainMeta.comportements,
    ageSegments: [segment],
    order: 6,
    prompt: lowEnergyPrompt,
    helpText: 'Réponse libre pour mieux comprendre le contexte.',
    defaultNextCode: `${prefix}_5`,
  }),
  likert({
    code: `${prefix}_7`,
    domain: 'social',
    domainLabel: domainMeta.social,
    ageSegments: [segment],
    order: 7,
    prompt: supportPrompt,
    helpText: 'Évaluez votre niveau de soutien de 1 à 5.',
    defaultNextCode: `${prefix}_8`,
  }),
  (screenType === 'text'
    ? text({
        code: `${prefix}_8`,
        domain: 'screen_time',
        domainLabel: domainMeta.screen_time,
        ageSegments: [segment],
        order: 8,
        prompt: freeConclusionPrompt,
        helpText: 'Dernière question ouverte.',
      })
    : likert({
        code: `${prefix}_8`,
        domain: 'screen_time',
        domainLabel: domainMeta.screen_time,
        ageSegments: [segment],
        order: 8,
        prompt: freeConclusionPrompt,
        helpText: 'Évaluation globale de votre temps d\'écran.',
      })),
];

const surveyQuestionsSeed = [
  ...buildBlock({
    segment: '3-6',
    prefix: 'A36',
    entryPrompt: 'Comment te sens-tu aujourd\'hui ?',
    followUpPrompt: 'Qu\'est-ce qui te rend triste ou inquiet ?',
    behaviorPrompt: 'As-tu fait quelque chose de spécial aujourd\'hui ?',
    socialPrompt: 'Est-ce que tu t\'entends bien avec les autres enfants ?',
    screenTimePrompt: 'As-tu regardé des écrans aujourd\'hui ?',
    lowEnergyPrompt: 'Qu\'est-ce qui te fatigue le plus ?',
    supportPrompt: 'Est-ce que tu te sens soutenu par ta famille ?',
    freeConclusionPrompt: 'Raconte ce qui t\'a plu ou déplu cette journée.',
    screenType: 'single-choice',
  }),
  ...buildBlock({
    segment: '7-11',
    prefix: 'A711',
    entryPrompt: 'Cette semaine, je me sens plutôt bien',
    followUpPrompt: 'Qu\'est-ce qui te préoccupe le plus ?',
    behaviorPrompt: 'Je fais des activités qui me changent les idées',
    socialPrompt: 'Je parle facilement avec mes amis',
    screenTimePrompt: 'Je passe beaucoup de temps devant des écrans',
    lowEnergyPrompt: 'Qu\'est-ce qui trouble mon énergie ?',
    supportPrompt: 'Je peux compter sur quelqu\'un quand j\'en ai besoin',
    freeConclusionPrompt: 'Si tu veux, raconte un moment important de ta semaine',
    screenType: 'text',
  }),
  ...buildBlock({
    segment: '12-15',
    prefix: 'A1215',
    entryPrompt: 'Je me sens équilibré ces derniers jours',
    followUpPrompt: 'Qu\'est-ce qui influence le plus mon humeur ?',
    behaviorPrompt: 'Je réussis à rester actif et concentré',
    socialPrompt: 'J\'ai de bonnes relations avec mes proches',
    screenTimePrompt: 'Mon usage d\'écran est bien contrôlé',
    lowEnergyPrompt: 'Quels éléments perturbent mon repos ?',
    supportPrompt: 'Je reçois du soutien quand j\'en ai besoin',
    freeConclusionPrompt: 'Parle de ton équilibre entre vie sociale et temps d\'écran',
    screenType: 'single-choice',
  }),
  ...buildBlock({
    segment: '16-18',
    prefix: 'A1618',
    entryPrompt: 'Je me sens stable en ce moment',
    followUpPrompt: 'Que penses-tu de ton niveau de stress ?',
    behaviorPrompt: 'Je gère bien mes routines quotidiennes',
    socialPrompt: 'Je maintiens des relations satisfaisantes',
    screenTimePrompt: 'Je suis capable de limiter mon temps d\'écran',
    lowEnergyPrompt: 'Qu\'est-ce qui réduit ma vitalité ?',
    supportPrompt: 'Je sais vers qui me tourner quand j\'ai besoin d\'aide',
    freeConclusionPrompt: 'Comment décrirais-tu ton équilibre personnel ?',
    screenType: 'text',
  }),
];

module.exports = {
  surveyQuestionsSeed,
  domainMeta,
};