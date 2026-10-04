const AppError = require('../utils/AppError');
const User = require('../models/User');
const SurveyQuestion = require('../models/SurveyQuestion');
const SurveySession = require('../models/SurveySession');
const { surveyQuestionsSeed, domainMeta } = require('../data/surveyQuestions.seed');

const AGE_SEGMENTS = [
  { key: '3-6', min: 3, max: 6, label: '3 - 6 ans' },
  { key: '7-11', min: 7, max: 11, label: '7 - 11 ans' },
  { key: '12-15', min: 12, max: 15, label: '12 - 15 ans' },
  { key: '16-18', min: 16, max: 18, label: '16 - 18 ans' },
];

const getAgeSegment = (age) => {
  const numericAge = Number(age);
  const segment = AGE_SEGMENTS.find((item) => numericAge >= item.min && numericAge <= item.max);

  if (!segment) {
    throw new AppError('L\'âge doit être compris entre 3 et 18 ans.', 400);
  }

  return segment;
};

const computeAgeFromBirthDate = (birthDate) =>
  Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));

// Détermine POUR QUI le questionnaire est rempli : soi-même (adolescent connecté), ou un enfant
// choisi par un parent (childId). L'âge est dérivé de la date de naissance réelle quand elle est
// disponible plutôt que d'être fait confiance depuis le client.
const resolveSurveyActor = async (actor, childId, clientAge) => {
  if (childId) {
    if (actor.role !== 'parent') {
      throw new AppError("Seul un compte parent peut démarrer le questionnaire d'un enfant.", 403);
    }

    const child = await User.findOne({
      _id: childId,
      role: 'adolescent',
      'adolescentProfile.parentId': actor._id,
    });

    if (!child) {
      throw new AppError('Enfant introuvable ou non rattaché à ce compte parent.', 404);
    }

    if (!child.adolescentProfile?.birthDate) {
      throw new AppError('Date de naissance manquante pour cet enfant.', 400);
    }

    return { targetUserId: child._id, age: computeAgeFromBirthDate(child.adolescentProfile.birthDate) };
  }

  if (actor.role === 'adolescent' && actor.adolescentProfile?.birthDate) {
    return { targetUserId: actor._id, age: computeAgeFromBirthDate(actor.adolescentProfile.birthDate) };
  }

  if (!clientAge) {
    throw new AppError("L'âge est obligatoire lorsqu'aucun enfant n'est sélectionné.", 400);
  }

  return { targetUserId: actor._id, age: clientAge };
};

// Vérifie qu'un acteur (l'utilisateur authentifié) a le droit d'agir sur une session survey donnée :
// soit c'est sa propre session, soit c'est un parent agissant pour l'un de ses enfants rattachés.
const getSessionForActor = async (sessionId, actor) => {
  const session = await SurveySession.findById(sessionId);

  if (!session) {
    return null;
  }

  if (String(session.user) === String(actor._id)) {
    return session;
  }

  if (actor.role === 'parent') {
    const child = await User.findOne({
      _id: session.user,
      role: 'adolescent',
      'adolescentProfile.parentId': actor._id,
    });

    if (child) {
      return session;
    }
  }

  return null;
};

const ensureSeeded = async () => {
  for (const question of surveyQuestionsSeed) {
    await SurveyQuestion.updateOne(
      { code: question.code },
      {
        $set: {
          ...question,
          active: true,
        },
      },
      { upsert: true }
    );
  }
};

const getQuestionsForSegmentAndDomain = async (ageSegmentKey, domain) => {
  await ensureSeeded();

  const questions = await SurveyQuestion.find({
    active: true,
    ageSegments: ageSegmentKey,
    domain,
  }).sort({ order: 1, createdAt: 1 });

  if (!questions.length) {
    throw new AppError('Aucune question disponible pour ce segment et ce domaine.', 404);
  }

  return questions;
};

const buildCatalog = async (ageSegmentKey) => {
  await ensureSeeded();

  const questions = await SurveyQuestion.find({ active: true, ageSegments: ageSegmentKey }).sort({
    order: 1,
    createdAt: 1,
  });

  const domainMap = new Map();

  for (const question of questions) {
    if (!domainMap.has(question.domain)) {
      domainMap.set(question.domain, {
        value: question.domain,
        label: question.domainLabel || domainMeta[question.domain] || question.domain,
        questionCount: 0,
      });
    }

    const domainInfo = domainMap.get(question.domain);
    domainInfo.questionCount += 1;
  }

  return {
    ageSegment: ageSegmentKey,
    domains: Array.from(domainMap.values()),
  };
};

const selectAdaptiveDomain = async ({ userId, ageSegmentKey, catalogDomains }) => {
  if (!catalogDomains.length) {
    return null;
  }

  const domainValues = catalogDomains.map((domain) => domain.value);

  const completedSessions = await SurveySession.find({
    user: userId,
    ageSegment: ageSegmentKey,
    status: 'completed',
    domain: { $in: domainValues },
  })
    .select('domain completedAt updatedAt')
    .sort({ completedAt: -1, updatedAt: -1, createdAt: -1 });

  const latestCompletionByDomain = new Map();

  for (const session of completedSessions) {
    if (!latestCompletionByDomain.has(session.domain)) {
      latestCompletionByDomain.set(session.domain, session.completedAt || session.updatedAt || session.createdAt);
    }
  }

  const neverCompleted = catalogDomains.find((domain) => !latestCompletionByDomain.has(domain.value));

  if (neverCompleted) {
    return neverCompleted.value;
  }

  const sortedByOldestCompletion = [...catalogDomains].sort((left, right) => {
    const leftDate = latestCompletionByDomain.get(left.value);
    const rightDate = latestCompletionByDomain.get(right.value);

    if (!leftDate && !rightDate) {
      return 0;
    }

    if (!leftDate) {
      return -1;
    }

    if (!rightDate) {
      return 1;
    }

    return new Date(leftDate).getTime() - new Date(rightDate).getTime();
  });

  return sortedByOldestCompletion[0]?.value || catalogDomains[0].value;
};

const resolveQuestionMap = (questions) => {
  const questionMap = new Map();

  questions.forEach((question) => questionMap.set(question.code, question));

  return questionMap;
};

const hashString = (value) => {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  return hash;
};

const buildPromptCandidates = (question) => {
  const base = (question.prompt || '').trim();

  if (!base) {
    return [''];
  }

  const variantsByType = {
    'single-choice': [
      base,
      `Choisissez l'option qui vous correspond le mieux: ${base}`,
      `Sélectionnez la réponse la plus juste pour vous: ${base}`,
    ],
    likert: [
      base,
      `Évaluez cette affirmation sur une échelle de 1 à 5: ${base}`,
      `Sur 5, à quel niveau vous situez-vous pour cette affirmation: ${base}`,
    ],
    text: [
      base,
      `Répondez librement, en quelques phrases: ${base}`,
      `Si vous le souhaitez, détaillez votre réponse: ${base}`,
    ],
  };

  const candidates = variantsByType[question.type] || [base];
  return Array.from(new Set(candidates.filter(Boolean)));
};

const withAdaptivePrompt = (question, session) => {
  if (!question) {
    return null;
  }

  const questionObject = typeof question.toObject === 'function' ? question.toObject() : { ...question };
  const candidates = buildPromptCandidates(questionObject);

  if (candidates.length <= 1) {
    return questionObject;
  }

  const seed = `${session._id}:${questionObject.code}:${session.startedAt || ''}`;
  const selectedIndex = hashString(seed) % candidates.length;

  return {
    ...questionObject,
    prompt: candidates[selectedIndex],
  };
};

const resolveBranch = (question, normalizedAnswer) => {
  if (!question.branchingRules || !question.branchingRules.length) {
    return null;
  }

  for (const rule of question.branchingRules) {
    if (question.type === 'single-choice' && Array.isArray(rule.values)) {
      if (rule.values.includes(String(normalizedAnswer))) {
        return rule.nextCode;
      }
    }

    if (question.type === 'likert') {
      const numericAnswer = Number(normalizedAnswer);

      if (Number.isNaN(numericAnswer)) {
        continue;
      }

      if (rule.minValue !== undefined && numericAnswer < rule.minValue) {
        continue;
      }

      if (rule.maxValue !== undefined && numericAnswer > rule.maxValue) {
        continue;
      }

      return rule.nextCode;
    }
  }

  return null;
};

const resolveNextQuestionCode = (question, normalizedAnswer, questionMap, questions) => {
  const branchNextCode = resolveBranch(question, normalizedAnswer);

  if (branchNextCode && questionMap.has(branchNextCode)) {
    return branchNextCode;
  }

  if (question.defaultNextCode && questionMap.has(question.defaultNextCode)) {
    return question.defaultNextCode;
  }

  const currentIndex = questions.findIndex((item) => item.code === question.code);

  if (currentIndex < 0) {
    return null;
  }

  const nextQuestion = questions[currentIndex + 1];
  return nextQuestion ? nextQuestion.code : null;
};

const normalizeAnswer = (question, rawAnswer, advance) => {
  if (question.type === 'single-choice') {
    const answer = typeof rawAnswer === 'string' ? rawAnswer.trim() : String(rawAnswer || '').trim();

    if (!answer && advance) {
      throw new AppError('Une réponse est obligatoire pour cette question.', 400);
    }

    if (!answer) {
      return '';
    }

    const optionValues = question.options.map((option) => option.value);
    if (!optionValues.includes(answer)) {
      throw new AppError('Réponse invalide pour cette question.', 400);
    }

    return answer;
  }

  if (question.type === 'likert') {
    const numericAnswer = Number(rawAnswer);

    if (!Number.isInteger(numericAnswer) || numericAnswer < 1 || numericAnswer > 5) {
      throw new AppError('La réponse Likert doit être comprise entre 1 et 5.', 400);
    }

    return numericAnswer;
  }

  const answer = typeof rawAnswer === 'string' ? rawAnswer.trim() : String(rawAnswer || '').trim();

  if (!answer && advance) {
    throw new AppError('Le texte de réponse est obligatoire.', 400);
  }

  return answer;
};

const upsertAnswer = (session, question, answer, draft) => {
  const index = session.answers.findIndex((item) => item.questionCode === question.code);
  const payload = {
    questionCode: question.code,
    questionPrompt: question.prompt,
    domain: question.domain,
    type: question.type,
    answer,
    draft,
    answeredAt: new Date(),
    updatedAt: new Date(),
  };

  if (index >= 0) {
    session.answers[index] = payload;
    return;
  }

  session.answers.push(payload);
};

const summarizeSession = (session, questions, catalog) => {
  const questionMap = resolveQuestionMap(questions);
  const rawCurrentQuestion = session.currentQuestionCode ? questionMap.get(session.currentQuestionCode) : null;
  const currentQuestion = withAdaptivePrompt(rawCurrentQuestion, session);
  const finalizedAnswers = session.answers.filter((answer) => !answer.draft).length;
  const totalQuestions = questions.length;
  const progress = totalQuestions === 0 ? 0 : Math.round((finalizedAnswers / totalQuestions) * 100);

  return {
    ageSegment: session.ageSegment,
    catalog,
    session,
    currentQuestion,
    completed: session.status === 'completed',
    progress: {
      answered: finalizedAnswers,
      total: totalQuestions,
      percent: progress,
    },
  };
};

const startOrResumeSurvey = async ({ actor, age, domain, childId }) => {
  const { targetUserId, age: resolvedAge } = await resolveSurveyActor(actor, childId, age);
  const userId = targetUserId;
  const ageSegment = getAgeSegment(resolvedAge);
  const catalog = await buildCatalog(ageSegment.key);
  const inProgressSession = domain
    ? null
    : await SurveySession.findOne({
        user: userId,
        ageSegment: ageSegment.key,
        status: 'in-progress',
      }).sort({ updatedAt: -1, createdAt: -1 });

  const adaptiveDomain = domain
    ? null
    : await selectAdaptiveDomain({
        userId,
        ageSegmentKey: ageSegment.key,
        catalogDomains: catalog.domains,
      });

  const selectedDomain = domain || inProgressSession?.domain || adaptiveDomain || catalog.domains[0]?.value;

  if (!selectedDomain) {
    throw new AppError('Aucun domaine de survey disponible pour cet âge.', 404);
  }

  const questions = await getQuestionsForSegmentAndDomain(ageSegment.key, selectedDomain);
  const questionMap = resolveQuestionMap(questions);
  const entryQuestion = questions.find((question) => question.isEntryPoint) || questions[0];

  let session =
    inProgressSession && inProgressSession.domain === selectedDomain
      ? inProgressSession
      : await SurveySession.findOne({
          user: userId,
          domain: selectedDomain,
          ageSegment: ageSegment.key,
          status: 'in-progress',
        }).sort({ updatedAt: -1, createdAt: -1 });

  if (!session) {
    try {
      session = await SurveySession.create({
        user: userId,
        domain: selectedDomain,
        domainLabel: questionMap.get(entryQuestion.code)?.domainLabel || domainMeta[selectedDomain] || selectedDomain,
        age: Number(resolvedAge),
        ageSegment: ageSegment.key,
        status: 'in-progress',
        currentQuestionCode: entryQuestion.code,
        answers: [],
        startedAt: new Date(),
        lastSavedAt: new Date(),
      });
    } catch (error) {
      // Index unique partiel {user, domain, ageSegment, status:'in-progress'} : une requête
      // concurrente (double-clic, deux onglets) a créé la session entre notre lecture et notre
      // écriture. On récupère cette session plutôt que de renvoyer une erreur à l'utilisateur.
      if (error?.code === 11000) {
        session = await SurveySession.findOne({
          user: userId,
          domain: selectedDomain,
          ageSegment: ageSegment.key,
          status: 'in-progress',
        }).sort({ updatedAt: -1, createdAt: -1 });

        if (!session) {
          throw error;
        }
      } else {
        throw error;
      }
    }
  } else if (!session.currentQuestionCode) {
    session.currentQuestionCode = entryQuestion.code;
    session.lastSavedAt = new Date();
    await session.save();
  }

  return summarizeSession(session, questions, catalog);
};

// Écrit une réponse de façon sûre même si deux requêtes concurrentes visent la même session
// (double-clic, retry réseau, deux onglets ouverts...). Le contrôle de concurrence optimiste du
// schéma (optimisticConcurrency) fait échouer le .save() d'une écriture basée sur un état périmé ;
// on relit alors la session à jour et on rejoue le calcul, au lieu de perdre silencieusement une réponse.
const MAX_SAVE_ANSWER_ATTEMPTS = 3;

const saveSurveyAnswer = async ({ sessionId, actor, answer, advance }) => {
  await ensureSeeded();

  for (let attempt = 1; attempt <= MAX_SAVE_ANSWER_ATTEMPTS; attempt += 1) {
    const session = await getSessionForActor(sessionId, actor);

    if (!session) {
      throw new AppError('Session survey introuvable.', 404);
    }

    if (session.status === 'completed') {
      throw new AppError('La session survey est déjà terminée.', 400);
    }

    const questions = await getQuestionsForSegmentAndDomain(session.ageSegment, session.domain);
    const questionMap = resolveQuestionMap(questions);
    const currentQuestion = session.currentQuestionCode ? questionMap.get(session.currentQuestionCode) : null;

    if (!currentQuestion) {
      throw new AppError('Question courante introuvable.', 404);
    }

    const effectiveQuestion = withAdaptivePrompt(currentQuestion, session);
    const normalizedAnswer = normalizeAnswer(effectiveQuestion, answer, advance);
    upsertAnswer(session, effectiveQuestion, normalizedAnswer, !advance);
    session.lastSavedAt = new Date();

    try {
      if (!advance) {
        await session.save();
        const catalog = await buildCatalog(session.ageSegment);
        return {
          ...summarizeSession(session, questions, catalog),
          draftSaved: true,
        };
      }

      const nextQuestionCode = resolveNextQuestionCode(currentQuestion, normalizedAnswer, questionMap, questions);

      if (!nextQuestionCode) {
        session.status = 'completed';
        session.completedAt = new Date();
        session.currentQuestionCode = null;
        await session.save();

        const catalog = await buildCatalog(session.ageSegment);
        return {
          ...summarizeSession(session, questions, catalog),
          completed: true,
          draftSaved: false,
        };
      }

      session.currentQuestionCode = nextQuestionCode;
      await session.save();

      const updatedQuestions = await getQuestionsForSegmentAndDomain(session.ageSegment, session.domain);
      const catalog = await buildCatalog(session.ageSegment);

      return {
        ...summarizeSession(session, updatedQuestions, catalog),
        draftSaved: false,
      };
    } catch (error) {
      const isVersionConflict = error?.name === 'VersionError';
      if (!isVersionConflict || attempt === MAX_SAVE_ANSWER_ATTEMPTS) {
        throw isVersionConflict
          ? new AppError('La session a été modifiée entre-temps. Veuillez réessayer.', 409)
          : error;
      }
      // Une autre requête a sauvegardé entre-temps : on relit l'état à jour et on rejoue au tour suivant.
    }
  }

  throw new AppError('Impossible d\'enregistrer la réponse après plusieurs tentatives.', 409);
};

const completeSurvey = async ({ sessionId, actor }) => {
  const session = await getSessionForActor(sessionId, actor);

  if (!session) {
    throw new AppError('Session survey introuvable.', 404);
  }

  session.status = 'completed';
  session.completedAt = new Date();
  session.currentQuestionCode = null;
  await session.save();

  const questions = await getQuestionsForSegmentAndDomain(session.ageSegment, session.domain);
  const catalog = await buildCatalog(session.ageSegment);

  return summarizeSession(session, questions, catalog);
};

module.exports = {
  ensureSeeded,
  getAgeSegment,
  buildCatalog,
  startOrResumeSurvey,
  saveSurveyAnswer,
  completeSurvey,
  getSessionForActor,
  resolveSurveyActor,
  resolveTargetUserId: async (actor, childId) => {
    if (!childId) {
      return actor._id;
    }

    if (actor.role !== 'parent') {
      throw new AppError("Seul un compte parent peut consulter le suivi d'un enfant.", 403);
    }

    const child = await User.findOne({
      _id: childId,
      role: 'adolescent',
      'adolescentProfile.parentId': actor._id,
    });

    if (!child) {
      throw new AppError('Enfant introuvable ou non rattaché à ce compte parent.', 404);
    }

    return child._id;
  },
};