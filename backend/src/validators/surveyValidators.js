const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const validateAge = (value) => {
  const age = Number(value);

  if (!Number.isInteger(age)) {
    return null;
  }

  if (age < 3 || age > 18) {
    return null;
  }

  return age;
};

const validateSurveyCatalogInput = (payload = {}) => {
  const errors = [];
  let age = null;

  if (payload.age !== undefined && payload.age !== null && payload.age !== '') {
    age = validateAge(payload.age);

    if (age === null) {
      errors.push('L\'âge doit être compris entre 3 et 18 ans.');
    }
  }

  const childId = normalizeString(payload.childId);

  return {
    isValid: errors.length === 0,
    errors,
    value: { age, childId: childId || undefined },
  };
};

const validateSurveyStartInput = (payload = {}) => {
  const errors = [];
  let age = null;

  // L'âge n'est obligatoire que lorsqu'il ne peut pas être dérivé côté serveur
  // (session pilotée par un parent pour un enfant, ou adolescent avec une date de naissance connue) —
  // voir resolveSurveyActor() dans surveyService.js.
  if (payload.age !== undefined && payload.age !== null && payload.age !== '') {
    age = validateAge(payload.age);

    if (age === null) {
      errors.push('L\'âge doit être compris entre 3 et 18 ans.');
    }
  }

  const domain = normalizeString(payload.domain);
  const childId = normalizeString(payload.childId);

  return {
    isValid: errors.length === 0,
    errors,
    value: { age, domain: domain || undefined, childId: childId || undefined },
  };
};

const validateSurveyAnswerInput = (payload = {}) => {
  const answer = payload.answer;
  const advance = payload.advance !== false;
  const errors = [];

  if (advance && (answer === undefined || answer === null || String(answer).trim() === '')) {
    errors.push('Une réponse est requise pour continuer.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: { answer, advance },
  };
};

module.exports = {
  validateSurveyCatalogInput,
  validateSurveyStartInput,
  validateSurveyAnswerInput,
};