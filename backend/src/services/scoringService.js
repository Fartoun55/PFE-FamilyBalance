const AppError = require('../utils/AppError');
const SurveySession = require('../models/SurveySession');
const ScoreRecord = require('../models/ScoreRecord');
const RiskAlert = require('../models/RiskAlert');
const { getSessionForActor, resolveTargetUserId } = require('./surveyService');
const { notifyScoreStored } = require('./notificationService');

const DYNAMIC_WEIGHTS = {
  '3-6': { comportemental: 0.2, emotionnel: 0.25, social: 0.15, parental: 0.4 },
  '7-11': { comportemental: 0.25, emotionnel: 0.25, social: 0.2, parental: 0.3 },
  '12-15': { comportemental: 0.25, emotionnel: 0.3, social: 0.3, parental: 0.15 },
  '16-18': { comportemental: 0.25, emotionnel: 0.35, social: 0.3, parental: 0.1 },
};

const DIMENSIONS = ['comportemental', 'emotionnel', 'social', 'parental'];

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const normalizeLikert = (answer) => {
  const numeric = Number(answer);
  if (!Number.isFinite(numeric)) return 50;
  return clamp(((numeric - 1) / 4) * 100);
};

const normalizeSingleChoice = (answer) => {
  const value = String(answer || '').toLowerCase();
  const map = {
    great: 95,
    good: 80,
    okay: 60,
    sad: 25,
    yes: 80,
    no: 30,
  };

  if (map[value] !== undefined) {
    return map[value];
  }

  return 55;
};

const normalizeText = (answer) => {
  const text = String(answer || '').toLowerCase();

  if (!text.trim()) {
    return 45;
  }

  const positiveKeywords = ['bien', 'calme', 'heureux', 'serein', 'motivé', 'content', 'ok'];
  const negativeKeywords = ['stress', 'anx', 'triste', 'colere', 'peur', 'fatigue', 'difficile', 'seul'];

  const positiveMatches = positiveKeywords.filter((word) => text.includes(word)).length;
  const negativeMatches = negativeKeywords.filter((word) => text.includes(word)).length;

  const raw = 55 + positiveMatches * 8 - negativeMatches * 10;
  return clamp(raw);
};

const normalizeAnswer = (type, answer) => {
  if (type === 'likert') {
    return normalizeLikert(answer);
  }

  if (type === 'single-choice') {
    return normalizeSingleChoice(answer);
  }

  return normalizeText(answer);
};

const getContributionMap = (domain) => {
  const mapping = {
    screen_time: { comportemental: 0.45, emotionnel: 0.25, social: 0.15, parental: 0.15 },
    comportements: { comportemental: 0.6, emotionnel: 0.15, social: 0.1, parental: 0.15 },
    emotions: { emotionnel: 0.6, comportemental: 0.15, social: 0.1, parental: 0.15 },
    social: { social: 0.5, emotionnel: 0.25, comportemental: 0.1, parental: 0.15 },
  };

  return mapping[domain] || { comportemental: 0.25, emotionnel: 0.25, social: 0.25, parental: 0.25 };
};

const calculateSubScores = (answers = []) => {
  const totals = {
    comportemental: { score: 0, weight: 0 },
    emotionnel: { score: 0, weight: 0 },
    social: { score: 0, weight: 0 },
    parental: { score: 0, weight: 0 },
  };

  answers
    .filter((item) => !item.draft)
    .forEach((item) => {
      const answerScore = normalizeAnswer(item.type, item.answer);
      const contributions = getContributionMap(item.domain);

      DIMENSIONS.forEach((dimension) => {
        const dimensionWeight = contributions[dimension] || 0;
        if (dimensionWeight <= 0) return;

        totals[dimension].score += answerScore * dimensionWeight;
        totals[dimension].weight += dimensionWeight;
      });
    });

  return {
    comportemental:
      totals.comportemental.weight > 0
        ? clamp(totals.comportemental.score / totals.comportemental.weight)
        : 50,
    emotionnel:
      totals.emotionnel.weight > 0 ? clamp(totals.emotionnel.score / totals.emotionnel.weight) : 50,
    social: totals.social.weight > 0 ? clamp(totals.social.score / totals.social.weight) : 50,
    parental: totals.parental.weight > 0 ? clamp(totals.parental.score / totals.parental.weight) : 50,
  };
};

// Seuils de classification du risque, alignés sur le cahier des charges FamilyBalance.
// Point d'entrée unique et explicite pour ajuster les bornes : modifier une valeur ici suffit à
// reclassifier tous les scores, sans dupliquer la logique ailleurs. Testés par ordre décroissant
// de "min" ; le premier seuil dont le score global est >= s'applique.
const RISK_THRESHOLDS = [
  { min: 75, level: 'green', category: 'equilibre-sain' },
  { min: 50, level: 'orange', category: 'vigilance-legere' },
  { min: 25, level: 'orange', category: 'risque-modere' },
  { min: 0, level: 'red', category: 'risque-eleve' },
];

const resolveRiskThreshold = (globalScore) =>
  RISK_THRESHOLDS.find((threshold) => globalScore >= threshold.min) || RISK_THRESHOLDS[RISK_THRESHOLDS.length - 1];

const calculateRiskLevel = (globalScore) => resolveRiskThreshold(globalScore).level;

const calculateRiskCategory = (globalScore) => resolveRiskThreshold(globalScore).category;

const buildRecommendations = ({ subScores, riskLevel, ageSegment }) => {
  const ordered = Object.entries(subScores).sort((a, b) => a[1] - b[1]);
  const recommendations = [];

  const dimensionMessage = {
    comportemental:
      'Mettre en place une routine stable (sommeil, activité physique légère, temps de pause).',
    emotionnel:
      'Prévoir des moments quotidiens d\'expression émotionnelle et des exercices de respiration.',
    social: 'Renforcer les interactions positives avec les pairs et les adultes de confiance.',
    parental: 'Accompagner la communication parent-enfant avec un suivi régulier et bienveillant.',
  };

  const riskMessage = {
    red: 'Risque élevé : déclencher un plan d\'action prioritaire et organiser un suivi rapproché.',
    orange: 'Risque modéré : mettre en place des actions ciblées et revoir le suivi dans 4 à 6 semaines.',
    green: 'Équilibre sain : maintenir les bonnes pratiques et poursuivre le suivi régulier.',
  };

  const resourceMessage = {
    red: 'Accéder à des ressources éducatives ciblées pour soutenir l\'enfant et la famille.',
    orange: 'Consulter des ressources éducatives adaptées aux besoins identifiés.',
    green: 'Poursuivre les ressources préventives pour conserver l\'équilibre.',
  };

  const specialistMessage = {
    red: 'Prise de rendez-vous avec un spécialiste recommandée pour approfondir le suivi.',
    orange: 'Envisager une consultation spécialisée si les difficultés persistent.',
    green: 'Aucun rendez-vous urgent nécessaire, mais garder le contact avec les professionnels si besoin.',
  };

  ordered.slice(0, 2).forEach(([dimension]) => {
    recommendations.push(dimensionMessage[dimension]);
  });

  recommendations.push(riskMessage[riskLevel] || 'Recommandations personnalisées basées sur le niveau de risque.');
  recommendations.push(resourceMessage[riskLevel] || 'Explorer des ressources éducatives adaptées.');
  recommendations.push(specialistMessage[riskLevel] || 'Suivre le plan d\'action recommandé par l\'application.');
  recommendations.push(`Pondération dynamique appliquée pour la tranche d'âge ${ageSegment}.`);

  return recommendations.slice(0, 6);
};

const calculateGlobalScore = ({ subScores, ageSegment }) => {
  const weights = DYNAMIC_WEIGHTS[ageSegment] || DYNAMIC_WEIGHTS['12-15'];

  const globalScore = clamp(
    subScores.comportemental * weights.comportemental +
      subScores.emotionnel * weights.emotionnel +
      subScores.social * weights.social +
      subScores.parental * weights.parental
  );

  return { globalScore, weights };
};

const findLatestCompletedSurveySession = async (userId) => {
  return SurveySession.findOne({ user: userId, status: 'completed' }).sort({ completedAt: -1, updatedAt: -1 });
};

const createOrUpdateRiskAlert = async ({ userId, scoreRecord, riskLevel, riskCategory }) => {
  if (riskLevel !== 'red') {
    // Le risque n'est plus élevé : on résout toute alerte encore ouverte plutôt que de la laisser trainer.
    await RiskAlert.updateMany(
      { user: userId, status: 'open' },
      { $set: { status: 'resolved', resolvedAt: new Date() } }
    );
    return null;
  }

  const alert = await RiskAlert.findOneAndUpdate(
    { user: userId, status: 'open' },
    {
      $set: {
        user: userId,
        scoreRecord: scoreRecord._id,
        level: 'red',
        riskCategory,
        status: 'open',
        message:
          'Profil à risque élevé détecté (zone rouge). Une évaluation approfondie et un suivi prioritaire sont recommandés.',
      },
    },
    { upsert: true, new: true }
  );

  return alert;
};

const calculateAndStoreScore = async ({ actor, sessionId, trigger = 'manual' }) => {
  const session = await getSessionForActor(sessionId, actor);

  if (!session) {
    throw new AppError('Session survey introuvable.', 404);
  }

  if (session.status !== 'completed') {
    throw new AppError('Le scoring nécessite une session survey complétée.', 400);
  }

  // Le score appartient toujours au propriétaire réel de la session (l'enfant),
  // pas à l'acteur qui déclenche le calcul (qui peut être le parent).
  const ownerId = session.user;

  const subScores = calculateSubScores(session.answers);
  const { globalScore, weights } = calculateGlobalScore({ subScores, ageSegment: session.ageSegment });
  const riskLevel = calculateRiskLevel(globalScore);
  const riskCategory = calculateRiskCategory(globalScore);
  const recommendations = buildRecommendations({ subScores, riskLevel, ageSegment: session.ageSegment });

  const scoreRecord = await ScoreRecord.findOneAndUpdate(
    { sourceSession: session._id },
    {
      $set: {
        user: ownerId,
        sourceSession: session._id,
        age: session.age,
        ageSegment: session.ageSegment,
        subScores,
        weights,
        globalScore,
        riskLevel,
        riskCategory,
        recommendations,
        answerCount: session.answers.filter((item) => !item.draft).length,
        trigger,
        calculatedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  const alert = await createOrUpdateRiskAlert({ userId: ownerId, scoreRecord, riskLevel, riskCategory });

  // Un nouveau calcul sur la même session réutilise le même ScoreRecord : la clé de
  // déduplication des notifications empêche alors toute double notification.
  notifyScoreStored({ scoreRecord, alert, actor });

  return {
    scoreRecord,
    alert,
  };
};

const average = (values) => {
  if (!values.length) return null;
  return Math.round((values.reduce((sum, item) => sum + item, 0) / values.length) * 100) / 100;
};

const buildPeriodStats = (records = [], now = new Date()) => {
  const monthWindows = [3, 6, 12];

  return monthWindows.map((months) => {
    const threshold = new Date(now);
    threshold.setMonth(threshold.getMonth() - months);

    const periodRecords = records.filter((record) => new Date(record.calculatedAt) >= threshold);

    return {
      months,
      count: periodRecords.length,
      averageGlobalScore: average(periodRecords.map((record) => record.globalScore)),
      latestGlobalScore: periodRecords[0]?.globalScore ?? null,
      riskDistribution: {
        green: periodRecords.filter((record) => record.riskLevel === 'green').length,
        orange: periodRecords.filter((record) => record.riskLevel === 'orange').length,
        red: periodRecords.filter((record) => record.riskLevel === 'red').length,
      },
    };
  });
};

const getScoringHistory = async (actor, childId) => {
  const userId = await resolveTargetUserId(actor, childId);
  const records = await ScoreRecord.find({ user: userId }).sort({ calculatedAt: -1 });
  const periodStats = buildPeriodStats(records);
  const openAlerts = await RiskAlert.find({ user: userId, status: 'open' }).sort({ createdAt: -1 });

  return {
    records,
    periodStats,
    openAlerts,
  };
};

const getLatestScoringResult = async (actor, childId) => {
  const userId = await resolveTargetUserId(actor, childId);
  const latestRecord = await ScoreRecord.findOne({ user: userId }).sort({ calculatedAt: -1 });
  const openAlerts = await RiskAlert.find({ user: userId, status: 'open' }).sort({ createdAt: -1 });
  const latestCompletedSession = await findLatestCompletedSurveySession(userId);

  return {
    latestRecord,
    openAlerts,
    latestCompletedSessionId: latestCompletedSession?._id || null,
  };
};

module.exports = {
  calculateAndStoreScore,
  getScoringHistory,
  getLatestScoringResult,
  findLatestCompletedSurveySession,
};