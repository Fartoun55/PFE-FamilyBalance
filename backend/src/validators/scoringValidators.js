const mongoose = require('mongoose');

const validateSessionIdInput = (payload = {}) => {
  const sessionId = String(payload.sessionId || '').trim();

  if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
    return {
      isValid: false,
      errors: ['Identifiant de session invalide.'],
      value: { sessionId: null },
    };
  }

  return {
    isValid: true,
    errors: [],
    value: { sessionId },
  };
};

module.exports = {
  validateSessionIdInput,
};