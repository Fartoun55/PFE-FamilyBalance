const asyncHandler = require('../utils/asyncHandler');
const PDFDocument = require('pdfkit');
const AppError = require('../utils/AppError');
const User = require('../models/User');
const { validateSessionIdInput } = require('../validators/scoringValidators');
const {
  calculateAndStoreScore,
  getScoringHistory,
  getLatestScoringResult,
  findLatestCompletedSurveySession,
} = require('../services/scoringService');
const { resolveTargetUserId } = require('../services/surveyService');

const calculateFromSession = asyncHandler(async (req, res) => {
  const validation = validateSessionIdInput({ sessionId: req.params.sessionId });

  if (!validation.isValid) {
    throw new AppError(validation.errors.join(' '), 400);
  }

  const result = await calculateAndStoreScore({
    actor: req.user,
    sessionId: validation.value.sessionId,
    trigger: 'manual',
  });

  res.status(200).json({
    status: 'success',
    message: 'Scoring calculé avec succès.',
    score: result.scoreRecord,
    alert: result.alert,
  });
});

const latest = asyncHandler(async (req, res) => {
  const result = await getLatestScoringResult(req.user, req.query.childId);

  res.status(200).json({
    status: 'success',
    latestRecord: result.latestRecord,
    openAlerts: result.openAlerts,
    latestCompletedSessionId: result.latestCompletedSessionId,
  });
});

const history = asyncHandler(async (req, res) => {
  const result = await getScoringHistory(req.user, req.query.childId);

  res.status(200).json({
    status: 'success',
    records: result.records,
    periodStats: result.periodStats,
    openAlerts: result.openAlerts,
  });
});

const latestCompletedSession = asyncHandler(async (req, res) => {
  const targetUserId = await resolveTargetUserId(req.user, req.query.childId);
  const session = await findLatestCompletedSurveySession(targetUserId);

  res.status(200).json({
    status: 'success',
    session,
  });
});

const exportLatestReportPdf = asyncHandler(async (req, res) => {
  const result = await getLatestScoringResult(req.user, req.query.childId);

  if (!result.latestRecord) {
    throw new AppError('Aucun score disponible pour générer le rapport.', 404);
  }

  const historyData = await getScoringHistory(req.user, req.query.childId);
  const latest = result.latestRecord;

  const reportSubject = req.query.childId ? await User.findById(latest.user) : req.user;

  const document = new PDFDocument({ margin: 40, size: 'A4' });

  const fileName = `score-report-${String(latest.user)}-${Date.now()}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  document.pipe(res);

  document.fontSize(20).text('FamilyBalance - Rapport de scoring', { underline: true });
  document.moveDown(0.5);
  document.fontSize(11).text(`Date: ${new Date().toLocaleDateString('fr-FR')}`);
  document.text(`Utilisateur: ${reportSubject?.firstName || ''} ${reportSubject?.lastName || ''}`.trim());
  document.text(`Tranche d'age: ${latest.ageSegment}`);
  document.moveDown(0.3);
  document.fontSize(12).text('Pondérations dynamiques appliquées :');
  document.fontSize(11).list([
    `Comportemental : ${(latest.weights.comportemental * 100).toFixed(0)}%`,
    `Emotionnel : ${(latest.weights.emotionnel * 100).toFixed(0)}%`,
    `Social : ${(latest.weights.social * 100).toFixed(0)}%`,
    `Parental : ${(latest.weights.parental * 100).toFixed(0)}%`,
  ]);
  document.moveDown(0.8);

  const formatRiskCategoryLabel = (category, riskLevel) => {
    if (category === 'risque-eleve') return 'Risque élevé';
    if (category === 'risque-modere') return 'Risque modéré';
    if (category === 'vigilance-legere') return 'Vigilance légère';
    if (category === 'equilibre-sain') return 'Équilibre sain';
    if (riskLevel === 'red') return 'Risque élevé';
    if (riskLevel === 'orange') return 'Risque modéré';
    if (riskLevel === 'green') return 'Équilibre sain';
    return 'Non évalué';
  };

  document.fontSize(14).text('Resultat global');
  document.fontSize(12).text(`Score global: ${latest.globalScore.toFixed(1)} / 100`);
  document.text(`Catégorie de risque: ${formatRiskCategoryLabel(latest.riskCategory, latest.riskLevel)}`);
  document.moveDown(0.6);

  document.fontSize(14).text('Sous-scores');
  document.fontSize(12).text(`Comportemental: ${latest.subScores.comportemental.toFixed(1)}`);
  document.text(`Emotionnel: ${latest.subScores.emotionnel.toFixed(1)}`);
  document.text(`Social: ${latest.subScores.social.toFixed(1)}`);
  document.text(`Parental: ${latest.subScores.parental.toFixed(1)}`);
  document.moveDown(0.6);

  document.fontSize(14).text('Recommandations personnalisees');
  latest.recommendations.forEach((item, index) => {
    document.fontSize(11).text(`${index + 1}. ${item}`);
  });
  document.moveDown(0.8);

  document.fontSize(14).text('Suivi longitudinal');
  historyData.periodStats.forEach((period) => {
    document
      .fontSize(11)
      .text(
        `${period.months} mois - moyenne: ${
          period.averageGlobalScore !== null ? period.averageGlobalScore.toFixed(1) : '-'
        }, dernier: ${period.latestGlobalScore !== null ? period.latestGlobalScore.toFixed(1) : '-'}, ` +
          `vert: ${period.riskDistribution.green}, orange: ${period.riskDistribution.orange}, rouge: ${period.riskDistribution.red}`
      );
  });

  if (result.openAlerts.length) {
    document.moveDown(0.8);
    document.fontSize(14).text('Alertes automatiques ouvertes');
    result.openAlerts.forEach((alert, index) => {
      document.fontSize(11).text(`${index + 1}. ${alert.message}`);
    });
  }

  document.end();
});

module.exports = {
  calculateFromSession,
  latest,
  history,
  latestCompletedSession,
  exportLatestReportPdf,
};