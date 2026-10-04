const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const {
  validateSurveyCatalogInput,
  validateSurveyStartInput,
  validateSurveyAnswerInput,
} = require('../validators/surveyValidators');
const {
  buildCatalog,
  startOrResumeSurvey,
  saveSurveyAnswer,
  completeSurvey,
  getAgeSegment,
  resolveSurveyActor,
} = require('../services/surveyService');
const { calculateAndStoreScore } = require('../services/scoringService');

const catalog = asyncHandler(async (req, res) => {
  const validation = validateSurveyCatalogInput(req.query);

  if (!validation.isValid) {
    throw new AppError(validation.errors.join(' '), 400);
  }

  const { age } = await resolveSurveyActor(req.user, validation.value.childId, validation.value.age);
  const ageSegment = getAgeSegment(age);
  const result = await buildCatalog(ageSegment.key);

  res.status(200).json({
    status: 'success',
    age,
    ageSegment: result.ageSegment,
    domains: result.domains,
  });
});

const start = asyncHandler(async (req, res) => {
  const validation = validateSurveyStartInput(req.body);

  if (!validation.isValid) {
    throw new AppError(validation.errors.join(' '), 400);
  }

  const result = await startOrResumeSurvey({
    actor: req.user,
    age: validation.value.age,
    domain: validation.value.domain,
    childId: validation.value.childId,
  });

  res.status(200).json({
    status: 'success',
    message: 'Session survey prête.',
    ...result,
  });
});

const saveAnswer = asyncHandler(async (req, res) => {
  const validation = validateSurveyAnswerInput(req.body);

  if (!validation.isValid) {
    throw new AppError(validation.errors.join(' '), 400);
  }

  const result = await saveSurveyAnswer({
    sessionId: req.params.sessionId,
    actor: req.user,
    answer: validation.value.answer,
    advance: validation.value.advance,
  });

  res.status(200).json({
    status: 'success',
    message: validation.value.advance ? 'Réponse enregistrée.' : 'Brouillon enregistré.',
    ...result,
  });
});

const complete = asyncHandler(async (req, res) => {
  const result = await completeSurvey({ sessionId: req.params.sessionId, actor: req.user });
  const scoring = await calculateAndStoreScore({
    actor: req.user,
    sessionId: req.params.sessionId,
    trigger: 'auto',
  });

  res.status(200).json({
    status: 'success',
    message: 'Survey complété avec succès. Scoring calculé automatiquement.',
    ...result,
    score: scoring.scoreRecord,
    alert: scoring.alert,
  });
});

module.exports = {
  catalog,
  start,
  saveAnswer,
  complete,
};