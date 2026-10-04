const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const User = require('../models/User');
const SurveySession = require('../models/SurveySession');
const ScoreRecord = require('../models/ScoreRecord');
const { getResourceLibrary } = require('../services/educationService');

const getAdolescentDashboard = async (userId) => {
  const user = await User.findById(userId);

  if (!user || user.role !== 'adolescent') {
    throw new AppError('Ce dashboard est réservé aux adolescents.', 403);
  }

  const parentId = user.adolescentProfile?.parentId;

  if (!parentId) {
    throw new AppError('Adolescent sans parent de rattachement.', 400);
  }

  const parent = await User.findById(parentId);

  if (!parent) {
    throw new AppError('Parent introuvable.', 404);
  }

  // Récupérer les sessions de survey
  const surveySessions = await SurveySession.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  // Récupérer les scores
  const scoreRecords = await ScoreRecord.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  // Obtenir le dernier score
  const latestScore = scoreRecords.length > 0 ? scoreRecords[0] : null;

  // Calculer la moyenne des scores
  const averageScore = scoreRecords.length > 0
    ? scoreRecords.reduce((sum, record) => sum + (record.globalScore || 0), 0) / scoreRecords.length
    : 0;

  // Statistiques
  const stats = {
    totalSurveys: surveySessions.length,
    lastSurveyDate: surveySessions.length > 0 ? surveySessions[0].createdAt : null,
    averageScore: Math.round(averageScore * 10) / 10,
    riskLevel: latestScore?.riskCategory || 'non-evaluée',
  };

  return {
    adolescent: user.toSafeJSON(),
    parent: {
      _id: parent._id,
      firstName: parent.firstName,
      lastName: parent.lastName,
      email: parent.email,
    },
    stats,
    latestScore,
    recentScores: scoreRecords,
    surveySessions: surveySessions.map((session) => ({
      _id: session._id,
      createdAt: session.createdAt,
      status: session.completedAt ? 'complétée' : 'en cours',
    })),
  };
};

const adolescentDashboard = asyncHandler(async (req, res) => {
  const dashboard = await getAdolescentDashboard(req.user._id);

  res.status(200).json({
    status: 'success',
    ...dashboard,
  });
});

const getAdolescentResources = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user || user.role !== 'adolescent') {
    throw new AppError('Accès réservé aux adolescents.', 403);
  }

  const birthDate = user.adolescentProfile?.birthDate;
  const age = birthDate
    ? Math.floor((new Date() - new Date(birthDate)) / (365.25 * 24 * 60 * 60 * 1000))
    : undefined;

  // Réutilise la vraie bibliothèque gérée par l'administrateur (mêmes ressources que
  // l'Espace Éducatif) plutôt qu'un jeu de données factice : ce widget affichait
  // auparavant 4 ressources codées en dur (avec un nombre de vues inventé) qui
  // n'avaient aucun lien avec les ressources réellement publiées par l'admin.
  const resources = await getResourceLibrary({ age });
  const categoryKey = typeof age === 'number' && age < 16 ? 'jeune-ado' : 'ado';

  res.status(200).json({
    status: 'success',
    age: age ?? null,
    ageGroup: categoryKey,
    resources,
  });
});

module.exports = {
  adolescentDashboard,
  getAdolescentResources,
  getAdolescentDashboard,
};
