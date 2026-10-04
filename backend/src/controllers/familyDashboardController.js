const asyncHandler = require('../utils/asyncHandler');
const PDFDocument = require('pdfkit');
const {
  getFamilyDashboardOverview,
  getChildDashboardForParent,
} = require('../services/familyDashboardService');

const overview = asyncHandler(async (req, res) => {
  const data = await getFamilyDashboardOverview(req.user._id);

  res.status(200).json({
    status: 'success',
    ...data,
  });
});

const childDetails = asyncHandler(async (req, res) => {
  const data = await getChildDashboardForParent(req.user._id, req.params.childId);

  res.status(200).json({
    status: 'success',
    ...data,
  });
});

const exportChildPdf = asyncHandler(async (req, res) => {
  const data = await getChildDashboardForParent(req.user._id, req.params.childId);

  const child = data.child;
  const latest = data.latestRecord;

  const document = new PDFDocument({ margin: 40, size: 'A4' });
  const safeName = `${child.firstName || 'enfant'}-${child.lastName || ''}`
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
  const fileName = `bilan-complet-${safeName || 'enfant'}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  document.pipe(res);

  document.fontSize(20).text('FamilyBalance - Bilan complet enfant', { underline: true });
  document.moveDown(0.7);

  document.fontSize(12).text(`Nom: ${child.firstName} ${child.lastName}`);
  document.text(`Email: ${child.email}`);
  document.text(`Téléphone: ${child.phone || '-'}`);
  document.text(
    `Date de naissance: ${child.birthDate ? new Date(child.birthDate).toLocaleDateString('fr-FR') : '-'}`
  );
  document.text(`Consentement: ${child.consentGiven ? 'Oui' : 'Non'}`);
  document.moveDown(0.8);

  document.fontSize(14).text('Rappels de réévaluation');
  document.fontSize(11).text(`Fréquence: tous les ${data.reminders.frequencyMonths} mois`);
  document.text(`Prochaine date: ${new Date(data.reminders.nextReevaluationDate).toLocaleDateString('fr-FR')}`);
  document.text(`Rappel en attente: ${data.reminders.due ? 'Oui' : 'Non'}`);
  document.moveDown(0.8);

  if (latest) {
    document.fontSize(14).text('Dernier score');
    document.fontSize(11).text(`Date: ${new Date(latest.calculatedAt).toLocaleDateString('fr-FR')}`);
    document.text(`Score global: ${latest.globalScore.toFixed(1)} / 100`);
    document.text(`Risque: ${latest.riskLevel.toUpperCase()}`);
    document.text(`Comportemental: ${latest.subScores.comportemental.toFixed(1)}`);
    document.text(`Emotionnel: ${latest.subScores.emotionnel.toFixed(1)}`);
    document.text(`Social: ${latest.subScores.social.toFixed(1)}`);
    document.text(`Parental: ${latest.subScores.parental.toFixed(1)}`);
    document.moveDown(0.5);

    document.fontSize(12).text('Recommandations');
    (latest.recommendations || []).forEach((item, index) => {
      document.fontSize(10).text(`${index + 1}. ${item}`);
    });
    document.moveDown(0.7);
  } else {
    document.fontSize(12).text('Aucun score disponible pour cet enfant.');
    document.moveDown(0.7);
  }

  document.fontSize(14).text('Historique des scores');
  if (!data.history.length) {
    document.fontSize(10).text('Aucun historique disponible.');
  } else {
    data.history.forEach((point, index) => {
      const dateLabel = new Date(point.calculatedAt).toLocaleDateString('fr-FR');
      document
        .fontSize(10)
        .text(
          `${index + 1}. ${dateLabel} - Global ${point.globalScore.toFixed(1)} - ` +
            `Comp ${point.subScores.comportemental.toFixed(1)} / Emo ${point.subScores.emotionnel.toFixed(1)} / ` +
            `Soc ${point.subScores.social.toFixed(1)} / Par ${point.subScores.parental.toFixed(1)} - Risque ${point.riskLevel}`
        );
    });
  }

  if (data.openAlerts.length) {
    document.moveDown(0.8);
    document.fontSize(14).text('Alertes ouvertes');
    data.openAlerts.forEach((alert, index) => {
      document.fontSize(10).text(`${index + 1}. ${alert.message}`);
    });
  }

  document.end();
});

module.exports = {
  overview,
  childDetails,
  exportChildPdf,
};
